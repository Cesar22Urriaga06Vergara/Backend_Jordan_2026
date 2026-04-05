import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EgresosService } from './egresos.service';
import { BuscarEgresosDto, RegistrarEgresoDto } from './dto/egresos.dto';
import { CurrentUser } from '../../../common/decorators';

@Controller('operaciones/egresos')
export class EgresosController {
  constructor(private egresosService: EgresosService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('fecha') fecha?: string,
    @Query('medioPago') medioPago?: string,
    @Query('search') search?: string,
  ) {
    const filtros: BuscarEgresosDto = {
      fecha,
      medioPago: medioPago as any,
      search,
    };
    return this.egresosService.findAll(parseInt(page), parseInt(limit), filtros);
  }

  @Post()
  registrar(@Body() dto: RegistrarEgresoDto, @CurrentUser() user: any) {
    return this.egresosService.registrar(dto, user?.id);
  }
}
