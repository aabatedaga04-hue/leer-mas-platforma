# CU02 — Gestión de perfil, etapa 2

## Alcance implementado

Esta etapa incorpora a `/vista-previa-cu02` la propuesta de perfil público, todavía sin persistencia en Supabase:

- fotografía para la cuenta personal y logotipo para Biblioteca o Editorial;
- biografía breve o descripción institucional;
- géneros literarios para Lector-Escritor y géneros de interés para Editorial;
- intereses de lectura para el perfil único `lector_escritor`;
- horarios de atención para Biblioteca;
- visibilidad general del perfil y visibilidad de ciudad/país;
- edición individual por campo, con los mismos patrones de la etapa 1;
- validación de imágenes JPG, PNG o WebP de hasta 5 MB;
- límites de longitud y de ocho selecciones por grupo;
- variantes revisables para Lector-Escritor, Biblioteca y Editorial.

La imagen se transforma en una URL de datos únicamente para sostener la previsualización del navegador. No se sube ningún archivo ni se escribe información en Supabase.

## Decisión vigente de producto

`lector_escritor` es un único tipo de cuenta personal. No se presenta una elección excluyente entre Lector y Autor: la misma cuenta puede leer, reseñar y publicar. Por eso intereses lectores y presentación como escritor conviven en un solo perfil.

Esta decisión reemplaza, para la implementación, los fragmentos antiguos del CU02 que describen Lector y Autor como roles que se agregan o desactivan por separado. Antes de la entrega final se debe reflejar la unificación en la especificación funcional y en el DER.

## Persistencia pendiente de acordar

Antes de escribir la migración de esta etapa se debe acordar con el equipo el modelo de datos. La propuesta recomendada es mantener la información pública separada de `usuario`:

- `perfil_publico`: relación 1 a 1 con `usuario`, con biografía/descripción, ruta de imagen y banderas de visibilidad;
- catálogos normalizados de géneros e intereses;
- tablas asociativas entre perfil y género/interés;
- horario institucional en el perfil de Biblioteca;
- bucket de Storage con políticas que impidan escribir archivos de otras cuentas.

No conviene guardar géneros e intereses como texto libre ni como una lista embebida sin aprobar antes el cambio del DER. Tampoco se debe usar una URL pública de imagen como única barrera de privacidad.

## Validación antes de integrar

1. Revisar visualmente las tres variantes en `/vista-previa-cu02`.
2. Confirmar con el equipo si la cuenta de Biblioteca representa solo a la institución o si conserva nombre y apellido privados de una persona autorizada. La documentación actual y el formulario de CU01 no son consistentes en este punto.
3. Aprobar formatos, peso máximo y criterio de visibilidad de imágenes.
4. Actualizar DER y documentación funcional.
5. Recién entonces crear la migración y conectar esta etapa con Supabase.

La etapa 1 continúa siendo la única parte conectable mediante `database/cu02_perfil_basico.sql`. CU02 no debe integrarse antes de CU01.
