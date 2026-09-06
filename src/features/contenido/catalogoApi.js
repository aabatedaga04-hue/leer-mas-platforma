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
import { generoDesdeCategorias } from './generos'
import { buscarVolumenes, esMismaObra } from '../../services/googleBooksApi'
import { buscarPrimeraPublicacion } from '../../services/openLibraryApi'

export const TIPO_OBRA = {
  TODOS: 'todos',
  ESCRITO: 'escrito',
  LIBRO: 'libro',
}

export const ORDEN = {
  TITULO: 'titulo',
  ANIO: 'anio',
  CALIFICACION: 'calificacion',
}

export const DIRECCION = { ASC: 'asc', DESC: 'desc' }

/**
 * Dirección con la que arranca cada criterio, que es la que se espera al
 * elegirlo: los títulos de la A a la Z, y los años y las calificaciones de
 * mayor a menor. Desde ahí el usuario la invierte con el botón.
 */
export const DIRECCION_POR_DEFECTO = {
  [ORDEN.TITULO]: DIRECCION.ASC,
  [ORDEN.ANIO]: DIRECCION.DESC,
  [ORDEN.CALIFICACION]: DIRECCION.DESC,
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
  'tipo, autor, google_books_id, isbn, portada_url, id_autor, contenido_url, ' +
  'fecha_publicacion_original, estado, idioma, editorial_texto, fragmento, ' +
  'perfil_publico, etiquetas'

/** Error de dominio: mensaje ya listo para mostrarle al usuario. */
export class CatalogoError extends Error {
  constructor(message, { cause = null } = {}) {
    super(message)
    this.name = 'CatalogoError'
    this.cause = cause
  }
}

/**
 * ¿La consulta se canceló?
 *
 * supabase-js no repropaga el AbortError del fetch: lo envuelve en un objeto
 * plano `{ message: 'AbortError: signal is aborted without reason', code: '' }`,
 * sin `name` ni código, así que mirar `error.name` no alcanza. Lo confiable es
 * consultar el propio signal; el resto son redes de seguridad.
 *
 * Importa porque React monta los efectos dos veces en desarrollo: la primera
 * consulta siempre se aborta, y si eso se toma por un fallo real el catálogo
 * muestra un error apenas se abre, sin que nadie haya buscado nada.
 */
function fueCancelada(error, signal) {
  return (
    Boolean(signal?.aborted) ||
    error?.name === 'AbortError' ||
    error?.code === '20' ||
    /abort/i.test(error?.message ?? '')
  )
}

/** Error de cancelación con la forma que espera quien llama (`name === 'AbortError'`). */
function errorDeCancelacion() {
  const cancelado = new Error('Consulta cancelada')
  cancelado.name = 'AbortError'
  return cancelado
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

  // 42P01 la vista no existe, PGRST204/205 falta una columna que la app pide:
  // en los dos casos la base está atrasada respecto de las migraciones.
  if (
    error?.code === '42P01' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    new RegExp(VISTA).test(error?.message ?? '') ||
    /does not exist/i.test(error?.message ?? '')
  ) {
    return new CatalogoError(
      'La base está desactualizada. Corré los scripts de database/ en el SQL Editor, ' +
        'en el orden que indica cada encabezado (el último es ficha_obra_completa.sql).',
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
    // Dos hechos distintos: el alta en la plataforma (relevante para los
    // escritos) y la publicación de la obra (lo que importa en un libro).
    fechaPublicacion: fila.fecha_publicacion,
    fechaPublicacionOriginal: fila.fecha_publicacion_original ?? null,
    promedioCalificacion: Number(fila.promedio_calificacion ?? 0),
    tipo: fila.tipo ?? null,
    autor: fila.autor ?? null,
    portadaUrl: fila.portada_url ?? null,
    googleBooksId: fila.google_books_id ?? null,
    isbn: fila.isbn ?? null,
    idAutor: fila.id_autor ?? null,
    // La ficha publica nunca expone contenidoUrl: solo el fragmento autorizado.
    contenidoUrl: fila.contenido_url ?? null,
    fragmento: fila.fragmento ?? null,
    estado: fila.estado ?? null,
    idioma: fila.idioma ?? null,
    editorial: fila.editorial_texto ?? null,
    // null para libros: su autoria es texto, no un usuario de la plataforma.
    perfilAutorPublico: fila.perfil_publico ?? null,
    etiquetas: fila.etiquetas ?? [],
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

function aplicarOrden(consulta, orden, direccion) {
  const ascendente = direccion === DIRECCION.ASC

  switch (orden) {
    case ORDEN.ANIO:
      // `anio_publicacion` unifica el año de la obra (libros) con el del alta
      // en la plataforma (escritos). nullsFirst: false deja las obras sin año
      // al final en las dos direcciones, en vez de encabezar el listado.
      return consulta
        .order('anio_publicacion', { ascending: ascendente, nullsFirst: false })
        .order('titulo', { ascending: true })
    case ORDEN.CALIFICACION:
      return consulta
        .order('promedio_calificacion', { ascending: ascendente })
        .order('titulo', { ascending: true })
    default:
      return consulta.order('titulo', { ascending: ascendente })
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
  direccion = DIRECCION.ASC,
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
  consulta = aplicarOrden(consulta, orden, direccion).range(desde, desde + porPagina - 1)

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error, count } = await consulta

  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
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
  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
    throw traducirErrorSupabase(error, 'cargar los géneros')
  }

  return [...new Set((data ?? []).map((fila) => fila.genero).filter(Boolean))]
}

/** CU04 — Datos locales de una obra puntual. Devuelve null si no existe. */
export async function obtenerObraPorId(idObra, { signal } = {}) {
  let consulta = supabase.from(VISTA).select(CAMPOS_VISTA).eq('id_obra', idObra).maybeSingle()

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
    throw traducirErrorSupabase(error, 'cargar la obra')
  }

  return normalizarObra(data)
}

/** Nombre reservado de la lista que hace de Favoritos (ver ficha_obra_completa.sql). */
export const LISTA_FAVORITOS = 'Favoritos'

/**
 * Perfil del usuario de la sesión: id y rol. Devuelve null si no hay sesión.
 *
 * El rol sale de `usuario.tipo_usuario`, cuya RLS solo permite leer la fila
 * propia — que es exactamente lo que hace falta para decidir qué acciones
 * mostrar en la ficha.
 */
export async function obtenerPerfilActual({ signal } = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let consulta = supabase
    .from('usuario')
    .select('id_usuario, tipo_usuario, estado')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error || !data) {
    // Sesión sin fila de perfil: se trata como usuario sin rol conocido.
    return { id: user.id, tipo: null, estado: null }
  }
  return { id: data.id_usuario, tipo: data.tipo_usuario, estado: data.estado }
}

/** Listas personales del usuario, sin la reservada de favoritos. */
export async function obtenerListasDelUsuario({ signal } = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let consulta = supabase
    .from('lista_personal')
    .select('id_lista, nombre')
    .eq('id_usuario', user.id)
    .neq('nombre', LISTA_FAVORITOS)
    .order('nombre')

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) return []
  return (data ?? []).map((fila) => ({ id: fila.id_lista, nombre: fila.nombre }))
}

