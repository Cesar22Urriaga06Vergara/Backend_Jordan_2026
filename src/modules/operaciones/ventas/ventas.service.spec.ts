import { BadRequestException } from '@nestjs/common';
import {
  Cartera,
  Cliente,
  DetalleVenta,
  MovimientoCaja,
  MovimientoInventario,
  Pago,
  Producto,
  Venta,
} from '../../../database/entities';
import {
  EstadoVenta,
  TipoMovimientoCaja,
  TipoPago,
} from '../../../common/enums';
import { VentasService } from './ventas.service';

function createHarness(options?: {
  ventaExistente?: Partial<Venta>;
  carteraExistente?: Partial<Cartera>;
}) {
  const saved: Record<string, any[]> = {
    Venta: [],
    DetalleVenta: [],
    Pago: [],
    MovimientoCaja: [],
    MovimientoInventario: [],
    Cartera: [],
  };

  let id = 1;
  const manager = {
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn(async (entity: any, value: any) => {
      const name = entity.name;
      const record = { id: value.id ?? id++, ...value };
      saved[name] = saved[name] ?? [];
      saved[name].push(record);
      return record;
    }),
    update: jest.fn(async () => ({ affected: 1 })),
    findOne: jest.fn(async (entity: any) => {
      if (entity === Venta) {
        return saved.Venta.at(-1) ?? options?.ventaExistente ?? null;
      }
      if (entity === Cartera) {
        return options?.carteraExistente ?? saved.Cartera.at(-1) ?? null;
      }
      return null;
    }),
  };

  const consecutivoService = {
    generar: jest.fn(async (prefijo: string) => `${prefijo}-20260520-001`),
  };

  const ventaRepo = {
    findOne: jest.fn(async () => options?.ventaExistente ?? null),
  };
  const clienteRepo = {
    findOne: jest.fn(async () => ({ id: 1 } as Cliente)),
  };
  const productoRepo = {
    findOne: jest.fn(async ({ where }: any) => ({ id: where.id } as Producto)),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (tx: typeof manager) => unknown) =>
      callback(manager),
    ),
  };

  const service = new VentasService(
    ventaRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    clienteRepo as any,
    productoRepo as any,
    dataSource as any,
    consecutivoService as any,
  );

  return {
    service,
    manager,
    saved,
    ventaRepo,
    dataSource,
    consecutivoService,
  };
}

describe('VentasService financial flows', () => {
  it('creates a direct sale fully paid with payment, cash movement and inventory impact', async () => {
    const { service, saved } = createHarness();

    await service.create({
      clienteId: 1,
      fecha: '2026-05-20',
      tipoPago: TipoPago.EFECTIVO,
      montoPagado: 20000,
      detalles: [
        { productoId: 10, cantidad: 2, precioUnitario: 10000 },
      ],
    } as any);

    expect(saved.Venta[0]).toMatchObject({
      numero: 'VEN-20260520-001',
      estado: EstadoVenta.COMPLETADA,
      totalVenta: 20000,
      totalPagado: 20000,
      saldoPendiente: 0,
    });
    expect(saved.DetalleVenta[0]).toMatchObject({
      productoId: 10,
      cantidad: 2,
      precioUnitario: 10000,
      subtotal: 20000,
    });
    expect(saved.Pago[0]).toMatchObject({
      numero: 'PAG-20260520-001',
      monto: 20000,
      tipo: TipoPago.EFECTIVO,
    });
    expect(saved.MovimientoCaja[0]).toMatchObject({
      numero: 'CAJ-20260520-001',
      tipo: TipoMovimientoCaja.INGRESO_VENTA_EFECTIVO,
      monto: 20000,
    });
    expect(saved.MovimientoInventario[0]).toMatchObject({
      productoId: 10,
      cantidad: 2,
    });
    expect(saved.Cartera).toHaveLength(0);
  });

  it('creates cartera for a direct sale with partial payment', async () => {
    const { service, saved } = createHarness();

    await service.create({
      clienteId: 1,
      fecha: '2026-05-20',
      tipoPago: TipoPago.TRANSFERENCIA,
      montoPagado: 5000,
      detalles: [
        { productoId: 10, cantidad: 2, precioUnitario: 10000 },
      ],
    } as any);

    expect(saved.Venta[0]).toMatchObject({
      estado: EstadoVenta.PARCIAL,
      totalVenta: 20000,
      totalPagado: 5000,
      saldoPendiente: 15000,
    });
    expect(saved.Pago[0]).toMatchObject({
      tipo: TipoPago.TRANSFERENCIA,
      monto: 5000,
    });
    expect(saved.MovimientoCaja[0]).toMatchObject({
      tipo: TipoMovimientoCaja.INGRESO_VENTA_TRANSFERENCIA,
      monto: 5000,
    });
    expect(saved.Cartera[0]).toMatchObject({
      clienteId: 1,
      saldoPendiente: 15000,
    });
  });

  it('registers a partial cartera payment and updates sale, cartera and cash movement', async () => {
    const venta = {
      id: 7,
      numero: 'VEN-20260520-001',
      clienteId: 1,
      estado: EstadoVenta.PARCIAL,
      totalPagado: 5000,
      saldoPendiente: 15000,
    };
    const cartera = { id: 3, ventaId: 7, saldoPendiente: 15000 };
    const { service, saved, manager } = createHarness({
      ventaExistente: venta,
      carteraExistente: cartera,
    });

    await service.registrarPago(7, {
      tipo: TipoPago.EFECTIVO,
      monto: 7000,
    } as any);

    expect(venta).toMatchObject({
      totalPagado: 12000,
      saldoPendiente: 8000,
      estado: EstadoVenta.PARCIAL,
    });
    expect(manager.update).toHaveBeenCalledWith(Venta, 7, {
      totalPagado: 12000,
      saldoPendiente: 8000,
      estado: EstadoVenta.PARCIAL,
    });
    expect(cartera).toMatchObject({ saldoPendiente: 8000 });
    expect(saved.Pago[0]).toMatchObject({
      numero: 'PAG-20260520-001',
      monto: 7000,
    });
    expect(saved.MovimientoCaja[0]).toMatchObject({
      tipo: TipoMovimientoCaja.INGRESO_CARTERA_EFECTIVO,
      monto: 7000,
    });
  });

  it('rejects payments above the pending balance', async () => {
    const { service } = createHarness({
      ventaExistente: {
        id: 7,
        clienteId: 1,
        estado: EstadoVenta.PARCIAL,
        saldoPendiente: 15000,
      },
    });

    await expect(
      service.registrarPago(7, {
        tipo: TipoPago.EFECTIVO,
        monto: 15001,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects tiny residual balances that would create unusable cartera', async () => {
    const { service } = createHarness({
      ventaExistente: {
        id: 7,
        clienteId: 1,
        estado: EstadoVenta.PARCIAL,
        totalPagado: 0,
        saldoPendiente: 6000,
      },
    });

    await expect(
      service.registrarPago(7, {
        tipo: TipoPago.EFECTIVO,
        monto: 5999,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
