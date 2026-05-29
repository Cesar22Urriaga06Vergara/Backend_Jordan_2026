import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTrabajadorTipos1790150400000 implements MigrationInterface {
  name = 'AddTrabajadorTipos1790150400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('trabajador_tipos');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'trabajador_tipos',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombre', type: 'varchar', length: '80', isUnique: true },
            { name: 'descripcion', type: 'varchar', length: '250', isNullable: true },
            { name: 'activo', type: 'tinyint', default: 1 },
            { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );
    }

    await queryRunner.query(
      `INSERT IGNORE INTO trabajador_tipos (nombre, descripcion, activo) VALUES
      ('PERMANENTE', 'Trabajador fijo o recurrente', 1),
      ('TEMPORAL', 'Trabajador temporal por temporada o necesidad puntual', 1),
      ('PREVENTISTA', 'Trabajador asignado a preventa o toma de pedidos', 1),
      ('DOMICILIARIO', 'Trabajador asignado a entregas o rutas', 1),
      ('MIXTO', 'Trabajador con funciones combinadas', 1)`,
    );

    const table = await queryRunner.getTable('trabajadores');
    const tipoColumn = table?.findColumnByName('tipoTrabajador');
    if (tipoColumn && tipoColumn.type !== 'varchar') {
      await queryRunner.query(
        `ALTER TABLE trabajadores MODIFY tipoTrabajador varchar(80) NOT NULL DEFAULT 'PERMANENTE'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('trabajador_tipos');
    if (hasTable) {
      await queryRunner.dropTable('trabajador_tipos');
    }
  }
}
