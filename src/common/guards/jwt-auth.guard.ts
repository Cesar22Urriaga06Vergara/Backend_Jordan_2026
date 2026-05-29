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
import { AUTH_ACCESS_COOKIE } from '@/common/constants/auth-cookie';

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
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('Token no encontrado (header Bearer ni cookie)');
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

  /** Preferencia: `Authorization: Bearer`, luego cookie HttpOnly `jordan_at`. */
  private extractToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    const cookies = (request as Request & { cookies?: Record<string, string> })
      .cookies;
    const fromCookie = cookies?.[AUTH_ACCESS_COOKIE];
    if (typeof fromCookie === 'string' && fromCookie.length > 0) {
      return fromCookie;
    }

    return undefined;
  }
}

@Injectable()
export class PublicGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
