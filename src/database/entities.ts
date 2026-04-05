import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  OneToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import {
  EstadoPedido,
  EstadoRuta,
  EstadoIntentoEntrega,
  TipoPago,
  EstadoVenta,
  TipoCliente,
  TipoLabor,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
  TipoAnticipoPrestamo,
  EstadoAnticipoPrestamo,
  TipoTrabajador,
} from '@/common/enums';

// ============================================================================
// AUTENTICACION Y USUARIOS
// ============================================================================

@Entity('usuarios')
@Index(['estado'])
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  nombre: string;

  @Column()
  password: string;

  @Column({ default: 'ACTIVO', type: 'varchar' })
  estado: string;

  @Column({ default: 'ADMIN', type: 'varchar' })
  rol: string;

  @OneToMany(() => CambioAuditoria, (cambio) => cambio.usuario)
  cambiosAuditoria: CambioAuditoria[];

  @OneToMany(() => LogActividad, (log) => log.usuario)
  logsActividad: LogActividad[];

  @OneToMany(() => PagoTrabajador, (pago) => pago.usuario)
  pagos: PagoTrabajador[];

  @OneToMany(() => CierreDiario, (cierre) => cierre.usuario)
  cierres: CierreDiario[];

  @OneToMany(() => AperturaDiaria, (apertura) => apertura.usuario)
  aperturasDiarias: AperturaDiaria[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

// ============================================================================
// CATALOGOS: PRODUCTOS
// ============================================================================

@Entity('productos')
@Index(['activo'])
@Index(['categoria'])
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column()
  categoria: string;

  @Column()
  unidad: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => PrecioCliente, (precio) => precio.producto)
  preciosCliente: PrecioCliente[];

  @OneToMany(() => DetallePedido, (detalle) => detalle.producto)
  detallesPedido: DetallePedido[];

  @OneToMany(() => DetalleVenta, (detalle) => detalle.producto)
  detallesVenta: DetalleVenta[];

  @OneToMany(() => MovimientoInventario, (movimiento) => movimiento.producto)
  movimientosInv: MovimientoInventario[];

  @OneToMany(() => ProduccionDiaria, (produccion) => produccion.producto)
  produccion: ProduccionDiaria[];

  @OneToMany(() => InventarioInicial, (inventario) => inventario.producto)
  inventarioInicial: InventarioInicial[];

  @OneToMany(() => CierreInventario, (cierre) => cierre.producto)
  cierreInventario: CierreInventario[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// CATALOGOS: CLIENTES
// ============================================================================

@Entity('clientes')
@Index(['activo'])
@Index(['tipo'])
@Index(['nombre'])
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nombre: string;

  @Column({
    type: 'enum',
    enum: TipoCliente,
  })
  tipo: TipoCliente;

  @Column({ nullable: true })
  cedula: string;

  @Column({ nullable: true })
  nit: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  vereda: string;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => PrecioCliente, (precio) => precio.cliente)
  preciosPersonalizados: PrecioCliente[];

  @OneToMany(() => Pedido, (pedido) => pedido.cliente)
  pedidos: Pedido[];

  @OneToMany(() => Venta, (venta) => venta.cliente)
  ventas: Venta[];

  @OneToMany(() => Pago, (pago) => pago.cliente)
  pagos: Pago[];

  @OneToMany(() => Cartera, (cartera) => cartera.cliente)
  carteras: Cartera[];

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.cliente)
  movimientosCaja: MovimientoCaja[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('precios_cliente')
@Index(['clienteId'])
@Index(['productoId'])
@Index(['activo'])
@Unique(['clienteId', 'productoId'])
export class PrecioCliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clienteId: number;

  @Column()
  productoId: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ nullable: true })
  vigenciaDesde: Date;

  @Column({ nullable: true })
  vigenciaHasta: Date;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Cliente, (cliente) => cliente.preciosPersonalizados, {
    onDelete: 'CASCADE',
  })
  cliente: Cliente;

  @ManyToOne(() => Producto, (producto) => producto.preciosCliente, {
    onDelete: 'CASCADE',
  })
  producto: Producto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// CATALOGOS: TRABAJADORES Y LABORES
// ============================================================================

