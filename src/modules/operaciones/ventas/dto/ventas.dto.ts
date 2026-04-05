import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPago } from '../../../../common/enums';

export class DetalleVentaDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @IsPositive()
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
  @IsNumber()
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

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
