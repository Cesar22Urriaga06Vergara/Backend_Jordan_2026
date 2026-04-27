import { Controller, Post, Body, Get, UseGuards, Logger } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('logout')
  async logout() {
    return {
      message:
        'Sesión cerrada en cliente. El JWT sigue siendo válido hasta su expiración.',
      stateless: true,
      revocado: false,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestWithUser['user']) {
    this.logger.log(`/auth/me called for user: ${user?.email || 'unknown'}`);
    
    if (!user) {
      this.logger.error('Usuario no autenticado en /auth/me');
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const usuarioData = await this.authService.getCurrentUser(user.id);
      this.logger.log(`User data retrieved: ${usuarioData.email}`);
      return { usuario: usuarioData };
    } catch (error) {
      this.logger.error(`Error getting current user: ${error.message}`);
      throw error;
    }
  }
}