@Entity('trabajadores')
@Index(['activo'])
@Index(['tipoTrabajador'])
export class Trabajador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  cedula: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({
    type: 'enum',
    enum: TipoTrabajador,
    default: TipoTrabajador.PERMANENTE,
  })
  tipoTrabajador: TipoTrabajador;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  saldoTotal: number;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => TrabajadorLabor, (labor) => labor.trabajador)
  laboresAsignadas: TrabajadorLabor[];

  @OneToMany(() => LaborTarifa, (tarifa) => tarifa.trabajador)
  laboresDisponibles: LaborTarifa[];

  @OneToMany(() => PagoTrabajador, (pago) => pago.trabajador)
  pagos: PagoTrabajador[];

  @OneToMany(() => AnticipoPrestamo, (anticipo) => anticipo.trabajador)
  anticiposPresta: AnticipoPrestamo[];

  @OneToMany(() => AbonoDeuda, (abono) => abono.trabajador)
  abonos: AbonoDeuda[];

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.trabajador)
  movimientosCaja: MovimientoCaja[];

  @OneToMany(() => Ruta, (ruta) => ruta.domiciliario)
  rutas: Ruta[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('labor_tipo')
@Index(['activo'])
export class LaborTipo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({
    type: 'enum',
    enum: TipoLabor,
  })
  tipo: TipoLabor;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => LaborTarifa, (tarifa) => tarifa.laborTipo)
  tarifas: LaborTarifa[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('labor_tarifa')
@Index(['trabajadorId'])
@Index(['laborTipoId'])
@Index(['activo'])
@Unique(['trabajadorId', 'laborTipoId'])
export class LaborTarifa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  trabajadorId: number;

  @Column()
  laborTipoId: number;

  @Column('decimal', { precision: 12, scale: 2 })
  tarifa: number;

  @Column({ nullable: true })
  horas: number;

  @Column({ nullable: true })
  unidad: string;

  @Column({ nullable: true })
  vigenciaDesde: Date;

  @Column({ nullable: true })
  vigenciaHasta: Date;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.laboresDisponibles, {
    onDelete: 'CASCADE',
  })
  trabajador: Trabajador;

  @ManyToOne(() => LaborTipo, (laborTipo) => laborTipo.tarifas, {
    onDelete: 'RESTRICT',
  })
  laborTipo: LaborTipo;

  @OneToMany(() => TrabajadorLabor, (labor) => labor.laborTarifa)
  laboresdel: TrabajadorLabor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: PEDIDOS
// ============================================================================

