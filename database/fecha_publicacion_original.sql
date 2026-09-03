-- ============================================================
-- Fecha de publicacion original de los libros (CU03 / CU04)
-- Ejecutar en el SQL Editor DESPUES de vista_obra_busqueda.sql
--   y de fn_catalogar_libro.sql
-- ============================================================
--
-- El problema: obra.fecha_publicacion es NOT NULL DEFAULT CURRENT_TIMESTAMP,
-- o sea la fecha en que la fila entro a LEER+. Para un escrito de la comunidad
-- eso es exactamente lo que hay que mostrar. Para un libro no: "Cien anios de
-- soledad" no se publico el dia que alguien lo cargo al catalogo.
--
-- Son dos hechos distintos y necesitan dos campos:
--   obra.fecha_publicacion              -> alta en la plataforma (escritos)
--   libro.fecha_publicacion_original    -> publicacion de la obra (libros)
--
-- Se guarda como VARCHAR y no como DATE porque la fuente externa da precision
-- variable: "1967", "1967-05" o "1967-05-30". Convertirlo a DATE obligaria a
-- inventar el mes y el dia que el dato no tiene.
-- ============================================================

ALTER TABLE libro ADD COLUMN IF NOT EXISTS fecha_publicacion_original VARCHAR(10);

COMMENT ON COLUMN libro.fecha_publicacion_original IS
    'Publicacion original de la obra, precision variable (YYYY | YYYY-MM | YYYY-MM-DD). '
    'No confundir con obra.fecha_publicacion, que es el alta en la plataforma.';

-- ------------------------------------------------------------
-- La vista suma la columna nueva al final: CREATE OR REPLACE VIEW
-- solo admite agregar columnas despues de las existentes.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vista_obra_busqueda
WITH (security_invoker = on) AS
SELECT
    o.id_obra,
    o.titulo,
    o.genero,
    o.sinopsis,
    o.fecha_publicacion,
    o.promedio_calificacion,
    CASE
        WHEN l.id_obra IS NOT NULL THEN 'libro'
        WHEN e.id_obra IS NOT NULL THEN 'escrito'
    END                               AS tipo,
    COALESCE(l.autor_texto, le.apodo) AS autor,
    l.google_books_id,
    l.isbn,
    l.portada_url,
    e.id_autor,
    e.contenido_url,
    l.fecha_publicacion_original
FROM obra o
LEFT JOIN libro           l  ON l.id_obra     = o.id_obra
LEFT JOIN escrito         e  ON e.id_obra     = o.id_obra
LEFT JOIN lector_escritor le ON le.id_usuario = e.id_autor;

GRANT SELECT ON vista_obra_busqueda TO anon, authenticated;

-- ------------------------------------------------------------
-- fn_catalogar_libro suma un parametro. Agregar un argumento cambia la firma,
-- asi que hay que borrar la version anterior en lugar de reemplazarla: si no,
-- quedarian las dos como sobrecargas y PostgREST no sabria cual llamar.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR
);

CREATE OR REPLACE FUNCTION fn_catalogar_libro(
    p_google_books_id            VARCHAR(50),
    p_titulo                     VARCHAR(255),
    p_autor_texto                VARCHAR(255) DEFAULT NULL,
    p_genero                     VARCHAR(100) DEFAULT NULL,
    p_sinopsis                   TEXT         DEFAULT NULL,
    p_isbn                       VARCHAR(20)  DEFAULT NULL,
    p_portada_url                VARCHAR(500) DEFAULT NULL,
    p_fecha_publicacion_original VARCHAR(10)  DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_obra INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Se requiere una sesión iniciada para catalogar libros.'
            USING ERRCODE = '42501';
    END IF;

    IF p_google_books_id IS NULL OR p_titulo IS NULL THEN
        RAISE EXCEPTION 'google_books_id y titulo son obligatorios.'
            USING ERRCODE = '22004';
    END IF;

    SELECT id_obra INTO v_id_obra
    FROM libro
    WHERE google_books_id = p_google_books_id;

    IF FOUND THEN
        RETURN v_id_obra;
    END IF;

    -- obra.fecha_publicacion queda con su DEFAULT: para un libro representa
    -- el alta en la plataforma, no la publicacion de la obra.
    INSERT INTO obra (titulo, genero, sinopsis)
    VALUES (p_titulo, p_genero, p_sinopsis)
    RETURNING id_obra INTO v_id_obra;

    INSERT INTO libro (id_obra, google_books_id, autor_texto, isbn, portada_url,
                       fecha_publicacion_original)
    VALUES (v_id_obra, p_google_books_id, p_autor_texto, p_isbn, p_portada_url,
            p_fecha_publicacion_original);

    RETURN v_id_obra;
END;
$$;

REVOKE ALL ON FUNCTION fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR
) TO authenticated;

-- ------------------------------------------------------------
-- Backfill de los libros ya cargados por seed_catalogo.sql
-- ------------------------------------------------------------
-- Los anios estan escritos a mano y NO salen de la API, a proposito.
--
-- La heuristica de "quedarse con la edicion mas antigua" funciona para elegir
-- entre ediciones, pero no equivale a la publicacion original de la obra: del
-- canon latinoamericano del siglo XX el corpus de Google solo tiene
-- reediciones. Consultado en 2026, devolvia 2013 para Rayuela (1963), 1983
-- para Cien anios de soledad (1967) y 1975 para Pedro Paramo (1955).
--
-- Al catalogar desde la app esto ya no aplica: el anio se consulta a Open
-- Library, que si modela la obra aparte de sus ediciones (ver
-- src/services/openLibraryApi.js). Google queda solo como respaldo.
UPDATE libro SET fecha_publicacion_original = v.anio
FROM (VALUES
    ('2yrVlXySgOAC', '1963'),  -- Rayuela
    ('kmAQCwAAQBAJ', '1967'),  -- Cien anios de soledad
    ('y_tIAAAAYAAJ', '1944'),  -- Ficciones
    ('FnT5EAAAQBAJ', '1955'),  -- Pedro Paramo
    ('WY1IAgAAQBAJ', '1982'),  -- La casa de los espiritus
    ('P55UAAAAMAAJ', '1948'),  -- El tunel
    ('EzdNEQAAQBAJ', '1998')   -- Los detectives salvajes
) AS v(gid, anio)
WHERE libro.google_books_id = v.gid;

SELECT o.id_obra, o.titulo, l.fecha_publicacion_original
FROM obra o JOIN libro l ON l.id_obra = o.id_obra
ORDER BY o.id_obra;
