import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Producto,
  Cliente,
  PrecioCliente,
  Trabajador,
  LaborTarifa,
  LaborTipo,
  TrabajadorLabor,
  PagoTrabajador,
} from '../../database/entities';

import { ProductosController } from './productos/productos.controller';
import { ProductosService } from './productos/productos.service';

import { ClientesController } from './clientes/clientes.controller';
import { ClientesService } from './clientes/clientes.service';

import { TrabajadoresController } from './trabajadores/trabajadores.controller';
import { TrabajadoresService } from './trabajadores/trabajadores.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      Cliente,
      PrecioCliente,
      Trabajador,
      LaborTarifa,
      LaborTipo,
      TrabajadorLabor,
      PagoTrabajador,
    ]),
  ],
  controllers: [ProductosController, ClientesController, TrabajadoresController],
  providers: [ProductosService, ClientesService, TrabajadoresService],
  exports: [ProductosService, ClientesService, TrabajadoresService],
})
export class CatalogosModule {}
