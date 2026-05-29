import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from '../../database/entities';

@Injectable()
export class AuditoriaService {
  private auditLogRepository: Repository<AuditLog>;

  constructor(private dataSource: DataSource) {
    this.auditLogRepository = this.dataSource.getRepository(AuditLog);
  }

  /**
   * Registrar cambio en auditoría
   */
  async registrarCambio(dto: {
    entidad: string;
    entidadId: number;
    accion: string;
    usuarioId?: number;
    cambiosAntes?: any;
    cambiosDespues?: any;
    ipAddress?: string;
    userAgent?: string;
    razon?: string;
  }) {
    const auditLog = new AuditLog();
    auditLog.entidad = dto.entidad;
    auditLog.entidadId = dto.entidadId;
    auditLog.accion = dto.accion;
    auditLog.usuarioId = dto.usuarioId || null;
    auditLog.cambiosAntes = dto.cambiosAntes;
    auditLog.cambiosDespues = dto.cambiosDespues;
    auditLog.ipAddress = dto.ipAddress || null;
    auditLog.userAgent = dto.userAgent || null;
    auditLog.razon = dto.razon || null;
    auditLog.fecha = new Date();

    return this.auditLogRepository.save(auditLog);
  }

  /**
   * Obtener cambios de una entidad específica
   */
  async obtenerCambiosPorEntidad(
    entidad: string,
    entidadId: number,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { entidad, entidadId },
      relations: ['usuario'],
      skip,
      take: limit,
      order: { fecha: 'DESC' },
    });

    return {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Obtener todos los cambios (con filtros)
   */
  async obtenerTodos(
    page = 1,
    limit = 50,
    filtros?: {
      entidad?: string;
      accion?: string;
      usuarioId?: number;
      fechaDesde?: Date;
      fechaHasta?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filtros?.entidad) {
      query.andWhere('audit.entidad = :entidad', { entidad: filtros.entidad });
    }

    if (filtros?.accion) {
      query.andWhere('audit.accion = :accion', { accion: filtros.accion });
    }

    if (filtros?.usuarioId) {
      query.andWhere('audit.usuarioId = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });
    }

    if (filtros?.fechaDesde) {
      query.andWhere('audit.fecha >= :fechaDesde', {
        fechaDesde: filtros.fechaDesde,
      });
    }

    if (filtros?.fechaHasta) {
      query.andWhere('audit.fecha <= :fechaHasta', {
        fechaHasta: filtros.fechaHasta,
      });
    }

    query.leftJoinAndSelect('audit.usuario', 'usuario');
    query.orderBy('audit.fecha', 'DESC');
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Obtener cambios recientes (últimas X horas)
   */
  async obtenerCambiosRecientes(horasAtras: number = 24, limit: number = 100) {
    const desde = new Date();
    desde.setHours(desde.getHours() - horasAtras);

    return this.auditLogRepository.find({
      where: {
        fecha: new Date(),
      },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtener resumen por entidad
   */
  async obtenerResumenPorEntidad() {
    const datos = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.entidad', 'entidad')
      .addSelect('COUNT(audit.id)', 'total')
      .addSelect('COUNT(DISTINCT audit.entidadId)', 'registros')
      .groupBy('audit.entidad')
      .getRawMany();

    return datos;
  }

  /**
   * Obtener actividad por usuario
   */
  async obtenerActividadPorUsuario() {
    const datos = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.usuarioId', 'usuarioId')
      .addSelect('usuario.nombre', 'usuarioNombre')
      .addSelect('COUNT(audit.id)', 'totalCambios')
      .leftJoin('usuarios', 'usuario', 'usuario.id = audit.usuarioId')
      .groupBy('audit.usuarioId, usuario.nombre')
      .orderBy('totalCambios', 'DESC')
      .getRawMany();

    return datos;
  }

  /**
   * Buscar cambios por palabra clave
   */
  async buscarCambios(
    palabra: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.razon LIKE :palabra', { palabra: `%${palabra}%` })
      .orWhere('audit.cambiosAntes LIKE :palabra', { palabra: `%${palabra}%` })
      .orWhere('audit.cambiosDespues LIKE :palabra', { palabra: `%${palabra}%` })
      .leftJoinAndSelect('audit.usuario', 'usuario')
      .orderBy('audit.fecha', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}