/** Agrega la obra a una lista existente. Silencioso si ya estaba (PK duplicada). */
export async function agregarObraALista(idLista, idObra) {
  const { error } = await supabase.from('lista_obra').insert({ id_lista: idLista, id_obra: idObra })
  if (error && error.code !== '23505') {
    throw traducirErrorSupabase(error, 'agregar la obra a la lista')
  }
}

/** CU04 — Alta de un ejemplar por parte de una biblioteca. */
export async function registrarEjemplar({ idLibro, codigoInterno, ubicacion }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new CatalogoError('Necesitás iniciar sesión.')

  const { error } = await supabase.from('ejemplar').insert({
    id_biblioteca: user.id,
    id_libro: idLibro,
    codigo_interno: codigoInterno.trim(),
    ubicacion: ubicacion?.trim() || null,
  })

  // UNIQUE (id_biblioteca, codigo_interno)
  if (error?.code === '23505') {
    throw new CatalogoError('Ya tenés un ejemplar con ese código interno.')
  }
  if (error) throw traducirErrorSupabase(error, 'registrar el ejemplar')
}

/** CU04 — Alta/baja de la obra en las recomendadas de una editorial. */
export async function alternarRecomendada(idObra, estaRecomendada) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new CatalogoError('Necesitás iniciar sesión.')

  if (estaRecomendada) {
    const { error } = await supabase
      .from('editorial_obra_recomendada')
      .delete()
      .eq('id_editorial', user.id)
      .eq('id_obra', idObra)
    if (error) throw traducirErrorSupabase(error, 'quitar de recomendadas')
    return false
  }

  // El PK (id_editorial, id_obra) ya impide duplicados.
  const { error } = await supabase
    .from('editorial_obra_recomendada')
    .insert({ id_editorial: user.id, id_obra: idObra })
  if (error && error.code !== '23505') {
    throw traducirErrorSupabase(error, 'agregar a recomendadas')
  }
  return true
}