@Entity('pedidos')
@Index(['clienteId'])
@Index(['estado'])
@Index(['fecha'])
@Index(['rutaId'])
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column()
  clienteId: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({
    type: 'enum',
    enum: EstadoPedido,
    default: EstadoPedido.PENDIENTE,
  })
  estado: EstadoPedido;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ nullable: true })
  razonCancelacion: string;

  @Column({ nullable: true })
  razonReprogramacion: string;

  @Column({ type: 'datetime', nullable: true })
  fechaReprogramacion: Date;

  @Column({ default: false })
  esDeRuta: boolean;

  @Column({ nullable: true })
  rutaId: number;

  @ManyToOne(() => Cliente, (cliente) => cliente.pedidos, {
    onDelete: 'RESTRICT',
  })
  cliente: Cliente;

  @ManyToOne(() => Ruta, (ruta) => ruta.pedidos, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  ruta: any;

  @OneToMany(() => DetallePedido, (detalle) => detalle.pedido)
  detalles: DetallePedido[];

  @OneToMany(() => ItemRuta, (item) => item.pedido)
  itemsRuta: ItemRuta[];

  @OneToMany(() => IntentoEntrega, (intento) => intento.pedido)
  intentosentrega: IntentoEntrega[];

  @OneToMany(() => Venta, (venta) => venta.pedido)
  ventas: Venta[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('detalle_pedido')
@Index(['pedidoId'])
@Index(['productoId'])
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pedidoId: number;

  @Column()
  productoId: number;

  @Column()
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precioUnitario: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.detalles, {
    onDelete: 'CASCADE',
  })
  pedido: Pedido;

  @ManyToOne(() => Producto, (producto) => producto.detallesPedido, {
    onDelete: 'RESTRICT',
  })
  producto: Producto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: RUTAS Y ENTREGAS
// ============================================================================

@Entity('rutas')
@Index(['estado'])
@Index(['fecha'])
@Index(['domiciliarioId'])
export class Ruta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({
    type: 'enum',
    enum: EstadoRuta,
    default: EstadoRuta.CREADA,
  })
  estado: EstadoRuta;

  @Column({ nullable: true })
  domiciliarioId: number;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.rutas, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  domiciliario: Trabajador;

  @OneToMany(() => Pedido, (pedido) => pedido.ruta)
  pedidos: Pedido[];

  @OneToMany(() => ItemRuta, (item) => item.ruta)
  itemsRuta: ItemRuta[];

  @OneToMany(() => IntentoEntrega, (intento) => intento.ruta)
  intentosEntrega: IntentoEntrega[];

  @OneToOne(() => LiquidacionRuta, (liquidacion) => liquidacion.ruta)
  liquidacion: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('item_ruta')
@Index(['rutaId'])
@Index(['pedidoId'])
@Unique(['rutaId', 'pedidoId'])
export class ItemRuta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rutaId: number;

  @Column()
  pedidoId: number;

  @Column()
  ordenEntrega: number;

  @Column({
    type: 'enum',
    enum: EstadoPedido,
    default: EstadoPedido.PENDIENTE,
  })
  estado: EstadoPedido;

  @ManyToOne(() => Ruta, (ruta) => ruta.itemsRuta, {
    onDelete: 'CASCADE',
  })
  ruta: Ruta;

  @ManyToOne(() => Pedido, (pedido) => pedido.itemsRuta, {
    onDelete: 'CASCADE',
  })
  pedido: Pedido;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('intento_entrega')
@Index(['rutaId'])
@Index(['pedidoId'])
@Index(['fecha'])
@Index(['estado'])
export class IntentoEntrega {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rutaId: number;

  @Column()
  pedidoId: number;

  @Column()
  numero: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({
    type: 'enum',
    enum: EstadoIntentoEntrega,
  })
  estado: EstadoIntentoEntrega;

  @Column({ nullable: true })
  razon: string;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Ruta, (ruta) => ruta.intentosEntrega, {
    onDelete: 'CASCADE',
  })
  ruta: Ruta;

  @ManyToOne(() => Pedido, (pedido) => pedido.intentosentrega, {
    onDelete: 'CASCADE',
  })
  pedido: Pedido;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('liquidacion_ruta')
export class LiquidacionRuta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  rutaId: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  totalEntregado: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalRecaudado: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalCartera: number;

  @Column('decimal', { precision: 12, scale: 2 })
  diferencia: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  efectivoRecibido: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  transferenciaRecibida: number;

  @Column({ nullable: true })
  observaciones: string;

  @OneToOne(() => Ruta, (ruta) => ruta.liquidacion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rutaId' })
  ruta: Ruta;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: VENTAS Y PAGOS
// ============================================================================

@Entity('ventas')
@Index(['clienteId'])
@Index(['estado'])
@Index(['fecha'])
@Index(['pedidoId'])
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column()
  clienteId: number;

  @Column({ nullable: true })
  pedidoId: number;

  @Column({ nullable: true })
  liquidacionRutaId: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
  })
  estado: EstadoVenta;

  @Column('decimal', { precision: 12, scale: 2 })
  totalVenta: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalPagado: number;

  @Column('decimal', { precision: 12, scale: 2 })
  saldoPendiente: number;

  @ManyToOne(() => Cliente, (cliente) => cliente.ventas, {
    onDelete: 'RESTRICT',
  })
  cliente: Cliente;

  @ManyToOne(() => Pedido, (pedido) => pedido.ventas, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  pedido: Pedido;

  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta)
  detalles: DetalleVenta[];

  @OneToMany(() => Pago, (pago) => pago.venta)
  pagos: Pago[];

  @OneToOne(() => Cartera, (cartera) => cartera.venta)
  cartera: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('detalle_venta')
