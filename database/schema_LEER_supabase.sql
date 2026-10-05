-- ============================================================
-- Esquema de base de datos - LEER+ (Fundación Literaria Comunitaria)
-- Adaptado para SUPABASE (Postgres + Supabase Auth + RLS)
-- ============================================================
-- Diferencias respecto al script original de Postgres "puro":
--   1. usuario.id_usuario es UUID y referencia a auth.users(id)
--      (la tabla que gestiona Supabase Auth automáticamente).
--   2. Se elimina la columna password: Supabase Auth ya guarda
--      las credenciales de forma encriptada en auth.users.
--   3. Todas las FK hacia usuario (y sus subtipos) pasan de
--      INTEGER a UUID.
--   4. Se habilita Row Level Security (RLS) en todas las tablas,
--      con políticas básicas de punto de partida.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES Y TIPOS ENUM
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid() en tablas que lo necesiten

CREATE TYPE tipo_usuario_enum AS ENUM ('lector_escritor', 'biblioteca', 'editorial', 'administrador');
CREATE TYPE estado_usuario_enum AS ENUM ('activo', 'pendiente', 'suspendido', 'baja');
CREATE TYPE estado_prestamo_enum AS ENUM ('activo', 'devuelto', 'atrasado');
CREATE TYPE estado_moderacion_enum AS ENUM ('activa', 'oculta', 'reportada');
CREATE TYPE estado_seguimiento_enum AS ENUM ('en_progreso', 'completado');
CREATE TYPE estado_desafio_enum AS ENUM ('proximo', 'activo', 'finalizado');
CREATE TYPE aplica_a_enum AS ENUM ('biblioteca', 'editorial', 'ambas');

-- ============================================================
-- 2. NÚCLEO DE USUARIOS (herencia, ligado a Supabase Auth)
-- ============================================================

-- "usuario" pasa a ser una tabla de PERFIL, extendiendo auth.users.
-- El registro en auth.users lo crea Supabase Auth (signUp);
-- esta fila se inserta desde la app inmediatamente después,
-- con el mismo id y el tipo de rol elegido en el formulario.

CREATE TABLE usuario (
    id_usuario      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(150) NOT NULL UNIQUE,
    telefono        VARCHAR(30),
    estado          estado_usuario_enum NOT NULL DEFAULT 'activo',
    fecha_registro  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_usuario    tipo_usuario_enum NOT NULL
);

