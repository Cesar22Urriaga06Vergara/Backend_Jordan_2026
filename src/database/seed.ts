import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';
import {
  Usuario,
  Producto,
  Cliente,
  PrecioCliente,
  Trabajador,
  LaborTipo,
  LaborTarifa,
  Pedido,
  DetallePedido,
  Ruta,
  ItemRuta,
  IntentoEntrega,
  LiquidacionRuta,
  Venta,
  DetalleVenta,
  Pago,
  Cartera,
  MovimientoCaja,
  AperturaDiaria,
  InventarioInicial,
  ProduccionDiaria,
  MovimientoInventario,
  PagoTrabajador,
  TrabajadorLabor,
  AnticipoPrestamo,
  AbonoDeuda,
  CierreCaja,
  CierreDiario,
  CierreInventario,
} from './entities';
import {
  EstadoAnticipoPrestamo,
  EstadoIntentoEntrega,
  EstadoPedido,
  EstadoRuta,
  EstadoVenta,
  TipoAnticipoPrestamo,
  TipoCliente,
  TipoLabor,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
  TipoPago,
  TipoTrabajador,
} from '@/common/enums';

function startOfDay(date = new Date()): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function atHour(base: Date, hour: number, minute = 0): Date {
  const value = new Date(base);
  value.setHours(hour, minute, 0, 0);
  return value;
}

