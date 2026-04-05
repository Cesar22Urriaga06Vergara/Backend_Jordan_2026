import { Controller, Post, Body, Get } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public, CurrentUser } from '../../common/decorators';

interface RequestWithUser extends ExpressRequest {
  user?: {
    id: number;
    email: string;
    rol: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  async logout() {
    return {
      message:
        'Sesión cerrada en cliente. El JWT sigue siendo válido hasta su expiración.',
      stateless: true,
      revocado: false,
    };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestWithUser['user']) {
    return { usuario: await this.authService.getCurrentUser(user!.id) };
  }
}
