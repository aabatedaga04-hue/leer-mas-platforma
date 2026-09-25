# LEER+

Plataforma web de la Fundación Literaria Comunitaria para descubrir obras, publicar escritos y conectar lectores-escritores, bibliotecas y editoriales.

## Requisitos

- Node.js 20 o superior.
- Un proyecto de Supabase con autenticación por correo habilitada.
- Una clave de Google Books API para probar el catálogo externo.

## Configuración local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` como `.env.local` y completar:

   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_GOOGLE_BOOKS_API_KEY=
   ```

   `.env.local` está excluido de Git y nunca debe subirse al repositorio.

3. Iniciar el proyecto:

   ```bash
   npm run dev
   ```

## Base de datos

- Proyecto nuevo: ejecutar `database/schema_LEER_supabase.sql`.
- Proyecto que ya tiene el esquema anterior: ejecutar `database/cu01_autenticacion_registro.sql`.
- Los demás scripts de `database/` agregan funciones, vistas y datos del catálogo.

Para el CU01, configurar en Supabase Auth:

- Confirmación de correo habilitada.
- URL local permitida: `http://localhost:5173/**`.
- URL de recuperación local: `http://localhost:5173/restablecer-contrasena`.
- Contraseña mínima del servidor de al menos 8 caracteres. La aplicación además exige una mayúscula, una minúscula y un carácter especial.

El registro consulta el catálogo público de CountriesNow para ofrecer países, prefijos telefónicos y localidades normalizadas. No requiere una clave adicional y muestra un error recuperable si el servicio no está disponible.

El script crea el bucket privado `documentacion-institucional`. Cada Biblioteca o Editorial debe verificar su correo y adjuntar exactamente dos archivos PDF de hasta 10 MB antes de generar su solicitud.

## Verificación antes de publicar una rama

```bash
npm run lint
npm run build
```

El trabajo debe realizarse en ramas `feature/...` creadas desde un `main` actualizado. La integración a `main` se hace mediante Pull Request revisado por el equipo.
