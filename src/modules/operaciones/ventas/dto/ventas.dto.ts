import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPago } from '../../../../common/enums';

export class DetalleVentaDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber({ maxDecimalPlaces: 0 })
  @IsPositive()
  @Max(999)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  precioUnitario: number;
}

export class CreateVentaDto {
  @IsNumber()
  @IsPositive()
  clienteId: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pedidoId?: number;

  @IsDateString()
  fecha: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];

  @IsOptional()
  @IsEnum(TipoPago)
  tipoPago?: TipoPago;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  montoPagado?: number;

  @IsOptional()
  @IsString()
  referenciaPago?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RegistrarPagoVentaDto {
  @IsEnum(TipoPago)
  tipo: TipoPago;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999)
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