CREATE TABLE lector_escritor (
    id_usuario      UUID PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    apodo           VARCHAR(50) NOT NULL,
    puntos_desafio  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE biblioteca (
    id_usuario      UUID PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    cuit            VARCHAR(20),
    nombre          VARCHAR(150) NOT NULL,
    direccion       VARCHAR(255)
);

CREATE TABLE editorial (
    id_usuario      UUID PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    razon_social    VARCHAR(150) NOT NULL,
    cuit            VARCHAR(20) NOT NULL,
    sitio_web       VARCHAR(255)
);

-- Nota: el rol Administrador no tiene atributos propios, por lo que no
-- necesita tabla de subtipo — alcanza con tipo_usuario = 'administrador'
-- en la tabla usuario.

-- ============================================================
-- 2.1 SOLICITUDES DE ROL INSTITUCIONAL (CU01 / CU16)
-- ============================================================
-- Al registrarse una Biblioteca o Editorial, su fila ya se crea en
-- biblioteca/editorial con usuario.estado = 'pendiente'. Esta tabla
-- registra el trámite de aprobación que el Administrador resuelve
-- en CU16 - Administrar Solicitudes de Rol.

CREATE TYPE estado_solicitud_enum AS ENUM ('pendiente', 'aprobada', 'rechazada');

CREATE TABLE solicitud_rol (
    id_solicitud       SERIAL PRIMARY KEY,
    id_usuario         UUID NOT NULL REFERENCES usuario(id_usuario),
    tipo_rol           tipo_usuario_enum NOT NULL,
    estado             estado_solicitud_enum NOT NULL DEFAULT 'pendiente',
    fecha_solicitud    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion   TIMESTAMP,
    id_admin_resuelve  UUID REFERENCES usuario(id_usuario),
    CONSTRAINT chk_tipo_rol_institucional CHECK (tipo_rol IN ('biblioteca', 'editorial'))
);

-- Evita que un mismo usuario tenga dos solicitudes pendientes simultáneas
CREATE UNIQUE INDEX idx_solicitud_pendiente_unica ON solicitud_rol (id_usuario)
    WHERE estado = 'pendiente';

CREATE INDEX idx_solicitud_estado ON solicitud_rol(estado);

-- ============================================================
-- 2.2 NOTIFICACIONES
-- ============================================================

CREATE TYPE tipo_notificacion_enum AS ENUM ('solicitud_rol', 'foro', 'prestamo', 'desafio', 'general');

CREATE TABLE notificacion (
    id_notificacion     SERIAL PRIMARY KEY,
    id_usuario_destino  UUID NOT NULL REFERENCES usuario(id_usuario),
    tipo                tipo_notificacion_enum NOT NULL,
    contenido           TEXT NOT NULL,
    leida               BOOLEAN NOT NULL DEFAULT false,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referencia_id       INTEGER  -- id genérico del objeto relacionado (id_solicitud, id_foro, etc.)
);

CREATE INDEX idx_notificacion_destino ON notificacion(id_usuario_destino, leida);

-- ============================================================
-- 2.3 TRIGGERS: automatizan la notificación del circuito de aprobación
-- ============================================================

-- Al crear una solicitud, notifica a todos los administradores
CREATE OR REPLACE FUNCTION fn_notificar_nueva_solicitud() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notificacion (id_usuario_destino, tipo, contenido, referencia_id)
    SELECT id_usuario, 'solicitud_rol',
           'Nueva solicitud de registro institucional pendiente de revisión.',
           NEW.id_solicitud
    FROM usuario
    WHERE tipo_usuario = 'administrador';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notificar_nueva_solicitud
    AFTER INSERT ON solicitud_rol
    FOR EACH ROW EXECUTE FUNCTION fn_notificar_nueva_solicitud();

-- Al resolver una solicitud (aprobar/rechazar), notifica al solicitante
-- y, si fue aprobada, activa su cuenta automáticamente
CREATE OR REPLACE FUNCTION fn_notificar_resolucion_solicitud() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado <> OLD.estado AND NEW.estado IN ('aprobada', 'rechazada') THEN
        INSERT INTO notificacion (id_usuario_destino, tipo, contenido, referencia_id)
        VALUES (
            NEW.id_usuario,
            'solicitud_rol',
            CASE WHEN NEW.estado = 'aprobada'
                 THEN 'Tu solicitud de registro institucional fue aprobada.'
                 ELSE 'Tu solicitud de registro institucional fue rechazada.'
            END,
            NEW.id_solicitud
        );

        IF NEW.estado = 'aprobada' THEN
            UPDATE usuario SET estado = 'activo' WHERE id_usuario = NEW.id_usuario;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notificar_resolucion_solicitud
    AFTER UPDATE ON solicitud_rol
    FOR EACH ROW EXECUTE FUNCTION fn_notificar_resolucion_solicitud();

-- ============================================================
-- 3. OBRAS: SUPERCLASE + SUBTIPOS (ESCRITO / LIBRO)
-- ============================================================

CREATE TABLE obra (
    id_obra                 SERIAL PRIMARY KEY,
    titulo                  VARCHAR(255) NOT NULL,
    genero                  VARCHAR(100),
    sinopsis                TEXT,
    fecha_publicacion       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    promedio_calificacion   NUMERIC(3,2) DEFAULT 0
);

-- Subtipo: obra autopublicada por un autor de la plataforma (CUU12)
CREATE TABLE escrito (
    id_obra                 INTEGER PRIMARY KEY REFERENCES obra(id_obra) ON DELETE CASCADE,
    id_autor                UUID NOT NULL REFERENCES lector_escritor(id_usuario),
    contenido_url           VARCHAR(500)
);

CREATE INDEX idx_escrito_autor ON escrito(id_autor);

-- Subtipo: libro catalogado desde Google Books (cache local)
CREATE TABLE libro (
    id_obra                 INTEGER PRIMARY KEY REFERENCES obra(id_obra) ON DELETE CASCADE,
    google_books_id         VARCHAR(50) NOT NULL UNIQUE,
    autor_texto             VARCHAR(255),
    isbn                    VARCHAR(20),
    portada_url             VARCHAR(500)
);

-- Obras recomendadas por una editorial en su perfil (CU02)
CREATE TABLE editorial_obra_recomendada (
    id_editorial    UUID NOT NULL REFERENCES editorial(id_usuario),
    id_obra         INTEGER NOT NULL REFERENCES obra(id_obra),
    orden           INTEGER NOT NULL DEFAULT 0,
    fecha_agregado  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_editorial, id_obra)
);

