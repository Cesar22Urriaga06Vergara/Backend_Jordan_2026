import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class UpsertPrecioClienteDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber()
  @IsPositive()
  precioUnitario: number;

  @IsOptional()
  @IsDateString()
  vigenciaDesde?: string;

  @IsOptional()
  @IsDateString()
  vigenciaHasta?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
