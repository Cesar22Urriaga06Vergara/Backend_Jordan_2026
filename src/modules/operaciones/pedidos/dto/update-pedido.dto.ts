import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleActualizadoDto {
  @IsOptional()
  @IsNumber()
  id?: number; // ID del detalle existente, si es que existe

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

export class UpdatePedidoDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleActualizadoDto)
  detalles?: DetalleActualizadoDto[];

  @IsOptional()
  @IsBoolean()
  esDeRuta?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
