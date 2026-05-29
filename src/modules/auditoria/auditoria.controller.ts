import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private auditoriaService: AuditoriaService) {}

  /**
   * GET /auditoria/cambios
   * Obtener todos los cambios registrados (con filtros)
   */
  @Get('cambios')
  async obtenerTodos(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('entidad') entidad?: string,
    @Query('accion') accion?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const filtros = {
      entidad,
      accion,
      usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    };

    return this.auditoriaService.obtenerTodos(
      parseInt(page),
      parseInt(limit),
      filtros,
    );
  }

  /**
   * GET /auditoria/cambios-por-entidad/:entidad/:entidadId
   * Obtener cambios de una entidad específica (ej: Pedido #5)
   */
  @Get('cambios-por-entidad/:entidad/:entidadId')
  async obtenerCambiosPorEntidad(
    @Param('entidad') entidad: string,
    @Param('entidadId', ParseIntPipe) entidadId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.auditoriaService.obtenerCambiosPorEntidad(
      entidad,
      entidadId,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * GET /auditoria/cambios-recientes
   * Obtener cambios recientes (últimas 24 horas por defecto)
   */
  @Get('cambios-recientes')
  async obtenerCambiosRecientes(
    @Query('horasAtras') horasAtras = '24',
    @Query('limit') limit = '100',
  ) {
    return this.auditoriaService.obtenerCambiosRecientes(
      parseInt(horasAtras),
      parseInt(limit),
    );
  }

  /**
   * GET /auditoria/resumen-por-entidad
   * Resumen: cuántos cambios por cada tipo de entidad
   */
  @Get('resumen-por-entidad')
  async obtenerResumenPorEntidad() {
    return this.auditoriaService.obtenerResumenPorEntidad();
  }

  /**
   * GET /auditoria/actividad-por-usuario
   * Resumen: cuántos cambios hizo cada usuario
   */
  @Get('actividad-por-usuario')
  async obtenerActividadPorUsuario() {
    return this.auditoriaService.obtenerActividadPorUsuario();
  }

  /**
   * GET /auditoria/buscar
   * Buscar cambios por palabra clave
   */
  @Get('buscar')
  async buscarCambios(
    @Query('q') palabra: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    if (!palabra) {
      return { data: [], pagination: { total: 0, page: 1, limit, pages: 0 } };
    }

    return this.auditoriaService.buscarCambios(
      palabra,
      parseInt(page),
      parseInt(limit),
    );
  }
}
