import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from '@/common/filters/http-exception.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para mantener consistencia de rutas con el frontend.
  app.setGlobalPrefix('api');

  // Filtro global de excepciones
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Interceptor de respuesta estándar
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  // CORS — wildcard es incompatible con credentials
  app.enableCors({
    origin: ['http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT || 3001;

  await app.listen(port);
  console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
}

bootstrap();
