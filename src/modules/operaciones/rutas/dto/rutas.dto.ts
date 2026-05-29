import { IsNumber, IsPositive, IsOptional, IsString, IsDateString, IsArray, IsBoolean, ValidateNested, IsIn, Min, Max } from 'class-validator';
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  totalEntregado: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  totalRecaudado: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  totalCartera: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-99999999)
  @Max(99999999)
  diferencia: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  efectivoRecibido?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
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
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsPositive()
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  montoEfectivo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999)
  montoTransferencia?: number;
}

export class CambioEstadoRutaDto {
  @IsString()
  estado: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
