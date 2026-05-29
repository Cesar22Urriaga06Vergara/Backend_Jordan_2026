import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoCaja } from '../../../database/entities';
import { TipoMovimientoCaja, TipoPago } from '../../../common/enums';
import { RegistrarEgresoDto, BuscarEgresosDto } from './dto/egresos.dto';
import { ConsecutivoService } from '../../../common/services/consecutivo.service';
import { MoneyUtil } from '../../../common/utils';

@Injectable()
export class EgresosService {
  constructor(
    @InjectRepository(MovimientoCaja)
    private movCajaRepo: Repository<MovimientoCaja>,
    private consecutivoService: ConsecutivoService,
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

  private buildFechaOperacion(fechaISO?: string) {
    const fechaStr = this.getFechaLocalISO(fechaISO);
    const [y, m, d] = fechaStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  private getDayRange(fecha?: string) {
    const fechaStr = this.getFechaLocalISO(fecha);
    const [y, m, d] = fechaStr.split('-').map(Number);
    return {
      start: new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0),
      end: new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999),
    };
  }

  private async generarNumero(fecha: Date) {
    return this.consecutivoService.generar('EGR', fecha);
  }

  async findAll(page = 1, limit = 20, filtros?: BuscarEgresosDto) {
    const tiposEgreso = [
      TipoMovimientoCaja.OTROS_EGRESOS,
      TipoMovimientoCaja.PAGO_TRABAJADOR,
      TipoMovimientoCaja.ANTICIPOS,
      TipoMovimientoCaja.PRESTAMOS,
    ];

    const qb = this.movCajaRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.trabajador', 't')
      .where('m.tipo IN (:...tipos)', { tipos: tiposEgreso });

    if (filtros?.fecha) {
      const fechaStr = this.getFechaLocalISO(filtros.fecha);
      qb.andWhere('DATE(m.fecha) = :fecha', { fecha: fechaStr });
    } else if (filtros?.fechaDesde || filtros?.fechaHasta) {
      const desde = this.getDayRange(filtros.fechaDesde).start;
      const hasta = this.getDayRange(filtros.fechaHasta ?? filtros.fechaDesde).end;
      qb.andWhere('m.fecha >= :desde AND m.fecha <= :hasta', { desde, hasta });
    }

    if (filtros?.medioPago) {
      qb.andWhere('m.medioPago = :medioPago', { medioPago: filtros.medioPago });
    }

    if (filtros?.search?.trim()) {
      qb.andWhere('(m.concepto LIKE :s OR m.referencia LIKE :s OR m.observaciones LIKE :s)', {
        s: `%${filtros.search.trim()}%`,
      });
    }

    qb.orderBy('m.fecha', 'DESC').addOrderBy('m.id', 'DESC');

    if (limit > 0) {
      qb.skip((page - 1) * limit).take(limit);
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      items,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  async registrar(dto: RegistrarEgresoDto, usuarioId?: number) {
    // Validaciones críticas
    if (!dto.concepto || !dto.concepto.trim()) {
      throw new BadRequestException('El concepto es requerido');
    }

    const monto = MoneyUtil.normalize(dto.monto);
    if (MoneyUtil.compare(monto, 0) <= 0) {
      throw new BadRequestException('El monto debe ser un número positivo');
    }

    if (MoneyUtil.compare(monto, 99999999) > 0) {
      throw new BadRequestException('El monto excede el límite permitido (máx: 99,999,999)');
    }

    const fechaOperacion = this.buildFechaOperacion(dto.fecha);
    const numero = await this.generarNumero(fechaOperacion);

    const egreso = this.movCajaRepo.create({
      numero,
      tipo: TipoMovimientoCaja.OTROS_EGRESOS,
      medioPago: dto.medioPago ?? TipoPago.EFECTIVO,
      monto: monto,
      fecha: fechaOperacion,
      concepto: dto.concepto.trim(),
      referencia: dto.referencia,
      observaciones: dto.observaciones,
      // Si no hay usuario autenticado, conservar trazabilidad en observaciones.
      clienteId: null as any,
      trabajadorId: null as any,
      pagoId: null as any,
    });

    if (usuarioId && !egreso.observaciones) {
      egreso.observaciones = `Registrado por usuario ${usuarioId}`;
    }

    return this.movCajaRepo.save(egreso);
  }
}