async function resetDatabase(dataSource: DataSource) {
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
    'detalle_pedido',
    'pedidos',
    'rutas',
    'labor_tarifa',
    'labor_tipo',
    'trabajadores',
    'precios_cliente',
    'clientes',
    'productos',
    'log_actividad',
    'cambio_auditoria',
    'usuarios',
  ];

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await dataSource.query(`TRUNCATE TABLE ${table}`);
  }
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seed() {
  const dataSource = new DataSource({
    ...typeOrmConfig,
    synchronize: true,
    logging: false,
  } as any);

  await dataSource.initialize();

  try {
    console.log('🌱 Iniciando seed de base de datos...');
    await resetDatabase(dataSource);
    console.log('🧹 Base reiniciada para seed deterministico');

    const usuarioRepo = dataSource.getRepository(Usuario);
    const productoRepo = dataSource.getRepository(Producto);
    const clienteRepo = dataSource.getRepository(Cliente);
    const precioClienteRepo = dataSource.getRepository(PrecioCliente);
    const trabajadorRepo = dataSource.getRepository(Trabajador);
    const laborTipoRepo = dataSource.getRepository(LaborTipo);
    const laborTarifaRepo = dataSource.getRepository(LaborTarifa);
    const pedidoRepo = dataSource.getRepository(Pedido);
    const detallePedidoRepo = dataSource.getRepository(DetallePedido);
    const rutaRepo = dataSource.getRepository(Ruta);
    const itemRutaRepo = dataSource.getRepository(ItemRuta);
    const intentoRepo = dataSource.getRepository(IntentoEntrega);
    const liquidacionRepo = dataSource.getRepository(LiquidacionRuta);
    const ventaRepo = dataSource.getRepository(Venta);
    const detalleVentaRepo = dataSource.getRepository(DetalleVenta);
    const pagoRepo = dataSource.getRepository(Pago);
    const carteraRepo = dataSource.getRepository(Cartera);
    const movCajaRepo = dataSource.getRepository(MovimientoCaja);
    const aperturaRepo = dataSource.getRepository(AperturaDiaria);
    const inventarioInicialRepo = dataSource.getRepository(InventarioInicial);
    const produccionRepo = dataSource.getRepository(ProduccionDiaria);
    const movInventarioRepo = dataSource.getRepository(MovimientoInventario);
    const trabajadorLaborRepo = dataSource.getRepository(TrabajadorLabor);
    const pagoTrabajadorRepo = dataSource.getRepository(PagoTrabajador);
    const anticipoRepo = dataSource.getRepository(AnticipoPrestamo);
    const abonoRepo = dataSource.getRepository(AbonoDeuda);
    const cierreCajaRepo = dataSource.getRepository(CierreCaja);
    const cierreDiarioRepo = dataSource.getRepository(CierreDiario);
    const cierreInventarioRepo = dataSource.getRepository(CierreInventario);

    const fechaBase = startOfDay(new Date());
    const fechaApertura = atHour(fechaBase, 6, 0);
    const fechaCierre = atHour(fechaBase, 18, 30);

    const usuario = await usuarioRepo.save(
      usuarioRepo.create({
        email: 'admin@jordan.local',
        nombre: 'Administrador JORDAN',
        password: await bcrypt.hash('admin123456', 10),
        estado: 'ACTIVO',
        rol: 'ADMIN',
      }),
    );
    console.log('✅ Usuario admin inicial creado');

    const productos = await productoRepo.save(
      productoRepo.create([
        { codigo: 'PACA-125', nombre: 'Paca 125 ml', descripcion: 'Picadillo', categoria: 'PACA', unidad: 'PACA', activo: true },
        { codigo: 'PACA-250', nombre: 'Paca 250 ml', descripcion: 'Normal', categoria: 'PACA', unidad: 'PACA', activo: true },
        { codigo: 'PACA-600', nombre: 'Paca 600 ml', descripcion: 'Hielo', categoria: 'PACA', unidad: 'PACA', activo: true },
        { codigo: 'BOTELLON-5L', nombre: 'Botellon 5 L', descripcion: 'Botellon 5 litros', categoria: 'BOTELLON', unidad: 'UNIDAD', activo: true },
        { codigo: 'BOTELLON-6L', nombre: 'Botellon 6 L', descripcion: 'Botellon 6 litros', categoria: 'BOTELLON', unidad: 'UNIDAD', activo: true },
        { codigo: 'RECARGA-5L', nombre: 'Recarga 5 L', descripcion: 'Recarga botellon 5 litros', categoria: 'RECARGA', unidad: 'UNIDAD', activo: true },
        { codigo: 'RECARGA-6L', nombre: 'Recarga 6 L', descripcion: 'Recarga botellon 6 litros', categoria: 'RECARGA', unidad: 'UNIDAD', activo: true },
        { codigo: 'GRANEL-2000', nombre: 'Agua a granel 2000', descripcion: 'Agua a granel', categoria: 'GRANEL', unidad: 'LITRO', activo: true },
        { codigo: 'GRANEL-3000', nombre: 'Agua a granel 3000', descripcion: 'Agua a granel', categoria: 'GRANEL', unidad: 'LITRO', activo: true },
        { codigo: 'GRANEL-4000', nombre: 'Agua a granel 4000', descripcion: 'Agua a granel', categoria: 'GRANEL', unidad: 'LITRO', activo: true },
        { codigo: 'GRANEL-5000', nombre: 'Agua a granel 5000', descripcion: 'Agua a granel', categoria: 'GRANEL', unidad: 'LITRO', activo: true },
      ]),
    );
    console.log('✅ Productos creados');

    const productosPorCodigo = Object.fromEntries(productos.map((p) => [p.codigo, p]));

    const clientes = await clienteRepo.save(
      clienteRepo.create([
        {
          codigo: 'CLI-0001',
          nombre: 'La Esperanza',
          tipo: TipoCliente.TIENDA,
          telefono: '3001234567',
          direccion: 'Calle Principal 123',
          vereda: 'Centro',
          observaciones: 'Cliente de tienda con precio especial',
          activo: true,
        },
        {
          codigo: 'CLI-0002',
          nombre: 'El Parador',
          tipo: TipoCliente.NEGOCIO,
          nit: '900123456-1',
          telefono: '3007654321',
          direccion: 'Avenida Comercial 10',
          vereda: 'Centro',
          observaciones: 'Negocio con pedidos por ruta',
          activo: true,
        },
        {
          codigo: 'CLI-0003',
          nombre: 'Cristal',
          tipo: TipoCliente.DIRECTO,
          cedula: '1111111111',
          telefono: '3015550101',
          direccion: 'Planta Jordan',
          vereda: 'Planta',
          observaciones: 'Cliente directo en purificadora',
          activo: true,
        },
      ]),
    );
    console.log('✅ Clientes creados');

    const clientesPorCodigo = Object.fromEntries(clientes.map((c) => [c.codigo, c]));

    const tablaPrecios: Record<string, Record<string, number>> = {
      'CLI-0001': {
        'PACA-125': 14000,
        'PACA-250': 16000,
        'PACA-600': 23000,
        'BOTELLON-5L': 7000,
        'BOTELLON-6L': 8000,
        'RECARGA-5L': 6000,
        'RECARGA-6L': 6500,
        'GRANEL-2000': 2000,
        'GRANEL-3000': 3000,
        'GRANEL-4000': 4000,
        'GRANEL-5000': 5000,
      },
      'CLI-0002': {
        'PACA-125': 14500,
        'PACA-250': 16500,
        'PACA-600': 24000,
        'BOTELLON-5L': 7300,
        'BOTELLON-6L': 8000,
        'RECARGA-5L': 6200,
        'RECARGA-6L': 6700,
        'GRANEL-2000': 2100,
        'GRANEL-3000': 3100,
        'GRANEL-4000': 4100,
        'GRANEL-5000': 5100,
      },
      'CLI-0003': {
        'PACA-125': 14000,
        'PACA-250': 17000,
        'PACA-600': 25000,
        'BOTELLON-5L': 7500,
        'BOTELLON-6L': 8200,
        'RECARGA-5L': 6100,
        'RECARGA-6L': 6000,
        'GRANEL-2000': 2200,
        'GRANEL-3000': 3200,
        'GRANEL-4000': 4200,
        'GRANEL-5000': 5200,
      },
    };

    for (const cliente of clientes) {
      for (const producto of productos) {
        await precioClienteRepo.save(
          precioClienteRepo.create({
            clienteId: cliente.id,
            productoId: producto.id,
            precioUnitario: tablaPrecios[cliente.codigo][producto.codigo],
            activo: true,
          }),
        );
      }
    }
    console.log('✅ Precios por cliente creados');

    const trabajadores = await trabajadorRepo.save(
      trabajadorRepo.create([
        {
          codigo: 'TRAB-0001',
          nombre: 'Sebastian',
          cedula: '1098765432',
          telefono: '3101234567',
          direccion: 'Calle 10 #20-30',
          tipoTrabajador: TipoTrabajador.PERMANENTE,
          saldoTotal: 120000,
          activo: true,
        },
        {
          codigo: 'TRAB-0002',
          nombre: 'Carlos Domiciliario',
          cedula: '1087654321',
          telefono: '3102345678',
          direccion: 'Barrio Central',
          tipoTrabajador: TipoTrabajador.DOMICILIARIO,
          saldoTotal: 0,
          activo: true,
        },
        {
          codigo: 'TRAB-0003',
          nombre: 'Roberto Preventista',
          cedula: '1076543210',
          telefono: '3103456789',
          direccion: 'Vereda San Antonio',
          tipoTrabajador: TipoTrabajador.PREVENTISTA,
          saldoTotal: 0,
          activo: true,
        },
        {
          codigo: 'TRAB-0004',
          nombre: 'Luis Preventista',
          cedula: '1065432109',
          telefono: '3104567890',
          direccion: 'Vereda El Carmen',
          tipoTrabajador: TipoTrabajador.PREVENTISTA,
          saldoTotal: 0,
          activo: true,
        },
      ]),
    );
    console.log('✅ Trabajadores creados');

    const trabajadoresPorCodigo = Object.fromEntries(trabajadores.map((t) => [t.codigo, t]));

    const tiposLabor = await laborTipoRepo.save(
      laborTipoRepo.create([
        { nombre: 'Domiciliario Jornada', tipo: TipoLabor.POR_JORNADA, descripcion: 'Pago por jornada completa', activo: true },
        { nombre: 'Produccion Horas', tipo: TipoLabor.POR_HORA, descripcion: 'Pago proporcional por horas', activo: true },
        { nombre: 'Preventista Por Paca', tipo: TipoLabor.POR_PACA, descripcion: 'Pago por paca vendida/entregada', activo: true },
        { nombre: 'Apoyo Manual', tipo: TipoLabor.MANUAL, descripcion: 'Pago manual por acuerdo', activo: true },
      ]),
    );

    const tipoLaborPorNombre = Object.fromEntries(tiposLabor.map((l) => [l.nombre, l]));

    const tarifas = await laborTarifaRepo.save(
      laborTarifaRepo.create([
        {
          trabajadorId: trabajadoresPorCodigo['TRAB-0002'].id,
          laborTipoId: tipoLaborPorNombre['Domiciliario Jornada'].id,
          tarifa: 35000,
          horas: 8,
          unidad: 'JORNADA',
          activo: true,
        },
        {
          trabajadorId: trabajadoresPorCodigo['TRAB-0001'].id,
          laborTipoId: tipoLaborPorNombre['Produccion Horas'].id,
          tarifa: 35000,
          horas: 8,
          unidad: 'HORA_PROPORCIONAL',
          activo: true,
        },
        {
          trabajadorId: trabajadoresPorCodigo['TRAB-0003'].id,
          laborTipoId: tipoLaborPorNombre['Preventista Por Paca'].id,
          tarifa: 500,
          unidad: 'PACA',
          activo: true,
        },
        {
          trabajadorId: trabajadoresPorCodigo['TRAB-0004'].id,
          laborTipoId: tipoLaborPorNombre['Preventista Por Paca'].id,
          tarifa: 500,
          unidad: 'PACA',
          activo: true,
        },
      ]),
    );
    console.log('✅ Labores y tarifas creadas');

    const tarifaPorTrabajador = Object.fromEntries(tarifas.map((t) => [t.trabajadorId, t]));

    const apertura = await aperturaRepo.save(
      aperturaRepo.create({
        fecha: fechaApertura,
        usuarioId: usuario.id,
        saldoInicial: 250000,
        observaciones: 'Apertura del dia con saldo inicial y stock base',
      }),
    );

    const inventarioBase: Record<string, number> = {
      'PACA-125': 50,
      'PACA-250': 60,
      'PACA-600': 40,
      'BOTELLON-5L': 30,
      'BOTELLON-6L': 30,
      'RECARGA-5L': 100,
      'RECARGA-6L': 80,
      'GRANEL-2000': 2000,
      'GRANEL-3000': 2000,
      'GRANEL-4000': 2000,
      'GRANEL-5000': 2000,
    };

    for (const producto of productos) {
      await inventarioInicialRepo.save(
        inventarioInicialRepo.create({
          productoId: producto.id,
          aperturaDiariaId: apertura.id,
          cantidadInicial: inventarioBase[producto.codigo],
        }),
      );
    }

    const producciones = await produccionRepo.save(
      produccionRepo.create([
        { productoId: productosPorCodigo['PACA-125'].id, aperturaDiariaId: apertura.id, cantidad: 15, observaciones: 'Produccion manana' },
        { productoId: productosPorCodigo['PACA-250'].id, aperturaDiariaId: apertura.id, cantidad: 20, observaciones: 'Produccion manana' },
        { productoId: productosPorCodigo['PACA-600'].id, aperturaDiariaId: apertura.id, cantidad: 10, observaciones: 'Produccion manana' },
        { productoId: productosPorCodigo['RECARGA-5L'].id, aperturaDiariaId: apertura.id, cantidad: 30, observaciones: 'Recarga planta' },
        { productoId: productosPorCodigo['RECARGA-6L'].id, aperturaDiariaId: apertura.id, cantidad: 20, observaciones: 'Recarga planta' },
      ]),
    );

    for (const produccion of producciones) {
      await movInventarioRepo.save(
        movInventarioRepo.create({
          productoId: produccion.productoId,
          tipo: TipoMovimientoInventario.PRODUCCION,
          cantidad: produccion.cantidad,
          fecha: atHour(fechaBase, 8, 0),
          produccionId: produccion.id,
          observaciones: 'Ingreso por produccion diaria',
        }),
      );
    }

    const rutaPrincipal = await rutaRepo.save(
      rutaRepo.create({
        numero: 'RUTA-20260403-001',
        fecha: atHour(fechaBase, 9, 0),
        estado: EstadoRuta.LIQUIDADA,
        domiciliarioId: trabajadoresPorCodigo['TRAB-0002'].id,
        observaciones: 'Ruta con orden manual de entrega',
      }),
    );

    const pedidos = await pedidoRepo.save(
      pedidoRepo.create([
        {
          numero: 'PED-20260403-001',
          clienteId: clientesPorCodigo['CLI-0001'].id,
          fecha: atHour(fechaBase, 7, 15),
          estado: EstadoPedido.ENTREGADO,
          observaciones: 'Pedido entregado y pagado en efectivo',
          esDeRuta: true,
          rutaId: rutaPrincipal.id,
        },
        {
          numero: 'PED-20260403-002',
          clienteId: clientesPorCodigo['CLI-0002'].id,
          fecha: atHour(fechaBase, 7, 30),
          estado: EstadoPedido.ENTREGADO,
          observaciones: 'Pedido entregado y pagado por transferencia',
          esDeRuta: true,
          rutaId: rutaPrincipal.id,
        },
        {
          numero: 'PED-20260403-003',
          clienteId: clientesPorCodigo['CLI-0003'].id,
          fecha: atHour(fechaBase, 8, 0),
          estado: EstadoPedido.ENTREGADO,
          observaciones: 'Pedido entregado con pago parcial',
          esDeRuta: true,
          rutaId: rutaPrincipal.id,
        },
        {
          numero: 'PED-20260404-001',
          clienteId: clientesPorCodigo['CLI-0001'].id,
          fecha: atHour(new Date(fechaBase.getTime() + 24 * 60 * 60 * 1000), 9, 30),
          estado: EstadoPedido.PENDIENTE,
          observaciones: 'Pedido pendiente para el siguiente dia',
          esDeRuta: false,
        },
        {
          numero: 'PED-20260404-002',
          clienteId: clientesPorCodigo['CLI-0002'].id,
          fecha: atHour(new Date(fechaBase.getTime() + 24 * 60 * 60 * 1000), 10, 0),
          estado: EstadoPedido.REPROGRAMADO,
          observaciones: 'Pedido no entregado y reprogramado',
          razonReprogramacion: 'Cliente ausente, reprogramado para proxima ruta',
          fechaReprogramacion: atHour(new Date(fechaBase.getTime() + 24 * 60 * 60 * 1000), 15, 0),
          esDeRuta: true,
          rutaId: rutaPrincipal.id,
        },
      ]),
    );

    const pedidoPorNumero = Object.fromEntries(pedidos.map((p) => [p.numero, p]));

    const detallesPedidoData = [
      { pedido: 'PED-20260403-001', producto: 'PACA-250', cantidad: 4, precioUnitario: 16000, subtotal: 64000 },
      { pedido: 'PED-20260403-001', producto: 'RECARGA-5L', cantidad: 6, precioUnitario: 6000, subtotal: 36000 },
      { pedido: 'PED-20260403-002', producto: 'PACA-600', cantidad: 3, precioUnitario: 24000, subtotal: 72000 },
      { pedido: 'PED-20260403-002', producto: 'BOTELLON-6L', cantidad: 6, precioUnitario: 8000, subtotal: 48000 },
      { pedido: 'PED-20260403-003', producto: 'PACA-125', cantidad: 5, precioUnitario: 14000, subtotal: 70000 },
      { pedido: 'PED-20260403-003', producto: 'RECARGA-6L', cantidad: 5, precioUnitario: 6000, subtotal: 30000 },
      { pedido: 'PED-20260404-001', producto: 'BOTELLON-5L', cantidad: 5, precioUnitario: 7000, subtotal: 35000 },
      { pedido: 'PED-20260404-001', producto: 'RECARGA-5L', cantidad: 5, precioUnitario: 6000, subtotal: 30000 },
      { pedido: 'PED-20260404-002', producto: 'PACA-250', cantidad: 4, precioUnitario: 16500, subtotal: 66000 },
    ];

    for (const d of detallesPedidoData) {
      await detallePedidoRepo.save(
        detallePedidoRepo.create({
          pedidoId: pedidoPorNumero[d.pedido].id,
          productoId: productosPorCodigo[d.producto].id,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        }),
      );
    }

    await itemRutaRepo.save(
      itemRutaRepo.create([
        { rutaId: rutaPrincipal.id, pedidoId: pedidoPorNumero['PED-20260403-002'].id, ordenEntrega: 1, estado: EstadoPedido.ENTREGADO },
        { rutaId: rutaPrincipal.id, pedidoId: pedidoPorNumero['PED-20260403-001'].id, ordenEntrega: 2, estado: EstadoPedido.ENTREGADO },
        { rutaId: rutaPrincipal.id, pedidoId: pedidoPorNumero['PED-20260403-003'].id, ordenEntrega: 3, estado: EstadoPedido.ENTREGADO },
        { rutaId: rutaPrincipal.id, pedidoId: pedidoPorNumero['PED-20260404-002'].id, ordenEntrega: 4, estado: EstadoPedido.REPROGRAMADO },
      ]),
    );

    await intentoRepo.save(
      intentoRepo.create([
        {
          rutaId: rutaPrincipal.id,
          pedidoId: pedidoPorNumero['PED-20260403-001'].id,
          numero: 1,
          fecha: atHour(fechaBase, 10, 0),
          estado: EstadoIntentoEntrega.COMPLETADO,
          observaciones: 'Entrega completada',
        },
        {
          rutaId: rutaPrincipal.id,
          pedidoId: pedidoPorNumero['PED-20260403-002'].id,
          numero: 1,
          fecha: atHour(fechaBase, 10, 30),
          estado: EstadoIntentoEntrega.COMPLETADO,
          observaciones: 'Entrega completada',
        },
        {
          rutaId: rutaPrincipal.id,
          pedidoId: pedidoPorNumero['PED-20260403-003'].id,
          numero: 1,
          fecha: atHour(fechaBase, 11, 0),
          estado: EstadoIntentoEntrega.COMPLETADO,
          observaciones: 'Entrega con pago parcial',
        },
        {
          rutaId: rutaPrincipal.id,
          pedidoId: pedidoPorNumero['PED-20260404-002'].id,
          numero: 1,
          fecha: atHour(fechaBase, 11, 20),
          estado: EstadoIntentoEntrega.NO_COMPLETADO,
          razon: 'Cliente ausente',
          observaciones: 'No recibido en primer intento',
        },
        {
          rutaId: rutaPrincipal.id,
          pedidoId: pedidoPorNumero['PED-20260404-002'].id,
          numero: 2,
          fecha: atHour(fechaBase, 12, 0),
          estado: EstadoIntentoEntrega.NO_COMPLETADO,
          razon: 'Devuelto a planta',
          observaciones: 'Se reprograma para siguiente ruta',
        },
      ]),
    );

    const ventas = await ventaRepo.save(
      ventaRepo.create([
        {
          numero: 'VTA-20260403-001',
          clienteId: clientesPorCodigo['CLI-0001'].id,
          pedidoId: pedidoPorNumero['PED-20260403-001'].id,
          fecha: atHour(fechaBase, 13, 0),
          estado: EstadoVenta.COMPLETADA,
          totalVenta: 100000,
          totalPagado: 100000,
          saldoPendiente: 0,
        },
        {
          numero: 'VTA-20260403-002',
          clienteId: clientesPorCodigo['CLI-0002'].id,
          pedidoId: pedidoPorNumero['PED-20260403-002'].id,
          fecha: atHour(fechaBase, 13, 10),
          estado: EstadoVenta.COMPLETADA,
          totalVenta: 120000,
          totalPagado: 120000,
          saldoPendiente: 0,
        },
        {
          numero: 'VTA-20260403-003',
          clienteId: clientesPorCodigo['CLI-0003'].id,
          pedidoId: pedidoPorNumero['PED-20260403-003'].id,
          fecha: atHour(fechaBase, 13, 20),
          estado: EstadoVenta.PARCIAL,
          totalVenta: 100000,
          totalPagado: 70000,
          saldoPendiente: 30000,
        },
      ]),
    );

    const ventaPorNumero = Object.fromEntries(ventas.map((v) => [v.numero, v]));

    await detalleVentaRepo.save(
      detalleVentaRepo.create([
        { ventaId: ventaPorNumero['VTA-20260403-001'].id, productoId: productosPorCodigo['PACA-250'].id, cantidad: 4, precioUnitario: 16000, subtotal: 64000 },
        { ventaId: ventaPorNumero['VTA-20260403-001'].id, productoId: productosPorCodigo['RECARGA-5L'].id, cantidad: 6, precioUnitario: 6000, subtotal: 36000 },
        { ventaId: ventaPorNumero['VTA-20260403-002'].id, productoId: productosPorCodigo['PACA-600'].id, cantidad: 3, precioUnitario: 24000, subtotal: 72000 },
        { ventaId: ventaPorNumero['VTA-20260403-002'].id, productoId: productosPorCodigo['BOTELLON-6L'].id, cantidad: 6, precioUnitario: 8000, subtotal: 48000 },
        { ventaId: ventaPorNumero['VTA-20260403-003'].id, productoId: productosPorCodigo['PACA-125'].id, cantidad: 5, precioUnitario: 14000, subtotal: 70000 },
        { ventaId: ventaPorNumero['VTA-20260403-003'].id, productoId: productosPorCodigo['RECARGA-6L'].id, cantidad: 5, precioUnitario: 6000, subtotal: 30000 },
      ]),
    );

    const pagos = await pagoRepo.save(
      pagoRepo.create([
        {
          numero: 'PAG-20260403-001',
          ventaId: ventaPorNumero['VTA-20260403-001'].id,
          clienteId: clientesPorCodigo['CLI-0001'].id,
          tipo: TipoPago.EFECTIVO,
          monto: 100000,
          fecha: atHour(fechaBase, 13, 30),
          referencia: 'EFECTIVO-001',
          observaciones: 'Pago total en efectivo',
        },
        {
          numero: 'PAG-20260403-002',
          ventaId: ventaPorNumero['VTA-20260403-002'].id,
          clienteId: clientesPorCodigo['CLI-0002'].id,
          tipo: TipoPago.TRANSFERENCIA,
          monto: 120000,
          fecha: atHour(fechaBase, 13, 40),
          referencia: 'TRX-001',
          observaciones: 'Pago total por transferencia',
        },
        {
          numero: 'PAG-20260403-003',
          ventaId: ventaPorNumero['VTA-20260403-003'].id,
          clienteId: clientesPorCodigo['CLI-0003'].id,
          tipo: TipoPago.EFECTIVO,
          monto: 70000,
          fecha: atHour(fechaBase, 13, 50),
          referencia: 'EFECTIVO-002',
          observaciones: 'Pago parcial',
        },
      ]),
    );

    const pagoPorNumero = Object.fromEntries(pagos.map((p) => [p.numero, p]));

    await carteraRepo.save(
      carteraRepo.create({
        clienteId: clientesPorCodigo['CLI-0003'].id,
        ventaId: ventaPorNumero['VTA-20260403-003'].id,
        saldoPendiente: 30000,
        diasMora: 0,
        ultimoMovimiento: atHour(fechaBase, 14, 0),
      }),
    );

    await movCajaRepo.save(
      movCajaRepo.create([
        {
          numero: 'MC-20260403-001',
          tipo: TipoMovimientoCaja.INGRESO_VENTA_EFECTIVO,
          monto: 100000,
          fecha: atHour(fechaBase, 13, 35),
          medioPago: TipoPago.EFECTIVO,
          pagoId: pagoPorNumero['PAG-20260403-001'].id,
          clienteId: clientesPorCodigo['CLI-0001'].id,
          concepto: 'Ingreso por venta en efectivo',
        },
        {
          numero: 'MC-20260403-002',
          tipo: TipoMovimientoCaja.INGRESO_VENTA_TRANSFERENCIA,
          monto: 120000,
          fecha: atHour(fechaBase, 13, 45),
          medioPago: TipoPago.TRANSFERENCIA,
          pagoId: pagoPorNumero['PAG-20260403-002'].id,
          clienteId: clientesPorCodigo['CLI-0002'].id,
          concepto: 'Ingreso por venta en transferencia',
        },
        {
          numero: 'MC-20260403-003',
          tipo: TipoMovimientoCaja.INGRESO_VENTA_EFECTIVO,
          monto: 70000,
          fecha: atHour(fechaBase, 13, 55),
          medioPago: TipoPago.EFECTIVO,
          pagoId: pagoPorNumero['PAG-20260403-003'].id,
          clienteId: clientesPorCodigo['CLI-0003'].id,
          concepto: 'Ingreso por pago parcial de venta',
        },
      ]),
    );

    await movInventarioRepo.save(
      movInventarioRepo.create([
        { productoId: productosPorCodigo['PACA-250'].id, tipo: TipoMovimientoInventario.DESPACHO_ENTREGA, cantidad: 8, fecha: atHour(fechaBase, 12, 30), rutaId: rutaPrincipal.id, observaciones: 'Despacho en ruta (incluye devuelto)' },
        { productoId: productosPorCodigo['RECARGA-5L'].id, tipo: TipoMovimientoInventario.DESPACHO_ENTREGA, cantidad: 6, fecha: atHour(fechaBase, 12, 35), rutaId: rutaPrincipal.id, observaciones: 'Despacho entregado' },
        { productoId: productosPorCodigo['PACA-600'].id, tipo: TipoMovimientoInventario.DESPACHO_ENTREGA, cantidad: 3, fecha: atHour(fechaBase, 12, 40), rutaId: rutaPrincipal.id, observaciones: 'Despacho entregado' },
        { productoId: productosPorCodigo['BOTELLON-6L'].id, tipo: TipoMovimientoInventario.DESPACHO_ENTREGA, cantidad: 6, fecha: atHour(fechaBase, 12, 45), rutaId: rutaPrincipal.id, observaciones: 'Despacho entregado' },
        { productoId: productosPorCodigo['PACA-125'].id, tipo: TipoMovimientoInventario.DESPACHO_ENTREGA, cantidad: 5, fecha: atHour(fechaBase, 12, 50), rutaId: rutaPrincipal.id, observaciones: 'Despacho entregado' },
        { productoId: productosPorCodigo['RECARGA-6L'].id, tipo: TipoMovimientoInventario.DESPACHO_ENTREGA, cantidad: 5, fecha: atHour(fechaBase, 12, 55), rutaId: rutaPrincipal.id, observaciones: 'Despacho entregado' },
        { productoId: productosPorCodigo['PACA-250'].id, tipo: TipoMovimientoInventario.DEVOLUCION, cantidad: 4, fecha: atHour(fechaBase, 14, 10), rutaId: rutaPrincipal.id, observaciones: 'Devolucion por pedido reprogramado' },
      ]),
    );

    const liquidacion = await liquidacionRepo.save(
      liquidacionRepo.create({
        rutaId: rutaPrincipal.id,
        fecha: atHour(fechaBase, 15, 0),
        totalEntregado: 320000,
        totalRecaudado: 290000,
        totalCartera: 30000,
        diferencia: 0,
        observaciones: 'Ruta liquidada con un pedido reprogramado y pago parcial',
      }),
    );

    for (const venta of ventas) {
      venta.liquidacionRutaId = liquidacion.id;
      await ventaRepo.save(venta);
    }

    const laborDomiciliario = await trabajadorLaborRepo.save(
      trabajadorLaborRepo.create({
        trabajadorId: trabajadoresPorCodigo['TRAB-0002'].id,
        laborTarifaId: tarifaPorTrabajador[trabajadoresPorCodigo['TRAB-0002'].id].id,
        fecha: atHour(fechaBase, 16, 0),
        cantidadRealizado: 1,
        montoAPagar: 35000,
        observaciones: 'Jornada completa de ruta',
      }),
    );

    const valorHoraProduccion = 35000 / 8;
    const laborSebastian = await trabajadorLaborRepo.save(
      trabajadorLaborRepo.create({
        trabajadorId: trabajadoresPorCodigo['TRAB-0001'].id,
        laborTarifaId: tarifaPorTrabajador[trabajadoresPorCodigo['TRAB-0001'].id].id,
        fecha: atHour(fechaBase, 16, 10),
        cantidadRealizado: 2,
        montoAPagar: Number((2 * valorHoraProduccion).toFixed(2)),
        observaciones: 'Pago proporcional por 2 horas de produccion',
      }),
    );

    const laborPreventista = await trabajadorLaborRepo.save(
      trabajadorLaborRepo.create({
        trabajadorId: trabajadoresPorCodigo['TRAB-0003'].id,
        laborTarifaId: tarifaPorTrabajador[trabajadoresPorCodigo['TRAB-0003'].id].id,
        fecha: atHour(fechaBase, 16, 20),
        cantidadRealizado: 80,
        montoAPagar: 40000,
        observaciones: 'Preventista liquidado por paca entregada',
      }),
    );

    const prestamo = await anticipoRepo.save(
      anticipoRepo.create({
        numero: 'PREST-20260403-001',
        trabajadorId: trabajadoresPorCodigo['TRAB-0001'].id,
        tipo: TipoAnticipoPrestamo.PRESTAMO,
        monto: 150000,
        estado: EstadoAnticipoPrestamo.PAGADO_PARCIALMENTE,
        fecha: atHour(fechaBase, 11, 30),
        motivo: 'Prestamo personal registrado por administrador',
        observaciones: 'No se descuenta automaticamente',
      }),
    );

    const abono = await abonoRepo.save(
      abonoRepo.create({
        anticipoPrestamoId: prestamo.id,
        trabajadorId: trabajadoresPorCodigo['TRAB-0001'].id,
        monto: 30000,
        fecha: atHour(fechaBase, 17, 0),
        observaciones: 'Abono manual decidido por trabajador al momento de pago',
      }),
    );

    const pagosTrabajadores = await pagoTrabajadorRepo.save(
      pagoTrabajadorRepo.create([
        {
          numero: 'PT-20260403-001',
          trabajadorId: trabajadoresPorCodigo['TRAB-0001'].id,
          usuarioId: usuario.id,
          fecha: atHour(fechaBase, 17, 5),
          montoBase: 80000,
          descuentosAplicados: 0,
          abonoADeuda: abono.monto,
          montoEntregado: 50000,
          observaciones: 'Pago mixto: parte en mano y parte a deuda',
        },
        {
          numero: 'PT-20260403-002',
          trabajadorId: trabajadoresPorCodigo['TRAB-0002'].id,
          usuarioId: usuario.id,
          fecha: atHour(fechaBase, 17, 10),
          montoBase: laborDomiciliario.montoAPagar,
          descuentosAplicados: 0,
          abonoADeuda: 0,
          montoEntregado: laborDomiciliario.montoAPagar,
          observaciones: 'Pago de jornada domiciliario',
        },
        {
          numero: 'PT-20260403-003',
          trabajadorId: trabajadoresPorCodigo['TRAB-0003'].id,
          usuarioId: usuario.id,
          fecha: atHour(fechaBase, 17, 15),
          montoBase: laborPreventista.montoAPagar,
          descuentosAplicados: 0,
          abonoADeuda: 0,
          montoEntregado: laborPreventista.montoAPagar,
          observaciones: 'Liquidacion preventista por paca',
        },
      ]),
    );

    await movCajaRepo.save(
      movCajaRepo.create([
        {
          numero: 'MC-20260403-010',
          tipo: TipoMovimientoCaja.PRESTAMOS,
          monto: 150000,
          fecha: atHour(fechaBase, 11, 31),
          trabajadorId: trabajadoresPorCodigo['TRAB-0001'].id,
          concepto: 'Prestamo entregado a trabajador',
        },
        {
          numero: 'MC-20260403-011',
          tipo: TipoMovimientoCaja.PAGO_TRABAJADOR,
          monto: pagosTrabajadores[0].montoEntregado,
          fecha: atHour(fechaBase, 17, 6),
          trabajadorId: pagosTrabajadores[0].trabajadorId,
          concepto: 'Pago en mano trabajador permanente',
        },
        {
          numero: 'MC-20260403-012',
          tipo: TipoMovimientoCaja.PAGO_TRABAJADOR,
          monto: pagosTrabajadores[1].montoEntregado,
          fecha: atHour(fechaBase, 17, 11),
          trabajadorId: pagosTrabajadores[1].trabajadorId,
          concepto: 'Pago jornada domiciliario',
        },
        {
          numero: 'MC-20260403-013',
          tipo: TipoMovimientoCaja.PAGO_TRABAJADOR,
          monto: pagosTrabajadores[2].montoEntregado,
          fecha: atHour(fechaBase, 17, 16),
          trabajadorId: pagosTrabajadores[2].trabajadorId,
          concepto: 'Pago preventista por paca',
        },
      ]),
    );

    const cierreCaja = await cierreCajaRepo.save(
      cierreCajaRepo.create({
        fecha: fechaCierre,
        totalEfectivo: 170000,
        totalTransferencias: 120000,
        totalEgresos: 275000,
        saldoCalculado: 145000,
        saldoContado: 145000,
        diferencia: 0,
        diferenciasInventario: '[]',
        rutas: JSON.stringify([{ numero: rutaPrincipal.numero, estado: rutaPrincipal.estado }]),
        observaciones: 'Cierre de caja validado',
      }),
    );

    const cierreDiario = await cierreDiarioRepo.save(
      cierreDiarioRepo.create({
        fecha: fechaCierre,
        usuarioId: usuario.id,
        cierreCajaId: cierreCaja.id,
        rutasLiquidadas: true,
        pedidosFinalizados: true,
        inventarioContado: true,
        cajaCuadrada: true,
        trabajadoresPagados: true,
        observaciones: 'Cierre diario con datos operativos reales',
      }),
    );

    await cierreInventarioRepo.save(
      cierreInventarioRepo.create([
        {
          productoId: productosPorCodigo['PACA-125'].id,
          cierreDiarioId: cierreDiario.id,
          cantidadInicial: 50,
          cantidadProducida: 15,
          cantidadSalida: 5,
          cantidadDevoluciones: 0,
          cantidadEsperada: 60,
          cantidadContada: 60,
          diferencia: 0,
          observaciones: 'Sin diferencias',
        },
        {
          productoId: productosPorCodigo['PACA-250'].id,
          cierreDiarioId: cierreDiario.id,
          cantidadInicial: 60,
          cantidadProducida: 20,
          cantidadSalida: 8,
          cantidadDevoluciones: 4,
          cantidadEsperada: 76,
          cantidadContada: 76,
          diferencia: 0,
          observaciones: 'Incluye devolucion de pedido reprogramado',
        },
        {
          productoId: productosPorCodigo['PACA-600'].id,
          cierreDiarioId: cierreDiario.id,
          cantidadInicial: 40,
          cantidadProducida: 10,
          cantidadSalida: 3,
          cantidadDevoluciones: 0,
          cantidadEsperada: 47,
          cantidadContada: 47,
          diferencia: 0,
          observaciones: 'Sin diferencias',
        },
        {
          productoId: productosPorCodigo['RECARGA-5L'].id,
          cierreDiarioId: cierreDiario.id,
          cantidadInicial: 100,
          cantidadProducida: 30,
          cantidadSalida: 6,
          cantidadDevoluciones: 0,
          cantidadEsperada: 124,
          cantidadContada: 124,
          diferencia: 0,
          observaciones: 'Sin diferencias',
        },
        {
          productoId: productosPorCodigo['RECARGA-6L'].id,
          cierreDiarioId: cierreDiario.id,
          cantidadInicial: 80,
          cantidadProducida: 20,
          cantidadSalida: 5,
          cantidadDevoluciones: 0,
          cantidadEsperada: 95,
          cantidadContada: 95,
          diferencia: 0,
          observaciones: 'Sin diferencias',
        },
      ]),
    );

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEED COMPLETADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 Credenciales de acceso:');
    console.log('   Email: admin@jordan.local');
    console.log('   Contraseña: admin123456');
    console.log('');
    console.log('📌 Casos seed incluidos:');
    console.log('   - Pedido entregado + pago efectivo');
    console.log('   - Pedido entregado + pago transferencia');
    console.log('   - Pedido parcial con cartera');
    console.log('   - Pedido pendiente');
    console.log('   - Pedido devuelto y reprogramado con intentos multiples');
    console.log('   - Preventista liquidado por paca');
    console.log('   - Trabajador con prestamo y abono manual a deuda');
    console.log('   - Apertura y cierre diario completos');
    console.log('');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error en seed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();
