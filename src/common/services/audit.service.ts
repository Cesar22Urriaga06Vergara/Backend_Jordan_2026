import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CambioAuditoria, LogActividad } from '@/database/entities';
import { AppLoggerService } from '@/common/services/logger.service';

export interface AuditChangeInput {
  usuarioId: number;
  entidad: string;
  registroId: number;
  campo: string;
  valorAnterior?: any;
  valorNuevo?: any;
  razonCambio?: string;
}

export interface ActivityLogInput {
  usuarioId?: number;
  accion: string;
  descripcion?: string;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(CambioAuditoria)
    private cambioRepo: Repository<CambioAuditoria>,
    @InjectRepository(LogActividad)
    private actividadRepo: Repository<LogActividad>,
    @Inject(AppLoggerService)
    private logger: AppLoggerService,
  ) {}

  /**
   * Registrar un cambio en la auditoria
   */
  async registrarCambio(input: AuditChangeInput): Promise<CambioAuditoria> {
    try {
      const cambio = this.cambioRepo.create({
        ...input,
        valorAnterior: JSON.stringify(input.valorAnterior),
        valorNuevo: JSON.stringify(input.valorNuevo),
        fecha: new Date(),
      });

      const resultado = await this.cambioRepo.save(cambio);
      
      this.logger.logAuditEvent(
        `UPDATE_${input.entidad}`,
        input.entidad,
        input.registroId,
        {
          campo: input.campo,
          antes: input.valorAnterior,
          despues: input.valorNuevo,
          razon: input.razonCambio,
        },
        { userId: input.usuarioId, username: 'System' }
      );

      return resultado;
    } catch (error) {
      this.logger.logCriticalError(
        'Error registering audit change',
        error,
        { userId: input.usuarioId }
      );
      throw error;
    }
  }

  /**
   * Registrar múltiples cambios en una transacción
   */
  async registrarCambios(inputs: AuditChangeInput[]): Promise<CambioAuditoria[]> {
    try {
      const cambios = inputs.map(input =>
        this.cambioRepo.create({
          ...input,
          valorAnterior: JSON.stringify(input.valorAnterior),
          valorNuevo: JSON.stringify(input.valorNuevo),
          fecha: new Date(),
        })
      );

      const resultados = await this.cambioRepo.save(cambios);
      this.logger.log(`Registered ${resultados.length} audit changes`, 'AuditService');
      return resultados;
    } catch (error) {
      this.logger.logCriticalError('Error registering multiple audit changes', error);
      throw error;
    }
  }

  /**
   * Registrar una actividad
   */
  async registrarActividad(input: ActivityLogInput): Promise<LogActividad> {
    try {
      const log = this.actividadRepo.create({
        ...input,
        fecha: new Date(),
      });

      const resultado = await this.actividadRepo.save(log);
      
      if (input.usuarioId) {
        this.logger.log(
          `Activity logged: ${input.accion}${input.descripcion ? ` (${input.descripcion})` : ''}`,
          'AuditService'
        );
      }

      return resultado;
    } catch (error) {
      this.logger.error(
        `Error registering activity: ${input.accion}`,
        (error as Error).message,
        'AuditService'
      );
      throw error;
    }
  }

  /**
   * Obtener historial de cambios para una entidad
   */
  async obtenerHistorial(entidad: string, registroId: number) {
    return this.cambioRepo.find({
      where: { entidad, registroId },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }

  /**
   * Obtener actividad de un usuario
   */
  async obtenerActividadUsuario(usuarioId: number, dias: number = 7) {
    const { MoreThanOrEqual } = require('typeorm');
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);

    return this.actividadRepo.find({
      where: {
        usuarioId,
        fecha: MoreThanOrEqual(fecha),
      },
      order: { fecha: 'DESC' },
    });
  }

  /**
   * Obtener cambios de una entidad en un rango de fechas
   */
  async obtenerCambiosPorFecha(
    entidad: string,
    desde: Date,
    hasta: Date
  ) {
    const { Between } = require('typeorm');
    return this.cambioRepo.find({
      where: {
        entidad,
        fecha: Between(desde, hasta),
      },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }

  /**
   * Detectar cambios entre dos versiones de un objeto
   */
  detectarCambios(
    anterior: Record<string, any>,
    nuevo: Record<string, any>
  ): Record<string, { antes: any; despues: any }> {
    const cambios: Record<string, { antes: any; despues: any }> = {};

    const todosLasCampos = new Set([
      ...Object.keys(anterior || {}),
      ...Object.keys(nuevo || {}),
    ]);

    todosLasCampos.forEach(campo => {
      // Ignorar campos internos de TypeORM
      if (['createdAt', 'updatedAt', 'id'].includes(campo)) {
        return;
      }

      const vAnterior = anterior?.[campo];
      const vNuevo = nuevo?.[campo];

      // Comparar valores
      if (JSON.stringify(vAnterior) !== JSON.stringify(vNuevo)) {
        cambios[campo] = {
          antes: vAnterior,
          despues: vNuevo,
        };
      }
    });

    return cambios;
  }
}
