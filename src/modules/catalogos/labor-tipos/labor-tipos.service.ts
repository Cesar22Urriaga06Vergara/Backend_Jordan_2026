import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoLabor } from '../../../common/enums';
import { LaborTipo } from '../../../database/entities';
import { CreateLaborTipoDto, UpdateLaborTipoDto } from './dto/labor-tipo.dto';

@Injectable()
export class LaborTiposService {
  constructor(
    @InjectRepository(LaborTipo)
    private laborTipoRepo: Repository<LaborTipo>,
  ) {}

  private defaults: Array<CreateLaborTipoDto> = [
    { nombre: 'Jornada', tipo: TipoLabor.POR_JORNADA, descripcion: 'Labor pagada por jornada completa' },
    { nombre: 'Hora', tipo: TipoLabor.POR_HORA, descripcion: 'Labor pagada por horas trabajadas' },
    { nombre: 'Sellador', tipo: TipoLabor.POR_PACA, descripcion: 'Sellado pagado por cantidad de pacas' },
    { nombre: 'Empacador', tipo: TipoLabor.POR_PACA, descripcion: 'Empaque pagado por cantidad de pacas' },
    { nombre: 'Auxiliar', tipo: TipoLabor.POR_HORA, descripcion: 'Apoyo operativo pagado por horas' },
    { nombre: 'Jefe de Area', tipo: TipoLabor.POR_JORNADA, descripcion: 'Responsable de area pagado por jornada' },
    { nombre: 'Administrador', tipo: TipoLabor.POR_JORNADA, descripcion: 'Gestion administrativa pagada por jornada' },
  ];

  async ensureDefaults() {
    for (const item of this.defaults) {
      let laborTipo = await this.laborTipoRepo.findOne({ where: { nombre: item.nombre } });
      if (!laborTipo) {
        laborTipo = this.laborTipoRepo.create({ ...item, activo: true });
        await this.laborTipoRepo.save(laborTipo);
      } else {
        const nextDescripcion = laborTipo.descripcion ?? item.descripcion;
        if (laborTipo.tipo !== item.tipo || laborTipo.descripcion !== nextDescripcion) {
          laborTipo.tipo = item.tipo;
          laborTipo.descripcion = nextDescripcion;
          await this.laborTipoRepo.save(laborTipo);
        }
      }
    }
  }

  async findAll(activo?: boolean) {
    await this.ensureDefaults();
    return this.laborTipoRepo.find({
      where: activo === undefined ? undefined : { activo },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number) {
    const laborTipo = await this.laborTipoRepo.findOne({ where: { id } });
    if (!laborTipo) throw new NotFoundException(`Tipo de labor ${id} no encontrado`);
    return laborTipo;
  }

  async create(dto: CreateLaborTipoDto) {
    const existe = await this.laborTipoRepo.findOne({ where: { nombre: dto.nombre } });
    if (existe) throw new ConflictException(`Ya existe un tipo de labor llamado ${dto.nombre}`);
    return this.laborTipoRepo.save(
      this.laborTipoRepo.create({
        ...dto,
        activo: dto.activo ?? true,
      }),
    );
  }

  async update(id: number, dto: UpdateLaborTipoDto) {
    const laborTipo = await this.findOne(id);
    if (dto.nombre && dto.nombre !== laborTipo.nombre) {
      const existe = await this.laborTipoRepo.findOne({ where: { nombre: dto.nombre } });
      if (existe) throw new ConflictException(`Ya existe un tipo de labor llamado ${dto.nombre}`);
    }
    Object.assign(laborTipo, dto);
    return this.laborTipoRepo.save(laborTipo);
  }

  async toggleActivo(id: number) {
    const laborTipo = await this.findOne(id);
    laborTipo.activo = !laborTipo.activo;
    return this.laborTipoRepo.save(laborTipo);
  }
}
