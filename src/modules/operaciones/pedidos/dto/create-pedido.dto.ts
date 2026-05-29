import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetallePedidoDto {
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

export class CreatePedidoDto {
  @IsNumber()
  @IsPositive()
  clienteId: number;

  @IsDateString()
  fecha: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetallePedidoDto)
  detalles: DetallePedidoDto[];

  @IsOptional()
  @IsBoolean()
  esDeRuta?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
