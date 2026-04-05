import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TrabajadoresService } from './trabajadores.service';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';

@Controller('catalogos/trabajadores')
export class TrabajadoresController {
  constructor(private trabajadoresService: TrabajadoresService) {}

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
    return this.trabajadoresService.findAll(
      parseInt(page),
      parseInt(limit),
      search,
      tipo,
      activoBool,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTrabajadorDto) {
    return this.trabajadoresService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrabajadorDto,
  ) {
    return this.trabajadoresService.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.toggleActivo(id);
  }
}
