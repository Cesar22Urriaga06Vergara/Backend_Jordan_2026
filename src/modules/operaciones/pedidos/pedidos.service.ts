import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Pedido,
  DetallePedido,
  Cliente,
  Producto,
  MovimientoInventario,
} from '../../../database/entities';
import { EstadoPedido, TipoMovimientoInventario } from '../../../common/enums';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { CambioEstadoPedidoDto } from './dto/cambio-estado-pedido.dto';
import { ConsecutivoService } from '../../../common/services/consecutivo.service';
import { MoneyUtil } from '../../../common/utils';

const TRANSICIONES_PEDIDO: Partial<Record<EstadoPedido, EstadoPedido[]>> = {
  [EstadoPedido.PENDIENTE]: [
    EstadoPedido.CARGADO_EN_RUTA,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.CARGADO_EN_RUTA]: [
    EstadoPedido.ENTREGADO,
    EstadoPedido.NO_ENTREGADO,
    EstadoPedido.REPROGRAMADO,
    EstadoPedido.DEVUELTO,
  ],
  [EstadoPedido.NO_ENTREGADO]: [
    EstadoPedido.PENDIENTE,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.REPROGRAMADO]: [
    EstadoPedido.PENDIENTE,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.ENTREGADO]: [],
  [EstadoPedido.DEVUELTO]: [],
  [EstadoPedido.CANCELADO]: [],
};

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private detalleRepo: Repository<DetallePedido>,
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
    @InjectRepository(MovimientoInventario)
    private movInvRepo: Repository<MovimientoInventario>,
    private consecutivoService: ConsecutivoService,
    private dataSource: DataSource,
  ) {}

  private async generarNumeroPedido(manager?: DataSource['manager']): Promise<string> {
    return this.consecutivoService.generar('PED', new Date(), manager);
  }

  private parseDateStart(value: string) {
    if (!value) return undefined;
    if (value.includes('T') || value.includes(' ')) return new Date(value);
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  private parseDateEnd(value: string) {
    if (!value) return undefined;
    if (value.includes('T') || value.includes(' ')) return new Date(value);
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  async findAll(
    page = 1,
    limit = 10,
    clienteId?: number,
    estado?: EstadoPedido,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const qb = this.pedidoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.cliente', 'c')
      .leftJoinAndSelect('p.detalles', 'd')
      .leftJoinAndSelect('d.producto', 'prod')
      .leftJoinAndSelect('p.ventas', 'v');

    if (clienteId) qb.andWhere('p.clienteId = :clienteId', { clienteId });
    if (estado) qb.andWhere('p.estado = :estado', { estado });
    const fechaDesdeDate = fechaDesde ? this.parseDateStart(fechaDesde) : undefined;
    const fechaHastaDate = fechaHasta ? this.parseDateEnd(fechaHasta) : undefined;

    if (fechaDesdeDate) qb.andWhere('p.fecha >= :fechaDesde', { fechaDesde: fechaDesdeDate });
    if (fechaHastaDate) qb.andWhere('p.fecha <= :fechaHasta', { fechaHasta: fechaHastaDate });

    qb.orderBy('p.fecha', 'DESC').skip((page - 1) * limit).take(limit);

    if (estado === EstadoPedido.PENDIENTE) {
      await this.pedidoRepo
        .createQueryBuilder()
        .update()
        .set({ rutaId: null as any, esDeRuta: false })
        .where('estado = :estado AND rutaId IS NOT NULL', { estado: EstadoPedido.PENDIENTE })
        .execute()
        .catch(() => undefined);
    }

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
    const pedido = await this.pedidoRepo.findOne({
      where: { id },
      relations: ['cliente', 'detalles', 'detalles.producto', 'ventas'],
    });
    if (!pedido) throw new NotFoundException(`Pedido con id ${id} no encontrado`);
    return pedido;
  }

  async create(dto: CreatePedidoDto) {
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }

    return this.dataSource.transaction(async (manager) => {
      const cliente = await manager.findOne(Cliente, {
        where: { id: dto.clienteId },
      });
      if (!cliente) {
        throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado o inactivo`);
      }

      const numero = await this.generarNumeroPedido(manager);
      const pedido = manager.create(Pedido, {
        numero,
        clienteId: dto.clienteId,
        fecha: new Date(dto.fecha),
        esDeRuta: dto.esDeRuta ?? false,
        observaciones: dto.observaciones,
        estado: EstadoPedido.PENDIENTE,
      });
      const savedPedido = await manager.save(Pedido, pedido);

      const detalles = await this.buildDetalles(manager, dto.detalles, savedPedido.id);
      await manager.save(DetallePedido, detalles);

      return manager.findOne(Pedido, {
        where: { id: savedPedido.id },
        relations: ['cliente', 'detalles', 'detalles.producto', 'ventas'],
      });
    });
  }

  async cambiarEstado(id: number, dto: CambioEstadoPedidoDto) {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, {
        where: { id },
        relations: ['cliente', 'detalles', 'detalles.producto', 'ventas'],
      });
      if (!pedido) throw new NotFoundException(`Pedido con id ${id} no encontrado`);

      const estadoActual = pedido.estado;
      const estadoNuevo = dto.estado;

      const permitidos = TRANSICIONES_PEDIDO[estadoActual] ?? [];
      if (!permitidos.includes(estadoNuevo)) {
        throw new BadRequestException(
          `No se puede cambiar de ${estadoActual} a ${estadoNuevo}`,
        );
      }

      if (estadoNuevo === EstadoPedido.REPROGRAMADO && !dto.razonReprogramacion) {
        throw new BadRequestException('Se requiere razonReprogramacion');
      }
      if (estadoNuevo === EstadoPedido.CANCELADO && !dto.razonCancelacion) {
        throw new BadRequestException('Se requiere razonCancelacion');
      }

      if (estadoNuevo === EstadoPedido.REPROGRAMADO && dto.fechaReprogramacion) {
        const fechaReprog = new Date(dto.fechaReprogramacion);
        const ahora = new Date();
        ahora.setHours(0, 0, 0, 0);
        fechaReprog.setHours(0, 0, 0, 0);

        if (fechaReprog < ahora) {
          throw new BadRequestException(
            'La fecha de reprogramacion debe ser futura (no puede ser hoy o pasada)',
          );
        }
      }

      Object.assign(pedido, {
        estado: estadoNuevo,
        razonCancelacion: dto.razonCancelacion ?? pedido.razonCancelacion,
        razonReprogramacion: dto.razonReprogramacion ?? pedido.razonReprogramacion,
        fechaReprogramacion: dto.fechaReprogramacion
          ? new Date(dto.fechaReprogramacion)
          : pedido.fechaReprogramacion,
        observaciones: dto.observaciones ?? pedido.observaciones,
      });

      const updated = await manager.save(Pedido, pedido);

      if (estadoNuevo === EstadoPedido.ENTREGADO || estadoNuevo === EstadoPedido.DEVUELTO) {
        const detalles = await manager.find(DetallePedido, { where: { pedidoId: updated.id } });
        const tipoMovimiento =
          estadoNuevo === EstadoPedido.ENTREGADO
            ? TipoMovimientoInventario.DESPACHO_ENTREGA
            : TipoMovimientoInventario.DEVOLUCION;

        const movimientos = detalles.map((detalle) =>
          manager.create(MovimientoInventario, {
            productoId: detalle.productoId,
            tipo: tipoMovimiento,
            cantidad: detalle.cantidad,
            fecha: new Date(),
            rutaId: updated.rutaId,
            observaciones: `Pedido ${updated.numero} ${estadoNuevo}`,
          }),
        );

        if (movimientos.length > 0) {
          await manager.save(MovimientoInventario, movimientos);
        }
      }

      return updated;
    });
  }

  async update(id: number, dto: any) {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, {
        where: { id },
        relations: ['cliente', 'detalles', 'detalles.producto', 'ventas'],
      });
      if (!pedido) throw new NotFoundException(`Pedido con id ${id} no encontrado`);

      if (pedido.estado !== EstadoPedido.PENDIENTE) {
        throw new BadRequestException(
          `No se puede editar un pedido en estado ${pedido.estado}. Solo se pueden editar pedidos PENDIENTE.`,
        );
      }

      if (dto.fecha) pedido.fecha = new Date(dto.fecha);
      if (dto.observaciones !== undefined) pedido.observaciones = dto.observaciones;
      if (dto.esDeRuta !== undefined) pedido.esDeRuta = dto.esDeRuta;

      await manager.save(Pedido, pedido);

      if (dto.detalles && Array.isArray(dto.detalles)) {
        if (dto.detalles.length === 0) {
          throw new BadRequestException('El pedido debe tener al menos un producto');
        }

        await manager.delete(DetallePedido, { pedidoId: id });
        const detalles = await this.buildDetalles(manager, dto.detalles, id);
        await manager.save(DetallePedido, detalles);
      }

      return manager.findOne(Pedido, {
        where: { id },
        relations: ['cliente', 'detalles', 'detalles.producto', 'ventas'],
      });
    });
  }

  private async buildDetalles(
    manager: DataSource['manager'],
    items: Array<{ productoId: number; cantidad: number; precioUnitario: number }>,
    pedidoId: number,
  ): Promise<DetallePedido[]> {
    const detalles: DetallePedido[] = [];

    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0 || item.cantidad > 999) {
        throw new BadRequestException(
          `Cantidad invalida: ${item.cantidad}. Debe estar entre 1 y 999 unidades`,
        );
      }

      if (item.precioUnitario < 0) {
        throw new BadRequestException('Precio unitario no puede ser negativo');
      }

      const producto = await manager.findOne(Producto, {
        where: { id: item.productoId },
      });
      if (!producto) {
        throw new NotFoundException(`Producto ${item.productoId} no encontrado o inactivo`);
      }

      const precioUnitario = MoneyUtil.normalize(item.precioUnitario);
      detalles.push(
        manager.create(DetallePedido, {
          pedidoId,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal: MoneyUtil.multiply(precioUnitario, item.cantidad),
        }),
      );
    }

    return detalles;
  }
}
