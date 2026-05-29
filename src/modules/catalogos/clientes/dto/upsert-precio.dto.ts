import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class UpsertPrecioClienteDto {
  @IsNumber()
  @IsPositive()
  productoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
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
