import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AperturaDiaria,
  InventarioInicial,
  ProduccionDiaria,
  MovimientoInventario,
  CierreDiario,
  CierreCaja,
  CierreInventario,
  MovimientoCaja,
  Pedido,
  Ruta,
  Trabajador,
  TrabajadorLabor,
} from '../../database/entities';
import { DiarioController } from './diario.controller';
import { DiarioService } from './diario.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AperturaDiaria,
      InventarioInicial,
      ProduccionDiaria,
      MovimientoInventario,
      CierreDiario,
      CierreCaja,
      CierreInventario,
      MovimientoCaja,
      Pedido,
      Ruta,
      Trabajador,
      TrabajadorLabor,
    ]),
  ],
  controllers: [DiarioController],
  providers: [DiarioService],
  exports: [DiarioService],
})
export class DiarioModule {}