-- Ejemplares físicos: solo los libros catalogados pueden tener copias en biblioteca (CU08)
CREATE TABLE ejemplar (
    id_ejemplar             SERIAL PRIMARY KEY,
    id_biblioteca           UUID NOT NULL REFERENCES biblioteca(id_usuario),
    id_libro                INTEGER NOT NULL REFERENCES libro(id_obra),
    codigo_interno          VARCHAR(50) NOT NULL,
    ubicacion               VARCHAR(150),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'disponible'
                             CHECK (estado IN ('disponible','prestado','en_reparacion')),
    UNIQUE (id_biblioteca, codigo_interno)
);

CREATE INDEX idx_ejemplar_libro ON ejemplar(id_libro);
CREATE INDEX idx_ejemplar_estado ON ejemplar(estado);

CREATE TABLE prestamo (
    id_prestamo                 SERIAL PRIMARY KEY,
    id_ejemplar                 INTEGER NOT NULL REFERENCES ejemplar(id_ejemplar),
    id_lector                   UUID NOT NULL REFERENCES lector_escritor(id_usuario),
    fecha_prestamo               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion_estimada   DATE NOT NULL,
    fecha_devolucion_real       DATE,
    estado                       estado_prestamo_enum NOT NULL DEFAULT 'activo'
);

CREATE INDEX idx_prestamo_lector ON prestamo(id_lector);
CREATE INDEX idx_prestamo_ejemplar ON prestamo(id_ejemplar);

-- ============================================================
-- 4. RESEÑAS
-- ============================================================

CREATE TABLE resena (
    id_resena       SERIAL PRIMARY KEY,
    id_usuario      UUID NOT NULL REFERENCES lector_escritor(id_usuario),
    id_obra         INTEGER NOT NULL REFERENCES obra(id_obra),
    calificacion    INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario      TEXT,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_edicion   TIMESTAMP,
    estado          estado_moderacion_enum NOT NULL DEFAULT 'activa',
    UNIQUE (id_usuario, id_obra)
);

CREATE INDEX idx_resena_obra ON resena(id_obra);

-- ============================================================
-- 5. LISTAS PERSONALES / ESTANTERÍAS
-- ============================================================

CREATE TABLE lista_personal (
    id_lista    SERIAL PRIMARY KEY,
    id_usuario  UUID NOT NULL REFERENCES lector_escritor(id_usuario),
    nombre      VARCHAR(100) NOT NULL
);

CREATE TABLE lista_obra (
    id_lista        INTEGER NOT NULL REFERENCES lista_personal(id_lista) ON DELETE CASCADE,
    id_obra         INTEGER NOT NULL REFERENCES obra(id_obra),
    fecha_agregado  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_lista, id_obra)
);

-- ============================================================
-- 6. SEGUIMIENTO DE LECTURA (CUU15)
-- ============================================================

CREATE TABLE seguimiento_lectura (
    id_seguimiento        SERIAL PRIMARY KEY,
    id_lector             UUID NOT NULL REFERENCES lector_escritor(id_usuario),
    id_obra               INTEGER NOT NULL REFERENCES obra(id_obra),
    paginas_leidas        INTEGER NOT NULL DEFAULT 0 CHECK (paginas_leidas >= 0),
    porcentaje_avance     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    estado                estado_seguimiento_enum NOT NULL DEFAULT 'en_progreso',
    fecha_inicio          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_lector, id_obra)
);

-- ============================================================
-- 7. FOROS (CUU13)
-- ============================================================

