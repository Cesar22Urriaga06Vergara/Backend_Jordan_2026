import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Venta,
  DetalleVenta,
  Pago,
  Cartera,
  MovimientoCaja,
  MovimientoInventario,
  Cliente,
  Producto,
} from '../../../database/entities';
import {
  EstadoVenta,
  TipoPago,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
} from '../../../common/enums';
import { CreateVentaDto, RegistrarPagoVentaDto } from './dto/ventas.dto';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
    @InjectRepository(DetalleVenta) private detalleRepo: Repository<DetalleVenta>,
    @InjectRepository(Pago) private pagoRepo: Repository<Pago>,
    @InjectRepository(Cartera) private carteraRepo: Repository<Cartera>,
    @InjectRepository(MovimientoCaja) private cajaMov: Repository<MovimientoCaja>,
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    @InjectRepository(Producto) private productoRepo: Repository<Producto>,
    private dataSource: DataSource,
  ) {}

  private async generarNumero(prefix: string, repo: Repository<Venta | Pago>): Promise<string> {
    const hoy = new Date();
    const pre = `${prefix}-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
    const count = await (repo as Repository<Venta>)
      .createQueryBuilder('e')
      .where('e.numero LIKE :pre', { pre: `${pre}%` })
      .getCount();
    return `${pre}-${String(count + 1).padStart(3, '0')}`;
  }

  private parseDateStart(value: string) {
    if (!value) return undefined;
    if (value.includes('T')) return new Date(value);
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  private parseDateEnd(value: string) {
    if (!value) return undefined;
    if (value.includes('T')) return new Date(value);
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  async findAll(
    page = 1,
    limit = 10,
    clienteId?: number,
    estado?: EstadoVenta,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const qb = this.ventaRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.cliente', 'c')
      .leftJoinAndSelect('v.detalles', 'd')
      .leftJoinAndSelect('d.producto', 'p')
      .leftJoinAndSelect('v.pagos', 'pg');

    if (clienteId) qb.andWhere('v.clienteId = :clienteId', { clienteId });
    if (estado) qb.andWhere('v.estado = :estado', { estado });
    const fechaDesdeDate = fechaDesde ? this.parseDateStart(fechaDesde) : undefined;
    const fechaHastaDate = fechaHasta ? this.parseDateEnd(fechaHasta) : undefined;

    if (fechaDesdeDate) qb.andWhere('v.fecha >= :fechaDesde', { fechaDesde: fechaDesdeDate });
    if (fechaHastaDate) qb.andWhere('v.fecha <= :fechaHasta', { fechaHasta: fechaHastaDate });

    qb.orderBy('v.fecha', 'DESC').skip((page - 1) * limit).take(limit);
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
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['cliente', 'detalles', 'detalles.producto', 'pagos'],
    });
    if (!venta) throw new NotFoundException(`Venta con id ${id} no encontrada`);
    return venta;
  }

  async create(dto: CreateVentaDto) {
    const cliente = await this.clienteRepo.findOne({
      where: { id: dto.clienteId, activo: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado o inactivo`);

    return this.dataSource.transaction(async (manager) => {
      // Validación: detalles no vacío
      if (!dto.detalles || dto.detalles.length === 0) {
        throw new BadRequestException('La venta debe tener al menos un producto');
      }

      // Calcular totales
      let totalVenta = 0;
      const detallesData: Partial<DetalleVenta>[] = [];

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
          throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
        }
        
        // Validación: precio unitario coherente
        if (item.precioUnitario < 0) {
          throw new BadRequestException(`Precio unitario no puede ser negativo`);
        }

        const subtotal = item.cantidad * item.precioUnitario;
        totalVenta += subtotal;
        detallesData.push({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal,
        });
      }

      const montoPagado = dto.montoPagado ?? 0;
      if (montoPagado < 0) {
        throw new BadRequestException('El monto pagado no puede ser negativo');
      }
      if (montoPagado > totalVenta) {
        throw new BadRequestException(
          `El monto pagado inicial ($${montoPagado}) supera el total de la venta ($${totalVenta})`,
        );
      }
      if (montoPagado > 0 && !dto.tipoPago) {
        throw new BadRequestException('Se requiere tipoPago cuando hay pago inicial');
      }

      const saldoPendiente = totalVenta - montoPagado;

      let estadoVenta: EstadoVenta;
      if (saldoPendiente <= 0) {
        estadoVenta = EstadoVenta.COMPLETADA;
      } else if (montoPagado > 0) {
        estadoVenta = EstadoVenta.PARCIAL;
      } else {
        estadoVenta = EstadoVenta.PENDIENTE;
      }

      // Número de venta
      const hoy = new Date();
      const numPrefix = `VEN-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const countVentas = await manager
        .createQueryBuilder(Venta, 'v')
        .where('v.numero LIKE :p', { p: `${numPrefix}%` })
        .getCount();
      const numeroVenta = `${numPrefix}-${String(countVentas + 1).padStart(3, '0')}`;

      // Crear venta
      const venta = manager.create(Venta, {
        numero: numeroVenta,
        clienteId: dto.clienteId,
        pedidoId: dto.pedidoId,
        fecha: new Date(dto.fecha),
        estado: estadoVenta,
        totalVenta,
        totalPagado: montoPagado,
        saldoPendiente: Math.max(0, saldoPendiente),
      });
      const savedVenta = await manager.save(Venta, venta);

      // Detalles
      for (const d of detallesData) {
        const savedDetalle = await manager.save(
          DetalleVenta,
          manager.create(DetalleVenta, { ...d, ventaId: savedVenta.id }),
        );

        // Impacto de inventario por venta directa
        await manager.save(
          MovimientoInventario,
          manager.create(MovimientoInventario, {
            productoId: savedDetalle.productoId,
            tipo: TipoMovimientoInventario.DESPACHO_VENTA_DIRECTA,
            cantidad: savedDetalle.cantidad,
            fecha: new Date(dto.fecha),
            ventaId: savedVenta.id,
            observaciones: `Venta ${numeroVenta}`,
          }),
        );
      }

      // Pago inicial si hay monto
      if (montoPagado > 0 && dto.tipoPago) {
        const numPagoPrefix = `PAG-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
        const countPagos = await manager
          .createQueryBuilder(Pago, 'p')
          .where('p.numero LIKE :p', { p: `${numPagoPrefix}%` })
          .getCount();
        const numeroPago = `${numPagoPrefix}-${String(countPagos + 1).padStart(3, '0')}`;

        const pago = manager.create(Pago, {
          numero: numeroPago,
          ventaId: savedVenta.id,
          clienteId: dto.clienteId,
          tipo: dto.tipoPago,
          monto: montoPagado,
          fecha: new Date(dto.fecha),
          referencia: dto.referenciaPago,
        });
        const savedPago = await manager.save(Pago, pago);

        // Movimiento caja
        const tipoMov =
          dto.tipoPago === TipoPago.EFECTIVO
            ? TipoMovimientoCaja.INGRESO_VENTA_EFECTIVO
            : TipoMovimientoCaja.INGRESO_VENTA_TRANSFERENCIA;

        const numCajaPrefix = `CAJ-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
        const countCaja = await manager
          .createQueryBuilder(MovimientoCaja, 'm')
          .where('m.numero LIKE :p', { p: `${numCajaPrefix}%` })
          .getCount();
        const numeroCaja = `${numCajaPrefix}-${String(countCaja + 1).padStart(3, '0')}`;

        await manager.save(
          MovimientoCaja,
          manager.create(MovimientoCaja, {
            numero: numeroCaja,
            tipo: tipoMov,
            medioPago: dto.tipoPago,
            monto: montoPagado,
            fecha: new Date(dto.fecha),
            pagoId: savedPago.id,
            clienteId: dto.clienteId,
            concepto: `Venta ${numeroVenta}`,
            referencia: dto.referenciaPago,
          }),
        );
      }

      // Cartera si hay saldo pendiente
      if (saldoPendiente > 0) {
        await manager.save(
          Cartera,
          manager.create(Cartera, {
            clienteId: dto.clienteId,
            ventaId: savedVenta.id,
            saldoPendiente,
            ultimoMovimiento: new Date(dto.fecha),
          }),
        );
      }

      return manager.findOne(Venta, {
        where: { id: savedVenta.id },
        relations: ['cliente', 'detalles', 'detalles.producto', 'pagos'],
      });
    });
  }

  async registrarPago(ventaId: number, dto: RegistrarPagoVentaDto) {
    const venta = await this.findOne(ventaId);

    if (venta.estado === EstadoVenta.COMPLETADA) {
      throw new BadRequestException(`La venta ya está completamente pagada`);
    }
    if (venta.estado === EstadoVenta.CANCELADA) {
      throw new BadRequestException(`No se puede pagar una venta cancelada`);
    }
    if (dto.monto > venta.saldoPendiente) {
      throw new BadRequestException(
        `El monto ($${dto.monto}) supera el saldo pendiente ($${venta.saldoPendiente})`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const hoy = new Date();
      const prefix = `PAG-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const count = await manager
        .createQueryBuilder(Pago, 'p')
        .where('p.numero LIKE :p', { p: `${prefix}%` })
        .getCount();
      const numeroPago = `${prefix}-${String(count + 1).padStart(3, '0')}`;

      const pago = manager.create(Pago, {
        numero: numeroPago,
        ventaId,
        clienteId: venta.clienteId,
        tipo: dto.tipo,
        monto: dto.monto,
        fecha: hoy,
        referencia: dto.referencia,
        observaciones: dto.observaciones,
      });
      const savedPago = await manager.save(Pago, pago);

      // Actualizar venta
      venta.totalPagado = Number(venta.totalPagado) + Number(dto.monto);
      venta.saldoPendiente = Number(venta.saldoPendiente) - Number(dto.monto);
      venta.estado =
        venta.saldoPendiente <= 0 ? EstadoVenta.COMPLETADA : EstadoVenta.PARCIAL;
      await manager.save(Venta, venta);

      // Actualizar cartera
      const cartera = await manager.findOne(Cartera, {
        where: { ventaId },
      });
      if (cartera) {
        cartera.saldoPendiente = venta.saldoPendiente;
        cartera.ultimoMovimiento = hoy;
        await manager.save(Cartera, cartera);
      }

      // Movimiento caja
      const tipoMov =
        dto.tipo === TipoPago.EFECTIVO
          ? TipoMovimientoCaja.INGRESO_CARTERA_EFECTIVO
          : TipoMovimientoCaja.INGRESO_CARTERA_TRANSFERENCIA;

      const cajaPrefix = `CAJ-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const cajaCnt = await manager
        .createQueryBuilder(MovimientoCaja, 'm')
        .where('m.numero LIKE :p', { p: `${cajaPrefix}%` })
        .getCount();
      const numeroCaja = `${cajaPrefix}-${String(cajaCnt + 1).padStart(3, '0')}`;

      await manager.save(
        MovimientoCaja,
        manager.create(MovimientoCaja, {
          numero: numeroCaja,
          tipo: tipoMov,
          medioPago: dto.tipo,
          monto: dto.monto,
          fecha: hoy,
          pagoId: savedPago.id,
          clienteId: venta.clienteId,
          concepto: `Abono cartera - Venta ${venta.numero}`,
          referencia: dto.referencia,
        }),
      );

      return manager.findOne(Venta, {
        where: { id: ventaId },
        relations: ['cliente', 'detalles', 'detalles.producto', 'pagos'],
      });
    });
  }

  async getCartera(clienteId?: number) {
    const qb = this.carteraRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.cliente', 'cl')
      .leftJoinAndSelect('c.venta', 'v')
      .where('c.saldoPendiente > 0');

    if (clienteId) qb.andWhere('c.clienteId = :clienteId', { clienteId });
    qb.orderBy('c.ultimoMovimiento', 'ASC');

    return qb.getMany();
  }
}
