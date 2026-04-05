import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

/**
 * Migración: Agregar Foreign Key con ON DELETE CASCADE para liquidacion_ruta → rutas
 * Previene registros huérfanos cuando se elimina una ruta.
 *
 * Ejecución manual (si lo necesitas):
 * npm run typeorm migration:run
 */
export class AddLiquidacionRutaForeignKey1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Obtener tabla liquidacion_ruta
    const table = await queryRunner.getTable('liquidacion_ruta');

    if (table) {
      // Verificar si la FK ya existe
      const existingFk = table.foreignKeys.find(
        (fk) => fk.columnNames.includes('rutaId'),
      );

      if (!existingFk) {
        // Agregar la FK con ON DELETE CASCADE
        await queryRunner.createForeignKey(
          'liquidacion_ruta',
          new TableForeignKey({
            name: 'FK_liquidacion_ruta_rutas_cascade',
            columnNames: ['rutaId'],
            referencedTableName: 'rutas',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'NO ACTION',
          }),
        );

        console.log(
          '✅ Migración exitosa: Foreign Key agregado a liquidacion_ruta',
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Eliminar la FK si existe
    const table = await queryRunner.getTable('liquidacion_ruta');

    if (table) {
      const fk = table.foreignKeys.find(
        (fk) => fk.name === 'FK_liquidacion_ruta_rutas_cascade',
      );

      if (fk) {
        await queryRunner.dropForeignKey('liquidacion_ruta', fk);
        console.log(
          '✅ Rollback exitoso: Foreign Key eliminado de liquidacion_ruta',
        );
      }
    }
  }
}
