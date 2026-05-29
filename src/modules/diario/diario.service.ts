import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import {
  AperturaDiaria,
  InventarioInicial,
  ProduccionDiaria,
  MovimientoInventario,
  CierreDiario,
  CierreCaja,
  CierreInventario,
  MovimientoCaja,
  Pedido,
  Ruta,
  Trabajador,
  TrabajadorLabor,
  Venta,
  DetalleVenta,
  Cartera,
} from '../../database/entities';
import {
  TipoMovimientoInventario,
  EstadoPedido,
  EstadoRuta,
  EstadoVenta,
} from '../../common/enums';
import {
  AbrirDiaDto,
  RegistrarProduccionDto,
  CerrarDiaDto,
} from './dto/diario.dto';
import { ConsecutivoService } from '../../common/services/consecutivo.service';
import { MoneyUtil } from '../../common/utils';

@Injectable()
export class DiarioService {
  constructor(
    @InjectRepository(AperturaDiaria)
    private aperturaRepo: Repository<AperturaDiaria>,
    @InjectRepository(InventarioInicial)
    private invInicialRepo: Repository<InventarioInicial>,
    @InjectRepository(ProduccionDiaria)
    private produccionRepo: Repository<ProduccionDiaria>,
    @InjectRepository(MovimientoInventario)
    private movInvRepo: Repository<MovimientoInventario>,
    @InjectRepository(CierreDiario)
    private cierreDiarioRepo: Repository<CierreDiario>,
    @InjectRepository(CierreCaja)
    private cierreCajaRepo: Repository<CierreCaja>,
    @InjectRepository(CierreInventario)
    private cierreInvRepo: Repository<CierreInventario>,
    @InjectRepository(MovimientoCaja)
    private movCajaRepo: Repository<MovimientoCaja>,
    @InjectRepository(Pedido)
    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(Ruta)
    private rutaRepo: Repository<Ruta>,
    @InjectRepository(Trabajador)
    private trabajadorRepo: Repository<Trabajador>,
    @InjectRepository(TrabajadorLabor)
    private trabajadorLaborRepo: Repository<TrabajadorLabor>,
    private dataSource: DataSource,
    private consecutivoService: ConsecutivoService,
  ) {}

