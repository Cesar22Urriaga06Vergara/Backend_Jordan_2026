import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Logger,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AUTH_ACCESS_COOKIE } from '@/common/constants/auth-cookie';
import { jwtExpirationToMs } from '@/common/utils/jwt-expiration-ms';

interface RequestWithUser extends ExpressRequest {
  user?: {
    id: number;
    email: string;
    rol: string;
  };
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    const result = await this.authService.login(loginDto);
    const maxAge = jwtExpirationToMs(process.env.JWT_EXPIRATION);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(AUTH_ACCESS_COOKIE, result.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api',
      maxAge,
    });
    return {
      usuario: result.usuario,
    };
  }

  @Public()
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_ACCESS_COOKIE, { path: '/api' });
    return {
      message:
        'Sesión cerrada. La cookie de acceso se eliminó en este navegador.',
      stateless: false,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestWithUser['user']) {
    this.logger.log(`/auth/me called for user: ${user?.email || 'unknown'}`);

    if (!user) {
      this.logger.error('Usuario no autenticado en /auth/me');
      throw new UnauthorizedException('Usuario no autenticado');
    }

    try {
      const usuarioData = await this.authService.getCurrentUser(user.id);
      this.logger.log(`User data retrieved: ${usuarioData.email}`);
      return { usuario: usuarioData };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting current user: ${msg}`);
      throw error;
    }
  }
}
