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
} from '../../database/entities';
import {
  EstadoAnticipoPrestamo,
  TipoMovimientoCaja,
  TipoPago,
} from '../../common/enums';
import {
  RegistrarLaborDto,
  PagarTrabajadorDto,
  RegistrarAnticipoDto,
  AbonarDeudaDto,
} from './dto/trabajadores-ops.dto';

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
    private dataSource: DataSource,
  ) {}

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

  async getLaboresToday(trabajadorId?: number, fecha?: string) {
    const { start, end } = this.getDayRange(fecha);

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
    const trabajador = await this.trabajadorRepo.findOne({
      where: { id: dto.trabajadorId, activo: true },
    });
    if (!trabajador) throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);

    const tarifa = await this.tarifaRepo.findOne({
      where: { id: dto.laborTarifaId, trabajadorId: dto.trabajadorId },
    });
    if (!tarifa) {
      throw new NotFoundException(
        `Tarifa ${dto.laborTarifaId} no encontrada para el trabajador`,
      );
    }

    const cantidad = Number(dto.cantidadRealizado ?? 1);
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // La labor siempre se liquida con la tarifa vigente en BD para evitar desfases del frontend.
    const montoCalculado = Number(tarifa.tarifa) * cantidad;

    const labor = this.laborRepo.create({
      trabajadorId: dto.trabajadorId,
      laborTarifaId: dto.laborTarifaId,
      fecha: this.parseFechaLocalToDate(dto.fecha),
      cantidadRealizado: cantidad,
      montoAPagar: montoCalculado,
      observaciones: dto.observaciones,
    });

    // Actualizar saldo trabajador
    trabajador.saldoTotal =
      Number(trabajador.saldoTotal) + montoCalculado;
    await this.trabajadorRepo.save(trabajador);

    return this.laborRepo.save(labor);
  }

  async pagarTrabajador(dto: PagarTrabajadorDto, usuarioId: number) {
    const trabajador = await this.trabajadorRepo.findOne({
      where: { id: dto.trabajadorId, activo: true },
    });
    if (!trabajador) throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);

    return this.dataSource.transaction(async (manager) => {
      const montoEntregado =
        Number(dto.montoBase) -
        Number(dto.descuentosAplicados ?? 0) -
        Number(dto.abonoADeuda ?? 0);

      if (montoEntregado < 0) {
        throw new BadRequestException(
          `El monto entregado (${montoEntregado}) no puede ser negativo`,
        );
      }

      const hoy = new Date(dto.fecha);
      const prefix = `PAG-T-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const count = await manager
        .createQueryBuilder(PagoTrabajador, 'p')
        .where('p.numero LIKE :p', { p: `${prefix}%` })
        .getCount();
      const numero = `${prefix}-${String(count + 1).padStart(3, '0')}`;

      const pago = manager.create(PagoTrabajador, {
        numero,
        trabajadorId: dto.trabajadorId,
        usuarioId,
        fecha: hoy,
        montoBase: dto.montoBase,
        descuentosAplicados: dto.descuentosAplicados ?? 0,
        abonoADeuda: dto.abonoADeuda ?? 0,
        montoEntregado,
        observaciones: dto.observaciones,
      });
      await manager.save(PagoTrabajador, pago);

      // Reducir saldo total del trabajador
      trabajador.saldoTotal = Math.max(
        0,
        Number(trabajador.saldoTotal) - Number(dto.montoBase),
      );
      await manager.save(Trabajador, trabajador);

      // Movimiento caja egreso
      const cajaPrefix = `CAJ-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const cajaCnt = await manager
        .createQueryBuilder(MovimientoCaja, 'm')
        .where('m.numero LIKE :p', { p: `${cajaPrefix}%` })
        .getCount();

      await manager.save(
        MovimientoCaja,
        manager.create(MovimientoCaja, {
          numero: `${cajaPrefix}-${String(cajaCnt + 1).padStart(3, '0')}`,
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
      where: { id: dto.trabajadorId, activo: true },
    });
    if (!trabajador) throw new NotFoundException(`Trabajador ${dto.trabajadorId} no encontrado`);

    return this.dataSource.transaction(async (manager) => {
      const hoy = new Date(dto.fecha);
      const prefix = `ANT-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const count = await manager
        .createQueryBuilder(AnticipoPrestamo, 'a')
        .where('a.numero LIKE :p', { p: `${prefix}%` })
        .getCount();
      const numero = `${prefix}-${String(count + 1).padStart(3, '0')}`;

      const anticipo = manager.create(AnticipoPrestamo, {
        numero,
        trabajadorId: dto.trabajadorId,
        tipo: dto.tipo,
        monto: dto.monto,
        estado: EstadoAnticipoPrestamo.ACTIVO,
        fecha: hoy,
        motivo: dto.motivo,
        observaciones: dto.observaciones,
      });
      const savedAnticipo = await manager.save(AnticipoPrestamo, anticipo);

      // Movimiento caja
      const cajaPrefix = `CAJ-${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      const cajaCnt = await manager
        .createQueryBuilder(MovimientoCaja, 'm')
        .where('m.numero LIKE :p', { p: `${cajaPrefix}%` })
        .getCount();

      const tipoMov =
        dto.tipo === 'PRESTAMO'
          ? TipoMovimientoCaja.PRESTAMOS
          : TipoMovimientoCaja.ANTICIPOS;

      await manager.save(
        MovimientoCaja,
        manager.create(MovimientoCaja, {
          numero: `${cajaPrefix}-${String(cajaCnt + 1).padStart(3, '0')}`,
          tipo: tipoMov,
          medioPago: TipoPago.EFECTIVO,
          monto: dto.monto,
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

    const montoAbonadoAntes = Number(totalAbonado?.total ?? 0);
    const saldoPendiente =
      Number(anticipo.monto) - montoAbonadoAntes - Number(dto.monto);

    if (saldoPendiente < 0) {
      throw new BadRequestException(
        `El abono ($${dto.monto}) supera el saldo pendiente ($${Number(anticipo.monto) - montoAbonadoAntes})`,
      );
    }

    const abono = this.abonoRepo.create({
      anticipoPrestamoId: dto.anticipoPrestamoId,
      trabajadorId: dto.trabajadorId,
      monto: dto.monto,
      fecha: new Date(dto.fecha),
      observaciones: dto.observaciones,
    });
    await this.abonoRepo.save(abono);

    // Actualizar estado del anticipo
    if (saldoPendiente <= 0) {
      anticipo.estado = EstadoAnticipoPrestamo.PAGADO_COMPLETAMENTE;
    } else {
      anticipo.estado = EstadoAnticipoPrestamo.PAGADO_PARCIALMENTE;
    }
    await this.anticipoRepo.save(anticipo);

    return { abono, saldoPendiente };
  }

  async getAnticipos(trabajadorId?: number) {
    const where = trabajadorId ? { trabajadorId } : undefined;

    return this.anticipoRepo.find({
      where,
      relations: ['abonos', 'trabajador'],
      order: { fecha: 'DESC' },
    });
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
