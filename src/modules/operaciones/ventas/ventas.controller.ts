import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto, RegistrarPagoVentaDto } from './dto/ventas.dto';
import { EstadoVenta } from '../../../common/enums';

@Controller('operaciones/ventas')
export class VentasController {
  constructor(private ventasService: VentasService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: EstadoVenta,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.ventasService.findAll(
      parseInt(page),
      parseInt(limit),
      clienteId ? parseInt(clienteId) : undefined,
      estado,
      fechaDesde,
      fechaHasta,
    );
  }

  @Get('reporte/movimientos')
  findAllForReport(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: EstadoVenta,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.ventasService.findAllForReport(
      parseInt(page),
      parseInt(limit),
      clienteId ? parseInt(clienteId) : undefined,
      estado,
      fechaDesde,
      fechaHasta,
    );
  }

  @Get('cartera/resumen')
  getCartera(@Query('clienteId') clienteId?: string) {
    return this.ventasService.getCartera(
      clienteId ? parseInt(clienteId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVentaDto) {
    return this.ventasService.create(dto);
  }

  @Post(':id/pagos')
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarPagoVentaDto,
  ) {
    return this.ventasService.registrarPago(id, dto);
  }
}
