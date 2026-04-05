import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { EstadoPedido } from '../../../../common/enums';

export class CambioEstadoPedidoDto {
  @IsEnum(EstadoPedido)
  estado: EstadoPedido;

  @IsOptional()
  @IsString()
  razonCancelacion?: string;

  @IsOptional()
  @IsString()
  razonReprogramacion?: string;

  @IsOptional()
  @IsDateString()
  fechaReprogramacion?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
