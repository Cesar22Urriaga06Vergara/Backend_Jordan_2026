import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ValidationError,
  Inject,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AppLoggerService } from '@/common/services/logger.service';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  constructor(@Inject(AppLoggerService) private appLogger: AppLoggerService) {}

  async transform(value: any, metadata: any) {
    // Si no hay tipo o es un tipo primitivo, pasar sin validar
    if (!metadata?.type || [String, Number, Boolean, Date].includes(metadata.type)) {
      return value;
    }

    try {
      // Validar que metadata.type es una clase válida
      if (typeof metadata.type !== 'function' || !metadata.type.name) {
        this.logger.warn(`Invalid metadata type: ${metadata.type}`);
        return value;
      }

      const object = plainToInstance(metadata.type, value, {
        enableImplicitConversion: true,
      });
      const errors = await validate(object, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const formattedErrors = this.formatErrors(errors);
        
        this.appLogger.logValidationError(
          metadata.type?.name || 'Unknown',
          formattedErrors
        );

        throw new BadRequestException({
          statusCode: 400,
          message: 'Error de validación',
          errors: formattedErrors,
        });
      }

      return object;
    } catch (error) {
      // Si es error de validación conocido, lanzar
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Si es error de transformación, registrarlo y usar valor original
      this.logger.warn(`Transform error for ${metadata?.type?.name}: ${error?.message}`);
      return value;
    }
  }

  /**
   * Formatea los errores de validación de class-validator
   */
  private formatErrors(errors: ValidationError[]): Record<string, any> {
    const formatted: Record<string, any> = {};

    const flattenErrors = (errs: ValidationError[], prefix = '') => {
      errs.forEach((error) => {
        const property = prefix ? `${prefix}.${error.property}` : error.property;

        if (error.constraints) {
          formatted[property] = Object.values(error.constraints);
        }

        if (error.children && error.children.length > 0) {
          flattenErrors(error.children, property);
        }
      });
    };

    flattenErrors(errors);
    return formatted;
  }
}
