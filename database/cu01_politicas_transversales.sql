-- CU01: bloqueo de funciones para cuentas pendientes en modulos compartidos.
-- Requiere database/cu01_autenticacion_registro.sql.
-- Revisar con los responsables de Contenido y Bibliotecas antes de integrar.
-- Aplicar en la misma ventana de despliegue que el script principal de CU01.

BEGIN;

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

COMMIT;
