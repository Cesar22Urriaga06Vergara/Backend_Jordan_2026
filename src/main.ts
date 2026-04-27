import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe as NestValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@/common/filters/http-exception.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { AppLoggerService } from '@/common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // CORS — wildcard es incompatible con credentials
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3003',
      'http://localhost:5000',
      'http://192.168.1.35:3000',
      'http://192.168.1.35:3003',
      'http://192.168.1.35:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT || 3002;

  await app.listen(port);
  console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
}

bootstrap();
