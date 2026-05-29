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
  MovimientoInventario,
} from '../../../database/entities';
import {
  EstadoRuta,
  EstadoPedido,
  EstadoVenta,
  TipoPago,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
} from '../../../common/enums';
import {
  CreateRutaDto,
  AgregarPedidoRutaDto,
  LiquidarRutaDto,
  CambioEstadoRutaDto,
  PedidoEntregaDto,
} from './dto/rutas.dto';
import { ConsecutivoService } from '../../../common/services/consecutivo.service';
import { MoneyUtil } from '../../../common/utils';

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
  private readonly saldoMinimoCartera = 50;

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
    private consecutivoService: ConsecutivoService,
  ) {}

  private async generarConsecutivo(
    manager: any,
    entidad: any,
    alias: string,
    prefijo: string,
    fecha = new Date(),
  ): Promise<string> {
    return this.consecutivoService.generar(prefijo, fecha, manager);
  }

  private async generarNumeroRuta(): Promise<string> {
    return this.consecutivoService.generar('RUT');
  }

  private toMoneyNumber(value: unknown): number {
    return MoneyUtil.normalize(value as number | string | null | undefined);
  }

  private liquidacionMatchesSnapshot(
    liquidacion: LiquidacionRuta,
    dto: LiquidarRutaDto,
  ): boolean {
    return (
      this.toMoneyNumber(liquidacion.totalEntregado) ===
        this.toMoneyNumber(dto.totalEntregado) &&
      this.toMoneyNumber(liquidacion.totalRecaudado) ===
        this.toMoneyNumber(dto.totalRecaudado) &&
      this.toMoneyNumber(liquidacion.totalCartera) ===
        this.toMoneyNumber(dto.totalCartera) &&
      this.toMoneyNumber(liquidacion.diferencia) ===
        this.toMoneyNumber(dto.diferencia) &&
      this.toMoneyNumber(liquidacion.efectivoRecibido) ===
        this.toMoneyNumber(dto.efectivoRecibido) &&
      this.toMoneyNumber(liquidacion.transferenciaRecibida) ===
        this.toMoneyNumber(dto.transferenciaRecibida)
    );
  }

  private applyLiquidacionSnapshot(
    liquidacion: LiquidacionRuta,
    dto: LiquidarRutaDto,
    fecha: Date,
  ): LiquidacionRuta {
    liquidacion.fecha = fecha;
    liquidacion.totalEntregado = this.toMoneyNumber(dto.totalEntregado);
    liquidacion.totalRecaudado = this.toMoneyNumber(dto.totalRecaudado);
    liquidacion.totalCartera = this.toMoneyNumber(dto.totalCartera);
    liquidacion.diferencia = this.toMoneyNumber(dto.diferencia);
    liquidacion.efectivoRecibido = this.toMoneyNumber(dto.efectivoRecibido);
    liquidacion.transferenciaRecibida = this.toMoneyNumber(
      dto.transferenciaRecibida,
    );
    liquidacion.observaciones = (dto.observaciones?.trim() || null) as any;
    return liquidacion;
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
        where: { id: dto.domiciliarioId },
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

    // Validación crítica: al cargar o entregar, se requieren pedidos/items
    if (estadoNuevo === EstadoRuta.CARGADA || estadoNuevo === EstadoRuta.EN_ENTREGA) {
      const itemsExistentes = await this.itemRutaRepo.count({
        where: { rutaId: id },
      });
      if (itemsExistentes === 0) {
        throw new BadRequestException(
          `No se puede pasar la ruta a ${estadoNuevo}: no tiene pedidos asignados`,
        );
      }
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

    if (ruta.estado === EstadoRuta.LIQUIDADA) {
      const liquidacionExistente = await this.liquidacionRepo.findOne({
        where: { rutaId },
      });
      if (
        liquidacionExistente &&
        this.liquidacionMatchesSnapshot(liquidacionExistente, dto)
      ) {
        return ruta;
      }

      throw new BadRequestException(
        `La ruta ya fue liquidada y no puede modificarse`,
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
        await manager.save(
          LiquidacionRuta,
          this.applyLiquidacionSnapshot(liquidacionExistente, dto, ahora),
        );
        liquidacionId = liquidacionExistente.id;
      } else {
        const liquidacionNueva = manager.create(LiquidacionRuta, {
          rutaId,
          fecha: ahora,
          totalEntregado: this.toMoneyNumber(dto.totalEntregado),
          totalRecaudado: this.toMoneyNumber(dto.totalRecaudado),
          totalCartera: this.toMoneyNumber(dto.totalCartera),
          diferencia: this.toMoneyNumber(dto.diferencia),
          efectivoRecibido: this.toMoneyNumber(dto.efectivoRecibido),
          transferenciaRecibida: this.toMoneyNumber(dto.transferenciaRecibida),
          observaciones: dto.observaciones?.trim() || undefined,
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
            montoEfectivo: MoneyUtil.maxZero(p?.montoEfectivo),
            montoTransferencia: MoneyUtil.maxZero(p?.montoTransferencia),
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

          const movimientosExistentes = await manager.count(MovimientoInventario, {
            where: {
              rutaId,
              tipo: TipoMovimientoInventario.DESPACHO_ENTREGA,
              observaciones: `Pedido ${pedido.numero} ENTREGADO`,
            },
          });
          if (movimientosExistentes === 0) {
            const movimientosInventario = (pedido.detalles ?? []).map((detalle) =>
              manager.create(MovimientoInventario, {
                productoId: detalle.productoId,
                tipo: TipoMovimientoInventario.DESPACHO_ENTREGA,
                cantidad: detalle.cantidad,
                fecha: ahora,
                rutaId,
                observaciones: `Pedido ${pedido.numero} ENTREGADO`,
              }),
            );
            if (movimientosInventario.length > 0) {
              await manager.save(MovimientoInventario, movimientosInventario);
            }
          }

          const ventaExistente = await manager.findOne(Venta, {
            where: { pedidoId: pedido.id },
          });
          if (ventaExistente) continue;

          const totalVenta = MoneyUtil.add(
            ...(pedido.detalles ?? []).map((d) => d?.subtotal ?? 0),
          );

          if (MoneyUtil.compare(totalVenta, 0) <= 0) continue;

          let montoPagado = 0;
          let saldoPendiente = totalVenta;
          let estadoVenta: EstadoVenta = EstadoVenta.PENDIENTE;

          let pagoEfectivo = 0;
          let pagoTransferencia = 0;

          if (!p.aCredito) {
            const tipoPagoPedido = p.tipoPago ?? TipoPago.EFECTIVO;
            const montoEfectivoInput = MoneyUtil.maxZero(p.montoEfectivo);
            const montoTransferenciaInput = MoneyUtil.maxZero(
              p.montoTransferencia,
            );

            if (tipoPagoPedido === 'EFECTIVO') {
              pagoEfectivo =
                MoneyUtil.compare(montoEfectivoInput, 0) > 0
                  ? montoEfectivoInput
                  : totalVenta;
              pagoTransferencia = 0;
            } else if (tipoPagoPedido === 'TRANSFERENCIA') {
              pagoTransferencia =
                MoneyUtil.compare(montoTransferenciaInput, 0) > 0
                  ? montoTransferenciaInput
                  : totalVenta;
              pagoEfectivo = 0;
            } else {
              pagoEfectivo = montoEfectivoInput;
              pagoTransferencia = montoTransferenciaInput;
            }

            const pagoSolicitado = MoneyUtil.add(
              pagoEfectivo,
              pagoTransferencia,
            );
            if (MoneyUtil.compare(pagoSolicitado, totalVenta) > 0) {
              throw new BadRequestException(
                `El pago del pedido ${pedido.id} excede el total del pedido`,
              );
            }

            montoPagado = pagoSolicitado;
          }

          saldoPendiente = MoneyUtil.maxZero(
            MoneyUtil.subtract(totalVenta, montoPagado),
          );
          if (
            MoneyUtil.compare(saldoPendiente, 0) > 0 &&
            MoneyUtil.compare(saldoPendiente, this.saldoMinimoCartera) < 0
          ) {
            throw new BadRequestException(
              `El pedido ${pedido.numero ?? pedido.id} queda con saldo de $${saldoPendiente}. Ajusta el pago para cancelarlo completo o deja al menos $${this.saldoMinimoCartera} en cartera.`,
            );
          }
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
                precioUnitario: MoneyUtil.normalize(det.precioUnitario),
                subtotal: MoneyUtil.normalize(det.subtotal),
              }),
            );
          }

          if (MoneyUtil.compare(pagoEfectivo, 0) > 0) {
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

          if (MoneyUtil.compare(pagoTransferencia, 0) > 0) {
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

          if (MoneyUtil.compare(saldoPendiente, 0) > 0) {
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

      return manager.findOne(Ruta, {
        where: { id: rutaId },
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
    });
  }
}
