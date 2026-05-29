# Auditoria y Roadmap - Sistema Jordan

Fecha de actualizacion: 2026-05-29

Este documento es la fuente de verdad para el estado tecnico actual del
backend y frontend. Reemplaza los reportes anteriores de auditoria, tabla de
hallazgos y plan semanal, que repetian informacion y ya no reflejaban varios
fixes aplicados.

## Estado actual

El sistema ya paso una ronda de correcciones criticas y verificacion local.
La validacion actual corresponde al entorno local MySQL/MariaDB.

La arquitectura oficial de despliegue queda alineada a Cloudflare Pages +
Render Free + Aiven MySQL Free para evitar migraciones innecesarias.

Verificaciones realizadas:

| Area | Resultado |
| --- | --- |
| Backend tests | OK, 21 tests |
| Backend build | OK |
| Migraciones TypeORM | OK, sin pendientes |
| Auditoria de datos | OK, 0 criticos y 0 medios |
| Smoke operativo | OK |
| Frontend build | OK |
| Frontend type-check | OK |

Smoke operativo validado:

- Login administrativo.
- Creacion de producto y cliente QA.
- Venta directa parcial.
- Cartera generada y cancelada.
- Pedido creado.
- Ruta cargada, en entrega y liquidada.
- Pedido entregado.
- Venta generada desde liquidacion.
- Movimiento de inventario por entrega.

## Cambios criticos ya resueltos

### Backend

- Autenticacion global con `APP_GUARD` y `JwtAuthGuard`.
- Roles globales con `RolesGuard`.
- Throttling global con `ThrottlerGuard`.
- Operaciones de pedidos dentro de transacciones.
- Actualizacion de pedidos dentro de transacciones.
- Validacion de producto, cantidad y precio al construir detalles.
- Calculos monetarios usando `MoneyUtil` en flujos criticos.
- Registro de pagos con lock pesimista para evitar doble pago concurrente.
- Indice unico para `ventas.pedidoId`.
- Migracion `1790246400000-AddUniqueVentaPedido`.
- TypeORM `synchronize` protegido: solo se activa con `DB_SYNCHRONIZE=true`,
  `ALLOW_TYPEORM_SYNC=true` y fuera de produccion.
- Listado de productos corregido para no incluir soft-deleted por defecto.
- Liquidacion de rutas registra movimientos de inventario por pedidos
  entregados.
- Liquidacion de rutas devuelve el estado desde la misma transaccion.

### Scripts operativos

- `npm run audit:data`: auditoria read-only de consistencia de datos.
- `npm run smoke:flow`: prueba end-to-end de flujo operativo.

### Git ignore

- Backend y frontend ignoran artefactos locales, builds, logs, entornos,
  caches y archivos generados.
- `tsconfig.tsbuildinfo` y `.operability-last-run.json` deben permanecer fuera
  del repositorio.

## Estado de riesgos

### Riesgo bajo o mitigado

- Doble venta para el mismo pedido: mitigado con indice unico.
- Pago concurrente duplicado: mitigado con lock pesimista.
- Inconsistencias por update parcial de pedidos: mitigado con transacciones.
- Inventario sin movimiento al liquidar ruta: mitigado.
- TypeORM sincronizando schema por accidente: mitigado.

### Riesgo pendiente

- Revisar manualmente flujos UI en navegador con usuario real.
- Validar permisos por rol en cada pantalla y endpoint sensible.
- Confirmar que produccion tiene `ALLOW_TYPEORM_SYNC` ausente o en `false`.
- Confirmar que secrets y URLs productivas no estan versionadas.
- Revisar performance con datos grandes.
- Decidir si el saldo minimo de cartera debe salir de ENV o configuracion.
- Completar cobertura para concurrencia y rollback en escenarios negativos.
- Configurar ESLint en ambos repos si se desea exigir `npm run lint` en CI.

## Roadmap recomendado

### Antes de subir a produccion

1. Preparar Aiven MySQL:

   - Crear servicio MySQL Free.
   - Guardar host, puerto, usuario, password y database en Render.
   - Activar `DB_SSL=true`.
   - Ejecutar `ALLOW_SCHEMA_BOOTSTRAP=true npm run db:bootstrap-mysql-schema`
     solo una vez sobre la base vacia.
   - Probar `npm run db:migration:run` contra Aiven.

2. Ejecutar:

   ```bash
   npm test -- --runInBand
   npm run build
   npm run db:migration:run
   npm run audit:data
   npm run smoke:flow
   ```

3. En frontend, ejecutar:

   ```bash
   npm run type-check
   npm run build
   ```

4. Validar manualmente:

   - Login y logout.
   - Crear pedido.
   - Cargar ruta.
   - Marcar entregas y devoluciones.
   - Liquidar ruta.
   - Crear venta directa.
   - Registrar pago parcial y pago final.
   - Cierre diario.

5. Revisar variables de produccion:

   - `NODE_ENV=production`
   - variables `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
   - `DB_SSL=true` para Aiven
   - `DB_SYNCHRONIZE=false`
   - No definir `ALLOW_TYPEORM_SYNC=true`
   - JWT secrets reales.
   - Cookies seguras si aplica HTTPS.

### Semana 1

- Separar commit backend de commit frontend.
- Configurar lint o retirar temporalmente lint del checklist de CI.
- Agregar tests de concurrencia para venta, pago y liquidacion.
- Agregar tests de rollback cuando falla caja, cartera o movimiento de
  inventario.
- Revisar reglas de roles por endpoint.
- Revisar mensajes de error para que usuario entienda que corregir.

### Semana 2

- Refactor de pantallas grandes en frontend.
- Consolidar composables duplicados.
- Completar tipos compartidos de DTOs.
- Agregar estados de carga y error consistentes.
- Revisar performance de reportes y listados.

### Mes actual

- Documentar deployment y rollback.
- Agregar OpenAPI/Swagger si se va a entregar API a terceros.
- Agregar auditoria funcional de acciones monetarias.
- Crear alertas para inconsistencias de cartera, caja e inventario.
- Probar con volumen alto de datos.

## Politica de documentacion

Para evitar redundancia:

- Este archivo resume estado, decisiones y roadmap.
- Los detalles tecnicos deben vivir en commits, tests y migraciones.
- Los hallazgos cerrados no deben mantenerse como documentos separados.
- Si aparece un nuevo hallazgo, agregarlo aqui en "Riesgo pendiente" con fecha.
- Si se resuelve un riesgo, moverlo a "Riesgo bajo o mitigado".

## Criterio de cierre

La ronda actual se considera cerrada cuando:

- La base de datos objetivo coincide con el despliegue real.
- Las migraciones corren sobre Aiven MySQL.
- Los comandos de verificacion pasan.
- No hay migraciones pendientes.
- `audit:data` reporta 0 criticos.
- `smoke:flow` pasa.
- El commit excluye archivos generados.
- El equipo revisa manualmente la UI principal.