/** ¿La editorial de la sesión ya recomienda esta obra? */
export async function estaRecomendadaPorEditorial(idObra, idEditorial, { signal } = {}) {
  if (!idEditorial) return false
  let consulta = supabase
    .from('editorial_obra_recomendada')
    .select('id_obra')
    .eq('id_editorial', idEditorial)
    .eq('id_obra', idObra)
    .maybeSingle()

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) return false
  return Boolean(data)
}

/**
 * Da forma de obra a un volumen externo, para que el resto de la app lo trate
 * igual que a una del catálogo. `id` en null es lo que marca que todavía no
 * tiene fila en la base.
 */
export function obraDesdeVolumen(volumen) {
  return {
    id: null,
    titulo: volumen.titulo,
    // Las categorías externas son BISAC, en inglés: se traducen al vocabulario
    // de la plataforma, igual que al catalogar.
    genero: generoDesdeCategorias(volumen.categorias),
    sinopsis: volumen.sinopsis,
    // Todavía no hay alta en la plataforma; la fecha que existe es la de la obra.
    fechaPublicacion: null,
    fechaPublicacionOriginal: volumen.fechaPublicacion,
    promedioCalificacion: 0,
    tipo: TIPO_OBRA.LIBRO,
    autor: volumen.autorTexto,
    portadaUrl: volumen.portadaUrl,
    googleBooksId: volumen.googleBooksId,
    isbn: volumen.isbn,
    idAutor: null,
    contenidoUrl: null,
    fragmento: null,
    estado: 'publicada',
    idioma: volumen.idioma,
    editorial: volumen.editorial,
    perfilAutorPublico: null,
    // La primera categoría ya se usó como género; el resto son etiquetas.
    etiquetas: (volumen.categorias ?? []).slice(1),
  }
}

/**
 * CU04 — Más del autor.
 *
 * Solo otras obras de la misma autoría. Antes completaba con el mismo género y
 * eso hacía que todas las obras del catálogo aparecieran relacionadas entre sí:
 * con pocas obras cargadas, compartir "Novela" no dice nada.
 *
 * Empieza por el catálogo local y completa con la fuente externa, así el autor
 * tiene obras para mostrar aunque solo una esté catalogada.
 */
export async function obtenerObrasRelacionadas(
  obra,
  { limite = 6, incluirExternas = true, signal } = {},
) {
  if (!obra?.autor) return []

  let consulta = supabase
    .from(VISTA)
    .select(CAMPOS_VISTA)
    .eq('estado', 'publicada')
    .ilike('autor', `%${escaparLike(obra.autor)}%`)
    .limit(limite)

  // Sin id la obra no está en el catálogo: no hay nada que excluir.
  if (obra.id) consulta = consulta.neq('id_obra', obra.id)
  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta

  let locales = []
  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
    // Sección accesoria: si la consulta falla, se sigue con lo externo.
  } else {
    locales = (data ?? []).map(normalizarObra)
  }

  if (locales.length >= limite || !incluirExternas) return locales

  return [...locales, ...(await relacionadasExternas(obra, locales, limite - locales.length, signal))]
}


/**
 * Completa las recomendaciones con obras que todavía no están en el catálogo.
 *
 * Se buscan por autor y no por género: `inauthor:` da otras obras de la misma
 * persona, que es una recomendación defendible, mientras que las categorías de
 * Google son demasiado amplias ("Fiction") para recomendar algo pertinente.
 *
 * Nunca lanza: es una sección accesoria de la ficha.
 */
