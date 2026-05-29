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
import { CreateLaborTipoDto, UpdateLaborTipoDto } from './dto/labor-tipo.dto';
import { LaborTiposService } from './labor-tipos.service';

@Controller('catalogos/labor-tipos')
export class LaborTiposController {
  constructor(private service: LaborTiposService) {}

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
  create(@Body() dto: CreateLaborTipoDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLaborTipoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleActivo(id);
  }
}
