-- CU02, etapa 1. Ejecutar DESPUES de las migraciones de CU01.
-- La RPC actualiza datos comunes y el subtipo en una sola transaccion.
-- Los datos institucionales verificados permanecen inmutables desde el cliente.

BEGIN;

REVOKE UPDATE ON public.lector_escritor FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.biblioteca FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.editorial FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_actualizar_perfil_basico(
    p_nombre TEXT,
    p_apellido TEXT,
    p_telefono TEXT,
    p_pais TEXT,
    p_provincia TEXT,
    p_localidad TEXT,
    p_apodo TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_sitio_web TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tipo public.tipo_usuario_enum;
    v_estado public.estado_usuario_enum;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesion para editar tu perfil';
    END IF;

    SELECT tipo_usuario, estado INTO v_tipo, v_estado
    FROM public.usuario
    WHERE id_usuario = auth.uid()
    FOR UPDATE;

    IF NOT FOUND OR v_estado <> 'activo' THEN
        RAISE EXCEPTION 'Tu cuenta no esta habilitada para editar el perfil';
    END IF;

    IF length(trim(COALESCE(p_nombre, ''))) NOT BETWEEN 1 AND 100
        OR length(trim(COALESCE(p_apellido, ''))) NOT BETWEEN 1 AND 100
        OR length(trim(COALESCE(p_pais, ''))) NOT BETWEEN 1 AND 100
        OR length(trim(COALESCE(p_provincia, ''))) NOT BETWEEN 1 AND 120
        OR length(trim(COALESCE(p_localidad, ''))) NOT BETWEEN 1 AND 150 THEN
        RAISE EXCEPTION 'Completa los datos de identidad y ubicacion';
    END IF;

    IF COALESCE(trim(p_telefono), '') !~ '^\+[0-9-]{1,8} [0-9 ()-]{6,20}$'
        OR length(trim(p_telefono)) > 30 THEN
        RAISE EXCEPTION 'El telefono no tiene un formato valido';
    END IF;

    IF v_tipo = 'lector_escritor' THEN
        IF length(trim(COALESCE(p_apodo, ''))) NOT BETWEEN 3 AND 50 THEN
            RAISE EXCEPTION 'El alias debe tener entre 3 y 50 caracteres';
        END IF;
    ELSIF v_tipo = 'biblioteca' THEN
        IF length(trim(COALESCE(p_direccion, ''))) NOT BETWEEN 1 AND 255 THEN
            RAISE EXCEPTION 'Completa una direccion de hasta 255 caracteres';
        END IF;
    ELSIF v_tipo = 'editorial' THEN
        IF p_sitio_web IS NOT NULL AND (
            length(trim(p_sitio_web)) > 255
            OR trim(p_sitio_web) !~* '^https?://[^[:space:]]+\.[^[:space:]]+$'
        ) THEN
            RAISE EXCEPTION 'El sitio web debe ser una URL http o https valida';
        END IF;
    ELSE
        RAISE EXCEPTION 'Este tipo de cuenta no admite esta edicion';
    END IF;

    UPDATE public.usuario
    SET nombre = trim(p_nombre),
        apellido = trim(p_apellido),
        telefono = trim(p_telefono),
        pais = trim(p_pais),
        provincia = trim(p_provincia),
        localidad = trim(p_localidad)
    WHERE id_usuario = auth.uid();

    IF v_tipo = 'lector_escritor' THEN
        UPDATE public.lector_escritor
        SET apodo = trim(p_apodo)
        WHERE id_usuario = auth.uid();
    ELSIF v_tipo = 'biblioteca' THEN
        UPDATE public.biblioteca
        SET direccion = NULLIF(trim(p_direccion), '')
        WHERE id_usuario = auth.uid();
    ELSE
        UPDATE public.editorial
        SET sitio_web = NULLIF(trim(p_sitio_web), '')
        WHERE id_usuario = auth.uid();
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_actualizar_perfil_basico(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_actualizar_perfil_basico(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

COMMIT;
