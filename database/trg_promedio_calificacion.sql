-- ============================================================
-- Mantenimiento de obra.promedio_calificacion (CU04)
-- Ejecutar en el SQL Editor de Supabase DESPUES de schema_LEER_supabase.sql
-- ============================================================
--
-- obra.promedio_calificacion esta desnormalizado y el schema no trae ningun
-- trigger que lo mantenga: hoy lo unico que lo escribe es el seed, una sola
-- vez. En cuanto alguien crea, edita, oculta o borra una resena, el promedio
-- que muestra la ficha queda desactualizado.
--
-- SECURITY DEFINER es necesario, no una comodidad: `obra` tiene RLS activo y
-- ninguna policy de UPDATE, asi que el trigger corriendo con los permisos del
-- usuario que inserto la resena no podria tocar la fila.
--
-- Solo cuentan las resenas con estado 'activa', que es el mismo criterio con
-- el que la ficha las lista: una resena oculta por moderacion no debe seguir
-- pesando en el promedio.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_recalcular_promedio_obra(p_id_obra INTEGER)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE obra
    SET promedio_calificacion = COALESCE(
        (SELECT ROUND(AVG(calificacion), 2)
         FROM resena
         WHERE id_obra = p_id_obra AND estado = 'activa'),
        0
    )
    WHERE id_obra = p_id_obra;
$$;

CREATE OR REPLACE FUNCTION fn_resena_actualiza_promedio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- En un UPDATE que mueve la resena de una obra a otra hay que recalcular
    -- las dos: la que la pierde y la que la recibe.
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        PERFORM fn_recalcular_promedio_obra(OLD.id_obra);
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM fn_recalcular_promedio_obra(NEW.id_obra);
    END IF;

    RETURN NULL; -- trigger AFTER: el valor de retorno se ignora
END;
$$;

-- Ninguna de las dos es para llamar desde la app: la invoca el trigger, que al
-- ser SECURITY DEFINER conserva sus permisos aunque se los saquemos a los roles
-- de la API. Sin este REVOKE, fn_recalcular_promedio_obra queda expuesta como
-- endpoint RPC publico en /rest/v1/rpc/.
REVOKE ALL ON FUNCTION fn_recalcular_promedio_obra(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fn_resena_actualiza_promedio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_resena_promedio ON resena;

CREATE TRIGGER trg_resena_promedio
    AFTER INSERT OR UPDATE OR DELETE ON resena
    FOR EACH ROW EXECUTE FUNCTION fn_resena_actualiza_promedio();

-- Backfill: deja consistente lo que ya estaba cargado antes del trigger.
UPDATE obra o
SET promedio_calificacion = COALESCE(sub.prom, 0)
FROM (
    SELECT o2.id_obra,
           (SELECT ROUND(AVG(r.calificacion), 2)
            FROM resena r
            WHERE r.id_obra = o2.id_obra AND r.estado = 'activa') AS prom
    FROM obra o2
) sub
WHERE o.id_obra = sub.id_obra
  AND o.promedio_calificacion IS DISTINCT FROM COALESCE(sub.prom, 0);

SELECT id_obra, titulo, promedio_calificacion FROM obra ORDER BY id_obra;
