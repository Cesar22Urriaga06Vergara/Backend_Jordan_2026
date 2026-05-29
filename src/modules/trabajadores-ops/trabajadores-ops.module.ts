import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Trabajador,
  TrabajadorLabor,
  LaborTarifa,
  PagoTrabajador,
  AnticipoPrestamo,
  AbonoDeuda,
  MovimientoCaja,
  LaborTipo,
} from '../../database/entities';
import { TrabajadoresOpsController } from './trabajadores-ops.controller';
import { TrabajadoresOpsService } from './trabajadores-ops.service';
import { CatalogosModule } from '../catalogos/catalogos.module';

@Module({
  imports: [
    CatalogosModule,
    TypeOrmModule.forFeature([
      Trabajador,
      TrabajadorLabor,
      LaborTarifa,
      PagoTrabajador,
      AnticipoPrestamo,
      AbonoDeuda,
      MovimientoCaja,
      LaborTipo,
    ]),
  ],
  controllers: [TrabajadoresOpsController],
  providers: [TrabajadoresOpsService],
  exports: [TrabajadoresOpsService],
})
export class TrabajadoresOpsModule {}
