-- ============================================================
-- CU04 — Ficha de Obra completa
-- Ejecutar en el SQL Editor DESPUES de orden_por_anio.sql
-- ============================================================
--
-- Cubre lo que la especificacion de CU04 pide y el schema no tenia:
--   obra.idioma                    idioma de la obra
--   obra.estado                    publicada / oculta / borrador
--   libro.editorial_texto          sello editorial (texto, no el usuario institucional)
--   escrito.fragmento              vista previa autorizada
--   lector_escritor.perfil_publico privacidad del perfil de autor
--   etiqueta / obra_etiqueta       etiquetas navegables
--   visualizacion_obra             eventos para metricas agregadas
--
-- Favoritos NO lleva tabla: se modela como una lista_personal con nombre
-- reservado, decision tomada para no duplicar el concepto de lista. El PK
-- (id_lista, id_obra) de lista_obra ya impide duplicados.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Estado de publicacion e idioma de la obra
-- ------------------------------------------------------------
-- La especificacion pide "validar que la Obra este publicada y sea visible".
-- Hasta ahora no era representable: obra no tenia estado.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_obra_enum') THEN
        CREATE TYPE estado_obra_enum AS ENUM ('publicada', 'oculta', 'borrador');
    END IF;
END
$$;

ALTER TABLE obra ADD COLUMN IF NOT EXISTS estado estado_obra_enum NOT NULL DEFAULT 'publicada';
ALTER TABLE obra ADD COLUMN IF NOT EXISTS idioma VARCHAR(10);

COMMENT ON COLUMN obra.idioma IS 'Codigo ISO 639-1 (es, en, fr...), como lo entrega la fuente externa.';

-- ------------------------------------------------------------
-- 2. Sello editorial del libro
-- ------------------------------------------------------------
-- Es texto y no una FK a `editorial` a proposito: esa tabla son las editoriales
-- registradas como usuarios de la plataforma, y el sello que publico un libro
-- casi nunca es una de ellas. Son dos conceptos distintos que compartian nombre.
ALTER TABLE libro ADD COLUMN IF NOT EXISTS editorial_texto VARCHAR(150);

-- ------------------------------------------------------------
-- 3. Fragmento autorizado
-- ------------------------------------------------------------
-- La especificacion prohibe exponer la obra completa. `contenido_url` sigue
-- existiendo para que el autor gestione su obra, pero la ficha publica pasa a
-- mostrar unicamente este fragmento.
ALTER TABLE escrito ADD COLUMN IF NOT EXISTS fragmento TEXT;

COMMENT ON COLUMN escrito.fragmento IS
    'Vista previa autorizada por el autor. Es lo unico que la ficha publica muestra del contenido.';

-- ------------------------------------------------------------
-- 4. Privacidad del perfil de autor
-- ------------------------------------------------------------
-- "Mantener la atribucion textual del Autor si su Perfil esta desactivado, sin
-- habilitar el enlace al Perfil": el apodo se sigue mostrando, el enlace no.
ALTER TABLE lector_escritor
    ADD COLUMN IF NOT EXISTS perfil_publico BOOLEAN NOT NULL DEFAULT true;

