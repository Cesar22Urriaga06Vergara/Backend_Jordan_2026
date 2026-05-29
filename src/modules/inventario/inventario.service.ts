import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Inventario } from '../../database/entities';
import { Producto } from '../../database/entities';
import { MoneyUtil } from '../../common/utils';

@Injectable()
export class InventarioService {
  private inventarioRepository: Repository<Inventario>;
  private productoRepository: Repository<Producto>;

  constructor(private dataSource: DataSource) {
    this.inventarioRepository = this.dataSource.getRepository(Inventario);
    this.productoRepository = this.dataSource.getRepository(Producto);
  }

  /**
   * Obtener stock actual de todos los productos
   */
  async obtenerTodos(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.inventarioRepository.findAndCount({
      relations: ['producto'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener stock de un producto específico
   */
  async obtenerPorProducto(productoId: number) {
    const inventario = await this.inventarioRepository.findOne({
      where: { productoId },
      relations: ['producto'],
    });

    if (!inventario) {
      throw new HttpException(
        'Inventario no encontrado para este producto',
        HttpStatus.NOT_FOUND,
      );
    }

    return inventario;
  }

  /**
   * Ajustar stock manualmente (auditoría manual)
   * Ej: corrección de error de conteo, deterioro, etc.
   */
  async ajusteManual(
    productoId: number,
    nuevaCantidad: number,
    razon: string,
    usuarioId?: number,
  ) {
    const inventario = await this.inventarioRepository.findOne({
      where: { productoId },
      relations: ['producto'],
    });

    if (!inventario) {
      throw new HttpException(
        'Inventario no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (nuevaCantidad < 0) {
      throw new HttpException(
        'Stock no puede ser negativo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cantidadAnterior = inventario.stockActual;
    inventario.stockActual = nuevaCantidad;
    await this.inventarioRepository.save(inventario);

    return {
      productoId,
      cantidadAnterior,
      cantidadNueva: nuevaCantidad,
      razon,
      usuarioId,
      timestamp: new Date(),
    };
  }

  /**
   * Validar si hay stock suficiente
   */
  async validarStock(productoId: number, cantidad: number): Promise<boolean> {
    const inventario = await this.inventarioRepository.findOne({
      where: { productoId },
    });

    if (!inventario) {
      throw new HttpException(
        'Inventario no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return inventario.stockActual >= cantidad;
  }

  /**
   * Incrementar stock (ej: nueva compra, producción)
   */
  async incrementar(
    productoId: number,
    cantidad: number,
    motivo: string,
  ): Promise<Inventario> {
    if (cantidad <= 0) {
      throw new HttpException(
        'Cantidad debe ser mayor a 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inventario = await this.inventarioRepository.findOne({
      where: { productoId },
    });

    if (!inventario) {
      throw new HttpException(
        'Inventario no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    inventario.stockActual += cantidad;
    const resultado = await this.inventarioRepository.save(inventario);

    console.log(
      `✅ Stock incrementado: Producto ${productoId} +${cantidad} (${motivo})`,
    );
    return resultado;
  }

  /**
   * Decrementar stock (ej: venta, devolución rechazada)
   */
  async decrementar(
    productoId: number,
    cantidad: number,
    motivo: string,
  ): Promise<Inventario> {
    if (cantidad <= 0) {
      throw new HttpException(
        'Cantidad debe ser mayor a 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inventario = await this.inventarioRepository.findOne({
      where: { productoId },
    });

    if (!inventario) {
      throw new HttpException(
        'Inventario no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (inventario.stockActual < cantidad) {
      throw new HttpException(
        `Stock insuficiente. Disponible: ${inventario.stockActual}, Solicitado: ${cantidad}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    inventario.stockActual -= cantidad;
    const resultado = await this.inventarioRepository.save(inventario);

    console.log(
      `✅ Stock decrementado: Producto ${productoId} -${cantidad} (${motivo})`,
    );
    return resultado;
  }

  /**
   * Obtener productos con stock bajo
   */
  async obtenerStockBajo(): Promise<Inventario[]> {
    return this.inventarioRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.producto', 'prod')
      .where('inv.stockActual <= inv.stockMinimo')
      .orderBy('inv.stockActual', 'ASC')
      .getMany();
  }

  /**
   * Actualizar stock mínimo
   */
  async actualizarStockMinimo(productoId: number, nuevoMinimo: number) {
    if (nuevoMinimo < 0) {
      throw new HttpException(
        'Stock mínimo no puede ser negativo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inventario = await this.inventarioRepository.findOne({
      where: { productoId },
    });

    if (!inventario) {
      throw new HttpException(
        'Inventario no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    inventario.stockMinimo = nuevoMinimo;
    return this.inventarioRepository.save(inventario);
  }

  /**
   * Obtener estadísticas de inventario
   */
  async obtenerEstadisticas() {
    const [inventarios, total] = await this.inventarioRepository.findAndCount({
      relations: ['producto'],
    });

    const stockBajo = inventarios.filter(
      (inv) => inv.stockActual <= inv.stockMinimo,
    );
    const totalValor = inventarios.reduce((sum, inv) => {
      const precio = (inv.producto as any)?.precioBase || 0;
      return MoneyUtil.add(
        sum,
        MoneyUtil.multiply(precio, Number(inv.stockActual ?? 0)),
      );
    }, 0);

    return {
      totalProductos: total,
      productosSinStock: inventarios.filter((inv) => inv.stockActual === 0)
        .length,
      productosStockBajo: stockBajo.length,
      valorTotalInventario: totalValor,
      inventarios,
    };
  }
}
