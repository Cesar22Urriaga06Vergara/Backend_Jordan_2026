# Backend - Purificadora de Agua JORDAN

Sistema de control interno para Purificadora de Agua JORDAN construido con NestJS y TypeORM.

## Estado de despliegue

La validacion local actual usa MySQL/MariaDB. La arquitectura oficial de
produccion es Render + Aiven MySQL Free para mantener compatibilidad y evitar
migraciones innecesarias.

Ver tambien:

- `DEPLOYMENT-ARCHITECTURE.md`
- `DEPLOYMENT-PLAN-JORDAN.md`
- `README_DEPLOY.md`
- `documentacion/AUDITORIA_Y_ROADMAP.md`

## 🚀 Requisitos Previos

- Node.js 16+ instalado
- MySQL 8+ o MariaDB 10.6+ corriendo en tu máquina
- npm o pnpm como gestor de paquetes

## 📦 Instalación

1. **Instalar dependencias**
   ```bash
   pnpm install
   # O con npm:
   npm install
   ```

2. **Configurar variables de entorno**
   
   Copia `.env.example` a `.env.local` y ajusta los valores locales. No subas
   `.env`, `.env.local` ni secretos reales al repositorio.

   Valores locales de ejemplo:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=tu_usuario_local
   DB_PASSWORD=tu_password_local
   DB_DATABASE=jordan
   JWT_SECRET=dev-insecure-jwt-secret-do-not-use-in-production
   JWT_EXPIRATION=1h
   NODE_ENV=development
   PORT=3000
   ALLOW_REOPEN_DAY_IN_DEV=false
   ```

   Si tu MySQL está en un servidor diferente o con credenciales distintas, actualiza estos valores.

   Solo para desarrollo, si necesitas que reintentar "abrir día" no falle cuando el mismo día ya está abierto y todavía no se ha cerrado, puedes usar:

   ```
   ALLOW_REOPEN_DAY_IN_DEV=true
   ```

   Esta bandera no debe habilitarse en producción.

3. **Crear base de datos**
   
   Abre HeidiSQL o tu cliente MySQL favorito y ejecuta:
   ```sql
   CREATE DATABASE jordan;
   ```

4. **Ejecutar seed con datos iniciales**
   ```bash
   pnpm run db:seed
   ```
   
   Esto creará:
   - ✅ Usuario admin: `admin@jordan.local` / `admin123456`
   - ✅ 11 productos (pacas, botellones, agua a granel)
   - ✅ 3 clientes con precios personalizados
   - ✅ 4 trabajadores (domiciliarios y preventistas)
   - ✅ Tipos de labor y tarifas

## 🏃 Ejecutar en Desarrollo

```bash
pnpm run start:dev
```

El servidor se ejecutará en `http://localhost:3001`

## 📝 Scripts Disponibles

| Comando | Descripción |
|---------|------------|
| `pnpm run start` | Ejecutar en modo producción |
| `pnpm run start:dev` | Ejecutar en modo desarrollo con watch |
| `pnpm run start:debug` | Ejecutar con debugger |
| `pnpm run build` | Compilar TypeScript a JavaScript |
| `pnpm run lint` | Ejecutar ESLint |
| `pnpm run format` | Formatear código con Prettier |
| `pnpm run test` | Ejecutar tests con Jest |
| `pnpm run db:seed` | Llenar BD con datos iniciales |

## 🗄️ Base de Datos

### Administración con HeidiSQL

1. Abre HeidiSQL
2. Crea una nueva conexión:
   - Servidor: `localhost`
   - Puerto: `3306`
   - Usuario: `root`
   - Contraseña: `root`
3. Conecta y navega a la BD `jordan`

### Entidades Principales

- **usuarios** - Usuarios del sistema
- **productos** - Catálogo de productos
- **clientes** - Datos de clientes
- **precios_cliente** - Precios personalizados por cliente
- **trabajadores** - Personal
- **pedidos** - Órdenes de compra
- **rutas** - Rutas de entrega
- **ventas** - Registro de ventas
- **cartera** - Cuentas por cobrar
- **movimiento_caja** - Transacciones
- **inventario_inicial** - Stock inicial del día
- **produccion_diaria** - Producción registrada

