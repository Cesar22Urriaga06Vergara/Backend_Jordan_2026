import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Trabajador,
  TrabajadorLabor,
  LaborTarifa,
  PagoTrabajador,
  AnticipoPrestamo,
  AbonoDeuda,
  MovimientoCaja,
  LaborTipo,
} from '../../database/entities';
import {
  EstadoAnticipoPrestamo,
  TipoLabor,
  TipoMovimientoCaja,
  TipoPago,
} from '../../common/enums';
import {
  RegistrarLaborDto,
  PagarTrabajadorDto,
  RegistrarAnticipoDto,
  AbonarDeudaDto,
} from './dto/trabajadores-ops.dto';
import { ConsecutivoService } from '../../common/services/consecutivo.service';
import { MoneyUtil } from '../../common/utils';
import { LaborTiposService } from '../catalogos/labor-tipos/labor-tipos.service';

@Injectable()
export class TrabajadoresOpsService {
  constructor(
    @InjectRepository(Trabajador)
    private trabajadorRepo: Repository<Trabajador>,
    @InjectRepository(TrabajadorLabor)
    private laborRepo: Repository<TrabajadorLabor>,
    @InjectRepository(LaborTarifa)
    private tarifaRepo: Repository<LaborTarifa>,
    @InjectRepository(PagoTrabajador)
    private pagoTrabRepo: Repository<PagoTrabajador>,
    @InjectRepository(AnticipoPrestamo)
    private anticipoRepo: Repository<AnticipoPrestamo>,
    @InjectRepository(AbonoDeuda)
    private abonoRepo: Repository<AbonoDeuda>,
    @InjectRepository(MovimientoCaja)
    private cajaMov: Repository<MovimientoCaja>,
    @InjectRepository(LaborTipo)
    private laborTipoRepo: Repository<LaborTipo>,
    private laborTiposService: LaborTiposService,
    private dataSource: DataSource,
    private consecutivoService: ConsecutivoService,
  ) {}

