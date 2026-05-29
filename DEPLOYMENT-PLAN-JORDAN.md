# Plan Oficial de Despliegue

## Sistema Purificadora de Agua JORDAN

Fecha: 2026

## Objetivo

Desplegar el sistema completo con costo 0 durante la fase inicial.

Prioridades:

- Mantener MySQL
- Evitar migraciones innecesarias
- Reducir complejidad
- Mantener seguridad
- Facilitar mantenimiento
- Permitir crecimiento futuro

## Arquitectura Oficial

```text
Internet
|
|-- Frontend: Cloudflare Pages
|-- Backend API: Render Free Web Service
`-- Base de Datos: Aiven MySQL Free
```

## Repositorios

```text
github/
|-- jordan-backend
`-- jordan-frontend
```

Repositorios independientes.

## Variables Backend

Configurar unicamente en Render:

```text
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SSL=true

JWT_SECRET=
JWT_EXPIRATION=1h

NODE_ENV=production
PORT=10000
DB_SYNCHRONIZE=false
CORS_ORIGINS=https://TU-FRONTEND.pages.dev
```

## Variables Frontend

Configurar unicamente en Cloudflare Pages:

```text
NUXT_PUBLIC_API_BASE=https://TU-BACKEND.onrender.com/api
NUXT_PUBLIC_APP_NAME=JORDAN
```

## Seguridad

Nunca subir:

- `.env`
- `.env.local`
- `.env.production`
- credenciales
- `JWT_SECRET`
- tokens
- backups SQL
- certificados
- llaves privadas
- archivos PEM
- archivos KEY

## Checklist Antes De Git Push

Backend:

- `npm install`
- `npm run build`
- `npm run lint`
- `npm run test`
- variables documentadas
- `.env` excluido
- documentacion actualizada

Frontend:

- `npm install`
- `npm run build`
- `npm run type-check`
- `npm run lint`
- variables documentadas
- documentacion actualizada

## Checklist Antes De Deploy

### Aiven

- Base creada
- Usuario creado
- SSL habilitado
- Credenciales almacenadas en Render
- Esquema inicial creado con `ALLOW_SCHEMA_BOOTSTRAP=true npm run db:bootstrap-mysql-schema`
- Migraciones verificadas con `npm run db:migration:run`

### Render

- Repositorio conectado
- Variables configuradas
- Build exitoso
- Endpoint `/api/health` operativo
- CORS configurado

### Cloudflare

- Repositorio conectado
- Build exitoso
- Variables configuradas
- URL publica funcionando

## Flujo De Despliegue

1. Desarrollar localmente.
2. Commit.
3. Push GitHub.
4. Deploy automatico frontend en Cloudflare Pages.
5. Deploy automatico backend en Render.
6. Conexion a MySQL Aiven.
7. Validacion funcional:
   - Login
   - Pedidos
   - Rutas
   - Ventas
   - Pagos
   - Cartera
   - Liquidacion
   - Cierre diario

## Roadmap Futuro

Fase 1:

- Cloudflare + Render Free + Aiven Free
- Costo: 0

Fase 2:

- Cloudflare Pages
- Render Starter
- Aiven Startup
- Costo mensual bajo

Fase 3:

- Produccion empresarial
- Cloudflare
- Render escalable
- Base dedicada
- Monitoreo
- Backups avanzados
- Observabilidad
- Auditoria completa

## Decision Oficial

La arquitectura aprobada para el proyecto Jordan sera:

- Frontend: Cloudflare Pages
- Backend: Render Free
- Base de Datos: Aiven MySQL Free

Objetivo: operacion inmediata, costo cero, minimo esfuerzo de migracion y
maxima compatibilidad con el codigo actual.
