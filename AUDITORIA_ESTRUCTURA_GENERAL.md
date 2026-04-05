# Auditoria Estructural General - Sistema JORDAN

Fecha: 2026-04-03
Alcance: Backend_Jordan + Frontend_Jordan
Objetivo: establecer una linea base de arquitectura para mantenimiento, roadmap y decisiones tecnicas.

## 1) Resumen Ejecutivo

- Arquitectura actual: monorepo logico en workspace multi-root con backend NestJS + frontend Nuxt 3.
- Backend: modular por dominio, con seguridad global por JWT/Roles, validacion global de DTOs y respuesta estandarizada.
- Frontend: SPA (SSR desactivado), layout protegido por middleware de auth, consumo de API centralizado via Axios composable.
- Cobertura funcional actual: operaciones diarias, pedidos, rutas, ventas, catalogos, cartera/caja, produccion e inventario.
- Brechas de estructura: carpetas backend placeholder sin implementacion funcional y algunas convenciones de manejo de errores mejorables.

## 2) Stack Tecnologico

### Backend

- Framework: NestJS 10
- ORM: TypeORM 0.3
- DB: MySQL/MariaDB
- Auth: JWT + Passport
- Validacion: class-validator + ValidationPipe global
- Lenguaje: TypeScript

### Frontend

- Framework: Nuxt 3 (ssr: false)
- UI: Vue 3 + TailwindCSS
- Estado: Pinia
- HTTP: Axios
- Lenguaje: TypeScript (strict)

## 3) Arquitectura Backend

## 3.1 Entry points y capa transversal

- `src/main.ts`
  - Prefijo global: `/api`
  - CORS habilitado para `http://localhost:3002` y `http://localhost:3000`
  - Filtro global de excepciones
  - Interceptor global de respuesta
  - ValidationPipe global (whitelist, transform, forbidNonWhitelisted)
- `src/app.module.ts`
  - Guards globales: `JwtAuthGuard` y `RolesGuard`
  - Carga de variables de entorno via ConfigModule
  - Inicializacion TypeORM

## 3.2 Modulos activos (importados en AppModule)

- Auth
- Users
- Catalogos
- Operaciones
- Diario
- TrabajadoresOps

## 3.3 Inventario de controladores y rutas

Prefijo global aplicado a todos: `/api`

- Auth (`/api/auth`)
  - POST `/login`
  - POST `/logout`
  - GET `/me`
- Users (`/api/users`)
  - POST `/`
  - GET `/`
  - GET `/profile`
  - GET `/:id`
  - PATCH `/profile`
  - PATCH `/change-password`
- Catalogos Clientes (`/api/catalogos/clientes`)
  - GET `/`
  - GET `/:id`
  - POST `/`
  - PUT `/:id`
  - PATCH `/:id/toggle-activo`
  - GET `/:id/precios`
  - POST `/:id/precios`
- Catalogos Productos (`/api/catalogos/productos`)
  - GET `/`
  - GET `/categorias`
  - GET `/:id`
  - POST `/`
  - PUT `/:id`
  - PATCH `/:id/toggle-activo`
- Catalogos Trabajadores (`/api/catalogos/trabajadores`)
  - GET `/`
  - GET `/:id`
  - POST `/`
  - PUT `/:id`
  - PATCH `/:id/toggle-activo`
- Diario (`/api/diario`)
  - GET `/estado`
  - GET `/historial`
  - POST `/apertura`
  - POST `/produccion`
  - POST `/cierre`
- Operaciones Pedidos (`/api/operaciones/pedidos`)
  - GET `/`
  - GET `/:id`
  - POST `/`
  - PATCH `/:id/estado`
- Operaciones Rutas (`/api/operaciones/rutas`)
  - GET `/`
  - GET `/:id`
  - POST `/`
  - POST `/:id/pedidos`
  - DELETE `/:id/pedidos/:pedidoId`
  - PATCH `/:id/estado`
  - POST `/:id/liquidar`
- Operaciones Ventas (`/api/operaciones/ventas`)
  - GET `/`
  - GET `/:id`
  - POST `/`
  - POST `/:id/pagos`
  - GET `/cartera/resumen`
- Trabajadores Ops (`/api/trabajadores-ops`)
  - GET `/labores`
  - POST `/labores`
  - POST `/pagos`
  - POST `/anticipos`
  - POST `/abonos`
  - GET `/:trabajadorId/anticipos`

## 3.4 Modelo de datos (TypeORM)

- Total de entidades detectadas: 31
- Dominios modelados:
  - Seguridad: usuarios
  - Catalogos: productos, clientes, trabajadores, tarifas
  - Operaciones: pedidos, rutas, intentos de entrega, ventas, pagos, cartera
  - Caja/Diario: apertura/cierre diario, movimientos y cierre de caja
  - Inventario/Produccion: inventario inicial/cierre, movimientos, produccion diaria
  - RRHH operativo: labores, pagos a trabajador, anticipos, abonos
  - Auditoria: cambio_auditoria, log_actividad

## 3.5 Scripts backend relevantes

- `start`, `start:dev`, `start:debug`, `build`
- `db:seed`
- `db:reset:empty`

## 3.6 Hallazgos backend

