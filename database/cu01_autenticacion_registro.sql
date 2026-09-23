-- ============================================================
-- CU01 - Autenticacion y registro de usuarios
-- Migracion incremental para una base LEER+ ya creada.
--
-- Ejecutar una sola vez en Supabase SQL Editor. Este script:
--   * completa el perfil comun de usuario;
--   * crea perfiles desde Supabase Auth de forma segura;
--   * activa al Lector-Escritor al verificar el correo;
--   * mantiene pendientes a Biblioteca y Editorial;
--   * recibe exactamente dos PDF privados por solicitud;
--   * registra la aceptacion versionada de terminos y privacidad.
-- ============================================================

BEGIN;

-- ---------- Datos de registro que faltaban en el modelo ----------
ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS nombre VARCHAR(100),
    ADD COLUMN IF NOT EXISTS apellido VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pais VARCHAR(100),
    ADD COLUMN IF NOT EXISTS localidad VARCHAR(150),
    ADD COLUMN IF NOT EXISTS terminos_version VARCHAR(30),
    ADD COLUMN IF NOT EXISTS privacidad_version VARCHAR(30),
    ADD COLUMN IF NOT EXISTS aceptacion_politicas_en TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_biblioteca_cuit_unico
    ON public.biblioteca (regexp_replace(cuit, '[^0-9]', '', 'g'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_editorial_cuit_unico
    ON public.editorial (regexp_replace(cuit, '[^0-9]', '', 'g'));

-- Reserva central para impedir que un CUIT aparezca a la vez como Biblioteca
-- y como Editorial. Las tablas de subtipo conservan sus datos operativos.
CREATE TABLE IF NOT EXISTS public.cuit_institucional (
    cuit_normalizado VARCHAR(20) PRIMARY KEY,
    id_usuario UUID NOT NULL UNIQUE REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
    tipo_usuario public.tipo_usuario_enum NOT NULL,
    CONSTRAINT chk_cuit_tipo_institucional
        CHECK (tipo_usuario IN ('biblioteca', 'editorial')),
    CONSTRAINT chk_cuit_solo_digitos
        CHECK (cuit_normalizado ~ '^[0-9]{11}$')
);

ALTER TABLE public.cuit_institucional ENABLE ROW LEVEL SECURITY;

-- ---------- Documentacion respaldatoria ----------
CREATE TABLE IF NOT EXISTS public.documento_solicitud_rol (
    id_documento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_solicitud INTEGER NOT NULL REFERENCES public.solicitud_rol(id_solicitud) ON DELETE CASCADE,
    id_usuario UUID NOT NULL REFERENCES public.usuario(id_usuario) ON DELETE CASCADE,
    ruta_storage TEXT NOT NULL UNIQUE,
    nombre_original VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    tamano_bytes BIGINT NOT NULL,
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_documento_pdf CHECK (mime_type = 'application/pdf'),
    CONSTRAINT chk_documento_tamano CHECK (tamano_bytes > 0 AND tamano_bytes <= 10485760)
);

CREATE INDEX IF NOT EXISTS idx_documento_solicitud
    ON public.documento_solicitud_rol (id_solicitud);

ALTER TABLE public.documento_solicitud_rol ENABLE ROW LEVEL SECURITY;

-- ---------- Funciones de autorizacion sin recursion RLS ----------
CREATE OR REPLACE FUNCTION public.fn_es_administrador(p_usuario UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario
        WHERE id_usuario = p_usuario
          AND tipo_usuario = 'administrador'
          AND estado = 'activo'
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_usuario_activo(p_usuario UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario
        WHERE id_usuario = p_usuario
          AND estado = 'activo'
    );
$$;

REVOKE ALL ON FUNCTION public.fn_es_administrador(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_usuario_activo(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_es_administrador(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_usuario_activo(UUID) TO authenticated;

-- ---------- Alta atomica del perfil desde auth.users ----------
-- Nunca acepta "administrador" desde metadatos del cliente.
CREATE OR REPLACE FUNCTION public.fn_crear_perfil_desde_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tipo TEXT := COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'lector_escritor');
    v_cuit TEXT;
    v_estado public.estado_usuario_enum := 'pendiente';
BEGIN
    IF v_tipo NOT IN ('lector_escritor', 'biblioteca', 'editorial') THEN
        RAISE EXCEPTION 'Tipo de usuario no permitido';
    END IF;

    IF COALESCE(NEW.raw_user_meta_data->>'politicas_aceptadas', 'false') <> 'true' THEN
        RAISE EXCEPTION 'Es obligatorio aceptar los terminos y la politica de privacidad';
    END IF;

    INSERT INTO public.usuario (
        id_usuario,
        email,
        telefono,
        estado,
        tipo_usuario,
        nombre,
        apellido,
        pais,
        localidad,
        terminos_version,
        privacidad_version,
        aceptacion_politicas_en
    ) VALUES (
        NEW.id,
        NEW.email,
        NULLIF(trim(NEW.raw_user_meta_data->>'telefono'), ''),
        v_estado,
        v_tipo::public.tipo_usuario_enum,
        NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'apellido'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'pais'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'localidad'), ''),
        NULLIF(NEW.raw_user_meta_data->>'terminos_version', ''),
        NULLIF(NEW.raw_user_meta_data->>'privacidad_version', ''),
        now()
    );

    IF v_tipo = 'lector_escritor' THEN
        INSERT INTO public.lector_escritor (id_usuario, apodo)
        VALUES (
            NEW.id,
            COALESCE(
                NULLIF(trim(NEW.raw_user_meta_data->>'apodo'), ''),
                NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
                split_part(NEW.email, '@', 1)
            )
        );
    ELSE
        v_cuit := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cuit', ''), '[^0-9]', '', 'g');
        IF v_cuit !~ '^[0-9]{11}$' THEN
            RAISE EXCEPTION 'El CUIT debe contener 11 digitos';
        END IF;

        INSERT INTO public.cuit_institucional (cuit_normalizado, id_usuario, tipo_usuario)
        VALUES (v_cuit, NEW.id, v_tipo::public.tipo_usuario_enum);

        IF v_tipo = 'biblioteca' THEN
            INSERT INTO public.biblioteca (id_usuario, cuit, nombre, direccion)
            VALUES (
                NEW.id,
                v_cuit,
                COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nombre_institucion'), ''), 'Biblioteca'),
                NULLIF(trim(NEW.raw_user_meta_data->>'direccion'), '')
            );
        ELSE
            INSERT INTO public.editorial (id_usuario, razon_social, cuit, sitio_web)
            VALUES (
                NEW.id,
                COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'razon_social'), ''), 'Editorial'),
                v_cuit,
                NULLIF(trim(NEW.raw_user_meta_data->>'sitio_web'), '')
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crear_perfil_desde_auth ON auth.users;
CREATE TRIGGER trg_crear_perfil_desde_auth
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_crear_perfil_desde_auth();

REVOKE ALL ON FUNCTION public.fn_crear_perfil_desde_auth() FROM PUBLIC;

-- La confirmacion de correo activa de inmediato solo al Lector-Escritor.
-- Las instituciones permanecen pendientes hasta la resolucion del CU16.
CREATE OR REPLACE FUNCTION public.fn_activar_correo_verificado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.usuario
        SET estado = CASE
            WHEN tipo_usuario = 'lector_escritor' THEN 'activo'::public.estado_usuario_enum
            ELSE 'pendiente'::public.estado_usuario_enum
        END
        WHERE id_usuario = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activar_correo_verificado ON auth.users;
CREATE TRIGGER trg_activar_correo_verificado
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_activar_correo_verificado();

REVOKE ALL ON FUNCTION public.fn_activar_correo_verificado() FROM PUBLIC;

-- Los triggers de solicitud deben poder notificar y activar otra cuenta aun
-- cuando la operacion original provenga de una sesion con RLS.
CREATE OR REPLACE FUNCTION public.fn_notificar_nueva_solicitud()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notificacion (id_usuario_destino, tipo, contenido, referencia_id)
    SELECT id_usuario, 'solicitud_rol',
           'Nueva solicitud de registro institucional pendiente de revisión.',
           NEW.id_solicitud
    FROM public.usuario
    WHERE tipo_usuario = 'administrador';
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_notificar_resolucion_solicitud()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.estado <> OLD.estado AND NEW.estado IN ('aprobada', 'rechazada') THEN
        INSERT INTO public.notificacion (id_usuario_destino, tipo, contenido, referencia_id)
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
            UPDATE public.usuario SET estado = 'activo' WHERE id_usuario = NEW.id_usuario;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Finaliza el registro institucional una vez verificado el correo y cargados
-- exactamente dos PDF. La solicitud dispara la notificacion existente a admin.
CREATE OR REPLACE FUNCTION public.fn_completar_solicitud_institucional(p_documentos JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_usuario public.usuario%ROWTYPE;
    v_id_solicitud INTEGER;
    v_documento JSONB;
    v_ruta TEXT;
BEGIN
    SELECT * INTO v_usuario
    FROM public.usuario
    WHERE id_usuario = auth.uid();

    IF NOT FOUND OR v_usuario.tipo_usuario NOT IN ('biblioteca', 'editorial') THEN
        RAISE EXCEPTION 'La cuenta no corresponde a una institucion';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Primero debes verificar tu correo electronico';
    END IF;

    IF jsonb_typeof(p_documentos) <> 'array' OR jsonb_array_length(p_documentos) <> 2 THEN
        RAISE EXCEPTION 'Debes adjuntar exactamente dos archivos PDF';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.solicitud_rol
        WHERE id_usuario = auth.uid() AND estado = 'pendiente'
    ) THEN
        RAISE EXCEPTION 'Ya existe una solicitud pendiente';
    END IF;

    INSERT INTO public.solicitud_rol (id_usuario, tipo_rol)
    VALUES (auth.uid(), v_usuario.tipo_usuario)
    RETURNING id_solicitud INTO v_id_solicitud;

    FOR v_documento IN SELECT value FROM jsonb_array_elements(p_documentos)
    LOOP
        v_ruta := v_documento->>'ruta';

        IF v_ruta IS NULL OR split_part(v_ruta, '/', 1) <> auth.uid()::TEXT THEN
            RAISE EXCEPTION 'Ruta de documento no permitida';
        END IF;

        IF COALESCE(v_documento->>'mime_type', '') <> 'application/pdf' THEN
            RAISE EXCEPTION 'Solo se admiten archivos PDF';
        END IF;

        IF COALESCE((v_documento->>'tamano_bytes')::BIGINT, 0) NOT BETWEEN 1 AND 10485760 THEN
            RAISE EXCEPTION 'Cada PDF debe pesar como maximo 10 MB';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM storage.objects
            WHERE bucket_id = 'documentacion-institucional'
              AND name = v_ruta
              AND owner_id = auth.uid()::TEXT
        ) THEN
            RAISE EXCEPTION 'No se encontro uno de los documentos cargados';
        END IF;

        INSERT INTO public.documento_solicitud_rol (
            id_solicitud,
            id_usuario,
            ruta_storage,
            nombre_original,
            mime_type,
            tamano_bytes
        ) VALUES (
            v_id_solicitud,
            auth.uid(),
            v_ruta,
            left(COALESCE(v_documento->>'nombre_original', 'documento.pdf'), 255),
            'application/pdf',
            (v_documento->>'tamano_bytes')::BIGINT
        );
    END LOOP;

    RETURN v_id_solicitud;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_completar_solicitud_institucional(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_completar_solicitud_institucional(JSONB) TO authenticated;

-- ---------- Politicas para datos del CU01 ----------
DROP POLICY IF EXISTS "cuit_institucional_select_admin" ON public.cuit_institucional;
CREATE POLICY "cuit_institucional_select_admin" ON public.cuit_institucional
    FOR SELECT USING (public.fn_es_administrador());

DROP POLICY IF EXISTS "documento_select_propio_o_admin" ON public.documento_solicitud_rol;
CREATE POLICY "documento_select_propio_o_admin" ON public.documento_solicitud_rol
    FOR SELECT USING (auth.uid() = id_usuario OR public.fn_es_administrador());

DROP POLICY IF EXISTS "solicitud_insert_propia" ON public.solicitud_rol;
DROP POLICY IF EXISTS "notificacion_insert_sistema" ON public.notificacion;

DROP POLICY IF EXISTS "solicitud_select_propia_o_admin" ON public.solicitud_rol;
CREATE POLICY "solicitud_select_propia_o_admin" ON public.solicitud_rol
    FOR SELECT USING (auth.uid() = id_usuario OR public.fn_es_administrador());

DROP POLICY IF EXISTS "solicitud_update_admin" ON public.solicitud_rol;
CREATE POLICY "solicitud_update_admin" ON public.solicitud_rol
    FOR UPDATE USING (public.fn_es_administrador());

-- El perfil se crea por trigger, no desde el navegador.
DROP POLICY IF EXISTS "usuario_insert_propio" ON public.usuario;

-- Impide que una cuenta pendiente se habilite sola cambiando estado o rol.
REVOKE UPDATE ON public.usuario FROM authenticated;
GRANT UPDATE (nombre, apellido, telefono, pais, localidad) ON public.usuario TO authenticated;

DROP POLICY IF EXISTS "usuario_update_propio" ON public.usuario;
CREATE POLICY "usuario_update_propio" ON public.usuario
    FOR UPDATE USING (auth.uid() = id_usuario)
    WITH CHECK (auth.uid() = id_usuario);

-- Las cuentas institucionales pendientes solo pueden leer su perfil,
-- consultar la solicitud y cargar los dos PDF. El resto exige estado activo.
DROP POLICY IF EXISTS "lector_escritor_insert_propio" ON public.lector_escritor;
DROP POLICY IF EXISTS "biblioteca_insert_propio" ON public.biblioteca;
DROP POLICY IF EXISTS "editorial_insert_propio" ON public.editorial;

DROP POLICY IF EXISTS "lector_escritor_update_propio" ON public.lector_escritor;
CREATE POLICY "lector_escritor_update_propio" ON public.lector_escritor
    FOR UPDATE USING (auth.uid() = id_usuario AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "biblioteca_update_propio" ON public.biblioteca;
CREATE POLICY "biblioteca_update_propio" ON public.biblioteca
    FOR UPDATE USING (auth.uid() = id_usuario AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "editorial_update_propio" ON public.editorial;
CREATE POLICY "editorial_update_propio" ON public.editorial
    FOR UPDATE USING (auth.uid() = id_usuario AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "libro_insert_autenticado" ON public.libro;
CREATE POLICY "libro_insert_autenticado" ON public.libro
    FOR INSERT WITH CHECK (public.fn_usuario_activo());

DROP POLICY IF EXISTS "foro_select_autenticado" ON public.foro;
CREATE POLICY "foro_select_autenticado" ON public.foro
    FOR SELECT USING (public.fn_usuario_activo());

DROP POLICY IF EXISTS "publicacion_foro_select_autenticado" ON public.publicacion_foro;
CREATE POLICY "publicacion_foro_select_autenticado" ON public.publicacion_foro
    FOR SELECT USING (public.fn_usuario_activo());

DROP POLICY IF EXISTS "escrito_insert_propio" ON public.escrito;
CREATE POLICY "escrito_insert_propio" ON public.escrito
    FOR INSERT WITH CHECK (auth.uid() = id_autor AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "escrito_update_propio" ON public.escrito;
CREATE POLICY "escrito_update_propio" ON public.escrito
    FOR UPDATE USING (auth.uid() = id_autor AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "editorial_obra_recomendada_insert_propia" ON public.editorial_obra_recomendada;
CREATE POLICY "editorial_obra_recomendada_insert_propia" ON public.editorial_obra_recomendada
    FOR INSERT WITH CHECK (auth.uid() = id_editorial AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "editorial_obra_recomendada_update_propia" ON public.editorial_obra_recomendada;
CREATE POLICY "editorial_obra_recomendada_update_propia" ON public.editorial_obra_recomendada
    FOR UPDATE USING (auth.uid() = id_editorial AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "editorial_obra_recomendada_delete_propia" ON public.editorial_obra_recomendada;
CREATE POLICY "editorial_obra_recomendada_delete_propia" ON public.editorial_obra_recomendada
    FOR DELETE USING (auth.uid() = id_editorial AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "ejemplar_insert_propio" ON public.ejemplar;
CREATE POLICY "ejemplar_insert_propio" ON public.ejemplar
    FOR INSERT WITH CHECK (auth.uid() = id_biblioteca AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "ejemplar_update_propio" ON public.ejemplar;
CREATE POLICY "ejemplar_update_propio" ON public.ejemplar
    FOR UPDATE USING (auth.uid() = id_biblioteca AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "prestamo_insert_biblioteca" ON public.prestamo;
CREATE POLICY "prestamo_insert_biblioteca" ON public.prestamo
    FOR INSERT WITH CHECK (
        public.fn_usuario_activo()
        AND auth.uid() = (SELECT id_biblioteca FROM public.ejemplar WHERE id_ejemplar = prestamo.id_ejemplar)
    );
DROP POLICY IF EXISTS "prestamo_update_biblioteca" ON public.prestamo;
CREATE POLICY "prestamo_update_biblioteca" ON public.prestamo
    FOR UPDATE USING (
        public.fn_usuario_activo()
        AND auth.uid() = (SELECT id_biblioteca FROM public.ejemplar WHERE id_ejemplar = prestamo.id_ejemplar)
    );

DROP POLICY IF EXISTS "resena_insert_propia" ON public.resena;
CREATE POLICY "resena_insert_propia" ON public.resena
    FOR INSERT WITH CHECK (auth.uid() = id_usuario AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "resena_update_propia" ON public.resena;
CREATE POLICY "resena_update_propia" ON public.resena
    FOR UPDATE USING (auth.uid() = id_usuario AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "lista_personal_propia" ON public.lista_personal;
CREATE POLICY "lista_personal_propia" ON public.lista_personal
    FOR ALL USING (auth.uid() = id_usuario AND public.fn_usuario_activo())
    WITH CHECK (auth.uid() = id_usuario AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "lista_obra_propia" ON public.lista_obra;
CREATE POLICY "lista_obra_propia" ON public.lista_obra
    FOR ALL USING (
        public.fn_usuario_activo()
        AND auth.uid() = (SELECT id_usuario FROM public.lista_personal WHERE id_lista = lista_obra.id_lista)
    ) WITH CHECK (
        public.fn_usuario_activo()
        AND auth.uid() = (SELECT id_usuario FROM public.lista_personal WHERE id_lista = lista_obra.id_lista)
    );

DROP POLICY IF EXISTS "seguimiento_propio" ON public.seguimiento_lectura;
CREATE POLICY "seguimiento_propio" ON public.seguimiento_lectura
    FOR ALL USING (auth.uid() = id_lector AND public.fn_usuario_activo())
    WITH CHECK (auth.uid() = id_lector AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "foro_insert_autenticado" ON public.foro;
CREATE POLICY "foro_insert_autenticado" ON public.foro
    FOR INSERT WITH CHECK (auth.uid() = id_usuario_creador AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "publicacion_foro_insert_propia" ON public.publicacion_foro;
CREATE POLICY "publicacion_foro_insert_propia" ON public.publicacion_foro
    FOR INSERT WITH CHECK (auth.uid() = id_usuario AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "publicacion_foro_update_propia" ON public.publicacion_foro;
CREATE POLICY "publicacion_foro_update_propia" ON public.publicacion_foro
    FOR UPDATE USING (auth.uid() = id_usuario AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "desafio_insert_institucion" ON public.desafio;
CREATE POLICY "desafio_insert_institucion" ON public.desafio
    FOR INSERT WITH CHECK (auth.uid() = id_institucion_creadora AND public.fn_usuario_activo());
DROP POLICY IF EXISTS "desafio_participante_propio" ON public.desafio_participante;
CREATE POLICY "desafio_participante_propio" ON public.desafio_participante
    FOR ALL USING (auth.uid() = id_lector AND public.fn_usuario_activo())
    WITH CHECK (auth.uid() = id_lector AND public.fn_usuario_activo());

DROP POLICY IF EXISTS "metrica_institucion_propia" ON public.metrica_institucion;
CREATE POLICY "metrica_institucion_propia" ON public.metrica_institucion
    FOR SELECT USING (auth.uid() = id_usuario AND public.fn_usuario_activo());

-- ---------- Bucket privado para los dos PDF ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documentacion-institucional',
    'documentacion-institucional',
    false,
    10485760,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "documentacion_insert_propia" ON storage.objects;
CREATE POLICY "documentacion_insert_propia" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documentacion-institucional'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

DROP POLICY IF EXISTS "documentacion_select_propia_o_admin" ON storage.objects;
CREATE POLICY "documentacion_select_propia_o_admin" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'documentacion-institucional'
        AND (
            (storage.foldername(name))[1] = auth.uid()::TEXT
            OR public.fn_es_administrador()
        )
    );

-- Solo permite limpiar una carga que todavia no fue asociada a una solicitud.
DROP POLICY IF EXISTS "documentacion_delete_propia_sin_enviar" ON storage.objects;
CREATE POLICY "documentacion_delete_propia_sin_enviar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'documentacion-institucional'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
        AND NOT EXISTS (
            SELECT 1
            FROM public.documento_solicitud_rol d
            WHERE d.ruta_storage = name
        )
    );

COMMIT;
