import { BadRequestException } from '@nestjs/common';
import {
  Cartera,
  DetalleVenta,
  ItemRuta,
  LiquidacionRuta,
  MovimientoCaja,
  MovimientoInventario,
  Pago,
  Pedido,
  Ruta,
  Venta,
} from '../../../database/entities';
import {
  EstadoPedido,
  EstadoRuta,
  EstadoVenta,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
  TipoPago,
} from '../../../common/enums';
import { RutasService } from './rutas.service';
import { LiquidarRutaDto } from './dto/rutas.dto';

const baseDto: LiquidarRutaDto = {
  totalEntregado: 100,
  totalRecaudado: 80,
  totalCartera: 20,
  diferencia: 0,
  efectivoRecibido: 50,
  transferenciaRecibida: 30,
  observaciones: 'nuevo cierre',
};

function createServiceHarness(options?: {
  rutaEstado?: EstadoRuta;
  liquidacionExistente?: Partial<LiquidacionRuta> | null;
  pedidosRuta?: any[];
  itemsRuta?: any[];
}) {
  const ruta = {
    id: 1,
    estado: options?.rutaEstado ?? EstadoRuta.EN_LIQUIDACION,
    numero: 'RUT-20260520-001',
  };
  const rutaFinal = { ...ruta, estado: EstadoRuta.LIQUIDADA };
  const liquidacionExistente = options?.liquidacionExistente ?? {
    id: 10,
    rutaId: 1,
    totalEntregado: 999,
    totalRecaudado: 999,
    totalCartera: 999,
    diferencia: 999,
    efectivoRecibido: 999,
    transferenciaRecibida: 999,
    observaciones: 'valor anterior',
  };

  const manager = {
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === LiquidacionRuta) return liquidacionExistente;
      if (entity === Ruta) return ruta;
      if (entity === Venta) return null;
      return null;
    }),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    find: jest.fn(async (entity: unknown) => {
      if (entity === ItemRuta) return options?.itemsRuta ?? [];
      if (entity === Pedido) return options?.pedidosRuta ?? [];
      return [];
    }),
    count: jest.fn(async () => 0),
  };

  const pedidoRepo = {
    manager: {
      transaction: jest.fn(async (callback: (txManager: typeof manager) => unknown) =>
        callback(manager),
      ),
    },
  };
  const rutaRepo = {
    findOne: jest.fn(async () => ruta),
  };
  const liquidacionRepo = {
    findOne: jest.fn(async () => liquidacionExistente),
  };
  const consecutivoService = {
    generar: jest.fn(async (prefijo: string) => `${prefijo}-20260520-001`),
  };

  const service = new RutasService(
    rutaRepo as any,
    {} as any,
    liquidacionRepo as any,
    pedidoRepo as any,
    {} as any,
    consecutivoService as any,
  );

  jest
    .spyOn(service, 'findOne')
    .mockResolvedValueOnce(ruta as any)
    .mockResolvedValueOnce(rutaFinal as any);

  return {
    service,
    manager,
    pedidoRepo,
    liquidacionRepo,
    ruta,
  };
}

