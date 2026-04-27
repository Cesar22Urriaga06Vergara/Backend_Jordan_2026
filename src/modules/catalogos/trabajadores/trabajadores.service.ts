import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoLabor } from '../../../common/enums';
import {
  Trabajador,
  LaborTarifa,
  LaborTipo,
  TrabajadorLabor,
  PagoTrabajador,
} from '../../../database/entities';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';
import { AppLoggerService } from '../../../common/services/logger.service';
import { AuditService } from '../../../common/services/audit.service';

@Injectable()
export class TrabajadoresService {
  constructor(
    @InjectRepository(Trabajador)
    private trabajadorRepo: Repository<Trabajador>,
    @InjectRepository(LaborTarifa)
    private tarifaRepo: Repository<LaborTarifa>,
    @InjectRepository(LaborTipo)
    private laborTipoRepo: Repository<LaborTipo>,
    @InjectRepository(TrabajadorLabor)
    private laborRepo: Repository<TrabajadorLabor>,
    @InjectRepository(PagoTrabajador)
    private pagoRepo: Repository<PagoTrabajador>,
    @Inject(AppLoggerService)
    private logger: AppLoggerService,
    private auditService: AuditService,
  ) {}

  private async reconcileSaldos(trabajadores: Trabajador[]) {
    if (!trabajadores.length) return;

    const ids = trabajadores.map((t) => t.id);

    const [laboresRaw, pagosRaw] = await Promise.all([
      this.laborRepo
        .createQueryBuilder('l')
        .select('l.trabajadorId', 'trabajadorId')
        .addSelect('COALESCE(SUM(l.montoAPagar), 0)', 'total')
        .where('l.trabajadorId IN (:...ids)', { ids })
        .groupBy('l.trabajadorId')
        .getRawMany<{ trabajadorId: number; total: string }>(),
      this.pagoRepo
        .createQueryBuilder('p')
        .select('p.trabajadorId', 'trabajadorId')
        .addSelect('COALESCE(SUM(p.montoBase), 0)', 'total')
        .where('p.trabajadorId IN (:...ids)', { ids })
        .groupBy('p.trabajadorId')
        .getRawMany<{ trabajadorId: number; total: string }>(),
    ]);

    const laboresMap = new Map<number, number>(
      laboresRaw.map((r) => [Number(r.trabajadorId), Number(r.total ?? 0)]),
    );
    const pagosMap = new Map<number, number>(
      pagosRaw.map((r) => [Number(r.trabajadorId), Number(r.total ?? 0)]),
    );

    const updates: Promise<any>[] = [];

    for (const trabajador of trabajadores) {
      const saldoActual = Number(trabajador.saldoTotal ?? 0);
      const totalLabores = laboresMap.get(trabajador.id) ?? 0;
      const totalPagos = pagosMap.get(trabajador.id) ?? 0;
      const saldoRecalculado = Math.max(0, totalLabores - totalPagos);

      trabajador.saldoTotal = saldoRecalculado;

      if (saldoActual !== saldoRecalculado) {
        updates.push(this.trabajadorRepo.update(trabajador.id, { saldoTotal: saldoRecalculado }));
      }
    }

    if (updates.length) {
      await Promise.all(updates);
    }
  }

  private async getTarifasBase(trabajadorIds: number[]) {
    if (!trabajadorIds.length) return new Map<number, { tarifaBase: number; modalidadPago?: TipoLabor }>();

    const tarifas = await this.tarifaRepo
      .createQueryBuilder('lt')
      .leftJoinAndSelect('lt.laborTipo', 'ltt')
      .where('lt.trabajadorId IN (:...ids)', { ids: trabajadorIds })
      .andWhere('lt.activo = :activo', { activo: true })
      .andWhere('ltt.tipo IN (:...tipos)', {
        tipos: [TipoLabor.POR_JORNADA, TipoLabor.POR_HORA],
      })
      .orderBy('lt.updatedAt', 'DESC')
      .getMany();

    const map = new Map<number, { tarifaBase: number; modalidadPago?: TipoLabor }>();
    for (const t of tarifas) {
      if (map.has(t.trabajadorId)) continue;
      map.set(t.trabajadorId, {
        tarifaBase: Number(t.tarifa ?? 0),
        modalidadPago: t.laborTipo?.tipo as TipoLabor | undefined,
      });
    }
    return map;
  }

