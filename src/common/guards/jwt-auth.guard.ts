import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@/common/decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('Token no encontrado en headers');
      throw new UnauthorizedException('Token no encontrado');
    }

    try {
      const payload = this.jwtService.verify(token);
      request['user'] = payload;
      this.logger.debug(`Usuario autenticado: ${payload.email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al verificar JWT: ${error.message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      this.logger.warn('Authorization header no encontrado');
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      this.logger.warn(`Tipo de autorización incorrecto: ${type}`);
      return undefined;
    }
    return token;
  }
}

@Injectable()
export class PublicGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
