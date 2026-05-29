import { DataSource, DataSourceOptions } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

function migrationTimestamp(name: string): number {
  const match = name.match(/(\d{13})$/);
  if (!match) {
    throw new Error(`No timestamp found in migration name: ${name}`);
  }
  return Number(match[1]);
}

async function assertDatabaseCanBeBootstrapped(dataSource: DataSource) {
  const database = dataSource.options.database;
  const rows = await dataSource.query(
    `
      SELECT table_name AS tableName
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('migrations', 'typeorm_metadata')
    `,
    [database],
  );

  if (rows.length > 0 && process.env.FORCE_SCHEMA_BOOTSTRAP !== 'true') {
    throw new Error(
      `Database ${database} is not empty. Refusing schema bootstrap. ` +
        'Set FORCE_SCHEMA_BOOTSTRAP=true only if you know what you are doing.',
    );
  }
}

async function markCurrentMigrationsAsApplied(dataSource: DataSource) {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT NOT NULL AUTO_INCREMENT,
      timestamp BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB
  `);

  const migrations = (typeOrmConfig.migrations ?? []) as any[];
  for (const Migration of migrations) {
    const instance =
      typeof Migration === 'function' ? new Migration() : Migration;
    const name = instance.name ?? Migration.name;
    const timestamp = migrationTimestamp(Migration.name ?? name);

    await dataSource.query(
      'INSERT IGNORE INTO migrations (`timestamp`, `name`) VALUES (?, ?)',
      [timestamp, name],
    );
  }
}

async function bootstrap() {
  if (process.env.ALLOW_SCHEMA_BOOTSTRAP !== 'true') {
    throw new Error(
      'Refusing to bootstrap schema. Set ALLOW_SCHEMA_BOOTSTRAP=true explicitly.',
    );
  }

  const dataSource = new DataSource({
    ...(typeOrmConfig as DataSourceOptions),
    synchronize: false,
    migrationsRun: false,
    logging: process.env.DEBUG_SCHEMA_BOOTSTRAP === 'true',
  });

  await dataSource.initialize();

  try {
    await assertDatabaseCanBeBootstrapped(dataSource);
    await dataSource.synchronize(false);
    await markCurrentMigrationsAsApplied(dataSource);
    console.log(`Schema bootstrapped for database: ${dataSource.options.database}`);
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch((error) => {
  console.error('Schema bootstrap failed:', error.message);
  process.exit(1);
});
