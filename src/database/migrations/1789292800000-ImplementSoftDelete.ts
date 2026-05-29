import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class ImplementSoftDelete1789292800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureSoftDeleteColumn(
      queryRunner,
      'productos',
      'IDX_productos_deletedAt',
    );
    await this.ensureSoftDeleteColumn(
      queryRunner,
      'clientes',
      'IDX_clientes_deletedAt',
    );
    await this.ensureSoftDeleteColumn(
      queryRunner,
      'trabajadores',
      'IDX_trabajadores_deletedAt',
    );
    await this.createIndexIfPossible(
      queryRunner,
      'trabajadores',
      new TableIndex({
        name: 'IDX_trabajadores_tipoTrabajador_deletedAt',
        columnNames: ['tipoTrabajador', 'deletedAt'],
      }),
    );
    await this.ensureSoftDeleteColumn(
      queryRunner,
      'precios_cliente',
      'IDX_precios_cliente_deletedAt',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.restoreActivoColumn(
      queryRunner,
      'productos',
      'IDX_productos_deletedAt',
    );
    await this.restoreActivoColumn(
      queryRunner,
      'clientes',
      'IDX_clientes_deletedAt',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'trabajadores',
      'IDX_trabajadores_tipoTrabajador_deletedAt',
    );
    await this.restoreActivoColumn(
      queryRunner,
      'trabajadores',
      'IDX_trabajadores_deletedAt',
    );
    await this.restoreActivoColumn(
      queryRunner,
      'precios_cliente',
      'IDX_precios_cliente_deletedAt',
    );
  }

  private async ensureSoftDeleteColumn(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);

    if (!table) {
      return;
    }

    if (table.columns.some((column) => column.name === 'activo')) {
      await queryRunner.dropColumn(tableName, 'activo');
    }

    const refreshedTable = await queryRunner.getTable(tableName);
    const hasDeletedAt = refreshedTable?.columns.some(
      (column) => column.name === 'deletedAt',
    );

    if (!hasDeletedAt) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'deletedAt',
          type: 'datetime',
          isNullable: true,
          default: null,
          comment: 'Timestamp de eliminacion (soft delete)',
        }),
      );
    }

    await this.createIndexIfMissing(queryRunner, tableName, indexName);
  }

  private async restoreActivoColumn(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);

    if (!table) {
      return;
    }

    await this.dropIndexIfExists(queryRunner, tableName, indexName);

    const refreshedTable = await queryRunner.getTable(tableName);

    if (refreshedTable?.columns.some((column) => column.name === 'deletedAt')) {
      await queryRunner.dropColumn(tableName, 'deletedAt');
    }

    const tableAfterDrop = await queryRunner.getTable(tableName);

    if (!tableAfterDrop?.columns.some((column) => column.name === 'activo')) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'activo',
          type: 'boolean',
          default: true,
        }),
      );
    }
  }

  private async createIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const hasDeletedAt = table?.columns.some(
      (column) => column.name === 'deletedAt',
    );
    const hasIndex = table?.indices.some((index) => index.name === indexName);

    if (hasDeletedAt && !hasIndex) {
      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: indexName,
          columnNames: ['deletedAt'],
        }),
      );
    }
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
