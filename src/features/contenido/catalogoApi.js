/**
 * Capa de acceso a datos del módulo Contenido (CU03 Buscar Obras / CU04 Ficha de Obra).
 *
 * Separada de los componentes para que las consultas se puedan testear y
 * reutilizar sin montar React. Todos los nombres de tabla y columna salen de
 * schema_LEERplus_supabase.sql.
 *
 * Modelo de obras (herencia por tabla):
 *   obra    -> superclase: id_obra, titulo, genero, sinopsis,
 *              fecha_publicacion, promedio_calificacion
 *   escrito -> subtipo autopublicado: id_obra (PK/FK), id_autor, contenido_url
 *   libro   -> subtipo cacheado de Google Books: id_obra (PK/FK),
 *              google_books_id, autor_texto, isbn, portada_url
 *
 * El "tipo de obra" no es una columna: se deduce de qué subtipo tiene fila.
 */

import { supabase } from '../../supabaseClient'

export const TIPO_OBRA = {
  TODOS: 'todos',
  ESCRITO: 'escrito',
  LIBRO: 'libro',
}

export const ORDEN = {
  TITULO: 'titulo',
  RECIENTES: 'recientes',
  MEJOR_CALIFICADAS: 'mejor_calificadas',
}

export const RESULTADOS_POR_PAGINA = 12

/**
 * Las búsquedas y la ficha se apoyan en `vista_obra_busqueda` (ver
 * database/vista_obra_busqueda.sql), que aplana obra + escrito + libro + autor.
 *
 * El motivo es el filtro por autor: en el modelo normalizado el autor está en
 * libro.autor_texto o en lector_escritor.apodo según el subtipo, y filtrar por
 * ambos a la vez exigiría un OR entre dos tablas embebidas, que PostgREST no
 * expresa. Con la vista, `autor` es una columna común y alcanza un ILIKE.
 */
const VISTA = 'vista_obra_busqueda'
const CAMPOS_VISTA =
  'id_obra, titulo, genero, sinopsis, fecha_publicacion, promedio_calificacion, ' +
  'tipo, autor, google_books_id, isbn, portada_url, id_autor, contenido_url'

/** Error de dominio: mensaje ya listo para mostrarle al usuario. */
export class CatalogoError extends Error {
  constructor(message, { cause = null } = {}) {
    super(message)
    this.name = 'CatalogoError'
    this.cause = cause
  }
}

function traducirErrorSupabase(error, accion) {
  // Sin conexión o con las variables VITE_SUPABASE_* mal cargadas, supabase-js
  // devuelve un TypeError de fetch sin código.
  if (!error?.code && /fetch|network/i.test(error?.message ?? '')) {
    return new CatalogoError(
      'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
      { cause: error },
    )
  }

  // 42P01 / PGRST205: la vista todavía no se creó en la base.
  if (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    new RegExp(VISTA).test(error?.message ?? '')
  ) {
    return new CatalogoError(
      `Falta crear ${VISTA} en Supabase. Corré database/vista_obra_busqueda.sql en el SQL Editor.`,
      { cause: error },
    )
  }

  return new CatalogoError(`No se pudo ${accion}. ${error?.message ?? ''}`.trim(), {
    cause: error,
  })
}

/** Aplana una fila de la vista a la forma que usa la UI. */
export function normalizarObra(fila) {
  if (!fila) return null

  return {
    id: fila.id_obra,
    titulo: fila.titulo,
    genero: fila.genero,
    sinopsis: fila.sinopsis,
    fechaPublicacion: fila.fecha_publicacion,
    promedioCalificacion: Number(fila.promedio_calificacion ?? 0),
    tipo: fila.tipo ?? null,
    autor: fila.autor ?? null,
    portadaUrl: fila.portada_url ?? null,
    googleBooksId: fila.google_books_id ?? null,
    isbn: fila.isbn ?? null,
    idAutor: fila.id_autor ?? null,
    contenidoUrl: fila.contenido_url ?? null,
  }
}

/**
 * PostgREST devuelve las relaciones uno-a-uno como objeto, pero según cómo
 * infiera la cardinalidad puede mandar un array de un elemento. Normalizamos.
 * (Sigue haciendo falta para el embed de reseñas, que no pasa por la vista.)
 */