- Carpetas placeholder detectadas sin implementacion funcional actual:
  - `src/modules/operacion`
  - `src/modules/reportes`
  - `src/modules/trabajadores`
- El backend usa puerto por defecto `3001` (main.ts), lo cual debe mantenerse consistente con clientes y docs.

## 4) Arquitectura Frontend

## 4.1 Fundamentos y configuracion

- `nuxt.config.ts`
  - SSR desactivado (`ssr: false`)
  - Runtime API base: `NUXT_PUBLIC_API_BASE` (fallback `http://localhost:3001/api`)
  - TypeScript strict + typecheck habilitado
  - Modulos: Tailwind + Pinia

## 4.2 Seguridad y sesion

- Store unico de auth (`stores/auth.ts`)
  - `token` y `user` en estado global
  - Persistencia en `localStorage` (`jordan_token`)
- Middleware (`middleware/auth.ts`)
  - Redireccion a `/login` cuando no autenticado
  - Redireccion a `/` cuando ya autenticado y entra a login
- Composable API (`composables/useApi.ts`)
  - Inyeccion automatica de Bearer token
  - Logout y redirect al recibir 401

## 4.3 Layout y UI base

- Layout principal (`layouts/default.vue`)
  - Sidebar por dominios de negocio
  - Header con titulo dinamico por ruta
  - Slot principal de contenido
- Layout de autenticacion (`layouts/auth.vue`)
  - Contenedor centrado para login
- Componentes detectados: 8
  - forms: FormField
  - layout: NavGroup, NavItem, NotificationsToast
  - ui: EstadoBadge, QuickLink, StatCard, StatusRow

## 4.4 Inventario de vistas (pages)

- Total de vistas detectadas: 18
- Core:
  - `/`
  - `/login`
  - `/logout`
- Operacion:
  - `/diario`
  - `/pedidos`
  - `/pedidos/:id`
  - `/rutas`
  - `/ventas`
  - `/cartera`
  - `/caja`
- Produccion e inventario:
  - `/produccion`
  - `/inventario`
- Catalogos:
  - `/catalogos/clientes`
  - `/catalogos/productos`
  - `/catalogos/trabajadores`
- Gestion/sistema:
  - `/reportes`
  - `/configuracion`
  - `/trabajadores`

## 4.5 Utilidades frontend

- Composables:
  - `useApi.ts`
  - `useApiResponse.ts`
  - `useNotification.ts`
- Plugin global:
  - `plugins/error-handler.ts` (suprime mensajes de Unauthorized en consola)

## 4.6 Hallazgos frontend

- El parser `useApiResponse` existe para homogenizar envolturas de respuesta, pero en paginas conviven estilos mixtos (`res.data.data ?? res.data` y `apiResponse.unwrap`).
- `logout.vue` ejecuta `localStorage.clear()`, lo cual puede borrar datos de otras features/aplicaciones en mismo origen.
- El plugin global que suprime `Unauthorized` mejora ruido visual, pero reduce observabilidad de errores de sesion.

## 5) Integracion Frontend-Backend

## 5.1 Estado de acople

- Acople por REST con prefijo `/api` consistente.
- Auth end-to-end funcional (login -> token -> interceptor -> guards).
- Estructura de dominios alineada entre menu frontend y modulos backend.

## 5.2 Riesgos de consistencia

- Documentacion frontend menciona `localhost:3000` en algunos textos, mientras configuracion runtime cae en `localhost:3001/api`.
- CORS backend permite 3000 y 3002; revisar estandar definitivo de puerto frontend para evitar errores intermitentes por entorno.

## 6) Mapa de Cobertura Funcional

- Implementado y conectado:
  - Autenticacion y usuario
  - Catalogos (clientes/productos/trabajadores)
  - Pedidos
  - Rutas
  - Ventas + pagos + cartera
  - Flujo diario (apertura/produccion/cierre)
  - Operaciones de trabajadores (labores, pagos, anticipos, abonos)
  - Caja (consulta operacional)
  - Produccion e inventario (consulta/registro ligado al flujo diario)
- Parcial o pendiente estructural:
  - Modulos backend placeholder (`operacion`, `reportes`, `trabajadores`)
  - Estandarizacion total de manejo de respuestas en frontend

## 7) Recomendaciones Priorizadas

1. Definir contrato unico de respuesta API y aplicar en todas las paginas con `useApiResponse`.
2. Estandarizar puertos/entornos (README, `.env`, runtimeConfig, CORS) para evitar drift de configuracion.
3. Sustituir `localStorage.clear()` por limpieza selectiva de claves propias del sistema.
4. Formalizar roadmap para carpetas placeholder backend (o eliminarlas si no se usaran).
5. Agregar una matriz de trazabilidad endpoint -> pagina para QA de regresion.

## 8) Base sugerida para crecimiento

- Mantener arquitectura por dominio (Catalogos, Operaciones, Diario, TrabajadoresOps).
- Introducir carpeta `docs/` para gobierno tecnico:
  - `docs/arquitectura.md`
  - `docs/contratos-api.md`
  - `docs/matriz-cobertura.md`
- Implementar checklist de release:
  - Consistencia de puertos/env
  - Endpoints nuevos documentados
  - Vistas nuevas mapeadas a permisos/roles

---

Documento generado como linea base de estructura general del sistema (frontend + backend).