# CU02 — Gestión de perfil, etapa 1

Esta rama parte de `feature/cu01-autenticacion-registro` porque necesita su sesión, perfil y columnas de registro. **No integrar CU02 en `main` antes de CU01.** Al aprobar CU01, actualizar CU02 desde `main` y revisar el diff antes de su propio Pull Request.

## Alcance implementado

- Ruta protegida `/mi-perfil` para cuentas activas.
- Consulta y edición de teléfono y ubicación; nombre y apellido solo aplican a cuentas personales y de Biblioteca.
- Cuenta Lector-Escritor: consulta y cambio del alias único.
- Biblioteca: consulta del nombre/CUIT verificados y edición de dirección.
- Editorial: consulta de razón social/CUIT verificados y edición de nombre de fantasía y sitio web. La cuenta representa a la institución y no almacena nombre/apellido de una persona como identidad del perfil.
- Confirmación accesible antes de descartar cambios; errores y confirmaciones en español.
- Guardado parcial: cada lápiz modifica únicamente el dato seleccionado. Ubicación actualiza país, provincia, localidad y el prefijo telefónico como una sola unidad.

El correo, el CUIT y el nombre/razón social institucional son de solo lectura. No hay botón que simule un trámite todavía no implementado.

## Base de datos y seguridad

Después de aplicar CU01, ejecutar `database/cu02_perfil_basico.sql`. La función `fn_actualizar_perfil_basico` valida sesión activa, tipo de cuenta, campo autorizado y existencia del subtipo antes de actualizar únicamente el dato solicitado. La migración revoca la edición directa de los subtipos para que un cliente no pueda cambiar CUIT, nombre institucional o puntos; por eso **CU16 y cualquier proceso de administración deberán usar una operación de servidor con permisos específicos**. Revisar este contrato con quien implemente CU16 antes de integrar.

Ejecutar `npm test`, `npm run lint` y `npm run build` antes de publicar cambios. Las pruebas unitarias cubren validación completa y por campo; las pruebas reales de RPC quedan pendientes hasta disponer de acceso al proyecto compartido.

## Fuera de esta etapa

La propuesta visual de fotografía/logotipo, biografía, intereses/géneros y visibilidad ya se encuentra en `CU02-etapa-2.md`, pero continúa sin persistencia hasta acordar y actualizar el DER. Siguen pendientes el contacto público, las obras recomendadas de Editorial, el cambio verificado de correo, el cambio de contraseña con invalidación de otras sesiones, las solicitudes institucionales y la desactivación.

La migración y el recorrido completo no están probados contra el Supabase compartido; no considerarlos desplegados hasta ejecutar el SQL y probar con cuentas reales de los tres tipos.
