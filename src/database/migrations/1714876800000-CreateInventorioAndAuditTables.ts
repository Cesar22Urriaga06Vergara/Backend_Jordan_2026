import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateInventorioAndAuditTables1714876800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('inventarios'))) {
      await queryRunner.createTable(
        new Table({
          name: 'inventarios',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'productoId',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'stockActual',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: 0,
            },
            {
              name: 'stockMinimo',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: 10,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
          foreignKeys: [
            {
              name: 'FK_inventarios_productos',
              columnNames: ['productoId'],
              referencedTableName: 'productos',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
              onUpdate: 'NO ACTION',
            },
          ],
          indices: [
            {
              name: 'IDX_inventarios_productoId',
              columnNames: ['productoId'],
              isUnique: true,
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('audit_logs'))) {
      await queryRunner.createTable(
        new Table({
          name: 'audit_logs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'entidad',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'entidadId',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'accion',
              type: 'varchar',
              length: '20',
              isNullable: false,
            },
            {
              name: 'usuarioId',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'cambiosAntes',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'cambiosDespues',
              type: 'json',
              isNullable: true,
            },
            {
              name: 'ipAddress',
              type: 'varchar',
              length: '45',
              isNullable: true,
            },
            {
              name: 'userAgent',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'razon',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'fecha',
              type: 'datetime',
              isNullable: false,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
          foreignKeys: [
            {
              name: 'FK_audit_logs_usuarios',
              columnNames: ['usuarioId'],
              referencedTableName: 'usuarios',
              referencedColumnNames: ['id'],
              onDelete: 'SET NULL',
              onUpdate: 'NO ACTION',
            },
          ],
          indices: [
            {
              name: 'IDX_audit_logs_entidad',
              columnNames: ['entidad', 'entidadId'],
            },
            {
              name: 'IDX_audit_logs_usuarioId',
              columnNames: ['usuarioId'],
            },
            {
              name: 'IDX_audit_logs_accion',
              columnNames: ['accion'],
            },
            {
              name: 'IDX_audit_logs_fecha',
              columnNames: ['fecha'],
            },
          ],
        }),
      );
    }

    await this.backfillInventarios(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs', true, true, true);
    await queryRunner.dropTable('inventarios', true, true, true);
  }

  private async backfillInventarios(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('productos')) ||
      !(await queryRunner.hasTable('inventarios'))
    ) {
      return;
    }

    const productosTable = await queryRunner.getTable('productos');
    let productosWhere = '1 = 1';

    if (productosTable?.columns.some((column) => column.name === 'activo')) {
      productosWhere = 'activo = true';
    } else if (
      productosTable?.columns.some((column) => column.name === 'deletedAt')
    ) {
      productosWhere = 'deletedAt IS NULL';
    }

    await queryRunner.query(`
      INSERT IGNORE INTO inventarios
        (productoId, stockActual, stockMinimo, createdAt, updatedAt)
      SELECT id, 0.00, 10.00, NOW(), NOW()
      FROM productos
      WHERE ${productosWhere}
    `);
  }
}
