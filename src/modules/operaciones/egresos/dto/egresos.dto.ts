import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsIn,
  Max,
} from 'class-validator';
import { TipoPago } from '../../../../common/enums';

export class RegistrarEgresoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999)
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
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(TipoPago)
  @IsIn([TipoPago.EFECTIVO, TipoPago.TRANSFERENCIA])
  medioPago?: TipoPago;

  @IsOptional()
  @IsString()
  search?: string;
}
