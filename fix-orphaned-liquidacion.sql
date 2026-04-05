-- =================================================================
-- Script para Limpiar Registros Huérfanos en liquidacion_ruta
-- =================================================================

-- 1. Ver registros huérfanos (liquidaciones sin ruta correspondiente)
SELECT lr.id, lr.rutaId, lr.fecha, lr.totalRecaudado
FROM liquidacion_ruta lr
LEFT JOIN rutas r ON lr.rutaId = r.id
WHERE r.id IS NULL AND lr.rutaId IS NOT NULL;

-- 2. OPCIÓN A: Establecer rutaId a NULL para registros huérfanos
-- (Mantiene el registro pero sin asociación a ruta)
UPDATE liquidacion_ruta
SET rutaId = NULL
WHERE rutaId IS NOT NULL 
  AND rutaId NOT IN (SELECT id FROM rutas);

-- 3. OPCIÓN B: Eliminar completamente registros huérfanos
-- (Descomenta si prefieres borrar en lugar de actualizar)
-- DELETE FROM liquidacion_ruta
-- WHERE rutaId IS NOT NULL 
--   AND rutaId NOT IN (SELECT id FROM rutas);

-- 4. Verificar que ya no hay huérfanos
SELECT COUNT(*) as huerfanos_restantes
FROM liquidacion_ruta lr
LEFT JOIN rutas r ON lr.rutaId = r.id
WHERE r.id IS NULL AND lr.rutaId IS NOT NULL;

-- 5. Ahora é seguro agregar la restricción (se ejecutará cuando DB_SYNCHRONIZE=true)
-- ALTER TABLE liquidacion_ruta 
-- ADD CONSTRAINT FK_liquidacion_ruta_rutas 
-- FOREIGN KEY (rutaId) REFERENCES rutas(id) 
-- ON DELETE CASCADE ON UPDATE NO ACTION;
