import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  categoria: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unidad: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
