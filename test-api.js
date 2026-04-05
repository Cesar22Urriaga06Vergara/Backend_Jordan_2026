const fs = require('node:fs/promises');
const path = require('node:path');

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const OUTPUT_FILE = path.join(__dirname, '.operability-last-run.json');

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function requireStatus(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name} devolvio ${actual}, esperado ${expected}`);
  }
}

async function testAPI() {
  try {
    console.log('=== Verificacion Operativa API (Usuarios/Productos/Clientes) ===');
    console.log('API_BASE:', API_BASE);

    const runId = Date.now().toString();
    const usuarioEmail = `qa.${runId}@jordan.local`;
    const productoCodigo = `QA-P-${runId.slice(-8)}`;
    const clienteCodigo = `QA-C-${runId.slice(-8)}`;

    console.log('\n1) Login admin');
    const login = await requestJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@jordan.local',
        password: 'admin123456',
      }),
    });
    requireStatus('Login', login.response.status, 201);

    const token = login.body?.data?.access_token;
    if (!token) {
      throw new Error('Login sin access_token');
    }
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    console.log('2) Crear usuario');
    const createUser = await requestJson(`${API_BASE}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nombre: `QA Usuario ${runId}`,
        email: usuarioEmail,
        password: 'qa12345678',
        rol: 'ADMIN',
      }),
    });
    requireStatus('Crear usuario', createUser.response.status, 201);
    const usuario = createUser.body?.data;

    console.log('3) Crear producto');
    const createProducto = await requestJson(`${API_BASE}/catalogos/productos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        codigo: productoCodigo,
        nombre: `QA Producto ${runId}`,
        categoria: 'Normal',
        unidad: 'Paca',
      }),
    });
    requireStatus('Crear producto', createProducto.response.status, 201);
    const producto = createProducto.body?.data;

    console.log('4) Crear cliente');
    const createCliente = await requestJson(`${API_BASE}/catalogos/clientes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        codigo: clienteCodigo,
        nombre: `QA Cliente ${runId}`,
        tipo: 'TIENDA',
        nit: `NIT-${runId.slice(-6)}`,
      }),
    });
    requireStatus('Crear cliente', createCliente.response.status, 201);
    const cliente = createCliente.body?.data;

    console.log('5) Listar y validar presencia');
    const listUsers = await requestJson(`${API_BASE}/users?page=1&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    requireStatus('Listar usuarios', listUsers.response.status, 200);
    const usersItems = listUsers.body?.data?.items || [];
    const hasUser = usersItems.some((u) => u.email === usuarioEmail);
    if (!hasUser) {
      throw new Error('Usuario creado no aparece en listado');
    }

    const listProductos = await requestJson(
      `${API_BASE}/catalogos/productos?page=1&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    requireStatus('Listar productos', listProductos.response.status, 200);
    const productosItems = listProductos.body?.data?.items || [];
    const hasProducto = productosItems.some((p) => p.codigo === productoCodigo);
    if (!hasProducto) {
      throw new Error('Producto creado no aparece en listado');
    }

    const listClientes = await requestJson(
      `${API_BASE}/catalogos/clientes?page=1&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    requireStatus('Listar clientes', listClientes.response.status, 200);
    const clientesItems = listClientes.body?.data?.items || [];
    const hasCliente = clientesItems.some((c) => c.codigo === clienteCodigo);
    if (!hasCliente) {
      throw new Error('Cliente creado no aparece en listado');
    }

    console.log('6) Recarga simulada (relectura por ID)');
    const readUser = await requestJson(`${API_BASE}/users/${usuario.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    requireStatus('Leer usuario por ID', readUser.response.status, 200);

    const readProducto = await requestJson(
      `${API_BASE}/catalogos/productos/${producto.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    requireStatus('Leer producto por ID', readProducto.response.status, 200);

    const readCliente = await requestJson(
      `${API_BASE}/catalogos/clientes/${cliente.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    requireStatus('Leer cliente por ID', readCliente.response.status, 200);

    const evidence = {
      runAt: new Date().toISOString(),
      apiBase: API_BASE,
      entities: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
        },
        producto: {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
        },
        cliente: {
          id: cliente.id,
          codigo: cliente.codigo,
          nombre: cliente.nombre,
        },
      },
    };

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(evidence, null, 2), 'utf8');

    console.log('\n✅ Verificacion API completada');
    console.log('   Usuario:', usuario.email);
    console.log('   Producto:', producto.codigo);
    console.log('   Cliente:', cliente.codigo);
    console.log('   Evidencia guardada en:', OUTPUT_FILE);
  } catch (error) {
    console.error('❌ FALLO EN VERIFICACION API:', error.message);
    process.exit(1);
  }
}

testAPI();
