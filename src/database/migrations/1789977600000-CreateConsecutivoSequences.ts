import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConsecutivoSequences1789977600000
  implements MigrationInterface
{
  name = 'CreateConsecutivoSequences1789977600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS secuencias_consecutivos (
        id INT NOT NULL AUTO_INCREMENT,
        clave VARCHAR(255) NOT NULL,
        prefijo VARCHAR(255) NOT NULL,
        fecha VARCHAR(8) NOT NULL,
        siguiente INT UNSIGNED NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_secuencias_consecutivos_clave (clave),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO secuencias_consecutivos
        (clave, prefijo, fecha, siguiente, createdAt, updatedAt)
      SELECT
        CONCAT(prefijo, '-', fecha) AS clave,
        prefijo,
        fecha,
        MAX(numero) + 1 AS siguiente,
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
      FROM (
        SELECT 'PED' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM pedidos
        WHERE numero REGEXP '^PED-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'RUT' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM rutas
        WHERE numero REGEXP '^RUT-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'VEN' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM ventas
        WHERE numero REGEXP '^VEN-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'PAG' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM pagos
        WHERE numero REGEXP '^PAG-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'CAJ' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM movimiento_caja
        WHERE numero REGEXP '^CAJ-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'EGR' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM movimiento_caja
        WHERE numero REGEXP '^EGR-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'PAG-T' AS prefijo, SUBSTRING(numero, 7, 8) AS fecha, CAST(SUBSTRING(numero, 16) AS UNSIGNED) AS numero
        FROM pago_trabajador
        WHERE numero REGEXP '^PAG-T-[0-9]{8}-[0-9]+$'
        UNION ALL
        SELECT 'ANT' AS prefijo, SUBSTRING(numero, 5, 8) AS fecha, CAST(SUBSTRING(numero, 14) AS UNSIGNED) AS numero
        FROM anticipo_prestamo
        WHERE numero REGEXP '^ANT-[0-9]{8}-[0-9]+$'
      ) existentes
      GROUP BY prefijo, fecha
      ON DUPLICATE KEY UPDATE
        siguiente = GREATEST(siguiente, VALUES(siguiente)),
        updatedAt = CURRENT_TIMESTAMP(6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS secuencias_consecutivos');
  }
}
