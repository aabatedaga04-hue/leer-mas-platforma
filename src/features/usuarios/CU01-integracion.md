# CU01 — Contrato de integración para el equipo

La implementación de interfaz y estado de sesión pertenece a `src/features/usuarios/`. `src/App.jsx` conserva su función de orquestador: conecta el proveedor de sesión, agrega las rutas de CU01 y muestra la navegación según estado/rol. `src/main.jsx`, `src/supabaseClient.js` y `database/schema_LEER_supabase.sql` permanecen iguales a `main`.

## Excepciones compartidas que requieren revisión

- `database/cu01_autenticacion_registro.sql`: amplía el esquema base, agrega el alta desde Auth, documentos privados y funciones para el registro. Es obligatorio también para un proyecto nuevo, después del esquema base.
- Las cuentas Biblioteca y Editorial representan exclusivamente a la institución. Biblioteca solicita nombre institucional, CUIT y dirección; Editorial solicita nombre de fantasía, razón social y CUIT. Ninguna solicita ni almacena nombre/apellido de una persona como identidad de la cuenta.
- `database/cu01_politicas_transversales.sql`: modifica políticas RLS de Contenido y Bibliotecas para impedir que cuentas institucionales pendientes utilicen sus funciones. Los responsables de esos módulos deben revisar esas políticas. Ambos scripts se aplican juntos, en orden, antes de permitir registros.
- `supabase/functions/registro-institucional/`: la ubicación la exige el despliegue de Supabase Edge Functions. No usa el archivo `src/supabaseClient.js` ni expone credenciales administrativas al navegador.

`database/cu01_mejoras_registro.sql` solo actualiza una instalación que ya recibió una versión anterior del primer script; no se ejecuta sobre la versión actual.

## Estado de verificación

Lint y compilación local verificados. Siguen pendientes la aplicación de los scripts, el despliegue de la función y las pruebas reales de registro, verificación de correo, inicio de sesión, recuperación y cuentas institucionales en el Supabase compartido. No integrar a `main` como funcionalidad terminada hasta revisar estas dependencias y probar el flujo completo.