@Index(['ventaId'])
@Index(['productoId'])
export class DetalleVenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ventaId: number;

  @Column()
  productoId: number;

  @Column()
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precioUnitario: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Venta, (venta) => venta.detalles, {
    onDelete: 'CASCADE',
  })
  venta: Venta;

  @ManyToOne(() => Producto, (producto) => producto.detallesVenta, {
    onDelete: 'RESTRICT',
  })
  producto: Producto;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('pagos')
@Index(['ventaId'])
@Index(['clienteId'])
@Index(['tipo'])
@Index(['fecha'])
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column()
  ventaId: number;

  @Column()
  clienteId: number;

  @Column({
    type: 'enum',
    enum: TipoPago,
  })
  tipo: TipoPago;

  @Column('decimal', { precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ nullable: true })
  referencia: string;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Venta, (venta) => venta.pagos, {
    onDelete: 'CASCADE',
  })
  venta: Venta;

  @ManyToOne(() => Cliente, (cliente) => cliente.pagos, {
    onDelete: 'RESTRICT',
  })
  cliente: Cliente;

  @OneToOne(() => MovimientoCaja, (movimiento) => movimiento.pago)
  movimientoCaja: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('cartera')
@Index(['clienteId'])
@Index(['saldoPendiente'])
export class Cartera {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clienteId: number;

  @Column({ unique: true })
  ventaId: number;

  @Column('decimal', { precision: 12, scale: 2 })
  saldoPendiente: number;

  @Column({ default: 0 })
  diasMora: number;

  @Column({ type: 'datetime' })
  ultimoMovimiento: Date;

  @ManyToOne(() => Cliente, (cliente) => cliente.carteras, {
    onDelete: 'RESTRICT',
  })
  cliente: Cliente;

  @OneToOne(() => Venta, (venta) => venta.cartera, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: CAJA
// ============================================================================

@Entity('movimiento_caja')
@Index(['tipo'])
@Index(['fecha'])
@Index(['pagoId'])
@Index(['clienteId'])
@Index(['trabajadorId'])
export class MovimientoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column({
    type: 'enum',
    enum: TipoMovimientoCaja,
  })
  tipo: TipoMovimientoCaja;

  @Column('decimal', { precision: 12, scale: 2 })
  monto: number;

  @Column({
    type: 'enum',
    enum: TipoPago,
    nullable: true,
  })
  medioPago: TipoPago;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ nullable: true })
  pagoId: number;

  @Column({ nullable: true })
  clienteId: number;

  @Column({ nullable: true })
  trabajadorId: number;

  @Column()
  concepto: string;

  @Column({ nullable: true })
  referencia: string;

  @Column({ nullable: true })
  observaciones: string;

  @OneToOne(() => Pago, (pago) => pago.movimientoCaja, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  pago: Pago;

  @ManyToOne(() => Cliente, (cliente) => cliente.movimientosCaja, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  cliente: Cliente;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.movimientosCaja, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  trabajador: Trabajador;

  @ManyToOne(() => CierreCaja, (cierre) => cierre.movimientosIncluidos, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  cierreCaja: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('cierre_caja')
export class CierreCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'datetime' })
  fecha: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  totalEfectivo: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalTransferencias: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalEgresos: number;

  @Column('decimal', { precision: 12, scale: 2 })
  saldoCalculado: number;

  @Column('decimal', { precision: 12, scale: 2 })
  saldoContado: number;

  @Column('decimal', { precision: 12, scale: 2 })
  diferencia: number;

  @Column({ nullable: true, type: 'text' })
  diferenciasInventario: string;

  @Column({ nullable: true, type: 'text' })
  rutas: string;

  @Column({ nullable: true })
  observaciones: string;

  @OneToMany(() => MovimientoCaja, (movimiento) => movimiento.cierreCaja)
  movimientosIncluidos: MovimientoCaja[];

  @OneToOne(() => CierreDiario, (cierre) => cierre.cierreCaja)
  cierreDiario: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: INVENTARIO
// ============================================================================

@Entity('inventario_inicial')
@Index(['productoId'])
@Index(['aperturaDiariaId'])
@Unique(['productoId', 'aperturaDiariaId'])
export class InventarioInicial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column()
  aperturaDiariaId: number;

  @Column()
  cantidadInicial: number;

  @ManyToOne(() => Producto, (producto) => producto.inventarioInicial, {
    onDelete: 'RESTRICT',
  })
  producto: Producto;

  @ManyToOne(() => AperturaDiaria, (apertura) => apertura.inventariosInicial, {
    onDelete: 'CASCADE',
  })
  aperturaDiaria: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('movimiento_inventario')
@Index(['productoId'])
@Index(['tipo'])
@Index(['fecha'])
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column({
    type: 'enum',
    enum: TipoMovimientoInventario,
  })
  tipo: TipoMovimientoInventario;

  @Column()
  cantidad: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ nullable: true })
  ventaId: number;

  @Column({ nullable: true })
  rutaId: number;

  @Column({ nullable: true })
  produccionId: number;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Producto, (producto) => producto.movimientosInv, {
    onDelete: 'RESTRICT',
  })
  producto: Producto;

  @ManyToOne(() => ProduccionDiaria, (produccion) => produccion.movimientosInv, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  produccion: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('cierre_inventario')
@Index(['productoId'])
@Index(['cierreDiarioId'])
@Unique(['productoId', 'cierreDiarioId'])
export class CierreInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column()
  cierreDiarioId: number;

  @Column()
  cantidadInicial: number;

  @Column({ default: 0 })
  cantidadProducida: number;

  @Column({ default: 0 })
  cantidadSalida: number;

  @Column({ default: 0 })
  cantidadDevoluciones: number;

  @Column()
  cantidadEsperada: number;

  @Column()
  cantidadContada: number;

  @Column()
  diferencia: number;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Producto, (producto) => producto.cierreInventario, {
    onDelete: 'RESTRICT',
  })
  producto: Producto;

  @ManyToOne(() => CierreDiario, (cierre) => cierre.cierreInventario, {
    onDelete: 'CASCADE',
  })
  cierreDiario: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: PRODUCCION
