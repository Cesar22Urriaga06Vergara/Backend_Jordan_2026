import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueVentaPedido1790246400000 implements MigrationInterface {
  name = 'AddUniqueVentaPedido1790246400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ventas` ADD UNIQUE INDEX `IDX_ventas_pedidoId_unique` (`pedidoId`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ventas` DROP INDEX `IDX_ventas_pedidoId_unique`',
    );
  }
}