  private async upsertTarifaBase(
    trabajadorId: number,
    dto: CreateTrabajadorDto | UpdateTrabajadorDto,
    isCreating = true,
  ) {
    const modalidad = dto.modalidadPago;
    const valor = dto.valorPago;

    if (!modalidad && valor === undefined) return;

    let tipoLabor = modalidad;
    if (!tipoLabor) {
      const existente = await this.tarifaRepo.findOne({
        where: { trabajadorId },
        relations: ['laborTipo'],
      });
      tipoLabor = existente?.laborTipo?.tipo as TipoLabor | undefined;
    }

    if (!tipoLabor) return;

    const laborTipo = await this.laborTipoRepo.findOne({
      where: { tipo: tipoLabor, activo: true },
    });
    if (!laborTipo) {
      // Si es creación (nuevo trabajador), es obligatorio que exista el tipo de labor
      // Si es actualización, permitir guardar sin actualizar tarifa
      if (isCreating) {
        throw new NotFoundException(`No existe tipo de labor activo para ${tipoLabor}`);
      }
      // En modo edición, simplemente no actualizar la tarifa si no existe su tipo
      return;
    }

    let tarifa = await this.tarifaRepo.findOne({
      where: { trabajadorId, laborTipoId: laborTipo.id },
    });

    const valorFinal =
      valor !== undefined
        ? Number(valor)
        : tarifa
          ? Number(tarifa.tarifa)
          : 0;

    if (valorFinal <= 0) return;

    const horasFinal =
      dto.horasBase !== undefined
        ? Number(dto.horasBase)
        : tipoLabor === TipoLabor.POR_JORNADA
          ? 8
          : 1;

    if (!tarifa) {
      tarifa = this.tarifaRepo.create({
        trabajadorId,
        laborTipoId: laborTipo.id,
        tarifa: valorFinal,
        horas: horasFinal,
        unidad: tipoLabor === TipoLabor.POR_JORNADA ? 'JORNADA' : 'HORA',
        activo: true,
      });
    } else {
      tarifa.tarifa = valorFinal;
      tarifa.horas = horasFinal;
      tarifa.unidad = tipoLabor === TipoLabor.POR_JORNADA ? 'JORNADA' : 'HORA';
      tarifa.activo = true;
    }

    await this.tarifaRepo.save(tarifa);
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    tipo?: string,
    activo?: boolean,
  ) {
    const qb = this.trabajadorRepo.createQueryBuilder('t');

    if (search) {
      qb.andWhere('(t.nombre LIKE :s OR t.codigo LIKE :s OR t.cedula LIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (tipo) {
      qb.andWhere('t.tipoTrabajador = :tipo', { tipo });
    }
    if (activo !== undefined) {
      qb.andWhere('t.activo = :activo', { activo });
    }

    qb.orderBy('t.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    await this.reconcileSaldos(data);
    const tarifaMap = await this.getTarifasBase(data.map((t) => t.id));

    const items = data.map((t) => ({
      ...t,
      tarifaBase: tarifaMap.get(t.id)?.tarifaBase ?? 0,
      modalidadPago: tarifaMap.get(t.id)?.modalidadPago,
    }));

    return {
      data: items,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const trabajador = await this.trabajadorRepo.findOne({
      where: { id },
      relations: ['laboresDisponibles', 'laboresDisponibles.laborTipo'],
    });
    if (!trabajador) {
      throw new NotFoundException(`Trabajador con id ${id} no encontrado`);
    }
    return trabajador;
  }

  async create(dto: CreateTrabajadorDto) {
    const {
      modalidadPago: _modalidadPago,
      valorPago: _valorPago,
      horasBase: _horasBase,
      ...payload
    } = dto;

    const [existeCodigo, existeCedula] = await Promise.all([
      this.trabajadorRepo.findOne({ where: { codigo: dto.codigo } }),
      this.trabajadorRepo.findOne({ where: { cedula: dto.cedula } }),
    ]);

    if (existeCodigo) {
      throw new ConflictException(`Ya existe un trabajador con código ${dto.codigo}`);
    }
    if (existeCedula) {
      throw new ConflictException(`Ya existe un trabajador con cédula ${dto.cedula}`);
    }

    const trabajador = this.trabajadorRepo.create(payload);
    const saved = await this.trabajadorRepo.save(trabajador);
    await this.upsertTarifaBase(saved.id, dto);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateTrabajadorDto) {
    const trabajador = await this.findOne(id);

    const {
      modalidadPago: _modalidadPago,
      valorPago: _valorPago,
      horasBase: _horasBase,
      ...payload
    } = dto;

    if (dto.codigo && dto.codigo !== trabajador.codigo) {
      const existe = await this.trabajadorRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(`Ya existe un trabajador con código ${dto.codigo}`);
      }
    }

    if (dto.cedula && dto.cedula !== trabajador.cedula) {
      const existe = await this.trabajadorRepo.findOne({
        where: { cedula: dto.cedula },
      });
      if (existe) {
        throw new ConflictException(`Ya existe un trabajador con cédula ${dto.cedula}`);
      }
    }

    Object.assign(trabajador, payload);

    const saved = await this.trabajadorRepo.save(trabajador);
    await this.upsertTarifaBase(saved.id, dto, false);
    return this.findOne(saved.id);
  }

  async toggleActivo(id: number) {
    const trabajador = await this.findOne(id);
    trabajador.activo = !trabajador.activo;
    return this.trabajadorRepo.save(trabajador);
  }
}
