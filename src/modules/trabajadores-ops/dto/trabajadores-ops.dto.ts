import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { TipoAnticipoPrestamo } from '../../../common/enums';

export class RegistrarLaborDto {
  @IsNumber()
  @IsPositive()
  trabajadorId: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  laborTarifaId?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  laborTipoId?: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999)
  cantidadRealizado?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  montoAPagar?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999)
  valorUnitario?: number;

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

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999)
  montoBase: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  descuentosAplicados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
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

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999)
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

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999)
  monto: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
