import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Producto,
  Cliente,
  PrecioCliente,
  Trabajador,
  TrabajadorTipo,
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
import { LaborTiposController } from './labor-tipos/labor-tipos.controller';
import { LaborTiposService } from './labor-tipos/labor-tipos.service';
import { TrabajadorTiposController } from './trabajador-tipos/trabajador-tipos.controller';
import { TrabajadorTiposService } from './trabajador-tipos/trabajador-tipos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      Cliente,
      PrecioCliente,
      Trabajador,
      TrabajadorTipo,
      LaborTarifa,
      LaborTipo,
      TrabajadorLabor,
      PagoTrabajador,
    ]),
  ],
  controllers: [
    ProductosController,
    ClientesController,
    TrabajadoresController,
    LaborTiposController,
    TrabajadorTiposController,
  ],
  providers: [
    ProductosService,
    ClientesService,
    TrabajadoresService,
    LaborTiposService,
    TrabajadorTiposService,
  ],
  exports: [
    ProductosService,
    ClientesService,
    TrabajadoresService,
    LaborTiposService,
    TrabajadorTiposService,
  ],
})
export class CatalogosModule {}
