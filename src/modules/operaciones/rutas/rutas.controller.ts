import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { RutasService } from './rutas.service';
import {
  CreateRutaDto,
  AgregarPedidoRutaDto,
  LiquidarRutaDto,
  CambioEstadoRutaDto,
} from './dto/rutas.dto';
import { EstadoRuta } from '../../../common/enums';

@Controller('operaciones/rutas')
export class RutasController {
  constructor(private rutasService: RutasService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('estado') estado?: EstadoRuta,
    @Query('fecha') fecha?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.rutasService.findAll(
      parseInt(page),
      parseInt(limit),
      estado,
      fecha,
      fechaDesde,
      fechaHasta,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rutasService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRutaDto) {
    return this.rutasService.create(dto);
  }

  @Post(':id/pedidos')
  agregarPedido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarPedidoRutaDto,
  ) {
    return this.rutasService.agregarPedido(id, dto);
  }

  @Delete(':id/pedidos/:pedidoId')
  removePedido(
    @Param('id', ParseIntPipe) id: number,
    @Param('pedidoId', ParseIntPipe) pedidoId: number,
  ) {
    return this.rutasService.removePedido(id, pedidoId);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambioEstadoRutaDto,
  ) {
    return this.rutasService.cambiarEstado(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rutasService.remove(id);
  }

  @Post(':id/liquidar')
  liquidar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidarRutaDto,
  ) {
    return this.rutasService.liquidar(id, dto);
  }
}
