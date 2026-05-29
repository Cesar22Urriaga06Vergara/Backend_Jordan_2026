const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));

function dbConfig() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_DATABASE'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Variables de entorno requeridas no definidas: ${missing.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  };
}

const checks = [
  {
    level: 'CRITICO',
    name: 'Ventas duplicadas por pedido',
    sql: `
      SELECT pedidoId, COUNT(*) AS totalVentas, GROUP_CONCAT(id ORDER BY id) AS ventaIds
      FROM ventas
      WHERE pedidoId IS NOT NULL
      GROUP BY pedidoId
      HAVING COUNT(*) > 1
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Ventas con saldos matematicamente inconsistentes',
    sql: `
      SELECT id, numero, totalVenta, totalPagado, saldoPendiente,
             ROUND(totalVenta - totalPagado, 2) AS saldoEsperado
      FROM ventas
      WHERE ABS(ROUND(totalVenta - totalPagado - saldoPendiente, 2)) > 0.01
         OR totalPagado < 0
         OR saldoPendiente < 0
         OR totalPagado - totalVenta > 0.01
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Cartera sin venta valida o con venta cerrada',
    sql: `
      SELECT c.id, c.clienteId, c.ventaId, c.saldoPendiente, v.estado, v.saldoPendiente AS saldoVenta
      FROM cartera c
      LEFT JOIN ventas v ON v.id = c.ventaId
      WHERE c.saldoPendiente > 0
        AND (
          v.id IS NULL
          OR v.estado IN ('COMPLETADA', 'CANCELADA')
          OR ABS(ROUND(c.saldoPendiente - v.saldoPendiente, 2)) > 0.01
        )
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Pagos sin movimiento de caja',
    sql: `
      SELECT p.id, p.numero, p.ventaId, p.clienteId, p.tipo, p.monto, p.fecha
      FROM pagos p
      LEFT JOIN movimiento_caja m ON m.pagoId = p.id
      WHERE m.id IS NULL
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Pagos invalidos o sin venta',
    sql: `
      SELECT p.id, p.numero, p.ventaId, p.monto, v.id AS ventaExiste
      FROM pagos p
      LEFT JOIN ventas v ON v.id = p.ventaId
      WHERE p.monto <= 0 OR v.id IS NULL
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Ventas cuyo detalle no cuadra con el total',
    sql: `
      SELECT v.id, v.numero, v.totalVenta, ROUND(COALESCE(SUM(d.subtotal), 0), 2) AS totalDetalle
      FROM ventas v
      LEFT JOIN detalle_venta d ON d.ventaId = v.id
      GROUP BY v.id, v.numero, v.totalVenta
      HAVING COUNT(d.id) = 0 OR ABS(ROUND(v.totalVenta - COALESCE(SUM(d.subtotal), 0), 2)) > 0.01
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Pedidos entregados sin venta',
    sql: `
      SELECT p.id, p.numero, p.clienteId, p.rutaId, p.fecha
      FROM pedidos p
      LEFT JOIN ventas v ON v.pedidoId = p.id
      WHERE p.estado = 'ENTREGADO' AND v.id IS NULL
      LIMIT 20
    `,
  },
  {
    level: 'CRITICO',
    name: 'Rutas liquidadas sin liquidacion',
    sql: `
      SELECT r.id, r.numero, r.fecha
      FROM rutas r
      LEFT JOIN liquidacion_ruta l ON l.rutaId = r.id
      WHERE r.estado = 'LIQUIDADA' AND l.id IS NULL
      LIMIT 20
    `,
  },
  {
    level: 'MEDIO',
    name: 'Pedidos con rutaId sin item_ruta correspondiente',
    sql: `
      SELECT p.id, p.numero, p.rutaId, p.estado
      FROM pedidos p
      LEFT JOIN item_ruta i ON i.pedidoId = p.id AND i.rutaId = p.rutaId
      WHERE p.rutaId IS NOT NULL AND i.id IS NULL
      LIMIT 20
    `,
  },
  {
    level: 'MEDIO',
    name: 'Items de ruta desincronizados con pedido',
    sql: `
      SELECT i.id, i.rutaId, i.pedidoId, p.rutaId AS rutaPedido, p.estado AS estadoPedido
      FROM item_ruta i
      LEFT JOIN pedidos p ON p.id = i.pedidoId
      WHERE p.id IS NULL OR p.rutaId <> i.rutaId
      LIMIT 20
    `,
  },
  {
    level: 'MEDIO',
    name: 'Movimientos de inventario invalidos',
    sql: `
      SELECT m.id, m.productoId, m.tipo, m.cantidad, p.id AS productoExiste
      FROM movimiento_inventario m
      LEFT JOIN productos p ON p.id = m.productoId
      WHERE m.cantidad <= 0 OR p.id IS NULL
      LIMIT 20
    `,
  },
  {
    level: 'MEDIO',
    name: 'Mas de una apertura sin cierre',
    sql: `
      SELECT a.id, a.fecha, a.usuarioId
      FROM apertura_diaria a
      WHERE NOT EXISTS (
        SELECT 1 FROM cierre_diario c WHERE DATE(c.fecha) = DATE(a.fecha)
      )
      ORDER BY a.fecha ASC
      LIMIT 20
    `,
    failWhenRowsGreaterThan: 1,
  },
  {
    level: 'MEDIO',
    name: 'Cierres duplicados por dia calendario',
    sql: `
      SELECT DATE(fecha) AS dia, COUNT(*) AS totalCierres, GROUP_CONCAT(id ORDER BY id) AS cierreIds
      FROM cierre_diario
      GROUP BY DATE(fecha)
      HAVING COUNT(*) > 1
      LIMIT 20
    `,
  },
];

async function runCheck(connection, check) {
  const [rows] = await connection.query(check.sql);
  const failThreshold = check.failWhenRowsGreaterThan ?? 0;
  const failed = rows.length > failThreshold;

  const icon = failed ? 'X' : 'OK';
  console.log(`${icon} [${check.level}] ${check.name}: ${rows.length} hallazgo(s)`);

  if (failed) {
    console.table(rows);
  }

  return failed ? check.level : null;
}

async function main() {
  const config = dbConfig();
  const connection = await mysql.createConnection(config);

  try {
    const [dbRows] = await connection.query('SELECT DATABASE() AS db');
    console.log('=== Auditoria de datos preproduccion ===');
    console.log('DB activa:', dbRows[0]?.db);
    console.log('Modo     : solo lectura\n');

    const failedLevels = [];
    for (const check of checks) {
      const failedLevel = await runCheck(connection, check);
      if (failedLevel) failedLevels.push(failedLevel);
    }

    const criticalCount = failedLevels.filter((level) => level === 'CRITICO').length;
    const mediumCount = failedLevels.filter((level) => level === 'MEDIO').length;

    console.log('\nResumen');
    console.log('Criticos:', criticalCount);
    console.log('Medios  :', mediumCount);

    if (criticalCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Error ejecutando auditoria:', error.message);
  process.exit(1);
});