describe('RutasService liquidar', () => {
  it('replaces an existing liquidacion snapshot instead of accumulating totals', async () => {
    const { service, manager } = createServiceHarness();

    await service.liquidar(1, baseDto);

    const savedLiquidacion = manager.save.mock.calls.find(
      ([entity]) => entity === LiquidacionRuta,
    )?.[1] as LiquidacionRuta;

    expect(savedLiquidacion).toMatchObject({
      id: 10,
      rutaId: 1,
      totalEntregado: 100,
      totalRecaudado: 80,
      totalCartera: 20,
      diferencia: 0,
      efectivoRecibido: 50,
      transferenciaRecibida: 30,
      observaciones: 'nuevo cierre',
    });
  });

  it('returns an already liquidated route when the retry matches the saved snapshot', async () => {
    const { service, pedidoRepo, ruta } = createServiceHarness({
      rutaEstado: EstadoRuta.LIQUIDADA,
      liquidacionExistente: {
        id: 10,
        rutaId: 1,
        totalEntregado: 100,
        totalRecaudado: 80,
        totalCartera: 20,
        diferencia: 0,
        efectivoRecibido: 50,
        transferenciaRecibida: 30,
      },
    });

    const result = await service.liquidar(1, baseDto);

    expect(result).toBe(ruta);
    expect(pedidoRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects changes to an already liquidated route', async () => {
    const { service } = createServiceHarness({
      rutaEstado: EstadoRuta.LIQUIDADA,
      liquidacionExistente: {
        id: 10,
        rutaId: 1,
        totalEntregado: 90,
        totalRecaudado: 80,
        totalCartera: 10,
        diferencia: 0,
        efectivoRecibido: 50,
        transferenciaRecibida: 30,
      },
    });

    await expect(service.liquidar(1, baseDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates sale, payment, cash movement and inventory movement when liquidating a delivered paid route order', async () => {
    const pedido = {
      id: 5,
      numero: 'PED-20260520-001',
      clienteId: 9,
      estado: EstadoPedido.CARGADO_EN_RUTA,
      detalles: [
        {
          productoId: 11,
          cantidad: 3,
          precioUnitario: 10000,
          subtotal: 30000,
        },
      ],
    };
    const { service, manager } = createServiceHarness({
      liquidacionExistente: null,
      itemsRuta: [{ rutaId: 1, pedidoId: 5 }],
      pedidosRuta: [pedido],
    });

    await service.liquidar(1, {
      ...baseDto,
      totalEntregado: 30000,
      totalRecaudado: 30000,
      totalCartera: 0,
      efectivoRecibido: 30000,
      transferenciaRecibida: 0,
      pedidos: [
        {
          pedidoId: 5,
          entregado: true,
          aCredito: false,
          tipoPago: TipoPago.EFECTIVO,
          montoEfectivo: 30000,
          montoTransferencia: 0,
        },
      ],
    });

    const savedVenta = manager.save.mock.calls.find(
      ([entity]) => entity === Venta,
    )?.[1];
    const savedDetalle = manager.save.mock.calls.find(
      ([entity]) => entity === DetalleVenta,
    )?.[1];
    const savedPago = manager.save.mock.calls.find(
      ([entity]) => entity === Pago,
    )?.[1];
    const savedCaja = manager.save.mock.calls.find(
      ([entity]) => entity === MovimientoCaja,
    )?.[1];
    const savedInventario = (manager.save.mock.calls.find(
      ([entity]) => entity === MovimientoInventario,
    )?.[1] as any[])?.[0];
    const savedCartera = manager.save.mock.calls.find(
      ([entity]) => entity === Cartera,
    );

    expect(savedVenta).toMatchObject({
      numero: 'VEN-20260520-001',
      clienteId: 9,
      pedidoId: 5,
      estado: EstadoVenta.COMPLETADA,
      totalVenta: 30000,
      totalPagado: 30000,
      saldoPendiente: 0,
    });
    expect(savedDetalle).toMatchObject({
      productoId: 11,
      cantidad: 3,
      precioUnitario: 10000,
      subtotal: 30000,
    });
    expect(savedPago).toMatchObject({
      numero: 'PAG-20260520-001',
      tipo: TipoPago.EFECTIVO,
      monto: 30000,
    });
    expect(savedCaja).toMatchObject({
      numero: 'CAJ-20260520-001',
      tipo: TipoMovimientoCaja.INGRESO_VENTA_EFECTIVO,
      monto: 30000,
    });
    expect(savedInventario).toMatchObject({
      productoId: 11,
      tipo: TipoMovimientoInventario.DESPACHO_ENTREGA,
      cantidad: 3,
      rutaId: 1,
      observaciones: 'Pedido PED-20260520-001 ENTREGADO',
    });
    expect(savedCartera).toBeUndefined();
  });

  it('rejects delivered paid orders that would leave a tiny cartera balance', async () => {
    const pedido = {
      id: 5,
      numero: 'PED-20260520-001',
      clienteId: 9,
      estado: EstadoPedido.CARGADO_EN_RUTA,
      detalles: [
        {
          productoId: 11,
          cantidad: 1,
          precioUnitario: 6000,
          subtotal: 6000,
        },
      ],
    };
    const { service } = createServiceHarness({
      liquidacionExistente: null,
      itemsRuta: [{ rutaId: 1, pedidoId: 5 }],
      pedidosRuta: [pedido],
    });

    await expect(
      service.liquidar(1, {
        ...baseDto,
        totalEntregado: 6000,
        totalRecaudado: 5999,
        totalCartera: 1,
        efectivoRecibido: 5999,
        transferenciaRecibida: 0,
        pedidos: [
          {
            pedidoId: 5,
            entregado: true,
            aCredito: false,
            tipoPago: TipoPago.EFECTIVO,
            montoEfectivo: 5999,
            montoTransferencia: 0,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
