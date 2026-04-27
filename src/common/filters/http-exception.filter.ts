import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '@/common/services/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(@Inject(AppLoggerService) private appLogger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let errors: string[] | undefined;
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      (Array.isArray(requestIdHeader)
        ? requestIdHeader[0]
        : requestIdHeader) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) || message;
        if (Array.isArray(res.message)) {
          errors = res.message as string[];
          message = 'Error de validación';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} -> ${status} ${message}`,
      );
      
      // Log crítico en AppLoggerService
      this.appLogger.logCriticalError(
        `${request.method} ${request.url}`,
        exception,
        {
          userId: (request as any).user?.id,
          ip: request.ip,
          method: request.method,
          path: request.url,
          statusCode: status,
          body: request.body,
        }
      );
    } else if (status >= 400) {
      // Log de errores de cliente
      this.appLogger.logValidationError(
        request.url,
        { status, message, errors },
        {
          userId: (request as any).user?.id,
          ip: request.ip,
        }
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url,
      requestId,
    });
  }
}
