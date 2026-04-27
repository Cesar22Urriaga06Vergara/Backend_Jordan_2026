import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Cliente, PrecioCliente, Producto } from '../../../database/entities';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpsertPrecioClienteDto } from './dto/upsert-precio.dto';
import { AppLoggerService } from '../../../common/services/logger.service';
import { AuditService } from '../../../common/services/audit.service';

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
    try {
      const existe = await this.clienteRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(`Ya existe un cliente con código ${dto.codigo}`);
      }

      const cliente = this.clienteRepo.create(dto);
      const resultado = await this.clienteRepo.save(cliente);

      // Auditoría no bloquea la respuesta
      try {
        this.logger.logOperation('CREATE', 'Cliente', resultado.id, {
          statusCode: 201,
          method: 'POST',
          path: '/catalogos/clientes',
        });
        await this.auditService.registrarActividad({
          usuarioId: dto.usuarioId || 0,
          accion: 'CREAR_CLIENTE',
          descripcion: `Creó cliente ${resultado.codigo}: ${resultado.nombre}`,
        });
      } catch (auditError) {
        this.logger.logCriticalError('Error en auditoría de creación de cliente', auditError);
      }

      return resultado;
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
        });
        if (existe) {
          throw new ConflictException(`Ya existe un cliente con código ${dto.codigo}`);
        }
      }

      // Detectar cambios
      const cambios = this.auditService.detectarCambios(clienteAnterior, dto);
      if (Object.keys(cambios).length > 0) {
        for (const [campo, { antes, despues }] of Object.entries(cambios)) {
          await this.auditService.registrarCambio({
            usuarioId: dto.usuarioId || 0,
            entidad: 'Cliente',
            registroId: id,
            campo,
            valorAnterior: antes,
            valorNuevo: despues,
            razonCambio: dto.razonCambio || 'Actualización',
          });
        }
      }

      Object.assign(clienteAnterior, dto);
      const resultado = await this.clienteRepo.save(clienteAnterior);

      try {
        this.logger.logOperation('UPDATE', 'Cliente', id, {
          statusCode: 200,
          method: 'PUT',
          path: `/catalogos/clientes/${id}`,
        });
      } catch (auditError) {
        this.logger.logCriticalError('Error en auditoría de actualización de cliente', auditError);
      }

      return resultado;
    } catch (error) {
      this.logger.logCriticalError('Error updating cliente', error);
      throw error;
    }
  }

  async toggleActivo(id: number, usuarioId: number = 0) {
    try {
      const cliente = await this.findOne(id);
      const estadoAnterior = cliente.activo;
      cliente.activo = !cliente.activo;
      const resultado = await this.clienteRepo.save(cliente);

      try {
        await this.auditService.registrarCambio({
          usuarioId,
          entidad: 'Cliente',
          registroId: id,
          campo: 'activo',
          valorAnterior: estadoAnterior,
          valorNuevo: resultado.activo,
          razonCambio: `Cambio de estado a ${resultado.activo ? 'activo' : 'inactivo'}`,
        });
        this.logger.logOperation('UPDATE', 'Cliente', id, {
          statusCode: 200,
          method: 'PATCH',
          path: `/catalogos/clientes/${id}/toggle`,
        });
      } catch (auditError) {
        this.logger.logCriticalError('Error en auditoría de toggle cliente', auditError);
      }

      return resultado;
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

  async delete(id: number, usuarioId: number = 0) {
    const cliente = await this.findOne(id);

    try {
      await this.clienteRepo.delete(id);
    } catch (error) {
      if ((error as any)?.code === 'ER_ROW_IS_REFERENCED_2' || (error as any)?.errno === 1451) {
        throw new BadRequestException(
          'No se puede eliminar el cliente porque tiene pedidos, ventas o movimientos registrados. Puede desactivarlo en su lugar.',
        );
      }
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
        descripcion: `Eliminó cliente ${cliente.codigo}: ${cliente.nombre}`,
      });
    } catch (auditError) {
      this.logger.logCriticalError('Error en auditoría de eliminación de cliente', auditError);
    }

    return { message: `Cliente ${cliente.codigo} eliminado correctamente` };
  }
}