function unoSolo(valor) {
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

/** Escapa los comodines de LIKE para que un `%` tipeado no barra todo el catálogo. */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, '\\$&')
}

function aplicarOrden(consulta, orden) {
  switch (orden) {
    case ORDEN.RECIENTES:
      return consulta.order('fecha_publicacion', { ascending: false })
    case ORDEN.MEJOR_CALIFICADAS:
      return consulta
        .order('promedio_calificacion', { ascending: false })
        .order('titulo', { ascending: true })
    default:
      return consulta.order('titulo', { ascending: true })
  }
}

/**
 * CU03 — Búsqueda paginada con filtros combinados.
 *
 * Paginación por offset (`.range`) en lugar de scroll infinito: Supabase
 * devuelve el total exacto en la misma llamada con { count: 'exact' }, así que
 * sale gratis mostrar "N resultados" y saltar de página sin estado de cursor.
 *
 * El filtro por autor cubre escritos y libros por igual: en la vista `autor` ya
 * resuelve el COALESCE entre libro.autor_texto y lector_escritor.apodo.
 *
 * @returns {Promise<{obras: Array, total: number}>}
 */
export async function buscarObras({
  titulo = '',
  autor = '',
  genero = '',
  tipo = TIPO_OBRA.TODOS,
  orden = ORDEN.TITULO,
  pagina = 1,
  porPagina = RESULTADOS_POR_PAGINA,
  signal,
} = {}) {
  const tituloBuscado = titulo.trim()
  const autorBuscado = autor.trim()

  let consulta = supabase.from(VISTA).select(CAMPOS_VISTA, { count: 'exact' })

  if (tituloBuscado) {
    consulta = consulta.ilike('titulo', `%${escaparLike(tituloBuscado)}%`)
  }

  if (autorBuscado) {
    consulta = consulta.ilike('autor', `%${escaparLike(autorBuscado)}%`)
  }

  if (genero) {
    consulta = consulta.eq('genero', genero)
  }

  if (tipo === TIPO_OBRA.ESCRITO || tipo === TIPO_OBRA.LIBRO) {
    consulta = consulta.eq('tipo', tipo)
  }

  const desde = (pagina - 1) * porPagina
  consulta = aplicarOrden(consulta, orden).range(desde, desde + porPagina - 1)

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error, count } = await consulta

  if (error) {
    if (error.name === 'AbortError' || error.code === '20') {
      const abortado = new Error('Búsqueda cancelada')
      abortado.name = 'AbortError'
      throw abortado
    }
    throw traducirErrorSupabase(error, 'completar la búsqueda')
  }

  return {
    obras: (data ?? []).map(normalizarObra),
    total: count ?? 0,
  }
}

/**
 * Géneros presentes en el catálogo, para poblar el filtro.
 * Postgres tiene DISTINCT pero PostgREST no lo expone, así que traemos la
 * columna y deduplicamos acá. Aceptable con el volumen de obras previsto.
 */
export async function obtenerGeneros({ signal } = {}) {
  let consulta = supabase
    .from(VISTA)
    .select('genero')
    .not('genero', 'is', null)
    .order('genero', { ascending: true })
    .limit(1000)

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) throw traducirErrorSupabase(error, 'cargar los géneros')

  return [...new Set((data ?? []).map((fila) => fila.genero).filter(Boolean))]
}

/** CU04 — Datos locales de una obra puntual. Devuelve null si no existe. */
export async function obtenerObraPorId(idObra, { signal } = {}) {
  let consulta = supabase.from(VISTA).select(CAMPOS_VISTA).eq('id_obra', idObra).maybeSingle()

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) throw traducirErrorSupabase(error, 'cargar la obra')

  return normalizarObra(data)
}

/**
 * CU04 — Reseñas visibles de una obra.
 *
 * La RLS de `resena` ya filtra a estado 'activa' (o las propias), pero lo
 * dejamos explícito para que la intención se lea en el código.
 */