// ============================================================================

@Entity('produccion_diaria')
@Index(['productoId'])
@Index(['aperturaDiariaId'])
@Unique(['productoId', 'aperturaDiariaId'])
export class ProduccionDiaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column()
  aperturaDiariaId: number;

  @Column()
  cantidad: number;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Producto, (producto) => producto.produccion, {
    onDelete: 'RESTRICT',
  })
  producto: Producto;

  @ManyToOne(() => AperturaDiaria, (apertura) => apertura.producciondiaria, {
    onDelete: 'CASCADE',
  })
  aperturaDiaria: any;

  @OneToMany(() => MovimientoInventario, (movimiento) => movimiento.produccion)
  movimientosInv: MovimientoInventario[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: DIARIO (Apertura y Cierre)
// ============================================================================

@Entity('apertura_diaria')
@Index(['usuarioId'])
export class AperturaDiaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'datetime' })
  fecha: Date;

  @Column()
  usuarioId: number;

  @Column('decimal', { precision: 12, scale: 2 })
  saldoInicial: number;

  @Column({ nullable: true })
  observaciones: string;

  @OneToMany(() => InventarioInicial, (inventario) => inventario.aperturaDiaria)
  inventariosInicial: InventarioInicial[];

  @OneToMany(() => ProduccionDiaria, (produccion) => produccion.aperturaDiaria)
  producciondiaria: ProduccionDiaria[];

  @ManyToOne(() => Usuario, (usuario) => usuario.aperturasDiarias, {
    onDelete: 'RESTRICT',
  })
  usuario: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('cierre_diario')
