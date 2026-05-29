import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorTipo } from '../../../database/entities';
import {
  CreateTrabajadorTipoDto,
  UpdateTrabajadorTipoDto,
} from './dto/trabajador-tipo.dto';

@Injectable()
export class TrabajadorTiposService {
  constructor(
    @InjectRepository(TrabajadorTipo)
    private trabajadorTipoRepo: Repository<TrabajadorTipo>,
  ) {}

  private defaults: Array<CreateTrabajadorTipoDto> = [
    { nombre: 'PERMANENTE', descripcion: 'Trabajador fijo o recurrente' },
    { nombre: 'TEMPORAL', descripcion: 'Trabajador temporal por temporada o necesidad puntual' },
    { nombre: 'PREVENTISTA', descripcion: 'Trabajador asignado a preventa o toma de pedidos' },
    { nombre: 'DOMICILIARIO', descripcion: 'Trabajador asignado a entregas o rutas' },
    { nombre: 'MIXTO', descripcion: 'Trabajador con funciones combinadas' },
  ];

  async ensureDefaults() {
    for (const item of this.defaults) {
      let tipo = await this.trabajadorTipoRepo.findOne({ where: { nombre: item.nombre } });
      if (!tipo) {
        tipo = this.trabajadorTipoRepo.create({ ...item, activo: true });
        await this.trabajadorTipoRepo.save(tipo);
      } else if (!tipo.descripcion && item.descripcion) {
        tipo.descripcion = item.descripcion;
        await this.trabajadorTipoRepo.save(tipo);
      }
    }
  }

  async findAll(activo?: boolean) {
    await this.ensureDefaults();
    return this.trabajadorTipoRepo.find({
      where: activo === undefined ? undefined : { activo },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number) {
    const tipo = await this.trabajadorTipoRepo.findOne({ where: { id } });
    if (!tipo) throw new NotFoundException(`Tipo de trabajador ${id} no encontrado`);
    return tipo;
  }

  async create(dto: CreateTrabajadorTipoDto) {
    const nombre = dto.nombre.trim().toUpperCase();
    const existe = await this.trabajadorTipoRepo.findOne({ where: { nombre } });
    if (existe) throw new ConflictException(`Ya existe un tipo de trabajador llamado ${nombre}`);
    return this.trabajadorTipoRepo.save(
      this.trabajadorTipoRepo.create({
        ...dto,
        nombre,
        activo: dto.activo ?? true,
      }),
    );
  }

  async update(id: number, dto: UpdateTrabajadorTipoDto) {
    const tipo = await this.findOne(id);
    const nombre = dto.nombre?.trim().toUpperCase();
    if (nombre && nombre !== tipo.nombre) {
      const existe = await this.trabajadorTipoRepo.findOne({ where: { nombre } });
      if (existe) throw new ConflictException(`Ya existe un tipo de trabajador llamado ${nombre}`);
    }

    Object.assign(tipo, {
      ...dto,
      nombre: nombre ?? tipo.nombre,
    });
    return this.trabajadorTipoRepo.save(tipo);
  }

  async toggleActivo(id: number) {
    const tipo = await this.findOne(id);
    tipo.activo = !tipo.activo;
    return this.trabajadorTipoRepo.save(tipo);
  }
}