CREATE TABLE foro (
    id_foro             SERIAL PRIMARY KEY,
    titulo              VARCHAR(200) NOT NULL,
    categoria           VARCHAR(100),
    id_usuario_creador  UUID NOT NULL REFERENCES usuario(id_usuario),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE publicacion_foro (
    id_publicacion      SERIAL PRIMARY KEY,
    id_foro              INTEGER NOT NULL REFERENCES foro(id_foro) ON DELETE CASCADE,
    id_usuario           UUID NOT NULL REFERENCES usuario(id_usuario),
    contenido            TEXT NOT NULL,
    fecha_publicacion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado                estado_moderacion_enum NOT NULL DEFAULT 'activa'
);

CREATE INDEX idx_publicacion_foro ON publicacion_foro(id_foro);

-- ============================================================
-- 8. DESAFÍOS DE LECTURA (CUU14)
-- ============================================================

CREATE TABLE desafio (
    id_desafio               SERIAL PRIMARY KEY,
    nombre                   VARCHAR(200) NOT NULL,
    descripcion              TEXT,
    id_institucion_creadora  UUID REFERENCES usuario(id_usuario),
    fecha_inicio             DATE NOT NULL,
    fecha_fin                DATE NOT NULL,
    estado                   estado_desafio_enum NOT NULL DEFAULT 'proximo',
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE desafio_obra (
    id_desafio  INTEGER NOT NULL REFERENCES desafio(id_desafio) ON DELETE CASCADE,
    id_obra     INTEGER NOT NULL REFERENCES obra(id_obra),
    PRIMARY KEY (id_desafio, id_obra)
);

CREATE TABLE desafio_participante (
    id_desafio            INTEGER NOT NULL REFERENCES desafio(id_desafio) ON DELETE CASCADE,
    id_lector             UUID NOT NULL REFERENCES lector_escritor(id_usuario),
    progreso_porcentaje   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progreso_porcentaje BETWEEN 0 AND 100),
    fecha_inscripcion     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado                estado_seguimiento_enum NOT NULL DEFAULT 'en_progreso',
    PRIMARY KEY (id_desafio, id_lector)
);

-- ============================================================
-- 9. MÉTRICAS INSTITUCIONALES (CUU11)
-- ============================================================

CREATE TABLE metrica (
    id_metrica    SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL UNIQUE,
    descripcion   VARCHAR(255),
    aplica_a      aplica_a_enum NOT NULL,
    unidad        VARCHAR(30)
);

CREATE TABLE metrica_institucion (
    id_metrica_institucion  SERIAL PRIMARY KEY,
    id_metrica              INTEGER NOT NULL REFERENCES metrica(id_metrica),
    id_usuario               UUID NOT NULL REFERENCES usuario(id_usuario),
    periodo                  DATE NOT NULL,
    valor                     JSONB NOT NULL,
    fecha_calculo             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_metrica, id_usuario, periodo)
);

CREATE INDEX idx_metrica_institucion_usuario ON metrica_institucion(id_usuario, periodo);

-- ============================================================
-- 10. DATOS INICIALES DE REFERENCIA (catálogo de métricas)
-- ============================================================

INSERT INTO metrica (nombre, descripcion, aplica_a, unidad) VALUES
    ('prestamos_totales',      'Cantidad total de préstamos en el período',            'biblioteca', 'cantidad'),
    ('obras_mas_prestadas',    'Ranking de obras más prestadas',                       'biblioteca', NULL),
    ('autores_destacados',     'Autores emergentes con mayor interacción',              'editorial',  NULL),
    ('valoracion_promedio',    'Promedio de calificaciones de obras vinculadas',        'editorial',  '%'),
    ('obras_en_tendencia',     'Obras con mayor crecimiento de interacción reciente',   'ambas',      NULL);

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Supabase expone todas las tablas vía API REST/Realtime usando
-- la "anon key". Sin RLS habilitado, esa key puede leer y escribir
-- TODO sin restricciones. Se habilita RLS en cada tabla y se
-- definen políticas de punto de partida (ajustar según cada CU).

ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE lector_escritor ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrito ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_obra_recomendada ENABLE ROW LEVEL SECURITY;
ALTER TABLE libro ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejemplar ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamo ENABLE ROW LEVEL SECURITY;
ALTER TABLE resena ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_lectura ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicacion_foro ENABLE ROW LEVEL SECURITY;
ALTER TABLE desafio ENABLE ROW LEVEL SECURITY;
ALTER TABLE desafio_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE desafio_participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrica ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrica_institucion ENABLE ROW LEVEL SECURITY;

