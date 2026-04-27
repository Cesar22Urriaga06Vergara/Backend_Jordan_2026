import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLoggerService } from '@/common/services/logger.service';
import { MetricsService } from '@/common/services/metrics.service';

/**
 * Interceptor global para logging de todas las requests HTTP
 * Se encarga de loguear:
 * - Request information (method, path, query, body)
 * - Response time
 * - Status code
 * - Errors si ocurren
 * - Métricas de performance
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(AppLoggerService) private logger: AppLoggerService,
    @Inject(MetricsService) private metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id;
    const username = request.user?.username;

    // Filtrar rutas que no queremos loguear
    const skipPaths = ['/health', '/metrics'];
    if (skipPaths.some(path => url.includes(path))) {
      return next.handle();
    }

    this.logger.log(
      `→ ${method} ${url}${userId ? ` (User: ${username || userId})` : ''}`,
      'HTTP'
    );

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.logger.log(
          `← ${statusCode} ${method} ${url} (${duration}ms)`,
          'HTTP'
        );

        // Registrar métrica
        const operationKey = `${method} ${url.split('?')[0]}`;
        this.metricsService.recordOperation(operationKey, duration, statusCode < 400);

        // Log de performance si es lento
        if (duration > 1000) {
          this.logger.logPerformance(
            `${method} ${url}`,
            duration,
            'HTTP'
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `✗ ${method} ${url} - ${error.message} (${duration}ms)`,
          error.stack,
          'HTTP'
        );

        // Registrar error en métrica
        const operationKey = `${method} ${url.split('?')[0]}`;
        this.metricsService.recordOperation(operationKey, duration, false);
        this.metricsService.recordError(error.message || 'Unknown Error');

        throw error;
      })
    );
  }
}
