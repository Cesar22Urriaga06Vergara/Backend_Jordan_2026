import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionEmpresa } from '../../database/entities';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(ConfiguracionEmpresa)
    private readonly empresaRepo: Repository<ConfiguracionEmpresa>,
  ) {}

  async getEmpresa(): Promise<ConfiguracionEmpresa> {
    let empresa = await this.empresaRepo.findOne({ where: { id: 1 } });
    if (!empresa) {
      empresa = this.empresaRepo.create({ id: 1, nombre: 'Mi Empresa' });
      await this.empresaRepo.save(empresa);
    }
    return empresa;
  }

  async updateEmpresa(dto: UpdateEmpresaDto): Promise<ConfiguracionEmpresa> {
    let empresa = await this.empresaRepo.findOne({ where: { id: 1 } });
    if (!empresa) {
      empresa = this.empresaRepo.create({ id: 1, nombre: 'Mi Empresa' });
    }
    Object.assign(empresa, dto);
    return this.empresaRepo.save(empresa);
  }
}
