import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, IsNull } from 'typeorm';
import { Producto } from '../../../database/entities';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { AppLoggerService } from '../../../common/services/logger.service';
import { AuditService } from '../../../common/services/audit.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
    @Inject(AppLoggerService)
    private logger: AppLoggerService,
    private auditService: AuditService,
  ) {}

  private withActivo(producto: Producto) {
    return {
      ...producto,
      activo: !producto.deletedAt,
    };
  }

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
    if (activo === false) {
      where['deletedAt'] = Not(IsNull());
    }

    const [data, total] = await this.productoRepo.findAndCount({
      where,
      withDeleted: activo === false,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = data.map((producto) => this.withActivo(producto));

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
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return this.withActivo(producto);
  }

  private async findOneWithDeleted(id: number) {
    const producto = await this.productoRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!producto) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return producto;
  }

  async findByCodigo(codigo: string) {
    const producto = await this.productoRepo.findOne({ where: { codigo } });
    if (!producto) {
      throw new NotFoundException(`Producto con codigo ${codigo} no encontrado`);
    }
    return producto;
  }

  async create(dto: CreateProductoDto) {
    try {
      const existe = await this.productoRepo.findOne({
        where: { codigo: dto.codigo },
        withDeleted: true,
      });
      if (existe) {
        throw new ConflictException(`Ya existe un producto con codigo ${dto.codigo}`);
      }

      const { activo: _activo, ...payload } = dto;
      const producto = this.productoRepo.create(payload);
      const resultado = await this.productoRepo.save(producto);

      this.logger.logOperation('CREATE', 'Producto', resultado.id, {
        statusCode: 201,
        method: 'POST',
        path: '/catalogos/productos',
      });

      await this.auditService.registrarActividad({
        usuarioId: dto.usuarioId || 0,
        accion: 'CREAR_PRODUCTO',
        descripcion: `Creo producto ${resultado.codigo}: ${resultado.nombre}`,
      });

      return this.withActivo(resultado);
    } catch (error) {
      this.logger.logCriticalError('Error creating producto', error);
      throw error;
    }
  }

  async update(id: number, dto: UpdateProductoDto) {
    try {
      const productoAnterior = await this.findOne(id);

      if (dto.codigo && dto.codigo !== productoAnterior.codigo) {
        const existe = await this.productoRepo.findOne({
          where: { codigo: dto.codigo },
          withDeleted: true,
        });
        if (existe) {
          throw new ConflictException(`Ya existe un producto con codigo ${dto.codigo}`);
        }
      }

      const { activo: _activo, ...payload } = dto;
      const cambios = this.auditService.detectarCambios(productoAnterior, payload);
      if (Object.keys(cambios).length > 0) {
        for (const [campo, { antes, despues }] of Object.entries(cambios)) {
          await this.auditService.registrarCambio({
            usuarioId: dto.usuarioId || 0,
            entidad: 'Producto',
            registroId: id,
            campo,
            valorAnterior: antes,
            valorNuevo: despues,
            razonCambio: dto.razonCambio || 'Actualizacion',
          });
        }
      }

      Object.assign(productoAnterior, payload);
      const resultado = await this.productoRepo.save(productoAnterior);

      this.logger.logOperation('UPDATE', 'Producto', id, {
        statusCode: 200,
        method: 'PUT',
        path: `/catalogos/productos/${id}`,
      });

      return this.withActivo(resultado);
    } catch (error) {
      this.logger.logCriticalError('Error updating producto', error);
      throw error;
    }
  }

  async toggleActivo(id: number, usuarioId: number = 0) {
    try {
      const producto = await this.findOneWithDeleted(id);
      const estadoAnterior = !producto.deletedAt;
      const resultado = producto.deletedAt
        ? await this.productoRepo.recover(producto)
        : await this.productoRepo.softRemove(producto);
      const estadoNuevo = !resultado.deletedAt;

      await this.auditService.registrarCambio({
        usuarioId,
        entidad: 'Producto',
        registroId: id,
        campo: 'deletedAt',
        valorAnterior: estadoAnterior,
        valorNuevo: estadoNuevo,
        razonCambio: `Cambio de estado a ${estadoNuevo ? 'activo' : 'inactivo'}`,
      });

      this.logger.logOperation('UPDATE', 'Producto', id, {
        statusCode: 200,
        method: 'PATCH',
        path: `/catalogos/productos/${id}/toggle`,
      });

      return this.withActivo(resultado);
    } catch (error) {
      this.logger.logCriticalError('Error toggling producto activo', error);
      throw error;
    }
  }

  async delete(id: number, usuarioId: number = 0) {
    const producto = await this.findOne(id);

    try {
      await this.productoRepo.softRemove(producto);
    } catch (error) {
      this.logger.logCriticalError('Error deleting producto', error);
      throw error;
    }

    try {
      this.logger.logOperation('DELETE', 'Producto', id, {
        statusCode: 200,
        method: 'DELETE',
        path: `/catalogos/productos/${id}`,
      });
      await this.auditService.registrarActividad({
        usuarioId,
        accion: 'ELIMINAR_PRODUCTO',
        descripcion: `Elimino producto ${producto.codigo}: ${producto.nombre}`,
      });
    } catch (auditError) {
      this.logger.logCriticalError('Error en auditoria de eliminacion', auditError);
    }

    return { message: `Producto ${producto.codigo} eliminado correctamente` };
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
