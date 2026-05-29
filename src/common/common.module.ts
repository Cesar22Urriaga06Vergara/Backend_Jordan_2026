import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  CambioAuditoria,
  LogActividad,
  SecuenciaConsecutivo,
} from '@/database/entities';

// Services
import { AppLoggerService } from './services/logger.service';
import { AuditService } from './services/audit.service';
import { MetricsService } from './services/metrics.service';
import { ConsecutivoService } from './services/consecutivo.service';
import { HealthController } from './controllers/health.controller';

// Filters
import { GlobalExceptionFilter } from './filters/http-exception.filter';

// Interceptors
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CambioAuditoria,
      LogActividad,
      SecuenciaConsecutivo,
    ]),
  ],
  controllers: [HealthController],
  providers: [
    // Services
    AppLoggerService,
    AuditService,
    MetricsService,
    ConsecutivoService,

    // Filters - Global
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Interceptors - Global
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [
    AppLoggerService,
    AuditService,
    MetricsService,
    ConsecutivoService,
  ],
})
export class CommonModule {}