-- --- Perfil de usuario: cada quien ve y edita solo su propio perfil ---
CREATE POLICY "usuario_select_propio" ON usuario
    FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY "usuario_insert_propio" ON usuario
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "usuario_update_propio" ON usuario
    FOR UPDATE USING (auth.uid() = id_usuario);

-- El apodo es dato de exhibición pública: aparece como autoría de cada
-- Escrito y como firma de cada reseña (CU03/CU04). Los datos sensibles
-- (email, teléfono) viven en usuario, que sigue restringida a la fila propia.
CREATE POLICY "lector_escritor_select_publico" ON lector_escritor
    FOR SELECT USING (true);
CREATE POLICY "lector_escritor_insert_propio" ON lector_escritor
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "lector_escritor_update_propio" ON lector_escritor
    FOR UPDATE USING (auth.uid() = id_usuario);

-- El nombre de la biblioteca acompaña la disponibilidad de ejemplares en la
-- ficha de obra (CU04); ejemplar ya es de lectura pública, así que sin esto
-- el join queda huérfano. CUIT y dirección quedan expuestos: si eso molesta,
-- separar en vista que proyecte solo nombre.
CREATE POLICY "biblioteca_select_publico" ON biblioteca
    FOR SELECT USING (true);
CREATE POLICY "biblioteca_insert_propio" ON biblioteca
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "biblioteca_update_propio" ON biblioteca
    FOR UPDATE USING (auth.uid() = id_usuario);

CREATE POLICY "editorial_select_propio" ON editorial
    FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY "editorial_insert_propio" ON editorial
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "editorial_update_propio" ON editorial
    FOR UPDATE USING (auth.uid() = id_usuario);

-- --- Solicitudes de rol: el solicitante ve/crea la suya; solo el admin resuelve ---
CREATE POLICY "solicitud_select_propia_o_admin" ON solicitud_rol
    FOR SELECT USING (
        auth.uid() = id_usuario
        OR EXISTS (SELECT 1 FROM usuario WHERE id_usuario = auth.uid() AND tipo_usuario = 'administrador')
    );
CREATE POLICY "solicitud_insert_propia" ON solicitud_rol
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "solicitud_update_admin" ON solicitud_rol
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM usuario WHERE id_usuario = auth.uid() AND tipo_usuario = 'administrador')
    );

-- --- Notificaciones: cada usuario ve y marca como leídas solo las propias ---
CREATE POLICY "notificacion_select_propia" ON notificacion
    FOR SELECT USING (auth.uid() = id_usuario_destino);
CREATE POLICY "notificacion_update_propia" ON notificacion
    FOR UPDATE USING (auth.uid() = id_usuario_destino);
CREATE POLICY "notificacion_insert_sistema" ON notificacion
    FOR INSERT WITH CHECK (true);

-- --- Obras: catálogo público de lectura (superclase, sin dueño propio) ---
CREATE POLICY "obra_select_publica" ON obra
    FOR SELECT USING (true);

-- --- Escritos: lectura pública (siempre publicados al crearse); escritura solo el autor dueño ---
CREATE POLICY "escrito_select_publico" ON escrito
    FOR SELECT USING (true);
CREATE POLICY "escrito_insert_propio" ON escrito
    FOR INSERT WITH CHECK (auth.uid() = id_autor);
CREATE POLICY "escrito_update_propio" ON escrito
    FOR UPDATE USING (auth.uid() = id_autor);

-- --- Obras recomendadas por editorial: lectura pública; gestión solo la editorial dueña (CU02) ---
CREATE POLICY "editorial_obra_recomendada_select_publica" ON editorial_obra_recomendada
    FOR SELECT USING (true);
CREATE POLICY "editorial_obra_recomendada_insert_propia" ON editorial_obra_recomendada
    FOR INSERT WITH CHECK (auth.uid() = id_editorial);
CREATE POLICY "editorial_obra_recomendada_update_propia" ON editorial_obra_recomendada
    FOR UPDATE USING (auth.uid() = id_editorial);
CREATE POLICY "editorial_obra_recomendada_delete_propia" ON editorial_obra_recomendada
    FOR DELETE USING (auth.uid() = id_editorial);

-- --- Libros: catálogo de Google Books, lectura pública para autenticados; inserción vía backend ---
CREATE POLICY "libro_select_publico" ON libro
    FOR SELECT USING (true);