async function relacionadasExternas(obra, locales, faltan, signal) {
  if (!obra.autor) return []

  // Solo el primer autor. `autor_texto` suele arrastrar a los editores de la
  // edición ("Julio Cortázar, Julio Ortega, Saúl Yurkiévich"), y buscar por la
  // cadena entera devuelve la obra académica de esos editores en vez de la del
  // autor que se está mirando.
  const autorPrincipal = obra.autor.split(',')[0].trim()
  if (!autorPrincipal) return []

  try {
    const { resultados } = await buscarVolumenes(`inauthor:${autorPrincipal}`, {
      maxResultados: (faltan + locales.length + 2) * 2, // margen para los descartes
      signal,
    })
    if (!resultados.length) return []

    // Descarta las que ya están en el catálogo por id exacto...
    const catalogadas = await buscarCatalogadosPorGoogleIds(
      resultados.map((v) => v.googleBooksId),
      { signal },
    )

    const esRepetida = (volumen) => {
      const ficha = { titulo: volumen.titulo, autor: volumen.autorTexto }
      // ...la obra que se está mirando, y las que ya aparecen más arriba. El
      // cruce por id no alcanza: otra edición del mismo libro trae otro id.
      if (esMismaObra({ titulo: obra.titulo, autor: obra.autor }, ficha)) return true
      return locales.some((l) => esMismaObra({ titulo: l.titulo, autor: l.autor }, ficha))
    }

    return resultados
      .filter((v) => !catalogadas.has(v.googleBooksId) && !esRepetida(v))
      .slice(0, faltan)
      // Se conserva el volumen original: la ficha lo recibe por el state del
      // enlace y no tiene que volver a pedirlo ni perder la fusión de ediciones.
      .map((volumen) => ({ ...obraDesdeVolumen(volumen), volumen }))
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return []
  }
}

/**
 * CU04 — Registro de la visita, para métricas agregadas.
 *
 * Entra por una función SECURITY DEFINER: `visualizacion_obra` no tiene policies
 * y queda cerrada a la API, porque quién miró qué obra es dato sensible. Las
 * visitas anónimas también cuentan.
 *
 * Nunca lanza: una métrica que falla no puede romper la ficha.
 */
export async function registrarVisualizacion(idObra) {
  if (!idObra) return
  try {
    await supabase.rpc('fn_registrar_visualizacion', { p_id_obra: Number(idObra) })
  } catch {
    // sin efecto para el usuario
  }
}

/**
 * CU04 — Favoritos, modelados como una `lista_personal` de nombre reservado.
 *
 * Devuelve si la obra está en favoritos del usuario actual, o null si no hay
 * sesión (la acción no aplica).
 */
export async function estaEnFavoritos(idObra, { signal } = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let consulta = supabase
    .from('lista_obra')
    .select('id_obra, lista_personal!inner ( id_usuario, nombre )')
    .eq('id_obra', idObra)
    .eq('lista_personal.id_usuario', user.id)
    .eq('lista_personal.nombre', LISTA_FAVORITOS)
    .maybeSingle()

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
    return false
  }
  return Boolean(data)
}

/** Crea la lista de favoritos del usuario si todavía no existe, y devuelve su id. */
async function obtenerListaFavoritos(idUsuario) {
  const { data: existente } = await supabase
    .from('lista_personal')
    .select('id_lista')
    .eq('id_usuario', idUsuario)
    .eq('nombre', LISTA_FAVORITOS)
    .maybeSingle()

  if (existente) return existente.id_lista

  const { data, error } = await supabase
    .from('lista_personal')
    .insert({ id_usuario: idUsuario, nombre: LISTA_FAVORITOS })
    .select('id_lista')
    .single()

  if (error) throw traducirErrorSupabase(error, 'crear la lista de favoritos')
  return data.id_lista
}

/**
 * Agrega o quita la obra de favoritos y devuelve el estado resultante.
 * El PK (id_lista, id_obra) de `lista_obra` ya impide duplicados.
 */
export async function alternarFavorito(idObra, estaGuardada) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new CatalogoError('Necesitás iniciar sesión para usar favoritos.')
  }

  const idLista = await obtenerListaFavoritos(user.id)

  if (estaGuardada) {
    const { error } = await supabase
      .from('lista_obra')
      .delete()
      .eq('id_lista', idLista)
      .eq('id_obra', idObra)
    if (error) throw traducirErrorSupabase(error, 'quitar de favoritos')
    return false
  }

  const { error } = await supabase.from('lista_obra').insert({ id_lista: idLista, id_obra: idObra })
  // 23505: ya estaba en la lista. El resultado buscado igual se cumple.
  if (error && error.code !== '23505') {
    throw traducirErrorSupabase(error, 'agregar a favoritos')
  }
  return true
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
  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
    throw traducirErrorSupabase(error, 'cargar las reseñas')
  }

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
 * Año de primera publicación de la obra.
 *
 * Se pregunta a Open Library, que modela la obra aparte de sus ediciones. La
 * respuesta se valida contra el título y el autor que ya conocemos, porque la
 * búsqueda devuelve el resultado más relevante sin garantizar que sea el mismo
 * libro. Si no hay coincidencia o la fuente no responde, se cae a la edición más
 * antigua que conoce Google, que es peor pero es algo.
 *
 * Exportada para poder reutilizarla al mostrar una obra que todavía no está en
 * el catálogo.
 */
