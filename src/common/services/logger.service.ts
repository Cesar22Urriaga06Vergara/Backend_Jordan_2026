import { Injectable, LoggerService } from '@nestjs/common';

export interface LogContext {
  userId?: number;
  username?: string;
  ip?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  query?: Record<string, any>;
  body?: Record<string, any>;
  duration?: number;
  error?: any;
}

@Injectable()
export class AppLoggerService implements LoggerService {
  log(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [LOG] [${context || 'App'}] ${message}`
    );
  }

  error(message: string, trace?: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.error(
      `[${timestamp}] [ERROR] [${context || 'App'}] ${message}`
    );
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.warn(
      `[${timestamp}] [WARN] [${context || 'App'}] ${message}`
    );
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(
        `[${timestamp}] [DEBUG] [${context || 'App'}] ${message}`
      );
    }
  }

  verbose(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [VERBOSE] [${context || 'App'}] ${message}`
    );
  }

  /**
   * Log de operaciones de negocio (CRUD)
   */
  logOperation(
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: number | string,
    context: LogContext
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      entity,
      entityId,
      userId: context.userId,
      username: context.username,
      ip: context.ip,
      method: context.method,
      path: context.path,
      statusCode: context.statusCode,
      duration: context.duration ? `${context.duration}ms` : undefined,
    };

    const message = JSON.stringify(logData);
    
    if (context.error) {
      this.error(`${operation} failed on ${entity}:${entityId}`, JSON.stringify(context.error));
    } else {
      this.log(`${operation} SUCCESS: ${message}`);
    }
  }

  /**
   * Log de errores críticos
   */
  logCriticalError(message: string, error: any, context?: LogContext) {
    const errorData = {
      timestamp: new Date().toISOString(),
      message,
      error: {
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode,
        stack: error?.stack,
      },
      ...context,
    };

    this.error(
      `CRITICAL ERROR: ${JSON.stringify(errorData)}`,
      error?.stack
    );
  }

  /**
   * Log de cambios sensibles (auditoría)
   */
  logAuditEvent(
    action: string,
    entity: string,
    entityId: number | string,
    changes: Record<string, any>,
    context: LogContext
  ) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      userId: context.userId,
      username: context.username,
      ip: context.ip,
      changes,
    };

    this.log(`AUDIT: ${JSON.stringify(auditLog)}`);
  }

  /**
   * Log de performance
   */
  logPerformance(operation: string, duration: number, context?: string) {
    const level = duration > 1000 ? 'warn' : 'log';
    const message = `${operation} took ${duration}ms`;
    
    if (level === 'warn') {
      this.warn(`SLOW OPERATION: ${message}`, context);
    } else {
      this.log(`PERFORMANCE: ${message}`, context);
    }
  }

  /**
   * Log de validación fallida
   */
  logValidationError(
    entity: string,
    errors: Record<string, any>,
    context?: LogContext
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      entity,
      errors,
      userId: context?.userId,
      ip: context?.ip,
    };

    this.warn(`VALIDATION ERROR on ${entity}: ${JSON.stringify(logData)}`);
  }
}
