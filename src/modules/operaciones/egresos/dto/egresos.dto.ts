import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsIn,
} from 'class-validator';
import { TipoPago } from '../../../../common/enums';

export class RegistrarEgresoDto {
  @IsNumber()
  @IsPositive()
  monto: number;

  @IsString()
  concepto: string;

  @IsOptional()
  @IsEnum(TipoPago)
  @IsIn([TipoPago.EFECTIVO, TipoPago.TRANSFERENCIA])
  medioPago?: TipoPago;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class BuscarEgresosDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsEnum(TipoPago)
  @IsIn([TipoPago.EFECTIVO, TipoPago.TRANSFERENCIA])
  medioPago?: TipoPago;

  @IsOptional()
  @IsString()
  search?: string;
}