CREATE POLICY "libro_insert_autenticado" ON libro
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- --- Ejemplares: lectura pública; escritura solo la biblioteca dueña ---
CREATE POLICY "ejemplar_select_publico" ON ejemplar
    FOR SELECT USING (true);
CREATE POLICY "ejemplar_insert_propio" ON ejemplar
    FOR INSERT WITH CHECK (auth.uid() = id_biblioteca);
CREATE POLICY "ejemplar_update_propio" ON ejemplar
    FOR UPDATE USING (auth.uid() = id_biblioteca);

-- --- Préstamos: el lector ve los suyos; la biblioteca dueña del ejemplar también ---
CREATE POLICY "prestamo_select_propio" ON prestamo
    FOR SELECT USING (
        auth.uid() = id_lector
        OR auth.uid() = (SELECT id_biblioteca FROM ejemplar WHERE id_ejemplar = prestamo.id_ejemplar)
    );
CREATE POLICY "prestamo_insert_biblioteca" ON prestamo
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT id_biblioteca FROM ejemplar WHERE id_ejemplar = prestamo.id_ejemplar)
    );
CREATE POLICY "prestamo_update_biblioteca" ON prestamo
    FOR UPDATE USING (
        auth.uid() = (SELECT id_biblioteca FROM ejemplar WHERE id_ejemplar = prestamo.id_ejemplar)
    );

-- --- Reseñas: lectura pública; escritura solo el autor de la reseña ---
CREATE POLICY "resena_select_publica" ON resena
    FOR SELECT USING (estado = 'activa' OR auth.uid() = id_usuario);
CREATE POLICY "resena_insert_propia" ON resena
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "resena_update_propia" ON resena
    FOR UPDATE USING (auth.uid() = id_usuario);

-- --- Listas personales: privadas, solo el dueño accede ---
CREATE POLICY "lista_personal_propia" ON lista_personal
    FOR ALL USING (auth.uid() = id_usuario) WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "lista_obra_propia" ON lista_obra
    FOR ALL USING (
        auth.uid() = (SELECT id_usuario FROM lista_personal WHERE id_lista = lista_obra.id_lista)
    ) WITH CHECK (
        auth.uid() = (SELECT id_usuario FROM lista_personal WHERE id_lista = lista_obra.id_lista)
    );

-- --- Seguimiento de lectura: privado, solo el propio lector ---
CREATE POLICY "seguimiento_propio" ON seguimiento_lectura
    FOR ALL USING (auth.uid() = id_lector) WITH CHECK (auth.uid() = id_lector);

-- --- Foros: lectura pública para todo usuario autenticado; publicar solo dueño ---
CREATE POLICY "foro_select_autenticado" ON foro
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "foro_insert_autenticado" ON foro
    FOR INSERT WITH CHECK (auth.uid() = id_usuario_creador);

CREATE POLICY "publicacion_foro_select_autenticado" ON publicacion_foro
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "publicacion_foro_insert_propia" ON publicacion_foro
    FOR INSERT WITH CHECK (auth.uid() = id_usuario);
CREATE POLICY "publicacion_foro_update_propia" ON publicacion_foro
    FOR UPDATE USING (auth.uid() = id_usuario);

-- --- Desafíos: lectura pública; creación solo instituciones ---
CREATE POLICY "desafio_select_publico" ON desafio
    FOR SELECT USING (true);
CREATE POLICY "desafio_insert_institucion" ON desafio
    FOR INSERT WITH CHECK (auth.uid() = id_institucion_creadora);

CREATE POLICY "desafio_obra_select_publico" ON desafio_obra
    FOR SELECT USING (true);

CREATE POLICY "desafio_participante_propio" ON desafio_participante
    FOR ALL USING (auth.uid() = id_lector) WITH CHECK (auth.uid() = id_lector);

-- --- Métricas: catálogo de definiciones público; valores solo la institución dueña ---
CREATE POLICY "metrica_select_publica" ON metrica
    FOR SELECT USING (true);

CREATE POLICY "metrica_institucion_propia" ON metrica_institucion
    FOR SELECT USING (auth.uid() = id_usuario);

-- ============================================================
-- Fin del script
-- ============================================================
