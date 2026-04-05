import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventarioInicialItemDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber()
  @IsPositive()
  cantidadInicial: number;
}

export class AbrirDiaDto {
  @IsDateString()
  fecha: string;

  @IsNumber()
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

  @IsNumber()
  @IsPositive()
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

  @IsNumber()
  cantidadContada: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CerrarDiaDto {
  @IsNumber()
  saldoContado: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CierreInventarioItemDto)
  inventario: CierreInventarioItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
