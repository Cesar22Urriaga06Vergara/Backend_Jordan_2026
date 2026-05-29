import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class ConsecutivoService {
  constructor(private readonly dataSource: DataSource) {}

  async generar(
    prefijo: string,
    fecha: Date = new Date(),
    manager?: EntityManager,
  ): Promise<string> {
    const fechaClave = this.formatFechaClave(fecha);
    const base = `${prefijo}-${fechaClave}`;
    const numero = manager
      ? await this.siguiente(manager, base, prefijo, fechaClave)
      : await this.dataSource.transaction((tx) =>
          this.siguiente(tx, base, prefijo, fechaClave),
        );

    return `${base}-${String(numero).padStart(3, '0')}`;
  }

  private formatFechaClave(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  private async siguiente(
    manager: EntityManager,
    clave: string,
    prefijo: string,
    fecha: string,
  ): Promise<number> {
    const result = await manager.query(
      `
        INSERT INTO secuencias_consecutivos
          (clave, prefijo, fecha, siguiente, createdAt, updatedAt)
        VALUES (?, ?, ?, 2, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
        ON DUPLICATE KEY UPDATE
          siguiente = LAST_INSERT_ID(siguiente) + 1,
          updatedAt = CURRENT_TIMESTAMP(6)
      `,
      [clave, prefijo, fecha],
    );

    const affectedRows = Array.isArray(result)
      ? result[0]?.affectedRows
      : result?.affectedRows;

    if (affectedRows === 1) {
      return 1;
    }

    const rows = await manager.query('SELECT LAST_INSERT_ID() AS numero');
    const numero = Number(rows?.[0]?.numero ?? 0);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }
}