  private unidadFromTipo(tipo?: TipoLabor) {
    if (tipo === TipoLabor.POR_PACA) return 'PACA';
    if (tipo === TipoLabor.POR_HORA) return 'HORA';
    return 'JORNADA';
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

  private parseFechaLocalToDate(fecha?: string) {
    const fechaStr = this.getFechaLocalISO(fecha);
    const [y, m, d] = fechaStr.split('-').map(Number);
    // Usar mediodia local evita que conversiones UTC cambien el dia calendario.
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  }

  private getDayRange(fecha?: string) {
    const fechaStr = this.getFechaLocalISO(fecha);
    const [y, m, d] = fechaStr.split('-').map(Number);
    const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
    const end = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
    return { start, end };
  }

  async getTiposLabor() {
    return this.laborTiposService.findAll(true);
  }

  async getLaboresToday(
    trabajadorId?: number,
    fecha?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const { start, end } = fecha
      ? this.getDayRange(fecha)
      : {
          start: this.getDayRange(fechaDesde).start,
          end: this.getDayRange(fechaHasta ?? fechaDesde).end,
        };

    const qb = this.laborRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.trabajador', 't')
      .leftJoinAndSelect('l.laborTarifa', 'lt')
      .leftJoinAndSelect('lt.laborTipo', 'ltt')
      .where('l.fecha >= :start AND l.fecha <= :end', { start, end });

    if (trabajadorId) qb.andWhere('l.trabajadorId = :tid', { tid: trabajadorId });
    return qb.getMany();
  }

  async registrarLabor(dto: RegistrarLaborDto) {
    const cantidad = Number(dto.cantidadRealizado ?? 1);
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const trabajador = await manager.findOne(Trabajador, {
        where: { id: dto.trabajadorId },
      });
      if (!trabajador) throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);

      let tarifa = dto.laborTarifaId
        ? await manager.findOne(LaborTarifa, {
            where: { id: dto.laborTarifaId, trabajadorId: dto.trabajadorId },
            relations: ['laborTipo'],
          })
        : null;

      if (!tarifa && dto.laborTipoId) {
        const laborTipo = await manager.findOne(LaborTipo, {
          where: { id: dto.laborTipoId, activo: true },
        });
        if (!laborTipo) {
          throw new NotFoundException(`Tipo de labor ${dto.laborTipoId} no encontrado`);
        }

        const valorUnitario = MoneyUtil.normalize(dto.valorUnitario ?? 0);
        if (MoneyUtil.compare(valorUnitario, 0) <= 0) {
          throw new BadRequestException('El valor unitario debe ser mayor a 0');
        }

        tarifa = await manager.findOne(LaborTarifa, {
          where: { trabajadorId: dto.trabajadorId, laborTipoId: laborTipo.id },
          relations: ['laborTipo'],
        });

        if (!tarifa) {
          tarifa = manager.create(LaborTarifa, {
            trabajadorId: dto.trabajadorId,
            laborTipoId: laborTipo.id,
            tarifa: valorUnitario,
            horas: laborTipo.tipo === TipoLabor.POR_JORNADA ? 8 : 1,
            unidad: this.unidadFromTipo(laborTipo.tipo),
            activo: true,
            laborTipo,
          });
        } else {
          tarifa.tarifa = valorUnitario;
          tarifa.unidad = this.unidadFromTipo(laborTipo.tipo);
          tarifa.activo = true;
          tarifa.laborTipo = laborTipo;
        }

        tarifa = await manager.save(LaborTarifa, tarifa);
      }

      if (!tarifa) {
        throw new NotFoundException(
          'Debe seleccionar una tarifa existente o definir tipo de labor y valor unitario',
        );
      }

      const valorUnitario = MoneyUtil.normalize(dto.valorUnitario ?? tarifa.tarifa);
      const montoCalculado = MoneyUtil.multiply(valorUnitario, cantidad);

      const labor = manager.create(TrabajadorLabor, {
        trabajadorId: dto.trabajadorId,
        laborTarifaId: tarifa.id,
        fecha: this.parseFechaLocalToDate(dto.fecha),
        cantidadRealizado: cantidad,
        montoAPagar: montoCalculado,
        observaciones: dto.observaciones,
      });

      trabajador.saldoTotal = MoneyUtil.add(trabajador.saldoTotal, montoCalculado);
      await manager.save(Trabajador, trabajador);

      return manager.save(TrabajadorLabor, labor);
    });
  }

  async pagarTrabajador(dto: PagarTrabajadorDto, usuarioId: number) {
    const trabajador = await this.trabajadorRepo.findOne({
      where: { id: dto.trabajadorId },
    });
    if (!trabajador) throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);

    return this.dataSource.transaction(async (manager) => {
      const montoBase = MoneyUtil.normalize(dto.montoBase);
      const descuentosAplicados = MoneyUtil.normalize(
        dto.descuentosAplicados ?? 0,
      );
      const abonoADeuda = MoneyUtil.normalize(dto.abonoADeuda ?? 0);
      const montoEntregado = MoneyUtil.subtract(
        montoBase,
        descuentosAplicados,
        abonoADeuda,
      );

      if (MoneyUtil.compare(montoEntregado, 0) < 0) {
        throw new BadRequestException(
          `El monto entregado (${montoEntregado}) no puede ser negativo`,
        );
      }

      const hoy = this.parseFechaLocalToDate(dto.fecha);
      const numero = await this.consecutivoService.generar(
        'PAG-T',
        hoy,
        manager,
      );

      const pago = manager.create(PagoTrabajador, {
        numero,
        trabajadorId: dto.trabajadorId,
        usuarioId,
        fecha: hoy,
        montoBase,
        descuentosAplicados,
        abonoADeuda,
        montoEntregado,
        observaciones: dto.observaciones,
      });
      await manager.save(PagoTrabajador, pago);

      // Reducir saldo total del trabajador
      trabajador.saldoTotal = MoneyUtil.maxZero(
        MoneyUtil.subtract(trabajador.saldoTotal, montoBase),
      );
      await manager.save(Trabajador, trabajador);

      // Movimiento caja egreso
      const numeroCaja = await this.consecutivoService.generar(
        'CAJ',
        hoy,
        manager,
      );

      await manager.save(
        MovimientoCaja,
        manager.create(MovimientoCaja, {
          numero: numeroCaja,
          tipo: TipoMovimientoCaja.PAGO_TRABAJADOR,
          medioPago: TipoPago.EFECTIVO,
          monto: montoEntregado,
          fecha: hoy,
          trabajadorId: dto.trabajadorId,
          concepto: `Pago trabajador ${trabajador.nombre}`,
        }),
      );

      return pago;
    });
  }

  async registrarAnticipo(dto: RegistrarAnticipoDto) {
    const trabajador = await this.trabajadorRepo.findOne({
      where: { id: dto.trabajadorId },
    });
    if (!trabajador) throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);

    return this.dataSource.transaction(async (manager) => {
      const hoy = this.parseFechaLocalToDate(dto.fecha);
      const monto = MoneyUtil.normalize(dto.monto);
      const numero = await this.consecutivoService.generar(
        'ANT',
        hoy,
        manager,
      );

      const anticipo = manager.create(AnticipoPrestamo, {
        numero,
        trabajadorId: dto.trabajadorId,
        tipo: dto.tipo,
        monto,
        estado: EstadoAnticipoPrestamo.ACTIVO,
        fecha: hoy,
        motivo: dto.motivo,
        observaciones: dto.observaciones,
      });
      const savedAnticipo = await manager.save(AnticipoPrestamo, anticipo);

      // Movimiento caja
      const numeroCaja = await this.consecutivoService.generar(
        'CAJ',
        hoy,
        manager,
      );

      const tipoMov =
        dto.tipo === 'PRESTAMO'
          ? TipoMovimientoCaja.PRESTAMOS
          : TipoMovimientoCaja.ANTICIPOS;

      await manager.save(
        MovimientoCaja,
        manager.create(MovimientoCaja, {
          numero: numeroCaja,
          tipo: tipoMov,
          medioPago: TipoPago.EFECTIVO,
          monto,
          fecha: hoy,
          trabajadorId: dto.trabajadorId,
          concepto: `${dto.tipo} - ${trabajador.nombre}`,
        }),
      );

      return savedAnticipo;
    });
  }

  async abonarDeuda(dto: AbonarDeudaDto) {
    const anticipo = await this.anticipoRepo.findOne({
      where: { id: dto.anticipoPrestamoId, trabajadorId: dto.trabajadorId },
    });
    if (!anticipo) {
      throw new NotFoundException(`Anticipo/Préstamo ${dto.anticipoPrestamoId} no encontrado`);
    }
    if (anticipo.estado === EstadoAnticipoPrestamo.PAGADO_COMPLETAMENTE) {
      throw new BadRequestException(`Este préstamo ya está completamente pagado`);
    }

    // Calcular total abonado
    const totalAbonado = await this.abonoRepo
      .createQueryBuilder('a')
      .where('a.anticipoPrestamoId = :id', { id: dto.anticipoPrestamoId })
      .select('SUM(a.monto)', 'total')
      .getRawOne<{ total: string }>();

    const montoAbonadoAntes = MoneyUtil.normalize(totalAbonado?.total ?? 0);
    const montoAbono = MoneyUtil.normalize(dto.monto);
    const saldoPendiente = MoneyUtil.subtract(
      anticipo.monto,
      montoAbonadoAntes,
      montoAbono,
    );

    if (MoneyUtil.compare(saldoPendiente, 0) < 0) {
      throw new BadRequestException(
        `El abono ($${montoAbono}) supera el saldo pendiente ($${MoneyUtil.subtract(anticipo.monto, montoAbonadoAntes)})`,
      );
    }

    const abono = this.abonoRepo.create({
      anticipoPrestamoId: dto.anticipoPrestamoId,
      trabajadorId: dto.trabajadorId,
      monto: montoAbono,
      fecha: this.parseFechaLocalToDate(dto.fecha),
      observaciones: dto.observaciones,
    });
    await this.abonoRepo.save(abono);

    // Actualizar estado del anticipo
    if (MoneyUtil.compare(saldoPendiente, 0) <= 0) {
      anticipo.estado = EstadoAnticipoPrestamo.PAGADO_COMPLETAMENTE;
    } else {
      anticipo.estado = EstadoAnticipoPrestamo.PAGADO_PARCIALMENTE;
    }
    await this.anticipoRepo.save(anticipo);

    return { abono, saldoPendiente };
  }

  async getAnticipos(trabajadorId?: number, fechaDesde?: string, fechaHasta?: string) {
    const qb = this.anticipoRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.abonos', 'ab')
      .leftJoinAndSelect('a.trabajador', 't');

    if (trabajadorId) qb.where('a.trabajadorId = :trabajadorId', { trabajadorId });
    if (fechaDesde || fechaHasta) {
      const { start } = this.getDayRange(fechaDesde);
      const { end } = this.getDayRange(fechaHasta ?? fechaDesde);
      qb.andWhere('a.fecha >= :start AND a.fecha <= :end', { start, end });
    }

    return qb.orderBy('a.fecha', 'DESC').addOrderBy('a.id', 'DESC').getMany();
  }

  async getPagos(trabajadorId?: number, fechaDesde?: string, fechaHasta?: string) {
    const qb = this.pagoTrabRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.trabajador', 't')
      .leftJoinAndSelect('p.usuario', 'u');

    if (trabajadorId) qb.where('p.trabajadorId = :trabajadorId', { trabajadorId });
    if (fechaDesde || fechaHasta) {
      const { start } = this.getDayRange(fechaDesde);
      const { end } = this.getDayRange(fechaHasta ?? fechaDesde);
      qb.andWhere('p.fecha >= :start AND p.fecha <= :end', { start, end });
    }

    return qb.orderBy('p.fecha', 'DESC').addOrderBy('p.id', 'DESC').getMany();
  }

  async getAbonos(trabajadorId?: number, fechaDesde?: string, fechaHasta?: string) {
    const qb = this.abonoRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.trabajador', 't')
      .leftJoinAndSelect('a.anticipoPrestamo', 'ap');

    if (trabajadorId) qb.where('a.trabajadorId = :trabajadorId', { trabajadorId });
    if (fechaDesde || fechaHasta) {
      const { start } = this.getDayRange(fechaDesde);
      const { end } = this.getDayRange(fechaHasta ?? fechaDesde);
      qb.andWhere('a.fecha >= :start AND a.fecha <= :end', { start, end });
    }

    return qb.orderBy('a.fecha', 'DESC').addOrderBy('a.id', 'DESC').getMany();
  }

  async getAnticiposByTrabajador(trabajadorId: number) {
    const trabajador = await this.trabajadorRepo.findOne({
      where: { id: trabajadorId },
    });
    if (!trabajador) throw new NotFoundException(`Trabajador ${trabajadorId} no encontrado`);

    return this.anticipoRepo.find({
      where: { trabajadorId },
      relations: ['abonos', 'trabajador'],
      order: { fecha: 'DESC' },
    });
  }
}
