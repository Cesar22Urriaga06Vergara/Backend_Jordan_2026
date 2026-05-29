import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventarioInicialItemDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999)
  cantidadInicial: number;
}

export class AbrirDiaDto {
  @IsDateString()
  fecha: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  saldoInicial: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventarioInicialItemDto)
  inventario: InventarioInicialItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ProduccionItemDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999)
  cantidad: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class RegistrarProduccionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProduccionItemDto)
  items: ProduccionItemDto[];
}

export class CierreInventarioItemDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999)
  cantidadContada: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CerrarDiaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  saldoContado: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CierreInventarioItemDto)
  inventario: CierreInventarioItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
