-- ============================================================
-- vista_obra_busqueda — catalogo aplanado para CU03 / CU04
-- Ejecutar en el SQL Editor de Supabase DESPUES de schema_LEER_supabase.sql
-- ============================================================
--
-- Por que hace falta:
--
-- El "autor" de una obra vive en dos lugares distintos segun el subtipo:
-- libro.autor_texto para los libros catalogados, y lector_escritor.apodo
-- (via escrito.id_autor) para los escritos de la comunidad. Buscar por autor
-- sobre ambos requeriria un OR entre dos tablas embebidas diferentes, algo que
-- PostgREST no sabe expresar en una sola consulta.
--
-- Aplanando en una vista, `autor` pasa a ser una columna comun y el filtro se
-- vuelve un ILIKE simple que cubre los dos subtipos a la vez. De paso `tipo`
-- deja de depender de INNER JOINs y se filtra con un igual.
--
-- security_invoker = on: la vista se evalua con los permisos de quien consulta,
-- asi que sigue respetando las policies RLS de obra, escrito, libro y
-- lector_escritor. Sin esta opcion la vista correria como su dueño y seria un
-- agujero que saltea RLS.
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
    END                              AS tipo,
    COALESCE(l.autor_texto, le.apodo) AS autor,
    l.google_books_id,
    l.isbn,
    l.portada_url,
    e.id_autor,
    e.contenido_url
FROM obra o
LEFT JOIN libro           l  ON l.id_obra    = o.id_obra
LEFT JOIN escrito         e  ON e.id_obra    = o.id_obra
LEFT JOIN lector_escritor le ON le.id_usuario = e.id_autor;

-- El catalogo es publico (obra_select_publica ya lo permite en la tabla base).
GRANT SELECT ON vista_obra_busqueda TO anon, authenticated;
