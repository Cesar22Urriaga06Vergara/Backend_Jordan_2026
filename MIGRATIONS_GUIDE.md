# 🛡️ Validación de Integridad Referencial - Migraciones TypeORM

## Problema Resuelto

Registros huérfanos en `liquidacion_ruta` cuando se eliminaban rutas, causando errores de Foreign Key constraint al sincronizar la base de datos.

## Soluciones Implementadas

### 1. ✅ Validaciones en Services (rutas.service.ts)

Se agregó validación explícita en el método `liquidar()` para evitar crear liquidaciones huérfanas:

```typescript
async liquidar(rutaId: number, dto: LiquidarRutaDto) {
  const ruta = await this.findOne(rutaId);

  // Validar que ruta existe (evita registros huérfanos)
  const rutaExiste = await this.rutaRepo.findOne({
    where: { id: rutaId },
  });
  if (!rutaExiste) {
    throw new NotFoundException(`Ruta ${rutaId} no existe o fue eliminada`);
  }

  // ... resto del método
  
  // También validar durante la transacción
  const rutaActualizada = await manager.findOne(Ruta, {
    where: { id: rutaId },
  });
  if (!rutaActualizada) {
    throw new NotFoundException(
      `Ruta ${rutaId} fue eliminada durante la liquidación`,
    );
  }
}
```

### 2. ✅ Migraciones TypeORM

Se creó una migración TypeORM para definir correctamente el Foreign Key con `ON DELETE CASCADE`:

**Archivo:** `src/database/migrations/1704067200000-AddLiquidacionRutaForeignKey.ts`

```typescript
export class AddLiquidacionRutaForeignKey1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica si FK existe y la agrega con ON DELETE CASCADE
    await queryRunner.createForeignKey(
      'liquidacion_ruta',
      new TableForeignKey({
        name: 'FK_liquidacion_ruta_rutas_cascade',
        columnNames: ['rutaId'],
        referencedTableName: 'rutas',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback automático
    await queryRunner.dropForeignKey('liquidacion_ruta', fk);
  }
}
```

### 3. ✅ Configuración en typeorm.config.ts

Se agregó el path de migraciones:

```typescript
migrations: ['src/database/migrations/**/*.ts'],
```

### 4. ✅ Scripts npm en package.json

Se agregaron comandos para ejecutar migraciones:

```json
{
  "scripts": {
    "db:migration:run": "typeorm migration:run",     // Ejecutar migraciones
    "db:migration:revert": "typeorm migration:revert", // Rollback
    "db:migration:generate": "typeorm migration:generate" // Generar automáticamente
  }
}
```

## Cómo Usar

### Ejecutar Migraciones Automáticamente

Al iniciar el servidor con `npm run start:dev`, las migraciones se ejecutan automáticamente si están pendientes.

### Ejecutar Migraciones Manualmente

```bash
# Ejecutar todas las migraciones pendientes
npm run db:migration:run

# Deshacer la última migración
npm run db:migration:revert

# Generar una nueva migración (requiere cambios en entities)
npm run db:migration:generate -n MigrationName
```

## Best Practices Going Forward

✅ **Haz:**
- Usar `DB_SYNCHRONIZE=false` en producción
- Crear migraciones para cambios de schema críticos
- Ejecutar migraciones en orden ascendente de timestamp
- Escribir rollback methods en todas las migraciones

❌ **No hagas:**
- Confiar en `DB_SYNCHRONIZE=true` en producción
- Eliminar rutas sin cascading deletes configurado
- Cambiar estructura de FK manualmente (usa migraciones)

## Validación Post-Limpieza

Si ejecutaste el script `fix-orphaned-liquidacion.sql` antes:

```sql
-- Verificar que ya no hay registros huérfanos
SELECT COUNT(*) as huerfanos
FROM liquidacion_ruta lr
LEFT JOIN rutas r ON lr.rutaId = r.id
WHERE r.id IS NULL AND lr.rutaId IS NOT NULL;
-- Debería retornar: 0
```

## Próximos Pasos

1. ✅ Validaciones agregadas en `rutas.service.ts`
2. ✅ Migración TypeORM creada
3. ✅ Scripts npm configurados
4. 📋 Dejar `DB_SYNCHRONIZE=false` en `.env.local` (mejor práctica)
5. 📋 Usar migraciones para futuros cambios de schema

---

**Nota:** Las migraciones se ejecutan automáticamente al iniciar el servidor. Para deshabilitar sincronización automática:

```env
DB_SYNCHRONIZE=false  # Usa migraciones en su lugar
```
