# Arquitectura Oficial de Despliegue

Proyecto: Purificadora Jordan

## Objetivo

Mantener costos en 0 durante desarrollo y pruebas.

Stack de despliegue:

- Frontend: Cloudflare Pages
- Backend: Render
- Base de datos: Aiven MySQL Free

## Infraestructura

```text
Internet
|
|-- Frontend: Cloudflare Pages
|-- Backend API: Render Free Web Service
`-- Base de datos: Aiven MySQL Free
```

## Repositorios

```text
github/
|-- jordan-backend
`-- jordan-frontend
```

Repositorios independientes.

## Frontend

Proveedor: Cloudflare Pages

Framework: Nuxt 3

Build command:

```bash
npm run build
```

Output:

```text
.output/public
```

Variables:

- `NUXT_PUBLIC_API_BASE`
- `NUXT_PUBLIC_APP_NAME`

## Backend

Proveedor: Render

Framework: NestJS

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm run start:prod
```

Variables:

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `DB_SSL`
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `NODE_ENV`
- `PORT`
- `CORS_ORIGINS`

## Base De Datos

Proveedor: Aiven

Motor: MySQL

No almacenar credenciales en repositorio. Utilizar unicamente variables de
entorno.

## Configuracion MySQL SSL

Aiven utiliza conexion segura. El backend soporta:

```text
DB_SSL=true
```

Cuando esta variable esta activa, TypeORM configura SSL para MySQL con
`rejectUnauthorized: false`.

## Health Check

Render puede validar:

```text
/api/health
```

## Reglas De Seguridad

Nunca subir:

- `.env`
- `.env.local`
- `.env.production`
- passwords
- `JWT_SECRET`
- tokens
- URLs privadas
- backups SQL
- credenciales
- archivos `.pem`
- keys
- certificados

## Checklist Antes De Push

- `npm run build`
- lint sin errores
- type-check sin errores
- variables en `.env.example`
- `.gitignore` actualizado
- README actualizado
- documentacion sincronizada
- no subir archivos generados

## Meta

Despliegue reproducible.

Configuracion segura.

Costo cero.

Escalable para produccion futura.
