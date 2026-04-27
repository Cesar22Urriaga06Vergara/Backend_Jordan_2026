import { Controller, Get, Post, UseGuards, Inject } from '@nestjs/common';
import { MetricsService } from '@/common/services/metrics.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators';

@Controller('monitoring/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(
    @Inject(MetricsService)
    private metricsService: MetricsService,
  ) {}

  /**
   * Obtener métricas del sistema
   */
  @Get('system')
  @Roles('ADMIN')
  getSystemMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  /**
   * Obtener estadísticas de auditoría
   */
  @Get('audit')
  @Roles('ADMIN')
  async getAuditStats() {
    return this.metricsService.getAuditStats();
  }

  /**
   * Obtener métricas combinadas (sistema + auditoría)
   */
  @Get('dashboard')
  @Roles('ADMIN')
  async getDashboard() {
    const [systemMetrics, auditStats] = await Promise.all([
      Promise.resolve(this.metricsService.getSystemMetrics()),
      this.metricsService.getAuditStats(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      audit: auditStats,
      health: {
        status: 'healthy',
        uptime: systemMetrics.uptime,
        errorRate: systemMetrics.errorRate,
      },
    };
  }

  /**
   * Resetear métricas (solo ADMIN)
   */
  @Post('reset')
  @Roles('ADMIN')
  resetMetrics() {
    this.metricsService.reset();
    return { message: 'Metrics reset successfully' };
  }

  /**
   * Health check endpoint (sin autenticación)
   */
  @Get('health')
  getHealth() {
    const metrics = this.metricsService.getSystemMetrics();
    const isHealthy = metrics.errorRate < 5;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      errorRate: metrics.errorRate,
      avgResponseTime: metrics.avgResponseTime,
      uptime: metrics.uptime,
    };
  }
}
