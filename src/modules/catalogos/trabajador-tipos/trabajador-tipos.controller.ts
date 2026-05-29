import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateTrabajadorTipoDto,
  UpdateTrabajadorTipoDto,
} from './dto/trabajador-tipo.dto';
import { TrabajadorTiposService } from './trabajador-tipos.service';

@Controller('catalogos/trabajador-tipos')
export class TrabajadorTiposController {
  constructor(private service: TrabajadorTiposService) {}

  @Get()
  findAll(@Query('activo') activo?: string) {
    const activoBool =
      activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.service.findAll(activoBool);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTrabajadorTipoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrabajadorTipoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleActivo(id);
  }
}
