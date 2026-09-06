-- ============================================================
-- fn_catalogar_libro — alta de un Libro desde Google Books (CU03)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema_LEER_supabase.sql
-- ============================================================
--
-- Por qué una función y no dos INSERT desde el cliente:
--
--   1. `obra` tiene RLS habilitado y su única policy es obra_select_publica
--      (FOR SELECT). No existe policy de INSERT, así que un insert desde la
--      anon key se rechaza siempre. Agregar una policy abierta de INSERT sobre
--      la superclase dejaría crear obras sueltas, sin subtipo: filas que el
--      catálogo no sabría mostrar (tipo = null).
--
--   2. Catalogar son dos inserts (obra + libro). Sueltos desde el navegador no
--      son atómicos: si el segundo falla queda una `obra` huérfana que nadie
--      puede borrar, porque tampoco hay policy de DELETE.
--
-- SECURITY DEFINER hace que la función corra con los permisos del dueño y
-- saltee RLS, por eso valida la sesión a mano y solo se otorga a `authenticated`.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_catalogar_libro(
    p_google_books_id VARCHAR(50),
    p_titulo          VARCHAR(255),
    p_autor_texto     VARCHAR(255) DEFAULT NULL,
    p_genero          VARCHAR(100) DEFAULT NULL,
    p_sinopsis        TEXT         DEFAULT NULL,
    p_isbn            VARCHAR(20)  DEFAULT NULL,
    p_portada_url     VARCHAR(500) DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_obra INTEGER;
BEGIN
    -- SECURITY DEFINER saltea RLS: la sesión se valida explícitamente.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Se requiere una sesión iniciada para catalogar libros.'
            USING ERRCODE = '42501';
    END IF;

    IF p_google_books_id IS NULL OR p_titulo IS NULL THEN
        RAISE EXCEPTION 'google_books_id y titulo son obligatorios.'
            USING ERRCODE = '22004';
    END IF;

    -- Idempotente: si el libro ya está en el catálogo devuelve el existente en
    -- lugar de fallar contra el UNIQUE de google_books_id. Dos usuarios pueden
    -- catalogar el mismo libro a la vez sin que ninguno vea un error.
    SELECT id_obra INTO v_id_obra
    FROM libro
    WHERE google_books_id = p_google_books_id;

    IF FOUND THEN
        RETURN v_id_obra;
    END IF;

    INSERT INTO obra (titulo, genero, sinopsis)
    VALUES (p_titulo, p_genero, p_sinopsis)
    RETURNING id_obra INTO v_id_obra;

    INSERT INTO libro (id_obra, google_books_id, autor_texto, isbn, portada_url)
    VALUES (v_id_obra, p_google_books_id, p_autor_texto, p_isbn, p_portada_url);

    -- Ambos INSERT viven en el mismo bloque: o entran los dos o no entra ninguno.
    RETURN v_id_obra;
END;
$$;

-- Solo usuarios con sesión iniciada pueden catalogar; los anónimos ni la ven.
REVOKE ALL ON FUNCTION fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR
) TO authenticated;
