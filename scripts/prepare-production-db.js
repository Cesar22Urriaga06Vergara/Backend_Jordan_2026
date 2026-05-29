const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PRESERVED_TABLES = new Set(['migrations', 'typeorm_metadata', 'usuarios']);

function required(name) {
  const value = process.env[name];
  if (value == null || String(value).trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  if (value == null || String(value).trim() === '') return fallback;
  return String(value).trim();
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

async function main() {
  const database = required('DB_DATABASE');
  const connection = await mysql.createConnection({
    host: required('DB_HOST'),
    port: Number(optional('DB_PORT', '3306')),
    user: required('DB_USERNAME'),
    password: required('DB_PASSWORD'),
    database,
    ssl:
      process.env.DB_SSL === 'true'
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });

  const adminEmail = required('PRODUCTION_ADMIN_EMAIL').toLowerCase();
  const adminPassword = required('PRODUCTION_ADMIN_PASSWORD');
  const adminName = optional('PRODUCTION_ADMIN_NAME', 'Administrador Jordan');
  const adminRole = optional('PRODUCTION_ADMIN_ROLE', 'ADMIN');

  try {
    const [tables] = await connection.query(
      `
        SELECT table_name AS name
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
      [database],
    );

    const tablesToTruncate = tables
      .map((row) => row.name)
      .filter((name) => !PRESERVED_TABLES.has(name));

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tablesToTruncate) {
      await connection.query(`TRUNCATE TABLE ${quoteIdentifier(table)}`);
    }

    await connection.query('DELETE FROM usuarios');
    await connection.query('ALTER TABLE usuarios AUTO_INCREMENT = 1');

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await connection.execute(
      `
        INSERT INTO usuarios
          (email, nombre, password, estado, rol, fechaCreacion, fechaActualizacion)
        VALUES (?, ?, ?, 'ACTIVO', ?, NOW(), NOW())
      `,
      [adminEmail, adminName, passwordHash, adminRole],
    );

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Production database prepared.');
    console.log(`Preserved schema tables: ${[...PRESERVED_TABLES].join(', ')}`);
    console.log(`Truncated tables: ${tablesToTruncate.length}`);
    console.log(`Admin user: ${adminEmail}`);
  } catch (error) {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Error preparing production database:', error.message);
  process.exit(1);
});
