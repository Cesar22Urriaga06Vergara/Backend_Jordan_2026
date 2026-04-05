import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TipoAnticipoPrestamo } from '../../../common/enums';

export class RegistrarLaborDto {
  @IsNumber()
  @IsPositive()
  trabajadorId: number;

  @IsNumber()
  @IsPositive()
  laborTarifaId: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  cantidadRealizado?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  montoAPagar?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class PagarTrabajadorDto {
  @IsNumber()
  @IsPositive()
  trabajadorId: number;

  @IsDateString()
  fecha: string;

  @IsNumber()
  @IsPositive()
  montoBase: number;

  @IsOptional()
  @IsNumber()
  descuentosAplicados?: number;

  @IsOptional()
  @IsNumber()
  abonoADeuda?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RegistrarAnticipoDto {
  @IsNumber()
  @IsPositive()
  trabajadorId: number;

  @IsEnum(TipoAnticipoPrestamo)
  tipo: TipoAnticipoPrestamo;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class AbonarDeudaDto {
  @IsNumber()
  @IsPositive()
  trabajadorId: number;

  @IsNumber()
  @IsPositive()
  anticipoPrestamoId: number;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