## 🔐 Autenticación

El sistema usa **JWT (JSON Web Tokens)**:

1. Usuario hace login con email/contraseña
2. Backend devuelve un JWT válido por 1 hora
3. Cliente incluye el token en el header: `Authorization: Bearer <token>`
4. Backend valida el token con `JwtAuthGuard`

**Credenciales por defecto:**
- **Email:** `admin@jordan.local`
- **Contraseña:** `admin123456`

## 📚 Estructura del Backend

```
src/
├── common/
│   ├── decorators/      # Decoradores (CurrentUser, Public)
│   ├── dtos/            # Data Transfer Objects comunes
│   ├── enums/           # Enumeraciones (EstadoPedido, TipoLabor, etc)
│   ├── guards/          # Guards de autenticación (JWT)
│   └── utils/           # Utilidades (Password, Date, Numbers)
├── database/
│   ├── entities.ts      # Entidades de TypeORM (todas las tablas)
│   ├── typeorm.config.ts # Configuración de TypeORM
│   └── seed.ts          # Script para llenar BD inicial
├── modules/             # Módulos de negocio (Auth, Productos, etc)
├── app.module.ts        # Módulo raíz
└── main.ts              # Punto de entrada
```

## 🚦 Estados y Enums

Los estados principales están definidos en `src/common/enums/index.ts`:

### EstadoPedido
- `PENDIENTE` - Creado pero no cargado
- `CARGADO_EN_RUTA` - Asignado a una ruta
- `ENTREGADO` - Entregado exitosamente
- `NO_ENTREGADO` - Intento fallido
- `DEVUELTO` - Devuelto a planta
- `CANCELADO` - Cancelado por el cliente

### EstadoRuta
- `CREADA` - Creada pero sin pedidos
- `CARGADA` - Pedidos asignados
- `EN_ENTREGA` - Domiciliario en ruta
- `EN_LIQUIDACION` - Esperando liquidación
- `LIQUIDADA` - Completada
- `ANULADA` - Cancelada

### EstadoVenta
- `COMPLETADA` - Pagada completamente
- `PARCIAL` - Pago parcial, saldo pendiente
- `PENDIENTE` - Sin pagos
- `CANCELADA` - Cancelada

## 🔄 Flujo Típico

1. **Crear Pedido** → `POST /api/pedidos`
2. **Crear Ruta** → `POST /api/rutas`
3. **Cargar Pedidos a Ruta** → `POST /api/rutas/:id/cargar-pedidos`
4. **Registrar Entrega** → `POST /api/rutas/:id/intentos-entrega`
5. **Crear Venta** → `POST /api/ventas`
6. **Registrar Pago** → `POST /api/pagos`
7. **Liquidar Ruta** → `POST /api/rutas/:id/liquidar`
8. **Cerrar Día** → `POST /api/diario/cerrar`

## ⚠️ Importantes

- **Venta ≠ Pago**: Una venta existe aunque no se pague. El saldo entra a cartera.
- **Cartera**: Solo saldo pendiente de cliente (no dinero en caja)
- **Pedidos no se pierden**: Pueden estar en estado NO_ENTREGADO o DEVUELTO
- **Precios por cliente**: Cada cliente puede tener precios personalizados
- **Trabajadores con deuda**: Los anticipos/préstamos NO se descuentan automáticamente

## 🐛 Troubleshooting

### Error: "Cannot find module 'src/...'"
Asegúrate de que `tsconfig.json` tenga la ruta `@/*` configurada y que estés en el directorio correcto.

### Error: "Connection to MySQL failed"
Verifica que:
- MySQL está corriendo
- Las credenciales en `.env.local` son correctas
- La BD `jordan` existe

### Error: "TypeORM synchronize error"
Si TypeORM intenta crear tablas y hay error:
1. Elimina todas las tablas de la BD
2. Ejecuta `pnpm run db:seed` nuevamente

## 📞 Soporte

Cualquier problema, revisa:
1. Los logs en la consola
2. HeidiSQL para ver el estado de la BD
3. Las variables de entorno en `.env.local`

---

**Última actualización:** 3 de abril de 2026
