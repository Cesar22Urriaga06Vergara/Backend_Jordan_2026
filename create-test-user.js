const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'jordan',
  });

  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Insertar usuario de prueba
    const query = `
      INSERT INTO usuarios (email, nombre, password, estado, rol, fechaCreacion, fechaActualizacion)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE password = ?, estado = ?, fechaActualizacion = NOW()
    `;

    const [result] = await connection.execute(query, [
      'urriaga44@gmail.com',
      'Usuario Prueba',
      hashedPassword,
      'ACTIVO',
      'ADMIN',
      hashedPassword,
      'ACTIVO',
    ]);

    console.log('✅ Usuario creado/actualizado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createTestUser();
