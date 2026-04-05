const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

const EVIDENCE_FILE = path.join(__dirname, '.operability-last-run.json');

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'jordan',
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
      'SELECT id, codigo, nombre, categoria, activo FROM productos WHERE id = ? AND codigo = ?',
      [producto.id, producto.codigo],
    );

    await verifyEntity(
      connection,
      `Cliente ${cliente.codigo}`,
      'SELECT id, codigo, nombre, tipo, activo FROM clientes WHERE id = ? AND codigo = ?',
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
