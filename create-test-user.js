/**
 * Crea o actualiza un usuario admin de prueba usando solo variables de entorno.
 * No incluye secretos en el repositorio.
 *
 * Requeridas en `.env` / `.env.local`:
 *   DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE
 *   SEED_TEST_USER_EMAIL, SEED_TEST_USER_PASSWORD
 *
 * Opcionales:
 *   DB_PORT (default 3306)
 *   SEED_TEST_USER_NOMBRE (default "Usuario prueba")
 *   SEED_TEST_USER_ROL (default "ADMIN")
 */

const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

function requireEnv(name) {
  const v = process.env[name];
  if (v == null || String(v).trim() === '') {
    console.error(`❌ Falta la variable de entorno obligatoria: ${name}`);
    process.exit(1);
  }
  return String(v).trim();
}

function envOr(name, defaultValue) {
  const v = process.env[name];
  if (v == null || String(v).trim() === '') return defaultValue;
  return String(v).trim();
}

async function createTestUser() {
  const host = requireEnv('DB_HOST');
  const user = requireEnv('DB_USERNAME');
  const password = requireEnv('DB_PASSWORD');
  const database = requireEnv('DB_DATABASE');
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  const email = requireEnv('SEED_TEST_USER_EMAIL');
  const plainPassword = requireEnv('SEED_TEST_USER_PASSWORD');
  const nombre = envOr('SEED_TEST_USER_NOMBRE', 'Usuario prueba');
  const rol = envOr('SEED_TEST_USER_ROL', 'ADMIN');

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const query = `
      INSERT INTO usuarios (email, nombre, password, estado, rol, fechaCreacion, fechaActualizacion)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE password = ?, estado = ?, fechaActualizacion = NOW()
    `;

    const [result] = await connection.execute(query, [
      email,
      nombre,
      hashedPassword,
      'ACTIVO',
      rol,
      hashedPassword,
      'ACTIVO',
    ]);

    console.log('✅ Usuario creado o actualizado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

createTestUser();