@Index(['usuarioId'])
export class CierreDiario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'datetime' })
  fecha: Date;

  @Column()
  usuarioId: number;

  @Column({ unique: true })
  cierreCajaId: number;

  @Column({ default: false })
  rutasLiquidadas: boolean;

  @Column({ default: false })
  pedidosFinalizados: boolean;

  @Column({ default: false })
  inventarioContado: boolean;

  @Column({ default: false })
  cajaCuadrada: boolean;

  @Column({ default: false })
  trabajadoresPagados: boolean;

  @Column({ nullable: true })
  observaciones: string;

  @OneToOne(() => CierreCaja, (cierreCaja) => cierreCaja.cierreDiario, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cierreCajaId' })
  cierreCaja: CierreCaja;

  @OneToMany(() => CierreInventario, (cierre) => cierre.cierreDiario)
  cierreInventario: CierreInventario[];

  @ManyToOne(() => Usuario, (usuario) => usuario.cierres, {
    onDelete: 'RESTRICT',
  })
  usuario: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// OPERATIVO: TRABAJADORES - LABORES Y PAGOS
// ============================================================================

@Entity('trabajador_labor')
@Index(['trabajadorId'])
@Index(['laborTarifaId'])
@Index(['fecha'])
export class TrabajadorLabor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  trabajadorId: number;

  @Column()
  laborTarifaId: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ nullable: true })
  cantidadRealizado: number;

  @Column('decimal', { precision: 12, scale: 2 })
  montoAPagar: number;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.laboresAsignadas, {
    onDelete: 'CASCADE',
  })
  trabajador: Trabajador;

  @ManyToOne(() => LaborTarifa, (tarifa) => tarifa.laboresdel, {
    onDelete: 'RESTRICT',
  })
  laborTarifa: LaborTarifa;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('pago_trabajador')
@Index(['trabajadorId'])
@Index(['usuarioId'])
@Index(['fecha'])
export class PagoTrabajador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column()
  trabajadorId: number;

  @Column()
  usuarioId: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  montoBase: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  descuentosAplicados: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  abonoADeuda: number;

  @Column('decimal', { precision: 12, scale: 2 })
  montoEntregado: number;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.pagos, {
    onDelete: 'CASCADE',
  })
  trabajador: Trabajador;

  @ManyToOne(() => Usuario, (usuario) => usuario.pagos, {
    onDelete: 'RESTRICT',
  })
  usuario: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('anticipo_prestamo')
@Index(['trabajadorId'])
@Index(['estado'])
@Index(['tipo'])
export class AnticipoPrestamo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: string;

  @Column()
  trabajadorId: number;

  @Column({
    type: 'enum',
    enum: TipoAnticipoPrestamo,
  })
  tipo: TipoAnticipoPrestamo;

  @Column('decimal', { precision: 12, scale: 2 })
  monto: number;

  @Column({
    type: 'enum',
    enum: EstadoAnticipoPrestamo,
    default: EstadoAnticipoPrestamo.ACTIVO,
  })
  estado: EstadoAnticipoPrestamo;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ nullable: true })
  motivo: string;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.anticiposPresta, {
    onDelete: 'CASCADE',
  })
  trabajador: Trabajador;

  @OneToMany(() => AbonoDeuda, (abono) => abono.anticipoPrestamo)
  abonos: AbonoDeuda[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('abono_deuda')
@Index(['anticipoPrestamoId'])
@Index(['trabajadorId'])
@Index(['fecha'])
export class AbonoDeuda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  anticipoPrestamoId: number;

  @Column()
  trabajadorId: number;

  @Column('decimal', { precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ nullable: true })
  observaciones: string;

  @ManyToOne(() => AnticipoPrestamo, (anticipo) => anticipo.abonos, {
    onDelete: 'CASCADE',
  })
  anticipoPrestamo: AnticipoPrestamo;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.abonos, {
    onDelete: 'CASCADE',
  })
  trabajador: Trabajador;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ============================================================================
// AUDITORIA
// ============================================================================

@Entity('cambio_auditoria')
@Index(['usuarioId'])
@Index(['entidad'])
@Index(['registroId'])
@Index(['fecha'])
export class CambioAuditoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @Column()
  entidad: string;

  @Column()
  registroId: number;

  @Column()
  campo: string;

  @Column({ nullable: true })
  valorAnterior: string;

  @Column({ nullable: true })
  valorNuevo: string;

  @Column({ nullable: true })
  razonCambio: string;

  @Column({ type: 'datetime' })
  fecha: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.cambiosAuditoria, {
    onDelete: 'RESTRICT',
  })
  usuario: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('log_actividad')
@Index(['usuarioId'])
@Index(['accion'])
@Index(['fecha'])
export class LogActividad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  usuarioId: number;

  @Column()
  accion: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ type: 'datetime' })
  fecha: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.logsActividad, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  usuario: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