export async function resolverAnioPublicacion(volumen, { signal } = {}) {
  try {
    const candidato = await buscarPrimeraPublicacion(
      { titulo: volumen.titulo, autor: volumen.autores?.[0] ?? volumen.autorTexto, isbn: volumen.isbn },
      { signal },
    )

    if (
      candidato &&
      esMismaObra(
        { titulo: volumen.titulo, autor: volumen.autorTexto },
        { titulo: candidato.titulo, autor: candidato.autor },
      )
    ) {
      return candidato.anio
    }
  } catch (error) {
    if (error.name === 'AbortError') throw error
    // Dato accesorio: nunca debe impedir catalogar ni mostrar la obra.
  }

  return volumen.fechaPublicacion ?? null
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
  const anioPublicacion = await resolverAnioPublicacion(volumen)

  const { data, error } = await supabase.rpc('fn_catalogar_libro', {
    p_google_books_id: recortar(volumen.googleBooksId, 50),
    p_titulo: recortar(volumen.titulo, 255) ?? 'Sin título',
    p_autor_texto: recortar(volumen.autorTexto, 255),
    // Traducido antes de guardar: las categorías externas son BISAC, en inglés.
    // Guardar el valor crudo dejaba géneros "Fiction" conviviendo con "Novela"
    // y el filtro del catálogo mezclando dos idiomas.
    p_genero: recortar(generoDesdeCategorias(volumen.categorias), 100),
    p_sinopsis: volumen.sinopsis ?? null,
    p_isbn: recortar(volumen.isbn, 20),
    p_portada_url: recortar(volumen.portadaUrl, 500),
    p_fecha_publicacion_original: recortar(anioPublicacion, 10),
    p_idioma: recortar(volumen.idioma, 10),
    p_editorial_texto: recortar(volumen.editorial, 150),
    // La primera categoría ya se usó como género; el resto quedan como etiquetas.
    p_etiquetas: (volumen.categorias ?? []).slice(1).map((c) => recortar(c, 60)).filter(Boolean),
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
 * Trae el nombre de cada biblioteca, no solo el conteo: saber *dónde* hay una
 * copia es el dato útil de la ficha. El join se apoya en la policy
 * `biblioteca_select_publico` del schema; sin ella volvería vacío.
 *
 * @returns {Promise<{total, disponibles, prestados, bibliotecas: Array}>}
 */
export async function obtenerDisponibilidad(idLibro, { signal } = {}) {
  let consulta = supabase
    .from('ejemplar')
    .select('id_ejemplar, estado, ubicacion, id_biblioteca, biblioteca ( nombre, direccion )')
    .eq('id_libro', idLibro)

  if (signal) consulta = consulta.abortSignal(signal)

  const { data, error } = await consulta
  if (error) {
    if (fueCancelada(error, signal)) throw errorDeCancelacion()
    throw traducirErrorSupabase(error, 'cargar la disponibilidad')
  }

  const ejemplares = data ?? []

  // Un mismo libro puede tener varias copias en la misma biblioteca: se agrupa
  // para mostrar una fila por institución, no una por ejemplar.
  const porBiblioteca = new Map()
  for (const ejemplar of ejemplares) {
    const datos = unoSolo(ejemplar.biblioteca)
    const entrada = porBiblioteca.get(ejemplar.id_biblioteca) ?? {
      id: ejemplar.id_biblioteca,
      // La RLS ya permite leer el nombre, pero una biblioteca dada de baja
      // podría no venir: se degrada a un texto neutro en lugar de "null".
      nombre: datos?.nombre ?? 'Biblioteca no identificada',
      direccion: datos?.direccion ?? null,
      total: 0,
      disponibles: 0,
      ubicaciones: [],
    }

    entrada.total += 1
    if (ejemplar.estado === 'disponible') {
      entrada.disponibles += 1
      if (ejemplar.ubicacion && !entrada.ubicaciones.includes(ejemplar.ubicacion)) {
        entrada.ubicaciones.push(ejemplar.ubicacion)
      }
    }

    porBiblioteca.set(ejemplar.id_biblioteca, entrada)
  }

  return {
    total: ejemplares.length,
    disponibles: ejemplares.filter((e) => e.estado === 'disponible').length,
    prestados: ejemplares.filter((e) => e.estado === 'prestado').length,
    // Primero las que tienen copias libres.
    bibliotecas: [...porBiblioteca.values()].sort(
      (a, b) => b.disponibles - a.disponibles || a.nombre.localeCompare(b.nombre),
    ),
  }
}
