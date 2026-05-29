import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTrabajadorCargo1790064000000 implements MigrationInterface {
  name = 'AddTrabajadorCargo1790064000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('trabajadores');
    const hasCargo = table?.findColumnByName('cargo');
    if (!hasCargo) {
      await queryRunner.addColumn(
        'trabajadores',
        new TableColumn({
          name: 'cargo',
          type: 'varchar',
          length: '80',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('trabajadores');
    const hasCargo = table?.findColumnByName('cargo');
    if (hasCargo) {
      await queryRunner.dropColumn('trabajadores', 'cargo');
    }
  }
}
