import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  Min,
  Max,
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

  @IsNumber({ maxDecimalPlaces: 0 })
  @IsPositive()
  @Max(999)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
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
