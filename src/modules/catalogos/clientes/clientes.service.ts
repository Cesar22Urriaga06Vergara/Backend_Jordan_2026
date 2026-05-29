import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente, PrecioCliente, Producto } from '../../../database/entities';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpsertPrecioClienteDto } from './dto/upsert-precio.dto';
import { AppLoggerService } from '../../../common/services/logger.service';
import { AuditService } from '../../../common/services/audit.service';
import { MoneyUtil } from '../../../common/utils';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
    @InjectRepository(PrecioCliente)
    private precioRepo: Repository<PrecioCliente>,
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
    @Inject(AppLoggerService)
    private logger: AppLoggerService,
    private auditService: AuditService,
  ) {}

  private withActivo(cliente: Cliente) {
    return {
      ...cliente,
      activo: !cliente.deletedAt,
    };
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    tipo?: string,
    activo?: boolean,
  ) {
    const qb = this.clienteRepo.createQueryBuilder('c');

    if (activo !== true) {
      qb.withDeleted();
    }
    if (activo === false) {
      qb.andWhere('c.deletedAt IS NOT NULL');
    }
    if (search) {
      qb.andWhere('(c.nombre LIKE :s OR c.codigo LIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (tipo) {
      qb.andWhere('c.tipo = :tipo', { tipo });
    }

    qb.orderBy('c.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const items = data.map((cliente) => this.withActivo(cliente));

    return {
      data: items,
      items,
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
    return this.withActivo(cliente);
  }

  private async findOneWithDeleted(id: number) {
    const cliente = await this.clienteRepo.findOne({
      where: { id },
      withDeleted: true,
      relations: ['preciosPersonalizados', 'preciosPersonalizados.producto'],
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    return cliente;
  }

  async create(dto: CreateClienteDto) {
    try {
      const existe = await this.clienteRepo.findOne({
        where: { codigo: dto.codigo },
        withDeleted: true,
      });
      if (existe) {
        throw new ConflictException(`Ya existe un cliente con codigo ${dto.codigo}`);
      }

      const { activo: _activo, ...payload } = dto;
      const cliente = this.clienteRepo.create(payload);
      const resultado = await this.clienteRepo.save(cliente);

      try {
        this.logger.logOperation('CREATE', 'Cliente', resultado.id, {
          statusCode: 201,
          method: 'POST',
          path: '/catalogos/clientes',
        });
        await this.auditService.registrarActividad({
          usuarioId: dto.usuarioId || 0,
          accion: 'CREAR_CLIENTE',
          descripcion: `Creo cliente ${resultado.codigo}: ${resultado.nombre}`,
        });
      } catch (auditError) {
        this.logger.logCriticalError('Error en auditoria de creacion de cliente', auditError);
      }

      return this.withActivo(resultado);
    } catch (error) {
      this.logger.logCriticalError('Error creating cliente', error);
      throw error;
    }
  }

  async update(id: number, dto: UpdateClienteDto) {
    try {
      const clienteAnterior = await this.findOne(id);

      if (dto.codigo && dto.codigo !== clienteAnterior.codigo) {
        const existe = await this.clienteRepo.findOne({
          where: { codigo: dto.codigo },
          withDeleted: true,
        });
        if (existe) {
          throw new ConflictException(`Ya existe un cliente con codigo ${dto.codigo}`);
        }
      }

      const { activo: _activo, ...payload } = dto;
      const cambios = this.auditService.detectarCambios(clienteAnterior, payload);
      if (Object.keys(cambios).length > 0) {
        for (const [campo, { antes, despues }] of Object.entries(cambios)) {
          await this.auditService.registrarCambio({
            usuarioId: dto.usuarioId || 0,
            entidad: 'Cliente',
            registroId: id,
            campo,
            valorAnterior: antes,
            valorNuevo: despues,
            razonCambio: dto.razonCambio || 'Actualizacion',
          });
        }
      }

      Object.assign(clienteAnterior, payload);
      const resultado = await this.clienteRepo.save(clienteAnterior);

      try {
        this.logger.logOperation('UPDATE', 'Cliente', id, {
          statusCode: 200,
          method: 'PUT',
          path: `/catalogos/clientes/${id}`,
        });
      } catch (auditError) {
        this.logger.logCriticalError('Error en auditoria de actualizacion de cliente', auditError);
      }

      return this.withActivo(resultado);
    } catch (error) {
      this.logger.logCriticalError('Error updating cliente', error);
      throw error;
    }
  }

  async toggleActivo(id: number, usuarioId: number = 0) {
    try {
      const cliente = await this.findOneWithDeleted(id);
      const estadoAnterior = !cliente.deletedAt;
      const resultado = cliente.deletedAt
        ? await this.clienteRepo.recover(cliente)
        : await this.clienteRepo.softRemove(cliente);
      const estadoNuevo = !resultado.deletedAt;

      try {
        await this.auditService.registrarCambio({
          usuarioId,
          entidad: 'Cliente',
          registroId: id,
          campo: 'deletedAt',
          valorAnterior: estadoAnterior,
          valorNuevo: estadoNuevo,
          razonCambio: `Cambio de estado a ${estadoNuevo ? 'activo' : 'inactivo'}`,
        });
        this.logger.logOperation('UPDATE', 'Cliente', id, {
          statusCode: 200,
          method: 'PATCH',
          path: `/catalogos/clientes/${id}/toggle`,
        });
      } catch (auditError) {
        this.logger.logCriticalError('Error en auditoria de toggle cliente', auditError);
      }

      return this.withActivo(resultado);
    } catch (error) {
      this.logger.logCriticalError('Error toggling cliente activo', error);
      throw error;
    }
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

    const { activo, ...payload } = dto;
    const precioPayload = {
      ...payload,
      precioUnitario: MoneyUtil.normalize(payload.precioUnitario),
    };
    let precio = await this.precioRepo.findOne({
      where: { clienteId, productoId: dto.productoId },
      withDeleted: true,
    });

    if (precio) {
      Object.assign(precio, precioPayload);
    } else {
      precio = this.precioRepo.create({ clienteId, ...precioPayload });
    }

    const saved = await this.precioRepo.save(precio);
    if (activo === false && !saved.deletedAt) {
      return this.precioRepo.softRemove(saved);
    }
    if (activo === true && saved.deletedAt) {
      return this.precioRepo.recover(saved);
    }

    return saved;
  }

  async getPreciosCliente(clienteId: number) {
    const cliente = await this.clienteRepo.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${clienteId} no encontrado`);
    }

    return this.precioRepo.find({
      where: { clienteId },
      relations: ['producto'],
      order: { producto: { nombre: 'ASC' } },
    });
  }

  async delete(id: number, usuarioId: number = 0) {
    const cliente = await this.findOne(id);

    try {
      await this.clienteRepo.softRemove(cliente);
    } catch (error) {
      this.logger.logCriticalError('Error deleting cliente', error);
      throw error;
    }

    try {
      this.logger.logOperation('DELETE', 'Cliente', id, {
        statusCode: 200,
        method: 'DELETE',
        path: `/catalogos/clientes/${id}`,
      });
      await this.auditService.registrarActividad({
        usuarioId,
        accion: 'ELIMINAR_CLIENTE',
        descripcion: `Elimino cliente ${cliente.codigo}: ${cliente.nombre}`,
      });
    } catch (auditError) {
      this.logger.logCriticalError('Error en auditoria de eliminacion de cliente', auditError);
    }

    return { message: `Cliente ${cliente.codigo} eliminado correctamente` };
  }
}
