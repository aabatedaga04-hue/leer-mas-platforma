# CU02 — Gestión de perfil, etapa 1

Esta rama parte de `feature/cu01-autenticacion-registro` porque necesita su sesión, perfil y columnas de registro. **No integrar CU02 en `main` antes de CU01.** Al aprobar CU01, actualizar CU02 desde `main` y revisar el diff antes de su propio Pull Request.

## Alcance implementado

- Ruta protegida `/mi-perfil` para cuentas activas.
- Consulta y edición de teléfono y ubicación; nombre y apellido solo aplican a cuentas personales y de Biblioteca.
- Cuenta Lector-Escritor: consulta y cambio del alias único.
- Biblioteca: consulta del nombre/CUIT verificados y edición de dirección.
- Editorial: consulta de razón social/CUIT verificados y edición de nombre de fantasía y sitio web. La cuenta representa a la institución y no almacena nombre/apellido de una persona como identidad del perfil.
- Confirmación antes de descartar cambios; errores y confirmaciones en español.

El correo, el CUIT y el nombre/razón social institucional son de solo lectura. No hay botón que simule un trámite todavía no implementado.

## Base de datos y seguridad

Después de aplicar CU01, ejecutar `database/cu02_perfil_basico.sql`. La función `fn_actualizar_perfil_basico` valida sesión activa y actualiza los datos comunes y el subtipo en una transacción. La migración revoca la edición directa de los subtipos para que un cliente no pueda cambiar CUIT, nombre institucional o puntos; por eso **CU16 y cualquier proceso de administración deberán usar una operación de servidor con permisos específicos**. Revisar este contrato con quien implemente CU16 antes de integrar.

## Fuera de esta etapa

Fotografía/logotipo, biografía, intereses/géneros, visibilidad, contacto público, obras recomendadas de Editorial, cambio verificado de correo, cambio de contraseña con invalidación de otras sesiones, solicitudes institucionales y desactivación. Esas acciones requieren decisiones de producto y ampliaciones de base de datos.

La migración y el recorrido completo no están probados contra el Supabase compartido; no considerarlos desplegados hasta ejecutar el SQL y probar con cuentas reales de los tres tipos.
