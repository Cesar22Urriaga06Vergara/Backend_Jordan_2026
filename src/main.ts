import 'reflect-metadata';
import './config/env.validation';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe as NestValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@/common/filters/http-exception.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { AppLoggerService } from '@/common/services/logger.service';

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});

function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return ['http://localhost:3001', 'http://192.168.1.35:3001'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appLogger = app.get(AppLoggerService);
  app.useLogger(appLogger);

  app.use(cookieParser());

  // Prefijo global para mantener consistencia de rutas con el frontend.
  app.setGlobalPrefix('api');

  // Filtro global de excepciones
  const logger = app.get(AppLoggerService);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Interceptor de respuesta estándar
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Validación global de DTOs - Usar ValidationPipe de NestJS
  app.useGlobalPipes(
    new NestValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS — wildcard es incompatible con credentials (cookies HttpOnly)
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT || 3000;

  await app.listen(port);
  console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
}

async function run() {
  try {
    await bootstrap();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error al iniciar la aplicación:', message);
    if (message.includes('EADDRINUSE')) {
      console.error('   El puerto configurado ya está en uso. Compruebe PORT en el .env o detenga el proceso usando ese puerto.');
      console.error('   Puede identificar el proceso con: netstat -ano | findstr :3000');
    } else {
      console.error('   Revise la configuración de la base de datos y que MySQL esté disponible.');
      console.error('   Valores esperados: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE.');
      if (message.includes('Timeout') || message.includes('timed out') || message.includes('ETIMEDOUT')) {
        console.error('   Sugerencia: aumente DB_CONNECT_TIMEOUT_MS o verifique connectivity/puerto.');
      }
    }
    process.exit(1);
  }
}

run();
