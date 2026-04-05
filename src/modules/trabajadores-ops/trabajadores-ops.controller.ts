import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TrabajadoresOpsService } from './trabajadores-ops.service';
import {
  RegistrarLaborDto,
  PagarTrabajadorDto,
  RegistrarAnticipoDto,
  AbonarDeudaDto,
} from './dto/trabajadores-ops.dto';
import { CurrentUser } from '../../common/decorators';

@Controller('trabajadores-ops')
export class TrabajadoresOpsController {
  constructor(private service: TrabajadoresOpsService) {}

  @Get('anticipos')
  getAnticiposAll(@Query('trabajadorId') trabajadorId?: string) {
    return this.service.getAnticipos(
      trabajadorId ? parseInt(trabajadorId) : undefined,
    );
  }

  @Get('labores')
  getLaboresToday(
    @Query('trabajadorId') trabajadorId?: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.service.getLaboresToday(
      trabajadorId ? parseInt(trabajadorId) : undefined,
      fecha,
    );
  }

  @Post('labores')
  registrarLabor(@Body() dto: RegistrarLaborDto) {
    return this.service.registrarLabor(dto);
  }

  @Post('pagos')
  pagarTrabajador(@Body() dto: PagarTrabajadorDto, @CurrentUser() user: any) {
    return this.service.pagarTrabajador(dto, user.id);
  }

  @Post('anticipos')
  registrarAnticipo(@Body() dto: RegistrarAnticipoDto) {
    return this.service.registrarAnticipo(dto);
  }

  @Post('abonos')
  abonarDeuda(@Body() dto: AbonarDeudaDto) {
    return this.service.abonarDeuda(dto);
  }

  @Get(':trabajadorId/anticipos')
  getAnticipos(@Param('trabajadorId', ParseIntPipe) trabajadorId: number) {
    return this.service.getAnticiposByTrabajador(trabajadorId);
  }
}
