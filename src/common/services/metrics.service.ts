import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CambioAuditoria, LogActividad } from '@/database/entities';

export interface PerformanceMetric {
  operation: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  count: number;
  errorCount: number;
  errorRate: number;
}

export interface SystemMetrics {
  requestsTotal: number;
  requestsSuccess: number;
  requestsError: number;
  errorRate: number;
  avgResponseTime: number;
  topOperations: PerformanceMetric[];
  topErrors: { error: string; count: number }[];
  uptime: number;
}

@Injectable()
export class MetricsService {
  private metrics = {
    requests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    operationDurations: new Map<string, number[]>(),
    operationErrors: new Map<string, number>(),
    errors: new Map<string, number>(),
    startTime: Date.now(),
  };

  constructor(
    @InjectRepository(CambioAuditoria)
    private cambioRepo: Repository<CambioAuditoria>,
    @InjectRepository(LogActividad)
    private actividadRepo: Repository<LogActividad>,
  ) {}

  /**
   * Registrar una métrica de operación
   */
  recordOperation(
    operation: string,
    duration: number,
    success: boolean = true
  ): void {
    this.metrics.requests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.metrics.totalDuration += duration;

    const key = `${operation}`;
    if (!this.metrics.operationDurations.has(key)) {
      this.metrics.operationDurations.set(key, []);
      this.metrics.operationErrors.set(key, 0);
    }

    const durations = this.metrics.operationDurations.get(key);
    if (durations) {
      durations.push(duration);
    }

    if (!success) {
      const errorCount = this.metrics.operationErrors.get(key) || 0;
      this.metrics.operationErrors.set(key, errorCount + 1);
    }
  }

  /**
   * Registrar un error
   */
  recordError(error: string): void {
    const count = this.metrics.errors.get(error) || 0;
    this.metrics.errors.set(error, count + 1);
  }

  /**
   * Obtener métricas del sistema
   */
  getSystemMetrics(): SystemMetrics {
    const errorRate = this.metrics.requests > 0
      ? (this.metrics.failedRequests / this.metrics.requests) * 100
      : 0;

    const avgResponseTime = this.metrics.requests > 0
      ? this.metrics.totalDuration / this.metrics.requests
      : 0;

    // Top operaciones
    const topOperations: PerformanceMetric[] = Array.from(
      this.metrics.operationDurations.entries()
    )
      .map(([operation, durations]) => {
        const errorCount = this.metrics.operationErrors.get(operation) || 0;
        return {
          operation,
          avgDuration: durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0,
          minDuration: durations.length > 0 ? Math.min(...durations) : 0,
          maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
          count: durations.length,
          errorCount,
          errorRate: durations.length > 0 ? (errorCount / durations.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top errores
    const topErrors = Array.from(this.metrics.errors.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      requestsTotal: this.metrics.requests,
      requestsSuccess: this.metrics.successfulRequests,
      requestsError: this.metrics.failedRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      topOperations,
      topErrors,
      uptime: Date.now() - this.metrics.startTime,
    };
  }

  /**
   * Obtener estadísticas de auditoría (últimos 30 días)
   */
  async getAuditStats(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [cambios, cambiosTotal] = await this.cambioRepo.findAndCount({
      where: { fecha: { $gte: thirtyDaysAgo } } as any,
    });

    const [actividades, actividadesTotal] = await this.actividadRepo.findAndCount({
      where: { fecha: { $gte: thirtyDaysAgo } } as any,
    });

    // Cambios por entidad
    const cambiosPorEntidad: Record<string, number> = {};
    cambios.forEach((cambio: any) => {
      cambiosPorEntidad[cambio.entidad] = (cambiosPorEntidad[cambio.entidad] || 0) + 1;
    });

    // Actividades por usuario
    const actividadesPorUsuario: Record<string, number> = {};
    actividades.forEach((actividad: any) => {
      if (actividad.usuarioId) {
        const key = `${actividad.usuarioId}`;
        actividadesPorUsuario[key] = (actividadesPorUsuario[key] || 0) + 1;
      }
    });

    return {
      cambiosTotal: cambiosTotal,
      actividadesTotal: actividadesTotal,
      cambiosPorEntidad,
      actividadesPorUsuario,
    };
  }

  /**
   * Resetear métricas
   */
  reset(): void {
    this.metrics = {
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      operationDurations: new Map(),
      operationErrors: new Map(),
      errors: new Map(),
      startTime: Date.now(),
    };
  }
}
