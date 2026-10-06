-- ============================================================
-- CU01 - Mejoras de registro
-- Ejecutar si cu01_autenticacion_registro.sql ya fue aplicado.
-- Agrega provincia, alias único y consultas seguras de disponibilidad.
-- ============================================================

BEGIN;

ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS provincia VARCHAR(120);

ALTER TABLE public.editorial
    ADD COLUMN IF NOT EXISTS nombre_fantasia VARCHAR(150);

UPDATE public.editorial
SET nombre_fantasia = razon_social
WHERE nombre_fantasia IS NULL OR trim(nombre_fantasia) = '';

ALTER TABLE public.editorial
    ALTER COLUMN nombre_fantasia SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lector_escritor_apodo_unico
    ON public.lector_escritor (lower(trim(apodo)));

CREATE OR REPLACE FUNCTION public.fn_email_registrado(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuario
        WHERE lower(email) = lower(trim(p_email))
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_alias_disponible(p_alias TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT length(trim(p_alias)) BETWEEN 3 AND 50
       AND NOT EXISTS (
           SELECT 1 FROM public.lector_escritor
           WHERE lower(trim(apodo)) = lower(trim(p_alias))
       );
$$;

REVOKE ALL ON FUNCTION public.fn_email_registrado(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_alias_disponible(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_email_registrado(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_alias_disponible(TEXT) TO anon, authenticated;

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
        id_usuario, email, telefono, estado, tipo_usuario, nombre, apellido,
        pais, provincia, localidad, terminos_version, privacidad_version,
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
        NULLIF(trim(NEW.raw_user_meta_data->>'provincia'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'localidad'), ''),
        NULLIF(NEW.raw_user_meta_data->>'terminos_version', ''),
        NULLIF(NEW.raw_user_meta_data->>'privacidad_version', ''),
        now()
    );

    IF v_tipo = 'lector_escritor' THEN
        IF length(trim(COALESCE(NEW.raw_user_meta_data->>'apodo', ''))) NOT BETWEEN 3 AND 50 THEN
            RAISE EXCEPTION 'El alias debe tener entre 3 y 50 caracteres';
        END IF;
        INSERT INTO public.lector_escritor (id_usuario, apodo)
        VALUES (NEW.id, trim(NEW.raw_user_meta_data->>'apodo'));
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
                trim(NEW.raw_user_meta_data->>'nombre_institucion'),
                NULLIF(trim(NEW.raw_user_meta_data->>'direccion'), '')
            );
        ELSE
            INSERT INTO public.editorial (id_usuario, nombre_fantasia, razon_social, cuit, sitio_web)
            VALUES (
                NEW.id,
                COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nombre_fantasia'), ''), 'Editorial'),
                trim(NEW.raw_user_meta_data->>'razon_social'),
                v_cuit,
                NULLIF(trim(NEW.raw_user_meta_data->>'sitio_web'), '')
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE UPDATE ON public.usuario FROM authenticated;
GRANT UPDATE (nombre, apellido, telefono, pais, provincia, localidad)
    ON public.usuario TO authenticated;

COMMIT;
