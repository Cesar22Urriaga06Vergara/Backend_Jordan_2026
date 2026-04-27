import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { CallHandler, ExecutionContext, NestInterceptor, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLoggerService } from '@/common/services/logger.service';

export interface AuditOptions {
  entity: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  description?: string;
  idParam?: string; // nombre del parámetro que contiene el ID (default: 'id')
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService, private readonly options: AuditOptions) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extraer información de contexto
    const userId = request.user?.id;
    const username = request.user?.username;
    const ip = request.ip || request.connection.remoteAddress;
    const method = request.method;
    const path = request.path;
    const idParam = this.options.idParam || 'id';
    const entityId = request.params[idParam] || request.body?.id;

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Extraer cambios si es UPDATE
        const changes = this.options.operation === 'UPDATE' ? request.body : undefined;

        const operation = (['CREATE', 'READ', 'UPDATE', 'DELETE'].includes(this.options.operation) 
          ? this.options.operation 
          : 'UPDATE') as any;
        
        this.logger.logOperation(operation, this.options.entity, entityId, {
          userId,
          username,
          ip,
          method,
          path,
          statusCode,
          duration,
          body: request.body,
        });

        // Si es cambio sensible, registrar auditoría
        if (['CREATE', 'UPDATE', 'DELETE'].includes(this.options.operation) && changes) {
          this.logger.logAuditEvent(
            `${this.options.operation}: ${this.options.description || this.options.entity}`,
            this.options.entity,
            entityId,
            changes,
            { userId, username, ip }
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const operation = (['CREATE', 'READ', 'UPDATE', 'DELETE'].includes(this.options.operation) 
          ? this.options.operation 
          : 'UPDATE') as any;
        
        this.logger.logOperation(operation, this.options.entity, entityId, {
          userId,
          username,
          ip,
          method,
          path,
          statusCode: error.statusCode || 500,
          duration,
          error,
        });
        throw error;
      })
    );
  }
}

/**
 * Decorator @Audit para métodos de servicio
 * Ejemplo:
 *   @Audit({ entity: 'Cliente', operation: 'CREATE' })
 *   async create(dto: CreateClienteDto) { ... }
 */
export function Audit(options: AuditOptions) {
  return applyDecorators(UseInterceptors(new AuditInterceptor(new AppLoggerService(), options)));
}
