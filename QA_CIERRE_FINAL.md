# QA Final Jordan

## Arranque

Backend:

```bash
npm install
npm run start:dev
```

Frontend:

```bash
npm install
npm run dev
```

Seed opcional si necesitas reiniciar datos:

```bash
npm run db:seed
```

Credenciales:

- Email: admin@jordan.local
- Password: admin123456

## Orden recomendado

1. Login
2. Pedidos
3. Rutas
4. Ventas
5. Cartera
6. Trabajadores
7. Diario
8. Caja
9. Reportes

## 1. Login

Paso:

- Ingresar con admin@jordan.local / admin123456.

Validar:

- Debe entrar al dashboard.
- No debe haber redirecciones erráticas.
- Las páginas privadas deben rechazar acceso si no hay sesión.

## 2. Pedidos

Caso A. Crear pedido válido:

- Crear un pedido con cliente activo.
- Agregar uno o más productos con cantidad > 0 y precio > 0.

Validar:

- Se crea en estado PENDIENTE.
- Aparece en listado y detalle.

Caso B. Cancelar pedido:

- Abrir detalle y cambiar a CANCELADO.

Validar:

- La UI debe exigir motivo.
- El backend debe aceptar el cambio solo si el motivo va informado.

Caso C. Reprogramar pedido:

- Cambiar a REPROGRAMADO.

Validar:

- La UI debe exigir motivo.
- El pedido debe refrescar con el nuevo estado.

## 3. Rutas

Caso A. Crear ruta:

- Crear ruta con trabajador activo.

Validar:

- Debe quedar en CREADA.

Caso B. Agregar pedido pendiente:

- Agregar un pedido PENDIENTE a una ruta.

Validar:

- No debe permitir agregar un pedido ya asignado a otra ruta.
- El pedido debe desaparecer de pendientes disponibles en otras rutas.

Caso C. Cargar ruta:

- Cambiar estado de ruta a CARGADA.

Validar:

- Los pedidos de esa ruta deben pasar a CARGADO_EN_RUTA.

Caso D. Quitar pedido de ruta cargada:

- Remover un pedido desde la ruta.

Validar:

- El pedido debe volver a PENDIENTE.
- Debe quedar sin ruta asignada.

Caso E. Anular ruta:

- Anular una ruta con pedidos tempranos.

Validar:

- Los pedidos afectados deben volver a PENDIENTE.
- Deben quedar liberados para otra ruta.

Caso F. Liquidar ruta:

- Llevar una ruta a EN_LIQUIDACION y luego liquidarla.

Validar:

- La liquidación debe guardarse.
- Las observaciones deben incluir notas y gastos de ruta si se informan.

## 4. Ventas

Caso A. Venta sin pago inicial:

- Crear venta con productos válidos y montoPagado = 0.

Validar:

- Debe quedar en PENDIENTE.
- Debe aparecer cartera asociada.

Caso B. Venta con pago parcial:

- Crear venta con montoPagado menor al total.

Validar:

- Debe quedar en PARCIAL.
- Debe registrarse pago y cartera residual.

Caso C. Venta pagada total:

- Crear venta con montoPagado igual al total.

Validar:

- Debe quedar en COMPLETADA.
- No debe generar cartera.

Caso D. Bloqueo de sobrepago:

- Intentar crear venta con montoPagado mayor al total.

Validar:

- La UI debe bloquearlo.
- Si se fuerza por API, el backend debe rechazarlo.

## 5. Cartera

Caso A. Registrar abono válido:

- Abrir una venta en cartera y registrar un abono menor al saldo.

Validar:

- Debe bajar saldoPendiente.
- La venta debe pasar a PARCIAL o COMPLETADA según corresponda.

Caso B. Pago exacto:

- Registrar un pago igual al saldo.

Validar:

- La venta debe quedar COMPLETADA.
- Debe desaparecer de cartera/resumen.

Caso C. Bloqueo de sobrepago:

- Intentar pagar más del saldo.

Validar:

- La UI debe bloquearlo.
- El backend debe rechazarlo si se fuerza la petición.

## 6. Trabajadores

Caso A. Registrar labor:

- Registrar labor para un trabajador activo.

Validar:

- Debe aparecer en labores del día.
- Debe subir saldoTotal del trabajador.

Caso B. Anticipo:

- Registrar anticipo o préstamo.

Validar:

- Debe aparecer en tab de anticipos.
- Debe mostrar saldoPendiente calculado.

Caso C. Abono de deuda:

- Registrar abono parcial y luego total.

Validar:

- El saldo debe bajar correctamente.
- El estado debe pasar a parcial o pagado completamente.

Caso D. Fecha local:

- Verificar labores del día cerca de medianoche local si aplica.

Validar:

- No debe desfasarse por UTC.

## 7. Diario

Caso A. Abrir día:

- Abrir jornada con inventario inicial y saldo inicial.

Validar:

- Debe registrarse apertura.
- Debe verse en diario, inventario y caja.

Caso B. Registrar producción:

- Registrar producción del día.

Validar:

- Debe reflejarse en inventario y diario.

Caso C. Cerrar día con pendientes reales:

- Intentar cerrar dejando pedidos no finalizados o trabajadores con saldo.

Validar:

- El cierre puede guardarse si así opera negocio actual, pero las banderas no deben quedar ficticiamente en true.
- Revisar en historial: pedidosFinalizados y trabajadoresPagados deben reflejar la realidad del día.

Caso D. Caja cuadrada:

- Cerrar con saldo contado distinto al calculado.

Validar:

- cajaCuadrada debe ser false si la diferencia supera el umbral.

## 8. Caja

Caso:

- Tener ingresos por efectivo y por transferencia el mismo día.

Validar:

- Ingresos del día puede incluir ambos.
- Saldo estimado en caja debe reflejar efectivo físico, no inflar con transferencias.

## 9. Reportes

Caso:

- Consultar un rango con ventas, pedidos, cartera y rutas.

Validar:

- KPIs deben coincidir con listados.
- Rutas no deben quedar subreportadas por límite corto.
- Excel y PDF deben generarse sin romper la pantalla.

## Criterio de cierre

Puedes considerar estable el sistema si se cumplen estas condiciones:

- No hay errores de validación inesperados en flujos válidos.
- Los errores inválidos muestran mensaje visible y útil.
- No hay silencios operativos relevantes.
- Pedidos, rutas, ventas, cartera y diario conservan consistencia entre sí.
- Reportes reflejan el mismo estado que las pantallas operativas.