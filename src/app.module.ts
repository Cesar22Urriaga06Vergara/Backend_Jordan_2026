import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { typeOrmConfig } from './database/typeorm.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { OperacionesModule } from './modules/operaciones/operaciones.module';
import { DiarioModule } from './modules/diario/diario.module';
import { TrabajadoresOpsModule } from './modules/trabajadores-ops/trabajadores-ops.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    CommonModule,
    AuthModule,
    UsersModule,
    CatalogosModule,
    OperacionesModule,
    DiarioModule,
    TrabajadoresOpsModule,
    ConfiguracionModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
