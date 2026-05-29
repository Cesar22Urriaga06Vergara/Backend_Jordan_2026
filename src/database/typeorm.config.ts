import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import {
  Usuario,
  Producto,
  Cliente,
  PrecioCliente,
  Trabajador,
  TrabajadorTipo,
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
  CierreCaja,
  InventarioInicial,
  MovimientoInventario,
  CierreInventario,
  Inventario,
  ProduccionDiaria,
  AperturaDiaria,
  CierreDiario,
  TrabajadorLabor,
  PagoTrabajador,
  AnticipoPrestamo,
  AbonoDeuda,
  CambioAuditoria,
  LogActividad,
  ConfiguracionEmpresa,
  SecuenciaConsecutivo,
} from './entities';
import { AddLiquidacionRutaForeignKey1704067200000 } from './migrations/1704067200000-AddLiquidacionRutaForeignKey';
import { CreateInventorioAndAuditTables1714876800000 } from './migrations/1714876800000-CreateInventorioAndAuditTables';
import { AddCompositeIndexes1779206400000 } from './migrations/1779206400000-AddCompositeIndexes';
import { ImplementSoftDelete1789292800000 } from './migrations/1789292800000-ImplementSoftDelete';
import { CreateConsecutivoSequences1789977600000 } from './migrations/1789977600000-CreateConsecutivoSequences';
import { AddTrabajadorCargo1790064000000 } from './migrations/1790064000000-AddTrabajadorCargo';
import { AddTrabajadorTipos1790150400000 } from './migrations/1790150400000-AddTrabajadorTipos';
import { AddUniqueVentaPedido1790246400000 } from './migrations/1790246400000-AddUniqueVentaPedido';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const synchronize =
  process.env.DB_SYNCHRONIZE === 'true' &&
  process.env.ALLOW_TYPEORM_SYNC === 'true' &&
  process.env.NODE_ENV !== 'production';

const dbSsl = process.env.DB_SSL === 'true';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    Usuario,
    Producto,
    Cliente,
    PrecioCliente,
    Trabajador,
    TrabajadorTipo,
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
    CierreCaja,
    InventarioInicial,
    MovimientoInventario,
    CierreInventario,
    Inventario,
    ProduccionDiaria,
    AperturaDiaria,
    CierreDiario,
    TrabajadorLabor,
    PagoTrabajador,
    AnticipoPrestamo,
    AbonoDeuda,
    CambioAuditoria,
    LogActividad,
    ConfiguracionEmpresa,
    SecuenciaConsecutivo,
  ],
  migrations: [
    AddLiquidacionRutaForeignKey1704067200000,
    CreateInventorioAndAuditTables1714876800000,
    AddCompositeIndexes1779206400000,
    ImplementSoftDelete1789292800000,
    CreateConsecutivoSequences1789977600000,
    AddTrabajadorCargo1790064000000,
    AddTrabajadorTipos1790150400000,
    AddUniqueVentaPedido1790246400000,
  ],
  synchronize,
  logging: process.env.NODE_ENV === 'development',
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '5', 10),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY_MS || '3000', 10),
  extra: {
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
    ...(dbSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
  dropSchema: false,
};
