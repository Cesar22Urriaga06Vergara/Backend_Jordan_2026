import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DiarioService } from './diario.service';
import { AbrirDiaDto, RegistrarProduccionDto, CerrarDiaDto } from './dto/diario.dto';
import { CurrentUser, Roles } from '../../common/decorators';

@Controller('diario')
export class DiarioController {
  constructor(private diarioService: DiarioService) {}

  @Get('estado')
  getEstadoDia(@Query('fecha') fecha?: string) {
    return this.diarioService.getEstadoDia(fecha);
  }

  @Get('historial')
  getHistorial(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.diarioService.getHistorial(parseInt(page), parseInt(limit));
  }

  @Post('apertura')
  @Roles('ADMIN')
  abrirDia(@Body() dto: AbrirDiaDto, @CurrentUser() user: any) {
    return this.diarioService.abrirDia(dto, user.id);
  }

  @Post('produccion')
  registrarProduccion(
    @Body() dto: RegistrarProduccionDto,
    @Query('fecha') fecha?: string,
  ) {
    return this.diarioService.registrarProduccion(dto, fecha);
  }

  @Post('cierre')
  @Roles('ADMIN')
  cerrarDia(
    @Body() dto: CerrarDiaDto,
    @CurrentUser() user: any,
    @Query('fecha') fecha?: string,
  ) {
    return this.diarioService.cerrarDia(dto, user.id, fecha);
  }
}
