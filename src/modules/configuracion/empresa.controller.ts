import { Controller, Get, Patch, Body } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Controller('configuracion/empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  async getEmpresa() {
    return this.empresaService.getEmpresa();
  }

  @Patch()
  async updateEmpresa(@Body() dto: UpdateEmpresaDto) {
    return this.empresaService.updateEmpresa(dto);
  }
}
