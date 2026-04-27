/**
 * Limpia todos los datos operacionales de la BD, conservando:
 *  - El usuario cuyo email se indique (por defecto urriagac44@gmail.com)
 *  - Todos los productos
 *
 * Uso:
 *   npm run db:clean
 *   npm run db:clean -- --email=otro@email.com --nombre="Nombre Admin"
 */

import { DataSource } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';
import * as bcrypt from 'bcrypt';

// ── Argumentos CLI ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : undefined;
}

const EMAIL   = getArg('email')  ?? 'urriagac44@gmail.com';
const NOMBRE  = getArg('nombre') ?? 'Administrador';
const PASSWORD = getArg('password') ?? 'admin123';

// ── Tablas a limpiar (orden respeta FK) ───────────────────────────────────────
const TABLAS_OPERACIONALES = [
  'abono_deuda',
  'anticipo_prestamo',
  'pago_trabajador',
  'trabajador_labor',
  'cierre_inventario',
  'cierre_diario',
  'cierre_caja',
  'movimiento_inventario',
  'produccion_diaria',
  'inventario_inicial',
  'apertura_diaria',
  'movimiento_caja',
  'cartera',
  'pagos',
  'detalle_venta',
  'ventas',
  'liquidacion_ruta',
  'intento_entrega',
  'item_ruta',
  'rutas',
  'detalle_pedido',
  'pedidos',
  'precios_cliente',
  'labor_tarifa',
  'labor_tipo',
  'trabajadores',
  'clientes',
  'cambio_auditoria',
  'log_actividad',
  // usuarios se maneja aparte
];

async function cleanData() {
  const dataSource = new DataSource({
    ...typeOrmConfig,
    synchronize: false,
    logging: false,
  } as any);

  await dataSource.initialize();

  try {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Limpiar tablas operacionales
    for (const table of TABLAS_OPERACIONALES) {
      try {
        await dataSource.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  ✓ ${table}`);
      } catch (e) {
        console.warn(`  ⚠ ${table}: ${(e as any)?.message}`);
      }
    }

    // 2. Conservar solo el usuario indicado, borrar el resto
    await dataSource.query(
      `DELETE FROM usuarios WHERE email != ?`,
      [EMAIL],
    );

    // 3. Upsert del usuario conservado: actualizar nombre (y password si se pasó)
    const existing = await dataSource.query(
      `SELECT id FROM usuarios WHERE email = ?`,
      [EMAIL],
    );

    if (existing.length > 0) {
      const hashed = await bcrypt.hash(PASSWORD, 10);
      await dataSource.query(
        `UPDATE usuarios SET nombre = ?, password = ?, rol = 'ADMIN', estado = 'ACTIVO' WHERE email = ?`,
        [NOMBRE, hashed, EMAIL],
      );
      console.log(`\n  ✓ Usuario actualizado: ${NOMBRE} <${EMAIL}>`);
    } else {
      const hashed = await bcrypt.hash(PASSWORD, 10);
      await dataSource.query(
        `INSERT INTO usuarios (email, nombre, password, rol, estado) VALUES (?, ?, ?, 'ADMIN', 'ACTIVO')`,
        [EMAIL, NOMBRE, hashed],
      );
      console.log(`\n  ✓ Usuario creado: ${NOMBRE} <${EMAIL}>`);
    }

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ Limpieza completada.');
    console.log(`   Usuario : ${NOMBRE} <${EMAIL}>`);
    console.log(`   Password: ${PASSWORD}`);
    console.log(`   Productos: conservados intactos`);
  } catch (error) {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

cleanData().catch(() => process.exit(1));
