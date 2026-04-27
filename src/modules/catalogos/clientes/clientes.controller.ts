import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpsertPrecioClienteDto } from './dto/upsert-precio.dto';

@Controller('catalogos/clientes')
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('tipo') tipo?: string,
    @Query('activo') activo?: string,
  ) {
    const activoBool =
      activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.clientesService.findAll(
      parseInt(page),
      parseInt(limit),
      search,
      tipo,
      activoBool,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.toggleActivo(id);
  }

  @Get(':id/precios')
  getPreciosCliente(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.getPreciosCliente(id);
  }

  @Post(':id/precios')
  upsertPrecio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertPrecioClienteDto,
  ) {
    return this.clientesService.upsertPrecio(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.delete(id);
  }
}
