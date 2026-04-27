import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  private async generarNumeroPedido(): Promise<string> {
    const hoy = new Date();
    const prefix = `PED-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
    const count = await this.pedidoRepo
      .createQueryBuilder('p')
      .where('p.numero LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
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
      .leftJoinAndSelect('d.producto', 'prod');

    if (clienteId) qb.andWhere('p.clienteId = :clienteId', { clienteId });
    if (estado) qb.andWhere('p.estado = :estado', { estado });
    if (fechaDesde) qb.andWhere('p.fecha >= :fechaDesde', { fechaDesde });
    if (fechaHasta) qb.andWhere('p.fecha <= :fechaHasta', { fechaHasta });

    qb.orderBy('p.fecha', 'DESC').skip((page - 1) * limit).take(limit);

    // Auto-sanear datos inconsistentes: PENDIENTE con rutaId sucio
    if (estado === EstadoPedido.PENDIENTE) {
      await this.pedidoRepo
        .createQueryBuilder()
        .update()
        .set({ rutaId: null as any, esDeRuta: false })
        .where('estado = :estado AND rutaId IS NOT NULL', { estado: EstadoPedido.PENDIENTE })
        .execute()
        .catch(() => {/* no bloquear si falla */});
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
      relations: ['cliente', 'detalles', 'detalles.producto'],
    });
    if (!pedido) throw new NotFoundException(`Pedido con id ${id} no encontrado`);
    return pedido;
  }

  async create(dto: CreatePedidoDto) {
    const cliente = await this.clienteRepo.findOne({
      where: { id: dto.clienteId, activo: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado o inactivo`);

    const numero = await this.generarNumeroPedido();

    const pedido = this.pedidoRepo.create({
      numero,
      clienteId: dto.clienteId,
      fecha: new Date(dto.fecha),
      esDeRuta: dto.esDeRuta ?? false,
      observaciones: dto.observaciones,
      estado: EstadoPedido.PENDIENTE,
    });

    const savedPedido = await this.pedidoRepo.save(pedido);

    const detalles: DetallePedido[] = [];
    for (const item of dto.detalles) {
      // Validación crítica: cantidad debe ser razonable
      if (!item.cantidad || item.cantidad <= 0 || item.cantidad > 999) {
        throw new BadRequestException(
          `Cantidad inválida: ${item.cantidad}. Debe estar entre 1 y 999 unidades`,
        );
      }
      
      const producto = await this.productoRepo.findOne({
        where: { id: item.productoId, activo: true },
      });
      if (!producto) {
        throw new NotFoundException(`Producto ${item.productoId} no encontrado o inactivo`);
      }
      
      detalles.push(
        this.detalleRepo.create({
          pedidoId: savedPedido.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.cantidad * item.precioUnitario,
        }),
      );
    }

    await this.detalleRepo.save(detalles);
    return this.findOne(savedPedido.id);
  }

  async cambiarEstado(id: number, dto: CambioEstadoPedidoDto) {
    const pedido = await this.findOne(id);
    const estadoActual = pedido.estado;
    const estadoNuevo = dto.estado;

    const permitidos = TRANSICIONES_PEDIDO[estadoActual] ?? [];
    if (!permitidos.includes(estadoNuevo)) {
      throw new BadRequestException(
        `No se puede cambiar de ${estadoActual} a ${estadoNuevo}`,
      );
    }

    if (
      estadoNuevo === EstadoPedido.REPROGRAMADO &&
      !dto.razonReprogramacion
    ) {
      throw new BadRequestException('Se requiere razonReprogramacion');
    }
    if (
      estadoNuevo === EstadoPedido.CANCELADO &&
      !dto.razonCancelacion
    ) {
      throw new BadRequestException('Se requiere razonCancelacion');
    }

    // Validación crítica: fecha reprogramación debe ser futura
    if (estadoNuevo === EstadoPedido.REPROGRAMADO && dto.fechaReprogramacion) {
      const fechaReprog = new Date(dto.fechaReprogramacion);
      const ahora = new Date();
      ahora.setHours(0, 0, 0, 0);
      fechaReprog.setHours(0, 0, 0, 0);
      
      if (fechaReprog < ahora) {
        throw new BadRequestException(
          'La fecha de reprogramación debe ser futura (no puede ser hoy o pasada)',
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

    const updated = await this.pedidoRepo.save(pedido);

    if (estadoNuevo === EstadoPedido.ENTREGADO || estadoNuevo === EstadoPedido.DEVUELTO) {
      const detalles = await this.detalleRepo.find({ where: { pedidoId: updated.id } });
      const tipoMovimiento =
        estadoNuevo === EstadoPedido.ENTREGADO
          ? TipoMovimientoInventario.DESPACHO_ENTREGA
          : TipoMovimientoInventario.DEVOLUCION;

      const movimientos = detalles.map((detalle) =>
        this.movInvRepo.create({
          productoId: detalle.productoId,
          tipo: tipoMovimiento,
          cantidad: detalle.cantidad,
          fecha: new Date(),
          rutaId: updated.rutaId,
          observaciones: `Pedido ${updated.numero} ${estadoNuevo}`,
        }),
      );

      await this.movInvRepo.save(movimientos);
    }

    return updated;
  }

  async update(id: number, dto: any) {
    const pedido = await this.findOne(id);

    // Solo permitir edición si está en estado PENDIENTE
    if (pedido.estado !== EstadoPedido.PENDIENTE) {
      throw new BadRequestException(
        `No se puede editar un pedido en estado ${pedido.estado}. Solo se pueden editar pedidos PENDIENTE.`,
      );
    }

    // Actualizar campos simples si se proporcionan
    if (dto.fecha) pedido.fecha = new Date(dto.fecha);
    if (dto.observaciones !== undefined) pedido.observaciones = dto.observaciones;
    if (dto.esDeRuta !== undefined) pedido.esDeRuta = dto.esDeRuta;

    await this.pedidoRepo.save(pedido);

    // Si hay detalles para actualizar, eliminar los existentes y crear nuevos
    if (dto.detalles && Array.isArray(dto.detalles) && dto.detalles.length > 0) {
      // Eliminar detalles existentes
      await this.detalleRepo.delete({ pedidoId: id });

      // Crear nuevos detalles
      const detalles: DetallePedido[] = [];
      for (const item of dto.detalles) {
        const producto = await this.productoRepo.findOne({
          where: { id: item.productoId, activo: true },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto ${item.productoId} no encontrado o inactivo`,
          );
        }
        detalles.push(
          this.detalleRepo.create({
            pedidoId: id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.cantidad * item.precioUnitario,
          }),
        );
      }

      await this.detalleRepo.save(detalles);
    }

    return this.findOne(id);
  }
}
