import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CurrentUser } from '../../common/decorators';

@Controller('inventarios')
export class InventarioController {
  constructor(private inventarioService: InventarioService) {}

  /**
   * GET /inventarios
   * Obtener lista de stock actual (paginado)
   */
  @Get()
  async obtenerTodos(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.inventarioService.obtenerTodos(parseInt(page), parseInt(limit));
  }

  /**
   * GET /inventarios/stock-bajo
   * Obtener productos con stock bajo (alertas)
   */
  @Get('stock-bajo')
  async obtenerStockBajo() {
    return this.inventarioService.obtenerStockBajo();
  }

  /**
   * GET /inventarios/estadisticas
   * Resumen de inventario
   */
  @Get('estadisticas')
  async obtenerEstadisticas() {
    return this.inventarioService.obtenerEstadisticas();
  }

  /**
   * GET /inventarios/:id
   * Obtener stock de un producto específico
   */
  @Get(':id')
  async obtenerPorProducto(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.obtenerPorProducto(id);
  }

  /**
   * PATCH /inventarios/:id/ajuste
   * Ajuste manual de stock
   * Body: { nuevaCantidad: number, razon: string }
   */
  @Patch(':id/ajuste')
  async ajusteManual(
    @Param('id', ParseIntPipe) productoId: number,
    @Body() dto: { nuevaCantidad: number; razon: string },
    @CurrentUser() user: any,
  ) {
    if (dto.nuevaCantidad === undefined || !dto.razon) {
      throw new HttpException(
        'nuevaCantidad y razon son requeridos',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.inventarioService.ajusteManual(
      productoId,
      dto.nuevaCantidad,
      dto.razon,
      user?.id,
    );
  }

  /**
   * PATCH /inventarios/:id/stock-minimo
   * Actualizar stock mínimo
   * Body: { nuevoMinimo: number }
   */
  @Patch(':id/stock-minimo')
  async actualizarStockMinimo(
    @Param('id', ParseIntPipe) productoId: number,
    @Body() dto: { nuevoMinimo: number },
  ) {
    if (dto.nuevoMinimo === undefined) {
      throw new HttpException(
        'nuevoMinimo es requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.inventarioService.actualizarStockMinimo(
      productoId,
      dto.nuevoMinimo,
    );
  }

  /**
   * GET /inventarios/:id/validar
   * Validar si hay stock suficiente
   * Query: cantidad
   */
  @Get(':id/validar')
  async validarStock(
    @Param('id', ParseIntPipe) productoId: number,
    @Query('cantidad', ParseIntPipe) cantidad: number,
  ) {
    const hay = await this.inventarioService.validarStock(productoId, cantidad);
    return { productoId, cantidad, hayStock: hay };
  }
}
