import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { TipoLabor, TipoTrabajador } from '../../../../common/enums';

export class UpdateTrabajadorDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsEnum(TipoTrabajador)
  tipoTrabajador?: TipoTrabajador;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsEnum(TipoLabor)
  @IsIn([TipoLabor.POR_JORNADA, TipoLabor.POR_HORA])
  modalidadPago?: TipoLabor;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valorPago?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  horasBase?: number;
}