  private canReuseOpenDayInDevelopment() {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_REOPEN_DAY_IN_DEV === 'true'
    );
  }

  private getFechaLocalISO(fecha?: string) {
    if (fecha) {
      const base = fecha.includes('T') ? fecha.split('T')[0] : fecha;
      const [y, m, d] = base.split('-').map(Number);
      if (y && m && d) {
        return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      }
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private buildLocalDate(fechaISO: string) {
    const [y, m, d] = fechaISO.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  private getDayRange(fechaISO: string) {
    const [y, m, d] = fechaISO.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { start, end };
  }

  private async limpiarCierreDelDiaEnDesarrollo(
    manager: EntityManager,
    fechaStr: string,
  ) {
    if (!this.canReuseOpenDayInDevelopment()) return;

    const cierres = await manager
      .createQueryBuilder(CierreDiario, 'c')
      .where('DATE(c.fecha) = :fecha', { fecha: fechaStr })
      .getMany();

    const cierreIds = cierres.map((cierre) => cierre.id);
    const cierreCajaIds = cierres
      .map((cierre) => cierre.cierreCajaId)
      .filter((id): id is number => Number.isFinite(Number(id)));

    if (cierreIds.length > 0) {
      await manager.delete(CierreInventario, { cierreDiarioId: In(cierreIds) });
      await manager.delete(CierreDiario, { id: In(cierreIds) });
    }

    const cajasHuerfanas = await manager
      .createQueryBuilder(CierreCaja, 'cc')
      .leftJoin(CierreDiario, 'cd', 'cd.cierreCajaId = cc.id')
      .where('DATE(cc.fecha) = :fecha', { fecha: fechaStr })
      .andWhere('cd.id IS NULL')
      .getMany();

    cierreCajaIds.push(...cajasHuerfanas.map((caja) => caja.id));

    const uniqueCajaIds = [...new Set(cierreCajaIds)];
    if (uniqueCajaIds.length > 0) {
      await manager.delete(CierreCaja, { id: In(uniqueCajaIds) });
    }
  }

  private async garantizarCarteraPendientePorPedidosEntregados(
    manager: EntityManager,
    fechaStr: string,
  ) {
    const pedidosEntregados = await manager
      .createQueryBuilder(Pedido, 'p')
      .leftJoinAndSelect('p.detalles', 'd')
      .where('DATE(p.fecha) = :fecha', { fecha: fechaStr })
      .andWhere('p.estado = :estado', { estado: EstadoPedido.ENTREGADO })
      .getMany();

    const fechaOperacion = this.buildLocalDate(fechaStr);

    for (const pedido of pedidosEntregados) {
      const totalPedido = MoneyUtil.add(
        ...(pedido.detalles ?? []).map((det) => det.subtotal ?? 0),
      );

      if (MoneyUtil.compare(totalPedido, 0) <= 0) {
        continue;
      }

      let venta = await manager.findOne(Venta, {
        where: { pedidoId: pedido.id },
        order: { id: 'DESC' },
      });

      if (!venta) {
        const numeroVenta = await this.consecutivoService.generar(
          'VEN',
          fechaOperacion,
          manager,
        );

        venta = await manager.save(
          Venta,
          manager.create(Venta, {
            numero: numeroVenta,
            clienteId: pedido.clienteId,
            pedidoId: pedido.id,
            fecha: fechaOperacion,
            estado: EstadoVenta.PENDIENTE,
            totalVenta: totalPedido,
            totalPagado: 0,
            saldoPendiente: totalPedido,
          }),
        );

        const detallesVenta = (pedido.detalles ?? []).map((det) =>
          manager.create(DetalleVenta, {
            ventaId: venta!.id,
            productoId: det.productoId,
            cantidad: det.cantidad,
            precioUnitario: det.precioUnitario,
            subtotal: det.subtotal,
          }),
        );

        if (detallesVenta.length > 0) {
          await manager.save(DetalleVenta, detallesVenta);
        }
      }

      const saldoPendiente = MoneyUtil.normalize(venta.saldoPendiente ?? 0);
      if (MoneyUtil.compare(saldoPendiente, 0) <= 0) {
        continue;
      }

      const carteraExistente = await manager.findOne(Cartera, {
        where: { ventaId: venta.id },
      });

      if (carteraExistente) {
        carteraExistente.saldoPendiente = saldoPendiente;
        carteraExistente.ultimoMovimiento = fechaOperacion;
        await manager.save(Cartera, carteraExistente);
      } else {
        await manager.save(
          Cartera,
          manager.create(Cartera, {
            clienteId: venta.clienteId,
            ventaId: venta.id,
            saldoPendiente,
            ultimoMovimiento: fechaOperacion,
          }),
        );
      }
    }
  }

  async getEstadoDia(fecha?: string) {
    const fechaStr = this.getFechaLocalISO(fecha);
    const { start, end } = this.getDayRange(fechaStr);

    const apertura = await this.aperturaRepo
      .createQueryBuilder('a')
      .where('DATE(a.fecha) = :fecha', { fecha: fechaStr })
      .leftJoinAndSelect('a.inventariosInicial', 'inv')
      .leftJoinAndSelect('inv.producto', 'invProducto')
      .leftJoinAndSelect('a.producciondiaria', 'prod')
      .leftJoinAndSelect('prod.producto', 'prodProducto')
      .getOne();

    const cierre = await this.cierreDiarioRepo
      .createQueryBuilder('c')
      .where('DATE(c.fecha) = :fecha', { fecha: fechaStr })
      .leftJoinAndSelect('c.cierreCaja', 'cc')
      .getOne();

    const pedidosPendientes = await this.pedidoRepo.count({
      where: { estado: EstadoPedido.PENDIENTE },
    });

    const rutasAbiertas = await this.rutaRepo
      .createQueryBuilder('r')
      .where('r.estado NOT IN (:...estados)', {
        estados: [EstadoRuta.LIQUIDADA, EstadoRuta.ANULADA],
      })
      .andWhere('DATE(r.fecha) = :fecha', { fecha: fechaStr })
      .getCount();

    const movimientos = await this.movCajaRepo
      .createQueryBuilder('m')
      .where('m.fecha >= :start AND m.fecha <= :end', { start, end })
      .getMany();

    let ingresosEfectivo = 0;
    let ingresosTransferencias = 0;
    let egresos = 0;

    for (const mov of movimientos) {
      const esIngreso = String(mov.tipo ?? '').startsWith('INGRESO');
      const monto = MoneyUtil.normalize(mov.monto ?? 0);
      if (MoneyUtil.compare(monto, 0) <= 0) continue;

      if (esIngreso) {
        if (mov.medioPago === 'EFECTIVO') {
          ingresosEfectivo = MoneyUtil.add(ingresosEfectivo, monto);
        } else {
          ingresosTransferencias = MoneyUtil.add(
            ingresosTransferencias,
            monto,
          );
        }
      } else {
        egresos = MoneyUtil.add(egresos, monto);
      }
    }

    const aperturaHoy = MoneyUtil.normalize(apertura?.saldoInicial ?? 0);
    const ingresosTotal = MoneyUtil.add(ingresosEfectivo, ingresosTransferencias);
    const saldoEstimadoCaja = MoneyUtil.subtract(
      MoneyUtil.add(aperturaHoy, ingresosEfectivo),
      egresos,
    );

    const ventasHoy = await this.dataSource.manager
      .createQueryBuilder(Venta, 'v')
      .where('v.fecha >= :start AND v.fecha <= :end', { start, end })
      .getCount();

    const carteraRaw = await this.dataSource.manager
      .createQueryBuilder(Cartera, 'c')
      .select('COALESCE(SUM(c.saldoPendiente), 0)', 'total')
      .where('c.saldoPendiente > 0')
      .getRawOne<{ total: string }>();

    const carteraTotal = MoneyUtil.normalize(carteraRaw?.total ?? 0);

    return {
      fecha: fechaStr,
      apertura,
      cierre,
      abierto: !!apertura && !cierre,
      pedidosPendientes,
      rutasAbiertas,
      ventasHoy,
      carteraTotal,
      cajaResumen: {
        apertura: aperturaHoy,
        ingresosEfectivo,
        ingresosTransferencias,
        ingresosTotal,
        egresos,
        saldoEstimadoCaja,
      },
    };
  }

  async getDiaAbiertoPendiente(fecha?: string) {
    const fechaReferencia = this.getFechaLocalISO(fecha);
    const apertura = await this.aperturaRepo
      .createQueryBuilder('a')
      .where(
        `NOT EXISTS (
          SELECT 1
          FROM cierre_diario c
          WHERE DATE(c.fecha) = DATE(a.fecha)
        )`,
      )
      .orderBy('a.fecha', 'ASC')
      .getOne();

    if (!apertura) {
      return null;
    }

    const fechaAbierta = this.getFechaLocalISO(apertura.fecha.toISOString());

    return {
      aperturaId: apertura.id,
      fecha: fechaAbierta,
      esFechaActual: fechaAbierta === fechaReferencia,
      saldoInicial: MoneyUtil.normalize(apertura.saldoInicial ?? 0),
      createdAt: apertura.createdAt,
    };
  }

  async abrirDia(dto: AbrirDiaDto, usuarioId: number) {
    const fechaStr = this.getFechaLocalISO(dto.fecha);

    const diaAbiertoAnterior = await this.aperturaRepo
      .createQueryBuilder('a')
      .where('DATE(a.fecha) <> :fecha', { fecha: fechaStr })
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM cierre_diario c
          WHERE DATE(c.fecha) = DATE(a.fecha)
        )`,
      )
      .orderBy('a.fecha', 'DESC')
      .getOne();

    if (diaAbiertoAnterior) {
      const fechaAbierta = this.getFechaLocalISO(
        diaAbiertoAnterior.fecha.toISOString(),
      );
      throw new ConflictException(
        `Debe cerrar el día ${fechaAbierta} antes de abrir ${fechaStr}`,
      );
    }

    const existente = await this.aperturaRepo
      .createQueryBuilder('a')
      .where('DATE(a.fecha) = :fecha', { fecha: fechaStr })
      .getOne();

    const cierreExistente = await this.cierreDiarioRepo
      .createQueryBuilder('c')
      .where('DATE(c.fecha) = :fecha', { fecha: fechaStr })
      .getOne();

    if (existente) {
      if (this.canReuseOpenDayInDevelopment() && !cierreExistente) {
        return this.dataSource.transaction(async (manager) => {
          await this.limpiarCierreDelDiaEnDesarrollo(manager, fechaStr);
          return manager.findOne(AperturaDiaria, {
            where: { id: existente.id },
            relations: ['inventariosInicial', 'inventariosInicial.producto'],
          });
        });
      }

      // En modo desarrollo: si el día ya fue cerrado, eliminar el cierre para poder reabrirlo
      if (this.canReuseOpenDayInDevelopment() && cierreExistente) {
        return this.dataSource.transaction(async (manager) => {
          await this.limpiarCierreDelDiaEnDesarrollo(manager, fechaStr);
          return manager.findOne(AperturaDiaria, {
            where: { id: existente.id },
            relations: ['inventariosInicial', 'inventariosInicial.producto'],
          });
        });
      }

      throw new ConflictException(`Ya existe apertura para el día ${fechaStr}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const apertura = manager.create(AperturaDiaria, {
        fecha: this.buildLocalDate(fechaStr),
        usuarioId,
        saldoInicial: dto.saldoInicial,
        observaciones: dto.observaciones,
      });
      const savedApertura = await manager.save(AperturaDiaria, apertura);

      for (const item of dto.inventario) {
        await manager.save(
          InventarioInicial,
          manager.create(InventarioInicial, {
            productoId: item.productoId,
            aperturaDiariaId: savedApertura.id,
            cantidadInicial: item.cantidadInicial,
          }),
        );
      }

      return manager.findOne(AperturaDiaria, {
        where: { id: savedApertura.id },
        relations: ['inventariosInicial', 'inventariosInicial.producto'],
      });
    });
  }

  async registrarProduccion(dto: RegistrarProduccionDto, fecha?: string) {
    const fechaStr = this.getFechaLocalISO(fecha);

    const apertura = await this.aperturaRepo
      .createQueryBuilder('a')
      .where('DATE(a.fecha) = :fecha', { fecha: fechaStr })
      .getOne();

    if (!apertura) {
      throw new BadRequestException(`No hay apertura para el día ${fechaStr}`);
    }

    const cierre = await this.cierreDiarioRepo
      .createQueryBuilder('c')
      .where('DATE(c.fecha) = :fecha', { fecha: fechaStr })
      .getOne();

    if (cierre) {
      throw new BadRequestException(`El día ${fechaStr} ya está cerrado`);
    }

    return this.dataSource.transaction(async (manager) => {
      const results: ProduccionDiaria[] = [];
      for (const item of dto.items) {
        // Upsert producción
        let prod = await manager.findOne(ProduccionDiaria, {
          where: {
            productoId: item.productoId,
            aperturaDiariaId: apertura.id,
          },
        });

        if (prod) {
          prod.cantidad += item.cantidad;
          prod.observaciones = item.observaciones ?? prod.observaciones;
        } else {
          prod = manager.create(ProduccionDiaria, {
            productoId: item.productoId,
            aperturaDiariaId: apertura.id,
            cantidad: item.cantidad,
            observaciones: item.observaciones,
          });
        }

        const savedProd = await manager.save(ProduccionDiaria, prod);
        results.push(savedProd);

        // Registrar movimiento inventario
        await manager.save(
          MovimientoInventario,
          manager.create(MovimientoInventario, {
            productoId: item.productoId,
            tipo: TipoMovimientoInventario.PRODUCCION,
            cantidad: item.cantidad,
            fecha: new Date(),
            produccionId: savedProd.id,
            observaciones: item.observaciones,
          }),
        );
      }
      return results;
    });
  }

  async cerrarDia(dto: CerrarDiaDto, usuarioId: number, fecha?: string) {
    const fechaStr = this.getFechaLocalISO(fecha);

    const apertura = await this.aperturaRepo
      .createQueryBuilder('a')
      .where('DATE(a.fecha) = :fecha', { fecha: fechaStr })
      .leftJoinAndSelect('a.inventariosInicial', 'inv')
      .leftJoinAndSelect('a.producciondiaria', 'prod')
      .getOne();

    if (!apertura) {
      throw new BadRequestException(`No hay apertura para el día ${fechaStr}`);
    }

    const existeCierre = await this.cierreDiarioRepo
      .createQueryBuilder('c')
      .where('DATE(c.fecha) = :fecha', { fecha: fechaStr })
      .getOne();
    if (existeCierre) {
      throw new ConflictException(`Ya existe cierre para el día ${fechaStr}`);
    }

    // Validaciones de precondición
    const rutasSinLiquidar = await this.rutaRepo
      .createQueryBuilder('r')
      .where('r.estado NOT IN (:...estados)', {
        estados: [EstadoRuta.LIQUIDADA, EstadoRuta.ANULADA],
      })
      .andWhere('DATE(r.fecha) = :fecha', { fecha: fechaStr })
      .getCount();

    const rutasLiquidadas = rutasSinLiquidar === 0;

    const pedidosPendientesCierre = await this.pedidoRepo
      .createQueryBuilder('p')
      .where('DATE(p.fecha) = :fecha', { fecha: fechaStr })
      .andWhere('p.estado IN (:...estados)', {
        estados: [
          EstadoPedido.PENDIENTE,
          EstadoPedido.CARGADO_EN_RUTA,
          EstadoPedido.NO_ENTREGADO,
          EstadoPedido.REPROGRAMADO,
        ],
      })
      .getCount();

    const trabajadoresConLaborPendiente = await this.trabajadorLaborRepo
      .createQueryBuilder('l')
      .innerJoin(Trabajador, 't', 't.id = l.trabajadorId')
      .where('DATE(l.fecha) = :fecha', { fecha: fechaStr })
      .andWhere('t.saldoTotal > 0')
      .select('COUNT(DISTINCT l.trabajadorId)', 'total')
      .getRawOne<{ total: string }>();

    const trabajadoresPagados = Number(trabajadoresConLaborPendiente?.total ?? 0) === 0;
    const pedidosFinalizados = pedidosPendientesCierre === 0;

    return this.dataSource.transaction(async (manager) => {
      await this.limpiarCierreDelDiaEnDesarrollo(manager, fechaStr);
      await this.garantizarCarteraPendientePorPedidosEntregados(
        manager,
        fechaStr,
      );

      // Calcular totales de caja del día
      const movimientos = await manager
        .createQueryBuilder(MovimientoCaja, 'm')
        .where('DATE(m.fecha) = :fecha', { fecha: fechaStr })
        .getMany();

      let totalEfectivo = 0;
      let totalTransferencias = 0;
      let totalEgresos = 0;

      for (const mov of movimientos) {
        const esIngreso = mov.tipo.startsWith('INGRESO');
        if (esIngreso) {
          if (mov.medioPago === 'EFECTIVO') {
            totalEfectivo = MoneyUtil.add(totalEfectivo, mov.monto);
          } else {
            totalTransferencias = MoneyUtil.add(
              totalTransferencias,
              mov.monto,
            );
          }
        } else {
          totalEgresos = MoneyUtil.add(totalEgresos, mov.monto);
        }
      }

      const saldoCalculado = MoneyUtil.subtract(
        MoneyUtil.add(apertura.saldoInicial, totalEfectivo),
        totalEgresos,
      );
      const saldoContado = MoneyUtil.normalize(dto.saldoContado);
      const diferenciaCaja = MoneyUtil.subtract(saldoContado, saldoCalculado);

      // Crear cierre caja
      const cierreCaja = await manager.save(
        CierreCaja,
        manager.create(CierreCaja, {
          fecha: this.buildLocalDate(fechaStr),
          totalEfectivo,
          totalTransferencias,
          totalEgresos,
          saldoCalculado,
          saldoContado,
          diferencia: diferenciaCaja,
          observaciones: dto.observaciones,
        }),
      );

      // Cierre inventario
      const cierreInventarios: CierreInventario[] = [];
      for (const item of dto.inventario) {
        const invInicial = apertura.inventariosInicial?.find(
          (i) => i.productoId === item.productoId,
        );
        const prod = apertura.producciondiaria?.find(
          (p) => p.productoId === item.productoId,
        );

        const cantInicial = invInicial?.cantidadInicial ?? 0;
        const cantProducida = prod?.cantidad ?? 0;

        // Calcular salidas del día
        const salidas = await manager
          .createQueryBuilder(MovimientoInventario, 'm')
          .where('m.productoId = :pid', { pid: item.productoId })
          .andWhere('m.tipo IN (:...tipos)', {
            tipos: [
              TipoMovimientoInventario.DESPACHO_ENTREGA,
              TipoMovimientoInventario.DESPACHO_VENTA_DIRECTA,
            ],
          })
          .andWhere('DATE(m.fecha) = :fecha', { fecha: fechaStr })
          .select('SUM(m.cantidad)', 'total')
          .getRawOne<{ total: string }>();

        const devoluciones = await manager
          .createQueryBuilder(MovimientoInventario, 'm')
          .where('m.productoId = :pid', { pid: item.productoId })
          .andWhere('m.tipo = :tipo', { tipo: TipoMovimientoInventario.DEVOLUCION })
          .andWhere('DATE(m.fecha) = :fecha', { fecha: fechaStr })
          .select('SUM(m.cantidad)', 'total')
          .getRawOne<{ total: string }>();

        const cantSalida = Number(salidas?.total ?? 0);
        const cantDevolucion = Number(devoluciones?.total ?? 0);
        const cantEsperada = cantInicial + cantProducida - cantSalida + cantDevolucion;
        const diferencia = item.cantidadContada - cantEsperada;

        const ci = manager.create(CierreInventario, {
          productoId: item.productoId,
          cierreDiarioId: 0, // lo completamos abajo
          cantidadInicial: cantInicial,
          cantidadProducida: cantProducida,
          cantidadSalida: cantSalida,
          cantidadDevoluciones: cantDevolucion,
          cantidadEsperada: cantEsperada,
          cantidadContada: item.cantidadContada,
          diferencia,
          observaciones: item.observaciones,
        });
        cierreInventarios.push(ci);
      }

      // Crear cierre diario
      const cierreDiario = await manager.save(
        CierreDiario,
        manager.create(CierreDiario, {
          fecha: this.buildLocalDate(fechaStr),
          usuarioId,
          cierreCajaId: cierreCaja.id,
          rutasLiquidadas,
          pedidosFinalizados,
          inventarioContado: dto.inventario.length > 0,
          cajaCuadrada: Math.abs(diferenciaCaja) < 100,
          trabajadoresPagados,
          observaciones: dto.observaciones,
        }),
      );

      // Guardar cierres inventario con el id correcto
      for (const ci of cierreInventarios) {
        ci.cierreDiarioId = cierreDiario.id;
        await manager.save(CierreInventario, ci);
      }

      return manager.findOne(CierreDiario, {
        where: { id: cierreDiario.id },
        relations: ['cierreCaja', 'cierreInventario', 'cierreInventario.producto'],
      });
    });
  }

  async getHistorial(page = 1, limit = 10) {
    const [data, total] = await this.cierreDiarioRepo.findAndCount({
      relations: ['cierreCaja', 'usuario'],
      order: { fecha: 'DESC' },
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
}
