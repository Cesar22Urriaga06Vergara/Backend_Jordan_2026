import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Cliente, PrecioCliente, Producto } from '../../../database/entities';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpsertPrecioClienteDto } from './dto/upsert-precio.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
    @InjectRepository(PrecioCliente)
    private precioRepo: Repository<PrecioCliente>,
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    tipo?: string,
    activo?: boolean,
  ) {
    const qb = this.clienteRepo.createQueryBuilder('c');

    if (search) {
      qb.andWhere('(c.nombre LIKE :s OR c.codigo LIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (tipo) {
      qb.andWhere('c.tipo = :tipo', { tipo });
    }
    if (activo !== undefined) {
      qb.andWhere('c.activo = :activo', { activo });
    }

    qb.orderBy('c.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
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
    const cliente = await this.clienteRepo.findOne({
      where: { id },
      relations: ['preciosPersonalizados', 'preciosPersonalizados.producto'],
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    return cliente;
  }

  async create(dto: CreateClienteDto) {
    const existe = await this.clienteRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existe) {
      throw new ConflictException(`Ya existe un cliente con código ${dto.codigo}`);
    }

    const cliente = this.clienteRepo.create(dto);
    return this.clienteRepo.save(cliente);
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = await this.findOne(id);

    if (dto.codigo && dto.codigo !== cliente.codigo) {
      const existe = await this.clienteRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(`Ya existe un cliente con código ${dto.codigo}`);
      }
    }

    Object.assign(cliente, dto);
    return this.clienteRepo.save(cliente);
  }

  async toggleActivo(id: number) {
    const cliente = await this.findOne(id);
    cliente.activo = !cliente.activo;
    return this.clienteRepo.save(cliente);
  }

  async upsertPrecio(clienteId: number, dto: UpsertPrecioClienteDto) {
    const cliente = await this.clienteRepo.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${clienteId} no encontrado`);
    }

    const producto = await this.productoRepo.findOne({
      where: { id: dto.productoId },
    });
    if (!producto) {
      throw new NotFoundException(`Producto con id ${dto.productoId} no encontrado`);
    }

    let precio = await this.precioRepo.findOne({
      where: { clienteId, productoId: dto.productoId },
    });

    if (precio) {
      Object.assign(precio, dto);
    } else {
      precio = this.precioRepo.create({ clienteId, ...dto });
    }

    return this.precioRepo.save(precio);
  }

  async getPreciosCliente(clienteId: number) {
    const cliente = await this.clienteRepo.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${clienteId} no encontrado`);
    }

    return this.precioRepo.find({
      where: { clienteId, activo: true },
      relations: ['producto'],
      order: { producto: { nombre: 'ASC' } },
    });
  }
}