-- ------------------------------------------------------------
-- 5. Etiquetas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etiqueta (
    id_etiqueta SERIAL PRIMARY KEY,
    nombre      VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS obra_etiqueta (
    id_obra     INTEGER NOT NULL REFERENCES obra(id_obra) ON DELETE CASCADE,
    id_etiqueta INTEGER NOT NULL REFERENCES etiqueta(id_etiqueta) ON DELETE CASCADE,
    PRIMARY KEY (id_obra, id_etiqueta)
);

CREATE INDEX IF NOT EXISTS idx_obra_etiqueta_etiqueta ON obra_etiqueta(id_etiqueta);

ALTER TABLE etiqueta      ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_etiqueta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etiqueta_select_publica" ON etiqueta;
CREATE POLICY "etiqueta_select_publica" ON etiqueta FOR SELECT USING (true);

DROP POLICY IF EXISTS "obra_etiqueta_select_publica" ON obra_etiqueta;
CREATE POLICY "obra_etiqueta_select_publica" ON obra_etiqueta FOR SELECT USING (true);
-- La escritura entra por fn_catalogar_libro, que es SECURITY DEFINER: no hace
-- falta abrir INSERT a los roles de la API.

-- ------------------------------------------------------------
-- 6. Visualizaciones
-- ------------------------------------------------------------
-- "Registrar cada visualizacion para metricas agregadas". Se guardan eventos
-- individuales porque metrica_institucion solo almacena agregados ya calculados
-- por periodo, y de un agregado no se puede recalcular otro corte.
CREATE TABLE IF NOT EXISTS visualizacion_obra (
    id_visualizacion BIGSERIAL PRIMARY KEY,
    id_obra          INTEGER NOT NULL REFERENCES obra(id_obra) ON DELETE CASCADE,
    id_usuario       UUID REFERENCES usuario(id_usuario),  -- NULL = visita anonima
    fecha            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visualizacion_obra ON visualizacion_obra(id_obra, fecha);

ALTER TABLE visualizacion_obra ENABLE ROW LEVEL SECURITY;
-- Sin policies: la tabla queda cerrada a la API. Se escribe por la funcion de
-- abajo y se lee solo desde el servidor al calcular metricas. Quien visito que
-- obra es dato sensible y no tiene por que ser legible por nadie mas.

CREATE OR REPLACE FUNCTION fn_registrar_visualizacion(p_id_obra INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Solo cuenta si la obra existe y esta publicada: si no, seria facil
    -- inflar las metricas de una obra oculta.
    IF NOT EXISTS (SELECT 1 FROM obra WHERE id_obra = p_id_obra AND estado = 'publicada') THEN
        RETURN;
    END IF;

    INSERT INTO visualizacion_obra (id_obra, id_usuario)
    VALUES (p_id_obra, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION fn_registrar_visualizacion(INTEGER) FROM PUBLIC;
-- Las visitas anonimas tambien cuentan, asi que `anon` necesita ejecutarla.
GRANT EXECUTE ON FUNCTION fn_registrar_visualizacion(INTEGER) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6.b Visibilidad de la obra: limite real, no filtro del cliente
-- ------------------------------------------------------------
-- obra_select_publica usaba USING (true), asi que una obra oculta se leia igual
-- desde la API filtrando en el cliente. La visibilidad se aplica en la policy,
-- y la vista la hereda por ser security_invoker.
--
-- El autor sigue viendo su propia obra aunque este oculta o en borrador: es la
-- unica forma de que pueda gestionarla.
DROP POLICY IF EXISTS "obra_select_publica" ON obra;

CREATE POLICY "obra_select_visible" ON obra
    FOR SELECT USING (
        estado = 'publicada'
        OR EXISTS (
            SELECT 1 FROM escrito e
            WHERE e.id_obra = obra.id_obra AND e.id_autor = auth.uid()
        )
    );

-- ------------------------------------------------------------
-- 7. Vista: se suman las columnas nuevas al final
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
    l.fecha_publicacion_original,
    COALESCE(
        CASE
            WHEN l.fecha_publicacion_original ~ '^[0-9]{4}'
            THEN LEFT(l.fecha_publicacion_original, 4)::INTEGER
        END,
        EXTRACT(YEAR FROM o.fecha_publicacion)::INTEGER
    )                                 AS anio_publicacion,
    o.estado,
    o.idioma,
    l.editorial_texto,
    e.fragmento,
    -- El enlace al perfil se habilita solo si el autor lo tiene publico. Para un
    -- libro no aplica: su autoria es texto, no un usuario de la plataforma.
    le.perfil_publico,
    -- Subconsulta correlacionada en lugar de array_agg con GROUP BY, que
    -- obligaria a agrupar por todas las columnas de la vista.
    (SELECT array_agg(et.nombre ORDER BY et.nombre)
     FROM obra_etiqueta oe
     JOIN etiqueta et ON et.id_etiqueta = oe.id_etiqueta
     WHERE oe.id_obra = o.id_obra)    AS etiquetas
FROM obra o
LEFT JOIN libro           l  ON l.id_obra     = o.id_obra
LEFT JOIN escrito         e  ON e.id_obra     = o.id_obra
LEFT JOIN lector_escritor le ON le.id_usuario = e.id_autor;

GRANT SELECT ON vista_obra_busqueda TO anon, authenticated;

-- ------------------------------------------------------------
-- 8. fn_catalogar_libro: idioma, editorial y etiquetas
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR
);

CREATE OR REPLACE FUNCTION fn_catalogar_libro(
    p_google_books_id            VARCHAR(50),
    p_titulo                     VARCHAR(255),
    p_autor_texto                VARCHAR(255) DEFAULT NULL,
    p_genero                     VARCHAR(100) DEFAULT NULL,
    p_sinopsis                   TEXT         DEFAULT NULL,
    p_isbn                       VARCHAR(20)  DEFAULT NULL,
    p_portada_url                VARCHAR(500) DEFAULT NULL,
    p_fecha_publicacion_original VARCHAR(10)  DEFAULT NULL,
    p_idioma                     VARCHAR(10)  DEFAULT NULL,
    p_editorial_texto            VARCHAR(150) DEFAULT NULL,
    p_etiquetas                  TEXT[]       DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_obra     INTEGER;
    v_etiqueta    TEXT;
    v_id_etiqueta INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Se requiere una sesión iniciada para catalogar libros.'
            USING ERRCODE = '42501';
    END IF;

    IF p_google_books_id IS NULL OR p_titulo IS NULL THEN
        RAISE EXCEPTION 'google_books_id y titulo son obligatorios.'
            USING ERRCODE = '22004';
    END IF;

    SELECT id_obra INTO v_id_obra FROM libro WHERE google_books_id = p_google_books_id;
    IF FOUND THEN
        RETURN v_id_obra;
    END IF;

    INSERT INTO obra (titulo, genero, sinopsis, idioma)
    VALUES (p_titulo, p_genero, p_sinopsis, p_idioma)
    RETURNING id_obra INTO v_id_obra;

    INSERT INTO libro (id_obra, google_books_id, autor_texto, isbn, portada_url,
                       fecha_publicacion_original, editorial_texto)
    VALUES (v_id_obra, p_google_books_id, p_autor_texto, p_isbn, p_portada_url,
            p_fecha_publicacion_original, p_editorial_texto);

    -- Las etiquetas se comparten entre obras: se reutiliza la que ya exista.
    FOREACH v_etiqueta IN ARRAY COALESCE(p_etiquetas, ARRAY[]::TEXT[])
    LOOP
        v_etiqueta := NULLIF(BTRIM(v_etiqueta), '');
        CONTINUE WHEN v_etiqueta IS NULL;

        SELECT id_etiqueta INTO v_id_etiqueta FROM etiqueta WHERE nombre = v_etiqueta;
        IF NOT FOUND THEN
            INSERT INTO etiqueta (nombre) VALUES (LEFT(v_etiqueta, 60))
            RETURNING id_etiqueta INTO v_id_etiqueta;
        END IF;

        INSERT INTO obra_etiqueta (id_obra, id_etiqueta)
        VALUES (v_id_obra, v_id_etiqueta)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN v_id_obra;
END;
$$;

REVOKE ALL ON FUNCTION fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION fn_catalogar_libro(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT[]
) TO authenticated;

-- ------------------------------------------------------------
-- 9. Datos de las obras ya cargadas
-- ------------------------------------------------------------
UPDATE obra SET idioma = 'es' WHERE idioma IS NULL;

SELECT id_obra, titulo, estado, idioma, etiquetas FROM vista_obra_busqueda ORDER BY id_obra;
