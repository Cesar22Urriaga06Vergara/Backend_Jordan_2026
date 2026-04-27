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
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Controller('catalogos/productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
    @Query('activo') activo?: string,
  ) {
    const activoBool =
      activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.productosService.findAll(
      parseInt(page),
      parseInt(limit),
      search,
      categoria,
      activoBool,
    );
  }

  @Get('categorias')
  getCategorias() {
    return this.productosService.getCategorias();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.toggleActivo(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.delete(id);
  }
}
