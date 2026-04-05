import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Ruta,
  ItemRuta,
  LiquidacionRuta,
  Pedido,
  Trabajador,
  Venta,
  DetalleVenta,
  Pago,
  Cartera,
  MovimientoCaja,
} from '../../../database/entities';
import {
  EstadoRuta,
  EstadoPedido,
  EstadoVenta,
  TipoPago,
  TipoMovimientoCaja,
} from '../../../common/enums';
import {
  CreateRutaDto,
  AgregarPedidoRutaDto,
  LiquidarRutaDto,
  CambioEstadoRutaDto,
  PedidoEntregaDto,
} from './dto/rutas.dto';

const TRANSICIONES_RUTA: Partial<Record<EstadoRuta, EstadoRuta[]>> = {
  [EstadoRuta.CREADA]: [EstadoRuta.CARGADA, EstadoRuta.ANULADA],
  [EstadoRuta.CARGADA]: [EstadoRuta.EN_ENTREGA, EstadoRuta.ANULADA],
  [EstadoRuta.EN_ENTREGA]: [EstadoRuta.EN_LIQUIDACION],
  [EstadoRuta.EN_LIQUIDACION]: [EstadoRuta.LIQUIDADA],
  [EstadoRuta.LIQUIDADA]: [],
  [EstadoRuta.ANULADA]: [],
};

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta)
    private rutaRepo: Repository<Ruta>,
    @InjectRepository(ItemRuta)
    private itemRutaRepo: Repository<ItemRuta>,
    @InjectRepository(LiquidacionRuta)
    private liquidacionRepo: Repository<LiquidacionRuta>,
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(Trabajador)
    private trabajadorRepo: Repository<Trabajador>,
  ) {}

  private async generarConsecutivo(
    manager: any,
    entidad: any,
    alias: string,
    prefijo: string,
    fecha = new Date(),
  ): Promise<string> {
    const base = `${prefijo}-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
    const count = await manager
      .createQueryBuilder(entidad, alias)
      .where(`${alias}.numero LIKE :pref`, { pref: `${base}%` })
      .getCount();
    return `${base}-${String(count + 1).padStart(3, '0')}`;
  }

  private async generarNumeroRuta(): Promise<string> {
    const hoy = new Date();
    const prefix = `RUT-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
    const count = await this.rutaRepo
      .createQueryBuilder('r')
      .where('r.numero LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(
    page = 1,
    limit = 10,
    estado?: EstadoRuta,
    fecha?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const qb = this.rutaRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.domiciliario', 'd')
      .leftJoinAndSelect('r.itemsRuta', 'i')
      .leftJoinAndSelect('i.pedido', 'p')
      .leftJoinAndSelect('p.cliente', 'c');

    if (estado) qb.andWhere('r.estado = :estado', { estado });
    if (fecha) qb.andWhere('DATE(r.fecha) = :fecha', { fecha });
    if (fechaDesde) qb.andWhere('DATE(r.fecha) >= :fechaDesde', { fechaDesde });
    if (fechaHasta) qb.andWhere('DATE(r.fecha) <= :fechaHasta', { fechaHasta });

    qb.orderBy('r.fecha', 'DESC').skip((page - 1) * limit).take(limit);

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
    const ruta = await this.rutaRepo.findOne({
      where: { id },
      relations: [
        'domiciliario',
        'itemsRuta',
        'itemsRuta.pedido',
        'itemsRuta.pedido.cliente',
        'itemsRuta.pedido.detalles',
        'itemsRuta.pedido.detalles.producto',
        'liquidacion',
      ],
    });
    if (!ruta) throw new NotFoundException(`Ruta con id ${id} no encontrada`);
    return ruta;
  }

  async create(dto: CreateRutaDto) {
    if (dto.domiciliarioId) {
      const domiciliario = await this.trabajadorRepo.findOne({
        where: { id: dto.domiciliarioId, activo: true },
      });
      if (!domiciliario) {
        throw new NotFoundException(`Domiciliario ${dto.domiciliarioId} no encontrado`);
      }
    }

    const numero = await this.generarNumeroRuta();
    const ruta = this.rutaRepo.create({
      numero,
      fecha: new Date(dto.fecha),
      domiciliarioId: dto.domiciliarioId,
      observaciones: dto.observaciones,
      estado: EstadoRuta.CREADA,
    });

    return this.rutaRepo.save(ruta);
  }

  async agregarPedido(rutaId: number, dto: AgregarPedidoRutaDto) {
    const ruta = await this.rutaRepo.findOne({ where: { id: rutaId } });
    if (!ruta) throw new NotFoundException(`Ruta ${rutaId} no encontrada`);
    if (ruta.estado !== EstadoRuta.CREADA && ruta.estado !== EstadoRuta.CARGADA) {
      throw new BadRequestException(
        `No se pueden agregar pedidos a una ruta en estado ${ruta.estado}`,
      );
    }

    const pedido = await this.pedidoRepo.findOne({ where: { id: dto.pedidoId } });
    if (!pedido) throw new NotFoundException(`Pedido ${dto.pedidoId} no encontrado`);
    if (pedido.estado !== EstadoPedido.PENDIENTE) {
      throw new BadRequestException(`El pedido debe estar en estado PENDIENTE`);
    }
    if (pedido.rutaId && pedido.rutaId !== rutaId) {
      throw new ConflictException(`El pedido ${dto.pedidoId} ya está asignado a otra ruta`);
    }

    const existeItem = await this.itemRutaRepo.findOne({
      where: { rutaId, pedidoId: dto.pedidoId },
    });
    if (existeItem) throw new ConflictException(`El pedido ya está en esta ruta`);

    const item = this.itemRutaRepo.create({
      rutaId,
      pedidoId: dto.pedidoId,
      ordenEntrega: dto.ordenEntrega,
      estado: EstadoPedido.PENDIENTE,
    });

    pedido.rutaId = rutaId;
    pedido.esDeRuta = true;
    await this.pedidoRepo.save(pedido);

    return this.itemRutaRepo.save(item);
  }

  async removePedido(rutaId: number, pedidoId: number) {
    const ruta = await this.rutaRepo.findOne({ where: { id: rutaId } });
    if (!ruta) throw new NotFoundException(`Ruta ${rutaId} no encontrada`);
    if (ruta.estado !== EstadoRuta.CREADA && ruta.estado !== EstadoRuta.CARGADA) {
      throw new BadRequestException(
        `No se pueden remover pedidos de una ruta en estado ${ruta.estado}`,
      );
    }

    const item = await this.itemRutaRepo.findOne({
      where: { rutaId, pedidoId },
    });
    if (!item) throw new NotFoundException(`Pedido ${pedidoId} no está en la ruta`);

    const pedido = await this.pedidoRepo.findOne({ where: { id: pedidoId } });
    if (pedido) {
      pedido.rutaId = undefined as unknown as number;
      pedido.esDeRuta = false;
      if (pedido.estado === EstadoPedido.CARGADO_EN_RUTA) {
        pedido.estado = EstadoPedido.PENDIENTE;
      }
      await this.pedidoRepo.save(pedido);
    }

    await this.itemRutaRepo.remove(item);
    return { message: 'Pedido removido de la ruta' };
  }

  async cambiarEstado(id: number, dto: CambioEstadoRutaDto) {
    const ruta = await this.findOne(id);
    const estadoActual = ruta.estado;
    const estadoNuevo = dto.estado as EstadoRuta;

    const permitidos = TRANSICIONES_RUTA[estadoActual] ?? [];
    if (!permitidos.includes(estadoNuevo)) {
      throw new BadRequestException(
        `No se puede cambiar ruta de ${estadoActual} a ${estadoNuevo}`,
      );
    }

    // Al cargar en ruta, marcar pedidos como CARGADO_EN_RUTA
    if (estadoNuevo === EstadoRuta.CARGADA) {
      await this.pedidoRepo
        .createQueryBuilder()
        .update(Pedido)
        .set({ estado: EstadoPedido.CARGADO_EN_RUTA })
        .where('rutaId = :id AND estado = :estado', {
          id,
          estado: EstadoPedido.PENDIENTE,
        })
        .execute();
    }

    if (estadoNuevo === EstadoRuta.ANULADA) {
      await this.pedidoRepo
        .createQueryBuilder()
        .update(Pedido)
        .set({
          estado: EstadoPedido.PENDIENTE,
          rutaId: null as any,
          esDeRuta: false,
        })
        .where('rutaId = :id', { id })
        .andWhere('estado IN (:...estados)', {
          estados: [EstadoPedido.PENDIENTE, EstadoPedido.CARGADO_EN_RUTA],
        })
        .execute();
    }

    ruta.estado = estadoNuevo;
    if (dto.observaciones) ruta.observaciones = dto.observaciones;

    return this.rutaRepo.save(ruta);
  }

  async liquidar(rutaId: number, dto: LiquidarRutaDto) {
    const ruta = await this.findOne(rutaId);

    // Validar que ruta existe (evita registros huérfanos)
    const rutaExiste = await this.rutaRepo.findOne({
      where: { id: rutaId },
    });
    if (!rutaExiste) {
      throw new NotFoundException(
        `Ruta ${rutaId} no existe o fue eliminada`,
      );
    }

    if (ruta.estado !== EstadoRuta.EN_LIQUIDACION) {
      throw new BadRequestException(
        `La ruta debe estar en estado EN_LIQUIDACION para liquidar`,
      );
    }

    return this.pedidoRepo.manager.transaction(async (manager) => {
      const ahora = new Date();
      let liquidacionId: number;
      const liquidacionExistente = await manager.findOne(LiquidacionRuta, {
        where: { rutaId },
      });

      if (liquidacionExistente) {
        liquidacionExistente.fecha = ahora;
        liquidacionExistente.totalEntregado =
          Number(liquidacionExistente.totalEntregado) +
          Number(dto.totalEntregado ?? 0);
        liquidacionExistente.totalRecaudado =
          Number(liquidacionExistente.totalRecaudado) +
          Number(dto.totalRecaudado ?? 0);
        liquidacionExistente.totalCartera =
          Number(liquidacionExistente.totalCartera) +
          Number(dto.totalCartera ?? 0);
        liquidacionExistente.diferencia =
          Number(liquidacionExistente.diferencia) + Number(dto.diferencia ?? 0);
        liquidacionExistente.efectivoRecibido =
          Number(liquidacionExistente.efectivoRecibido) +
          Number(dto.efectivoRecibido ?? 0);
        liquidacionExistente.transferenciaRecibida =
          Number(liquidacionExistente.transferenciaRecibida) +
          Number(dto.transferenciaRecibida ?? 0);

        if (dto.observaciones?.trim()) {
          liquidacionExistente.observaciones =
            liquidacionExistente.observaciones?.trim()
              ? `${liquidacionExistente.observaciones} | ${dto.observaciones.trim()}`
              : dto.observaciones.trim();
        }

        await manager.save(LiquidacionRuta, liquidacionExistente);
        liquidacionId = liquidacionExistente.id;
      } else {
        const liquidacionNueva = manager.create(LiquidacionRuta, {
          rutaId,
          fecha: ahora,
          totalEntregado: dto.totalEntregado,
          totalRecaudado: dto.totalRecaudado,
          totalCartera: dto.totalCartera,
          diferencia: dto.diferencia,
          efectivoRecibido: dto.efectivoRecibido ?? 0,
          transferenciaRecibida: dto.transferenciaRecibida ?? 0,
          observaciones: dto.observaciones,
        });

        const savedLiquidacion = await manager.save(LiquidacionRuta, liquidacionNueva);
        liquidacionId = savedLiquidacion.id;
      }

      // Procesar estado de cada pedido según lo registrado en liquidación
      if (dto.pedidos && Array.isArray(dto.pedidos) && dto.pedidos.length > 0) {
        const pedidosNormalizados = dto.pedidos
          .map((p) => ({
            ...p,
            pedidoId: Number(p?.pedidoId),
            montoEfectivo: Number(p?.montoEfectivo ?? 0),
            montoTransferencia: Number(p?.montoTransferencia ?? 0),
          }))
          .filter((p) => Number.isFinite(p.pedidoId) && p.pedidoId > 0);

        const pedidosIds = Array.from(new Set(pedidosNormalizados.map((p) => p.pedidoId)));

        const itemsRuta = await manager.find(ItemRuta, {
          where: {
            rutaId,
            pedidoId: In(pedidosIds),
          },
        });

        const idsAsociadosRuta = new Set(itemsRuta.map((i) => Number(i.pedidoId)));

        const pedidosRuta = await manager.find(Pedido, {
          where: {
            id: In(pedidosIds),
          },
          relations: ['detalles'],
        });

        const pedidosRutaMap = new Map(pedidosRuta.map((p) => [Number(p.id), p]));

        for (const p of pedidosNormalizados) {
          if (!idsAsociadosRuta.has(p.pedidoId)) {
            throw new BadRequestException(
              `El pedido ${p.pedidoId} no está asociado a la ruta ${rutaId}`,
            );
          }

          const pedido = pedidosRutaMap.get(p.pedidoId);
          if (!pedido) {
            throw new BadRequestException(
              `El pedido ${p.pedidoId} no existe`,
            );
          }

          if (p.aCredito && !p.entregado) {
            throw new BadRequestException(
              `El pedido ${p.pedidoId} no puede marcarse a crédito si no fue entregado`,
            );
          }

          if (pedido.estado === EstadoPedido.CANCELADO) {
            throw new BadRequestException(
              `El pedido ${p.pedidoId} está cancelado y no se puede liquidar`,
            );
          }

          pedido.estado = p.entregado
            ? EstadoPedido.ENTREGADO
            : EstadoPedido.NO_ENTREGADO;

          // Auto-reparar desincronizaciones en pruebas entre item_ruta y pedido.rutaId.
          pedido.rutaId = rutaId;
          pedido.esDeRuta = true;

          await manager.save(Pedido, pedido);

          // Automatización de venta en liquidación de ruta.
          // Reglas:
          // - ENTREGADO + CREDITO -> cartera
          // - ENTREGADO + contado -> pago con efectivo/transferencia disponible
          // - NO_ENTREGADO -> no crea venta
          if (!p.entregado) continue;

          const ventaExistente = await manager.findOne(Venta, {
            where: { pedidoId: pedido.id },
          });
          if (ventaExistente) continue;

          const totalVenta = Number(
            (pedido.detalles ?? []).reduce(
              (acc, d) => acc + Number(d?.subtotal ?? 0),
              0,
            ),
          );

          if (totalVenta <= 0) continue;

          let montoPagado = 0;
          let saldoPendiente = totalVenta;
          let estadoVenta: EstadoVenta = EstadoVenta.PENDIENTE;

          let pagoEfectivo = 0;
          let pagoTransferencia = 0;

          if (!p.aCredito) {
            const tipoPagoPedido = p.tipoPago ?? TipoPago.EFECTIVO;
            const montoEfectivoInput = Math.max(0, Number(p.montoEfectivo ?? 0));
            const montoTransferenciaInput = Math.max(0, Number(p.montoTransferencia ?? 0));

            if (tipoPagoPedido === 'EFECTIVO') {
              pagoEfectivo = montoEfectivoInput > 0 ? montoEfectivoInput : totalVenta;
              pagoTransferencia = 0;
            } else if (tipoPagoPedido === 'TRANSFERENCIA') {
              pagoTransferencia = montoTransferenciaInput > 0 ? montoTransferenciaInput : totalVenta;
              pagoEfectivo = 0;
            } else {
              pagoEfectivo = montoEfectivoInput;
              pagoTransferencia = montoTransferenciaInput;
            }

            const pagoSolicitado = pagoEfectivo + pagoTransferencia;
            if (pagoSolicitado > totalVenta) {
              throw new BadRequestException(
                `El pago del pedido ${pedido.id} excede el total del pedido`,
              );
            }

            montoPagado = pagoSolicitado;
          }

          saldoPendiente = Math.max(0, totalVenta - montoPagado);
          estadoVenta =
            saldoPendiente <= 0
              ? EstadoVenta.COMPLETADA
              : montoPagado > 0
                ? EstadoVenta.PARCIAL
                : EstadoVenta.PENDIENTE;

          const numeroVenta = await this.generarConsecutivo(
            manager,
            Venta,
            'v',
            'VEN',
            ahora,
          );

          const venta = manager.create(Venta, {
            numero: numeroVenta,
            clienteId: pedido.clienteId,
            pedidoId: pedido.id,
            liquidacionRutaId: liquidacionId,
            fecha: ahora,
            estado: estadoVenta,
            totalVenta,
            totalPagado: montoPagado,
            saldoPendiente,
          });
          const savedVenta = await manager.save(Venta, venta);

          for (const det of pedido.detalles ?? []) {
            await manager.save(
              DetalleVenta,
              manager.create(DetalleVenta, {
                ventaId: savedVenta.id,
                productoId: det.productoId,
                cantidad: Number(det.cantidad ?? 0),
                precioUnitario: Number(det.precioUnitario ?? 0),
                subtotal: Number(det.subtotal ?? 0),
              }),
            );
          }

          if (pagoEfectivo > 0) {
            const numeroPagoEfectivo = await this.generarConsecutivo(
              manager,
              Pago,
              'p',
              'PAG',
              ahora,
            );

            const pago = await manager.save(
              Pago,
              manager.create(Pago, {
                numero: numeroPagoEfectivo,
                ventaId: savedVenta.id,
                clienteId: pedido.clienteId,
                tipo: TipoPago.EFECTIVO,
                monto: pagoEfectivo,
                fecha: ahora,
                observaciones: `Pago automático liquidación ruta ${ruta.numero}`,
              }),
            );

            const numeroCaja = await this.generarConsecutivo(
              manager,
              MovimientoCaja,
              'm',
              'CAJ',
              ahora,
            );

            await manager.save(
              MovimientoCaja,
              manager.create(MovimientoCaja, {
                numero: numeroCaja,
                tipo: TipoMovimientoCaja.INGRESO_VENTA_EFECTIVO,
                medioPago: TipoPago.EFECTIVO,
                monto: pagoEfectivo,
                fecha: ahora,
                pagoId: pago.id,
                clienteId: pedido.clienteId,
                concepto: `Liquidación ruta ${ruta.numero} - ${pedido.numero}`,
              }),
            );
          }

          if (pagoTransferencia > 0) {
            const numeroPagoTransferencia = await this.generarConsecutivo(
              manager,
              Pago,
              'p',
              'PAG',
              ahora,
            );

            const pago = await manager.save(
              Pago,
              manager.create(Pago, {
                numero: numeroPagoTransferencia,
                ventaId: savedVenta.id,
                clienteId: pedido.clienteId,
                tipo: TipoPago.TRANSFERENCIA,
                monto: pagoTransferencia,
                fecha: ahora,
                observaciones: `Pago automático liquidación ruta ${ruta.numero}`,
              }),
            );

            const numeroCaja = await this.generarConsecutivo(
              manager,
              MovimientoCaja,
              'm',
              'CAJ',
              ahora,
            );

            await manager.save(
              MovimientoCaja,
              manager.create(MovimientoCaja, {
                numero: numeroCaja,
                tipo: TipoMovimientoCaja.INGRESO_VENTA_TRANSFERENCIA,
                medioPago: TipoPago.TRANSFERENCIA,
                monto: pagoTransferencia,
                fecha: ahora,
                pagoId: pago.id,
                clienteId: pedido.clienteId,
                concepto: `Liquidación ruta ${ruta.numero} - ${pedido.numero}`,
              }),
            );
          }

          if (saldoPendiente > 0) {
            await manager.save(
              Cartera,
              manager.create(Cartera, {
                clienteId: pedido.clienteId,
                ventaId: savedVenta.id,
                saldoPendiente,
                ultimoMovimiento: ahora,
              }),
            );
          }
        }
      }

      const pendientesRuta = await manager.count(Pedido, {
        where: {
          rutaId,
          estado: In([
            EstadoPedido.PENDIENTE,
            EstadoPedido.CARGADO_EN_RUTA,
            EstadoPedido.REPROGRAMADO,
          ]),
        },
      });

      // Marcar ruta como liquidada solo cuando todos sus pedidos fueron resueltos
      const rutaActualizada = await manager.findOne(Ruta, {
        where: { id: rutaId },
      });
      if (!rutaActualizada) {
        throw new NotFoundException(
          `Ruta ${rutaId} fue eliminada durante la liquidación`,
        );
      }

      rutaActualizada.estado =
        pendientesRuta === 0 ? EstadoRuta.LIQUIDADA : EstadoRuta.EN_LIQUIDACION;
      await manager.save(Ruta, rutaActualizada);

      return this.findOne(rutaId);
    });
  }
}
