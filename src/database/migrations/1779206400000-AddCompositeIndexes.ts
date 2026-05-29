import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddCompositeIndexes1779206400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfPossible(
      queryRunner,
      'pedidos',
      new TableIndex({
        name: 'IDX_pedidos_clienteId_estado_fecha',
        columnNames: ['clienteId', 'estado', 'fecha'],
      }),
    );

    await this.createIndexIfPossible(
      queryRunner,
      'detalle_venta',
      new TableIndex({
        name: 'IDX_detalle_venta_ventaId_productoId',
        columnNames: ['ventaId', 'productoId'],
      }),
    );

    await this.createIndexIfPossible(
      queryRunner,
      'rutas',
      new TableIndex({
        name: 'IDX_rutas_estado_fecha',
        columnNames: ['estado', 'fecha'],
      }),
    );

    await this.createIndexIfPossible(
      queryRunner,
      'trabajadores',
      new TableIndex({
        name: 'IDX_trabajadores_tipoTrabajador_deletedAt',
        columnNames: ['tipoTrabajador', 'deletedAt'],
      }),
    );

    await this.createIndexIfPossible(
      queryRunner,
      'movimiento_caja',
      new TableIndex({
        name: 'IDX_movimiento_caja_tipo_fecha',
        columnNames: ['tipo', 'fecha'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(
      queryRunner,
      'movimiento_caja',
      'IDX_movimiento_caja_tipo_fecha',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'trabajadores',
      'IDX_trabajadores_tipoTrabajador_deletedAt',
    );
    await this.dropIndexIfExists(queryRunner, 'rutas', 'IDX_rutas_estado_fecha');
    await this.dropIndexIfExists(
      queryRunner,
      'detalle_venta',
      'IDX_detalle_venta_ventaId_productoId',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'pedidos',
      'IDX_pedidos_clienteId_estado_fecha',
    );
  }

  private async createIndexIfPossible(
    queryRunner: QueryRunner,
    tableName: string,
    index: TableIndex,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);

    if (!table) {
      return;
    }

    const indexExists = table.indices.some(
      (existingIndex) => existingIndex.name === index.name,
    );
    const columnsExist = index.columnNames.every((columnName) =>
      table.columns.some((column) => column.name === columnName),
    );

    if (!indexExists && columnsExist) {
      await queryRunner.createIndex(tableName, index);
    }
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const index = table?.indices.find(
      (existingIndex) => existingIndex.name === indexName,
    );

    if (index) {
      await queryRunner.dropIndex(tableName, index);
    }
  }
}
