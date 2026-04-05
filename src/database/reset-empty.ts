import { DataSource } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

async function resetEmpty() {
  const dataSource = new DataSource({
    ...typeOrmConfig,
    synchronize: false,
    logging: false,
  } as any);

  await dataSource.initialize();

  try {
    // Desactivar restricciones de llaves foráneas temporalmente
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
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
      'productos',
      'cambio_auditoria',
      'log_actividad',
    ];

    // Vaciar todas las tablas
    for (const table of tables) {
      try {
        await dataSource.query(`TRUNCATE TABLE ${table}`);
      } catch (e) {
        console.warn(`Advertencia al truncar ${table}:`, (e as any)?.message);
      }
    }

    // Reactivar restricciones
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Sincronizar esquema después de limpiar
    await dataSource.synchronize();
    
    console.log('✅ Base de datos limpiada exitosamente. Estructura sincronizada.');
  } catch (error) {
    console.error('Error reseteando base:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

resetEmpty().catch((error) => {
  console.error('Error reseteando base limpia:', error);
  process.exit(1);
});