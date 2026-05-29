const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const EVIDENCE_FILE = path.join(__dirname, '.operability-last-run.json');

function loadEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) return;
  const raw = fsSync.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '.env.local'));
loadEnvFile(path.join(__dirname, '.env'));

function dbConfig() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Variables de entorno requeridas no están definidas: ${missing.join(', ')}`);
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };
}

async function readEvidence() {
  const raw = await fs.readFile(EVIDENCE_FILE, 'utf8');
  return JSON.parse(raw);
}

async function verifyEntity(connection, label, query, params) {
  const [rows] = await connection.query(query, params);
  if (!rows.length) {
    throw new Error(`${label} no encontrado en DB`);
  }
  console.log(`✅ ${label} encontrado en DB`);
  console.table(rows);
}

async function verificarDB() {
  const evidence = await readEvidence();
  const config = dbConfig();

  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Verificacion DB de Persistencia Operativa ===');
    console.log('DB esperada:', config.database);

    const [activeDbRows] = await connection.query('SELECT DATABASE() AS db');
    const activeDb = activeDbRows[0]?.db;
    console.log('DB activa  :', activeDb);

    if (activeDb !== config.database) {
      throw new Error(
        `Base activa (${activeDb}) diferente a esperada (${config.database})`,
      );
    }

    const { usuario, producto, cliente } = evidence.entities;

    await verifyEntity(
      connection,
      `Usuario ${usuario.email}`,
      'SELECT id, email, nombre, rol, estado FROM usuarios WHERE id = ? AND email = ?',
      [usuario.id, usuario.email],
    );

    await verifyEntity(
      connection,
      `Producto ${producto.codigo}`,
      'SELECT id, codigo, nombre, categoria, deletedAt FROM productos WHERE id = ? AND codigo = ?',
      [producto.id, producto.codigo],
    );

    await verifyEntity(
      connection,
      `Cliente ${cliente.codigo}`,
      'SELECT id, codigo, nombre, tipo, deletedAt FROM clientes WHERE id = ? AND codigo = ?',
      [cliente.id, cliente.codigo],
    );

    const [countUsers] = await connection.query(
      'SELECT COUNT(*) AS total FROM usuarios',
    );
    const [countProductos] = await connection.query(
      'SELECT COUNT(*) AS total FROM productos',
    );
    const [countClientes] = await connection.query(
      'SELECT COUNT(*) AS total FROM clientes',
    );

    console.log('\n📊 Totales actuales');
    console.log('Usuarios :', countUsers[0].total);
    console.log('Productos:', countProductos[0].total);
    console.log('Clientes :', countClientes[0].total);

    console.log('\n✅ Verificacion DB completada sin falsos negativos por IDs fijos');
  } finally {
    await connection.end();
  }
}

verificarDB().catch((e) => {
  console.error('❌ Error:', e.message);
  console.error(`   Evidencia esperada en: ${EVIDENCE_FILE}`);
  process.exit(1);
});
