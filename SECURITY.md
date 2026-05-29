# Seguridad

## Secretos

Nunca subir al repositorio:

- `.env`
- `.env.local`
- `.env.production`
- credenciales de base de datos
- `JWT_SECRET`
- tokens
- backups SQL
- certificados
- llaves privadas
- archivos PEM o KEY

## Produccion

Variables obligatorias:

- `NODE_ENV=production`
- `DB_SYNCHRONIZE=false`
- `DB_SSL=true` para Aiven MySQL
- `JWT_SECRET` fuerte y unico
- `CORS_ORIGINS` limitado al dominio real del frontend

## Reporte De Incidentes

Si se expone una credencial:

1. Revocar la credencial inmediatamente.
2. Generar una nueva.
3. Actualizar variables en Render o Cloudflare.
4. Revisar logs y accesos recientes.

## Usuario Inicial

El usuario administrador inicial debe crearse con `npm run db:prepare-production`
usando variables de entorno temporales. La contrasena real no debe guardarse en
scripts, commits, README ni archivos `.env.example`.
