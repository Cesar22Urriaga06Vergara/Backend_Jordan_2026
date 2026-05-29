# Deploy Backend Jordan

## Plataforma

- Backend: Render Free Web Service
- Base de datos: Aiven MySQL Free

## Build

```bash
npm install && npm run build
```

## Start

```bash
npm run start:prod
```

## Variables En Render

```text
NODE_ENV=production
PORT=10000

DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SSL=true
DB_SYNCHRONIZE=false

JWT_SECRET=
JWT_EXPIRATION=1h
CORS_ORIGINS=https://TU-FRONTEND.pages.dev
```

## Health Check

```text
https://TU-BACKEND.onrender.com/api/health
```

## Migraciones

Este proyecto ya tenia esquema antes de incorporar migraciones completas. Para
una base Aiven nueva, primero crear una linea base del esquema:

```bash
ALLOW_SCHEMA_BOOTSTRAP=true npm run db:bootstrap-mysql-schema
```

Luego ejecutar migraciones. En una base recien inicializada deberia indicar que
no hay pendientes:

```bash
npm run db:migration:run
```

## Preparar Base Limpia

Para dejar una base limpia con un unico usuario administrador, ejecutar con
variables de entorno temporales:

```bash
PRODUCTION_ADMIN_EMAIL=admin@example.com \
PRODUCTION_ADMIN_PASSWORD=change-me \
PRODUCTION_ADMIN_NAME="Administrador Jordan" \
npm run db:prepare-production
```

No guardar la contrasena real en archivos del repositorio.

## Validacion Posterior

- Login
- Pedidos
- Rutas
- Ventas
- Pagos
- Cartera
- Liquidacion
- Cierre diario
