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
} from '../../database/entities';
import { TrabajadoresOpsController } from './trabajadores-ops.controller';
import { TrabajadoresOpsService } from './trabajadores-ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trabajador,
      TrabajadorLabor,
      LaborTarifa,
      PagoTrabajador,
      AnticipoPrestamo,
      AbonoDeuda,
      MovimientoCaja,
    ]),
  ],
  controllers: [TrabajadoresOpsController],
  providers: [TrabajadoresOpsService],
  exports: [TrabajadoresOpsService],
})
export class TrabajadoresOpsModule {}
