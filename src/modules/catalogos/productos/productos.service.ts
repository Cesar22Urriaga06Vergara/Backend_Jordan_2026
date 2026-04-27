import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
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
    try {
      const existe = await this.productoRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(`Ya existe un producto con código ${dto.codigo}`);
      }

      const producto = this.productoRepo.create(dto);
      const resultado = await this.productoRepo.save(producto);

      this.logger.logOperation('CREATE', 'Producto', resultado.id, {
        statusCode: 201,
        method: 'POST',
        path: '/catalogos/productos',
      });

      await this.auditService.registrarActividad({
        usuarioId: dto.usuarioId || 0,
        accion: 'CREAR_PRODUCTO',
        descripcion: `Creó producto ${resultado.codigo}: ${resultado.nombre}`,
      });

      return resultado;
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
        });
        if (existe) {
          throw new ConflictException(`Ya existe un producto con código ${dto.codigo}`);
        }
      }

      // Detectar cambios
      const cambios = this.auditService.detectarCambios(productoAnterior, dto);
      if (Object.keys(cambios).length > 0) {
        for (const [campo, { antes, despues }] of Object.entries(cambios)) {
          await this.auditService.registrarCambio({
            usuarioId: dto.usuarioId || 0,
            entidad: 'Producto',
            registroId: id,
            campo,
            valorAnterior: antes,
            valorNuevo: despues,
            razonCambio: dto.razonCambio || 'Actualización',
          });
        }
      }

      Object.assign(productoAnterior, dto);
      const resultado = await this.productoRepo.save(productoAnterior);

      this.logger.logOperation('UPDATE', 'Producto', id, {
        statusCode: 200,
        method: 'PUT',
        path: `/catalogos/productos/${id}`,
      });

      return resultado;
    } catch (error) {
      this.logger.logCriticalError('Error updating producto', error);
      throw error;
    }
  }

  async toggleActivo(id: number, usuarioId: number = 0) {
    try {
      const producto = await this.findOne(id);
      const estadoAnterior = producto.activo;
      producto.activo = !producto.activo;
      const resultado = await this.productoRepo.save(producto);

      await this.auditService.registrarCambio({
        usuarioId,
        entidad: 'Producto',
        registroId: id,
        campo: 'activo',
        valorAnterior: estadoAnterior,
        valorNuevo: resultado.activo,
        razonCambio: `Cambio de estado a ${resultado.activo ? 'activo' : 'inactivo'}`,
      });

      this.logger.logOperation('UPDATE', 'Producto', id, {
        statusCode: 200,
        method: 'PATCH',
        path: `/catalogos/productos/${id}/toggle`,
      });

      return resultado;
    } catch (error) {
      this.logger.logCriticalError('Error toggling producto activo', error);
      throw error;
    }
  }

  async delete(id: number, usuarioId: number = 0) {
    const producto = await this.findOne(id);

    try {
      await this.productoRepo.delete(id);
    } catch (error) {
      // FK constraint: producto tiene movimientos o pedidos asociados
      if ((error as any)?.code === 'ER_ROW_IS_REFERENCED_2' || (error as any)?.errno === 1451) {
        throw new BadRequestException(
          'No se puede eliminar el producto porque tiene movimientos o pedidos registrados. Puede desactivarlo en su lugar.',
        );
      }
      this.logger.logCriticalError('Error deleting producto', error);
      throw error;
    }

    // Auditoría no bloquea la respuesta
    try {
      this.logger.logOperation('DELETE', 'Producto', id, {
        statusCode: 200,
        method: 'DELETE',
        path: `/catalogos/productos/${id}`,
      });
      await this.auditService.registrarActividad({
        usuarioId,
        accion: 'ELIMINAR_PRODUCTO',
        descripcion: `Eliminó producto ${producto.codigo}: ${producto.nombre}`,
      });
    } catch (auditError) {
      this.logger.logCriticalError('Error en auditoría de eliminación', auditError);
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
