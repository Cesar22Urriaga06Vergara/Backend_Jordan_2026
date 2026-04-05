import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Pedido,
  DetallePedido,
  Ruta,
  ItemRuta,
  LiquidacionRuta,
  IntentoEntrega,
  Venta,
  DetalleVenta,
  Pago,
  Cartera,
  MovimientoCaja,
  MovimientoInventario,
  Cliente,
  Producto,
  Trabajador,
} from '../../database/entities';

import { PedidosController } from './pedidos/pedidos.controller';
import { PedidosService } from './pedidos/pedidos.service';

import { RutasController } from './rutas/rutas.controller';
import { RutasService } from './rutas/rutas.service';

import { VentasController } from './ventas/ventas.controller';
import { VentasService } from './ventas/ventas.service';
import { EgresosController } from './egresos/egresos.controller';
import { EgresosService } from './egresos/egresos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      DetallePedido,
      Ruta,
      ItemRuta,
      LiquidacionRuta,
      IntentoEntrega,
      Venta,
      DetalleVenta,
      Pago,
      Cartera,
      MovimientoCaja,
      MovimientoInventario,
      Cliente,
      Producto,
      Trabajador,
    ]),
  ],
  controllers: [PedidosController, RutasController, VentasController, EgresosController],
  providers: [PedidosService, RutasService, VentasService, EgresosService],
  exports: [PedidosService, RutasService, VentasService, EgresosService],
})
export class OperacionesModule {}
