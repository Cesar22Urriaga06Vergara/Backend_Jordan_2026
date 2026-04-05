import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Producto } from '../../../database/entities';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    categoria?: string,
    activo?: boolean,
  ) {
    const where: Record<string, unknown> = {};

    if (search) {
      where['nombre'] = Like(`%${search}%`);
    }
    if (categoria) {
      where['categoria'] = categoria;
    }
    if (activo !== undefined) {
      where['activo'] = activo;
    }

    const [data, total] = await this.productoRepo.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return producto;
  }

  async findByCodigo(codigo: string) {
    const producto = await this.productoRepo.findOne({ where: { codigo } });
    if (!producto) {
      throw new NotFoundException(`Producto con código ${codigo} no encontrado`);
    }
    return producto;
  }

  async create(dto: CreateProductoDto) {
    const existe = await this.productoRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existe) {
      throw new ConflictException(`Ya existe un producto con código ${dto.codigo}`);
    }

    const producto = this.productoRepo.create(dto);
    return this.productoRepo.save(producto);
  }

  async update(id: number, dto: UpdateProductoDto) {
    const producto = await this.findOne(id);

    if (dto.codigo && dto.codigo !== producto.codigo) {
      const existe = await this.productoRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(`Ya existe un producto con código ${dto.codigo}`);
      }
    }

    Object.assign(producto, dto);
    return this.productoRepo.save(producto);
  }

  async toggleActivo(id: number) {
    const producto = await this.findOne(id);
    producto.activo = !producto.activo;
    return this.productoRepo.save(producto);
  }

  async getCategorias() {
    const result = await this.productoRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.categoria', 'categoria')
      .orderBy('p.categoria', 'ASC')
      .getRawMany<{ categoria: string }>();
    return result.map((r) => r.categoria);
  }
}
