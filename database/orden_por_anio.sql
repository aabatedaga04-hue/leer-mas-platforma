-- ============================================================
-- anio_publicacion: columna de ordenamiento del catalogo (CU03)
-- Ejecutar en el SQL Editor DESPUES de fecha_publicacion_original.sql
-- ============================================================
--
-- El orden por fecha usaba obra.fecha_publicacion, que es el alta en la
-- plataforma: ordenaba por cuando se cargo cada obra, no por cuando se
-- publico. Con el seed cargado de una sola vez, todos los libros quedaban
-- practicamente empatados.
--
-- Ordenar directamente por libro.fecha_publicacion_original tampoco sirve:
-- es VARCHAR con precision variable y los escritos de la comunidad no la
-- tienen. Esta columna unifica los dos casos en un entero comparable:
--
--   libro   -> anio de publicacion de la obra
--   escrito -> anio del alta en la plataforma, que para un autopublicado
--              ES la fecha de publicacion
--
-- El CASE con la expresion regular evita que un valor mal cargado rompa la
-- vista entera con un error de casteo: si no empieza con cuatro digitos,
-- queda NULL y la obra se ordena al final.
-- ============================================================

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
    l.fecha_publicacion_original,
    COALESCE(
        CASE
            WHEN l.fecha_publicacion_original ~ '^[0-9]{4}'
            THEN LEFT(l.fecha_publicacion_original, 4)::INTEGER
        END,
        EXTRACT(YEAR FROM o.fecha_publicacion)::INTEGER
    ) AS anio_publicacion
FROM obra o
LEFT JOIN libro           l  ON l.id_obra     = o.id_obra
LEFT JOIN escrito         e  ON e.id_obra     = o.id_obra
LEFT JOIN lector_escritor le ON le.id_usuario = e.id_autor;

GRANT SELECT ON vista_obra_busqueda TO anon, authenticated;

SELECT id_obra, titulo, tipo, fecha_publicacion_original, anio_publicacion
FROM vista_obra_busqueda
ORDER BY anio_publicacion;
