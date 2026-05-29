const fs = require('node:fs');
const path = require('node:path');

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

const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || '3000'}/api`;

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

function unwrap(body) {
  return body?.data ?? body;
}

function requireStatus(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name} devolvio ${actual}, esperado ${expected}`);
  }
}

function requireValue(name, condition, details = '') {
  if (!condition) {
    throw new Error(`${name} fallo${details ? `: ${details}` : ''}`);
  }
}

async function api(method, path, cookie, body) {
  const headers = { Cookie: cookie };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return requestJson(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function login() {
  const result = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL || 'admin@jordan.local',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123456',
    }),
  });
  requireStatus('Login admin', result.response.status, 201);
  const cookie = result.response.headers.get('set-cookie');
  requireValue('Cookie de login', !!cookie);
  return cookie;
}

async function createProducto(cookie, runId, suffix) {
  const res = await api('POST', '/catalogos/productos', cookie, {
    codigo: `QA${suffix}${runId.slice(-8)}`,
    nombre: `QA Producto ${suffix} ${runId}`,
    categoria: 'Normal',
    unidad: 'Unidad',
  });
  requireStatus(`Crear producto ${suffix}`, res.response.status, 201);
  return unwrap(res.body);
}

async function createCliente(cookie, runId, suffix) {
  const res = await api('POST', '/catalogos/clientes', cookie, {
    codigo: `QA${suffix}${runId.slice(-8)}`,
    nombre: `QA Cliente ${suffix} ${runId}`,
    tipo: 'TIENDA',
    nit: `QA-${suffix}-${runId.slice(-6)}`,
  });
  requireStatus(`Crear cliente ${suffix}`, res.response.status, 201);
  return unwrap(res.body);
}

async function verifyDirectSale(cookie, runId) {
  console.log('1) Venta directa parcial y abono de cartera');
  const producto = await createProducto(cookie, runId, 'VD');
  const cliente = await createCliente(cookie, runId, 'VD');

  const ventaRes = await api('POST', '/operaciones/ventas', cookie, {
    clienteId: cliente.id,
    fecha: new Date().toISOString(),
    tipoPago: 'EFECTIVO',
    montoPagado: 5000,
    detalles: [{ productoId: producto.id, cantidad: 2, precioUnitario: 10000 }],
  });
  requireStatus('Crear venta directa parcial', ventaRes.response.status, 201);
  const venta = unwrap(ventaRes.body);
  requireValue('Venta parcial', venta.estado === 'PARCIAL', JSON.stringify(venta));
  requireValue('Saldo inicial cartera', Number(venta.saldoPendiente) === 15000);

  const carteraRes = await api(
    'GET',
    `/operaciones/ventas/cartera/resumen?clienteId=${cliente.id}`,
    cookie,
  );
  requireStatus('Consultar cartera', carteraRes.response.status, 200);
  const cartera = unwrap(carteraRes.body);
  requireValue('Cartera creada', Array.isArray(cartera) && cartera.length === 1);

  const pagoRes = await api('POST', `/operaciones/ventas/${venta.id}/pagos`, cookie, {
    tipo: 'TRANSFERENCIA',
    monto: 15000,
    referencia: `QA-${runId}`,
  });
  requireStatus('Registrar abono total', pagoRes.response.status, 201);
  const ventaPagada = unwrap(pagoRes.body);
  requireValue('Venta completada', ventaPagada.estado === 'COMPLETADA');
  requireValue('Saldo final cero', Number(ventaPagada.saldoPendiente) === 0);
}

async function verifyRouteLiquidation(cookie, runId) {
  console.log('2) Pedido en ruta, entrega, liquidacion, venta e inventario');
  const producto = await createProducto(cookie, runId, 'RT');
  const cliente = await createCliente(cookie, runId, 'RT');

  const pedidoRes = await api('POST', '/operaciones/pedidos', cookie, {
    clienteId: cliente.id,
    fecha: new Date().toISOString(),
    esDeRuta: true,
    detalles: [{ productoId: producto.id, cantidad: 3, precioUnitario: 4000 }],
  });
  requireStatus('Crear pedido de ruta', pedidoRes.response.status, 201);
  const pedido = unwrap(pedidoRes.body);

  const rutaRes = await api('POST', '/operaciones/rutas', cookie, {
    fecha: new Date().toISOString(),
    observaciones: `QA ruta ${runId}`,
  });
  requireStatus('Crear ruta', rutaRes.response.status, 201);
  const ruta = unwrap(rutaRes.body);

  const addPedidoRes = await api('POST', `/operaciones/rutas/${ruta.id}/pedidos`, cookie, {
    pedidoId: pedido.id,
    ordenEntrega: 1,
  });
  requireStatus('Agregar pedido a ruta', addPedidoRes.response.status, 201);

  for (const estado of ['CARGADA', 'EN_ENTREGA', 'EN_LIQUIDACION']) {
    const estadoRes = await api('PATCH', `/operaciones/rutas/${ruta.id}/estado`, cookie, {
      estado,
    });
    requireStatus(`Cambiar ruta a ${estado}`, estadoRes.response.status, 200);
  }

  const liquidarRes = await api('POST', `/operaciones/rutas/${ruta.id}/liquidar`, cookie, {
    totalEntregado: 12000,
    totalRecaudado: 12000,
    totalCartera: 0,
    diferencia: 0,
    efectivoRecibido: 12000,
    transferenciaRecibida: 0,
    pedidos: [
      {
        pedidoId: pedido.id,
        entregado: true,
        aCredito: false,
        tipoPago: 'EFECTIVO',
        montoEfectivo: 12000,
        montoTransferencia: 0,
      },
    ],
  });
  requireStatus('Liquidar ruta', liquidarRes.response.status, 201);
  const rutaLiquidada = unwrap(liquidarRes.body);
  requireValue('Ruta liquidada', rutaLiquidada.estado === 'LIQUIDADA');
  requireValue('Liquidacion presente', !!rutaLiquidada.liquidacion?.id);

  const pedidoFinalRes = await api('GET', `/operaciones/pedidos/${pedido.id}`, cookie);
  requireStatus('Leer pedido liquidado', pedidoFinalRes.response.status, 200);
  const pedidoFinal = unwrap(pedidoFinalRes.body);
  requireValue('Pedido entregado', pedidoFinal.estado === 'ENTREGADO');
  requireValue('Venta creada desde pedido', Array.isArray(pedidoFinal.ventas) && pedidoFinal.ventas.length === 1);
}

async function main() {
  console.log('=== Smoke test flujo operativo Jordan ===');
  console.log('API_BASE:', API_BASE);
  const runId = Date.now().toString();
  const cookie = await login();
  await verifyDirectSale(cookie, runId);
  await verifyRouteLiquidation(cookie, runId);
  console.log('\nOK Flujo operativo completado');
}

main().catch((error) => {
  console.error('X Flujo operativo fallo:', error.message);
  process.exit(1);
});