export async function obtenerResenasDeObra(idObra, { limite = 20, signal } = {}) {
  let consulta = supabase
    .from('resena')
    .select(
      'id_resena, id_usuario, calificacion, comentario, fecha_creacion, fecha_edicion, lector_escritor ( apodo )',
    )
    .eq('id_obra', idObra)
    .eq('estado', 'activa')
    .order('fecha_creacion', { ascending: false })
    .limit(limite)

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) throw traducirErrorSupabase(error, 'cargar las reseñas')

  return (data ?? []).map((fila) => ({
    id: fila.id_resena,
    idUsuario: fila.id_usuario,
    calificacion: fila.calificacion,
    comentario: fila.comentario,
    fechaCreacion: fila.fecha_creacion,
    fechaEdicion: fila.fecha_edicion,
    // null para reseñas ajenas por la RLS de lector_escritor.
    autor: unoSolo(fila.lector_escritor)?.apodo ?? null,
  }))
}

/**
 * Dado un lote de ids de Google Books, devuelve un Map googleBooksId -> id_obra
 * con los que ya están catalogados. Sirve para marcar en los resultados de la
 * búsqueda externa cuáles ya existen en LEER+.
 */
export async function buscarCatalogadosPorGoogleIds(googleBooksIds, { signal } = {}) {
  const ids = [...new Set((googleBooksIds ?? []).filter(Boolean))]
  if (ids.length === 0) return new Map()

  let consulta = supabase.from('libro').select('id_obra, google_books_id').in('google_books_id', ids)
  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  // No es crítico: si falla, los resultados se muestran sin la marca.
  if (error) return new Map()

  return new Map((data ?? []).map((fila) => [fila.google_books_id, fila.id_obra]))
}

/** Recorta a los límites VARCHAR del schema para no chocar con un error 22001. */
function recortar(texto, maximo) {
  if (!texto) return null
  const limpio = String(texto).trim()
  if (!limpio) return null
  return limpio.length > maximo ? limpio.slice(0, maximo) : limpio
}

/**
 * CU03 — Alta de un Libro al catálogo local desde un volumen de Google Books.
 *
 * Delega en la función fn_catalogar_libro (ver database/fn_catalogar_libro.sql):
 * `obra` no tiene policy de INSERT, y hacer los dos inserts por separado desde
 * el cliente no sería atómico.
 *
 * @returns {Promise<number>} id_obra del libro catalogado (o del ya existente).
 */
export async function catalogarLibro(volumen) {
  const { data, error } = await supabase.rpc('fn_catalogar_libro', {
    p_google_books_id: recortar(volumen.googleBooksId, 50),
    p_titulo: recortar(volumen.titulo, 255) ?? 'Sin título',
    p_autor_texto: recortar(volumen.autorTexto, 255),
    p_genero: recortar(volumen.categorias?.[0], 100),
    p_sinopsis: volumen.sinopsis ?? null,
    p_isbn: recortar(volumen.isbn, 20),
    p_portada_url: recortar(volumen.portadaUrl, 500),
  })

  if (error) {
    // 42501 lo levanta la propia función cuando no hay sesión; 42883 es que
    // todavía no se corrió el script SQL en Supabase.
    if (error.code === '42501') {
      throw new CatalogoError('Necesitás iniciar sesión para agregar libros al catálogo.', {
        cause: error,
      })
    }
    if (error.code === '42883' || /function .*fn_catalogar_libro/i.test(error.message ?? '')) {
      throw new CatalogoError(
        'Falta instalar la función fn_catalogar_libro en Supabase. Corré database/fn_catalogar_libro.sql en el SQL Editor.',
        { cause: error },
      )
    }
    throw traducirErrorSupabase(error, 'agregar el libro al catálogo')
  }

  return data
}

/**
 * CU04 — Disponibilidad en bibliotecas. Solo aplica a Libros: `ejemplar.id_libro`
 * referencia `libro(id_obra)`, los Escritos no tienen copias físicas.
 *
 * No traemos el nombre de la biblioteca: la RLS de `biblioteca` solo permite
 * leer la fila propia, así que el join volvería vacío.
 */
export async function obtenerDisponibilidad(idLibro, { signal } = {}) {
  let consulta = supabase
    .from('ejemplar')
    .select('id_ejemplar, estado, ubicacion')
    .eq('id_libro', idLibro)

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) throw traducirErrorSupabase(error, 'cargar la disponibilidad')

  const ejemplares = data ?? []
  return {
    total: ejemplares.length,
    disponibles: ejemplares.filter((e) => e.estado === 'disponible').length,
    prestados: ejemplares.filter((e) => e.estado === 'prestado').length,
  }
}
