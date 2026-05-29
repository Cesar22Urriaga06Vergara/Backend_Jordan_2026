import { Trabajador, TrabajadorLabor } from '../../database/entities';
import { TrabajadoresOpsService } from './trabajadores-ops.service';

function createHarness() {
  const trabajador = { id: 1, nombre: 'Sellador', saldoTotal: 0 };
  const tarifa = {
    id: 7,
    trabajadorId: 1,
    tarifa: 300,
    unidad: 'PACA',
  };
  const savedLabores: TrabajadorLabor[] = [];

  const trabajadorRepo = {
    findOne: jest.fn(async () => trabajador),
    save: jest.fn(async (value: Trabajador) => value),
  };
  const tarifaRepo = {
    findOne: jest.fn(async () => tarifa),
  };
  const laborRepo = {
    create: jest.fn((value: TrabajadorLabor) => value),
    save: jest.fn(async (value: TrabajadorLabor) => {
      savedLabores.push(value);
      return value;
    }),
  };
  const manager = {
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === Trabajador) return trabajador;
      return tarifa;
    }),
    create: jest.fn((_entity: unknown, value: TrabajadorLabor) => value),
    save: jest.fn(async (entity: unknown, value: any) => {
      if (entity === TrabajadorLabor) {
        savedLabores.push(value);
      }
      return value;
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (tx: typeof manager) => unknown) =>
      callback(manager),
    ),
  };

  const service = new TrabajadoresOpsService(
    trabajadorRepo as any,
    laborRepo as any,
    tarifaRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    dataSource as any,
    {} as any,
  );

  return {
    service,
    trabajador,
    trabajadorRepo,
    laborRepo,
    savedLabores,
  };
}

describe('TrabajadoresOpsService por paca', () => {
  it('liquidates a sellador by paca quantity and updates worker balance', async () => {
    const { service, trabajador, savedLabores } = createHarness();

    await service.registrarLabor({
      trabajadorId: 1,
      laborTarifaId: 7,
      fecha: '2026-05-20',
      cantidadRealizado: 150,
      observaciones: 'Sellado de pacas al cierre de produccion',
    });

    expect(savedLabores[0]).toMatchObject({
      trabajadorId: 1,
      laborTarifaId: 7,
      cantidadRealizado: 150,
      montoAPagar: 45000,
      observaciones: 'Sellado de pacas al cierre de produccion',
    });
    expect(trabajador.saldoTotal).toBe(45000);
  });
});
