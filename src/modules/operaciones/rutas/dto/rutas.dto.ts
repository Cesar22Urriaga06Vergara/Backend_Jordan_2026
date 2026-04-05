import { IsNumber, IsPositive, IsOptional, IsString, IsDateString, IsArray, IsBoolean, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRutaDto {
  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  domiciliarioId?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class AgregarPedidoRutaDto {
  @IsNumber()
  @IsPositive()
  pedidoId: number;

  @IsNumber()
  @IsPositive()
  ordenEntrega: number;
}

export class LiquidarRutaDto {
  @IsNumber()
  totalEntregado: number;

  @IsNumber()
  totalRecaudado: number;

  @IsNumber()
  totalCartera: number;

  @IsNumber()
  diferencia: number;

  @IsOptional()
  @IsNumber()
  efectivoRecibido?: number;

  @IsOptional()
  @IsNumber()
  transferenciaRecibida?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoEntregaDto)
  pedidos?: PedidoEntregaDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class PedidoEntregaDto {
  @IsNumber()
  pedidoId: number;

  @IsBoolean()
  entregado: boolean;

  @IsOptional()
  @IsBoolean()
  aCredito?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'AMBOS'])
  tipoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'AMBOS';

  @IsOptional()
  @IsNumber()
  montoEfectivo?: number;

  @IsOptional()
  @IsNumber()
  montoTransferencia?: number;
}

export class CambioEstadoRutaDto {
  @IsString()
  estado: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
