import { ConflictException } from '@nestjs/common';
import { Not, IsNull } from 'typeorm';
import { TipoCliente, TipoTrabajador } from '../../common/enums';
import { Cliente, Producto, Trabajador } from '../../database/entities';
import { ClientesService } from './clientes/clientes.service';
import { ProductosService } from './productos/productos.service';
import { TrabajadoresService } from './trabajadores/trabajadores.service';

const loggerMock = {
  logOperation: jest.fn(),
  logCriticalError: jest.fn(),
};

const auditMock = {
  detectarCambios: jest.fn(() => ({})),
  registrarActividad: jest.fn(),
  registrarCambio: jest.fn(),
};

function createQueryBuilderMock(data: any[] = []) {
  return {
    withDeleted: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(async () => [data, data.length]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => data),
    getRawMany: jest.fn(async () => []),
  };
}

describe('Catalogos soft delete behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('productos lista activos por defecto y eliminados cuando activo=false', async () => {
    const productoRepo = {
      findAndCount: jest.fn(async () => [[{ id: 1 }], 1]),
    };
    const service = new ProductosService(
      productoRepo as any,
      loggerMock as any,
      auditMock as any,
    );

    await service.findAll();
    expect(productoRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        withDeleted: false,
      }),
    );

    await service.findAll(1, 10, undefined, undefined, false);
    expect(productoRepo.findAndCount).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { deletedAt: Not(IsNull()) },
        withDeleted: true,
      }),
    );
  });

  it('productos restaura con recover cuando el registro esta eliminado', async () => {
    const eliminado = { id: 1, codigo: 'P001', deletedAt: new Date() };
    const productoRepo = {
      findOne: jest.fn(async () => eliminado),
      recover: jest.fn(async (producto: Producto) => ({
        ...producto,
        deletedAt: null,
      })),
      softRemove: jest.fn(),
    };
    const service = new ProductosService(
      productoRepo as any,
      loggerMock as any,
      auditMock as any,
    );

    await service.toggleActivo(1, 7);

    expect(productoRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      withDeleted: true,
    });
    expect(productoRepo.recover).toHaveBeenCalledWith(eliminado);
    expect(productoRepo.softRemove).not.toHaveBeenCalled();
  });

  it('clientes lista eliminados con withDeleted y restaura con recover', async () => {
    const qb = createQueryBuilderMock([{ id: 1 }]);
    const eliminado = { id: 1, codigo: 'C001', deletedAt: new Date() };
    const clienteRepo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(async () => eliminado),
      recover: jest.fn(async (cliente: Cliente) => ({
        ...cliente,
        deletedAt: null,
      })),
      softRemove: jest.fn(),
    };
    const service = new ClientesService(
      clienteRepo as any,
      {} as any,
      {} as any,
      loggerMock as any,
      auditMock as any,
    );

    await service.findAll(1, 10, undefined, undefined, false);
    expect(qb.withDeleted).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith('c.deletedAt IS NOT NULL');

    await service.toggleActivo(1, 7);
    expect(clienteRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      withDeleted: true,
      relations: ['preciosPersonalizados', 'preciosPersonalizados.producto'],
    });
    expect(clienteRepo.recover).toHaveBeenCalledWith(eliminado);
    expect(clienteRepo.softRemove).not.toHaveBeenCalled();
  });

  it('trabajadores lista eliminados con withDeleted y restaura con recover', async () => {
    const qb = createQueryBuilderMock([
      {
        id: 1,
        codigo: 'T001',
        nombre: 'Sellador',
        deletedAt: new Date(),
        saldoTotal: 0,
      },
    ]);
    const eliminado = { id: 1, codigo: 'T001', deletedAt: new Date() };
    const trabajadorRepo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(async () => eliminado),
      recover: jest.fn(async (trabajador: Trabajador) => ({
        ...trabajador,
        deletedAt: null,
      })),
      softRemove: jest.fn(),
      update: jest.fn(),
    };
    const service = new TrabajadoresService(
      trabajadorRepo as any,
      { createQueryBuilder: jest.fn(() => createQueryBuilderMock()) } as any,
      {} as any,
      { createQueryBuilder: jest.fn(() => createQueryBuilderMock()) } as any,
      { createQueryBuilder: jest.fn(() => createQueryBuilderMock()) } as any,
      loggerMock as any,
      auditMock as any,
    );

    await service.findAll(1, 10, undefined, undefined, false);
    expect(qb.withDeleted).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith('t.deletedAt IS NOT NULL');

    await service.toggleActivo(1);
    expect(trabajadorRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      withDeleted: true,
      relations: ['laboresDisponibles', 'laboresDisponibles.laborTipo'],
    });
    expect(trabajadorRepo.recover).toHaveBeenCalledWith(eliminado);
    expect(trabajadorRepo.softRemove).not.toHaveBeenCalled();
  });

  it('trabajadores bloquea codigo o cedula duplicados aunque el registro este eliminado', async () => {
    const trabajadorRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 10, codigo: 'T001', deletedAt: new Date() })
        .mockResolvedValueOnce(null),
    };
    const service = new TrabajadoresService(
      trabajadorRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      loggerMock as any,
      auditMock as any,
    );

    await expect(
      service.create({
        codigo: 'T001',
        cedula: '100',
        nombre: 'Sellador',
        tipoTrabajador: TipoTrabajador.TEMPORAL,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(trabajadorRepo.findOne).toHaveBeenCalledWith({
      where: { codigo: 'T001' },
      withDeleted: true,
    });
    expect(trabajadorRepo.findOne).toHaveBeenCalledWith({
      where: { cedula: '100' },
      withDeleted: true,
    });
  });

  it('clientes mantiene precios personalizados eliminados fuera del listado normal', async () => {
    const precioRepo = {
      find: jest.fn(async () => []),
    };
    const clienteRepo = {
      findOne: jest.fn(async () => ({
        id: 1,
        tipo: TipoCliente.DIRECTO,
      })),
    };
    const service = new ClientesService(
      clienteRepo as any,
      precioRepo as any,
      {} as any,
      loggerMock as any,
      auditMock as any,
    );

    await service.getPreciosCliente(1);

    expect(precioRepo.find).toHaveBeenCalledWith({
      where: { clienteId: 1 },
      relations: ['producto'],
      order: { producto: { nombre: 'ASC' } },
    });
    const findOptions = (precioRepo.find as jest.Mock).mock.calls[0][0];
    expect(findOptions).not.toHaveProperty('withDeleted');
  });
});
