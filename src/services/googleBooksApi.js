/**
 * Cliente de la Google Books API v1.
 *
 * Aislado del resto de la app para que lo puedan reutilizar CU03/CU04
 * (catálogo y ficha), PerfilAutor y el alta de libros al cache local.
 *
 * La API no exige key por contrato, pero en la práctica hace falta: las
 * consultas anónimas se atribuyen a un proyecto compartido de Google que suele
 * tener cuota diaria 0 y responde 429 desde la primera llamada. Definí
 * VITE_GOOGLE_BOOKS_API_KEY en el .env.local.
 */

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes'
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

/** Error tipado para poder distinguir fallos de red de respuestas HTTP con estado. */
export class GoogleBooksError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message)
    this.name = 'GoogleBooksError'
    this.status = status
    this.cause = cause
  }
}

function construirUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, valor)
    }
  }
  if (API_KEY) url.searchParams.set('key', API_KEY)
  return url.toString()
}

async function pedir(url, signal) {
  let respuesta
  try {
    respuesta = await fetch(url, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new GoogleBooksError('No se pudo conectar con Google Books.', { cause: error })
  }

  if (!respuesta.ok) {
    const detalle =
      respuesta.status === 429
        ? 'Se alcanzó el límite de consultas a Google Books. Probá de nuevo en unos minutos.'
        : `Google Books respondió con estado ${respuesta.status}.`
    throw new GoogleBooksError(detalle, { status: respuesta.status })
  }

  return respuesta.json()
}

/**
 * Las miniaturas vienen por http y con curl de página. Forzamos https (si no,
 * el navegador bloquea contenido mixto) y subimos un escalón de resolución.
 */
function normalizarPortada(imageLinks) {
  const cruda =
    imageLinks?.extraLarge ||
    imageLinks?.large ||
    imageLinks?.medium ||
    imageLinks?.thumbnail ||
    imageLinks?.smallThumbnail

  if (!cruda) return null
  return cruda.replace(/^http:/, 'https:').replace('&edge=curl', '')
}

function extraerIsbn(identifiers = []) {
  const isbn13 = identifiers.find((i) => i.type === 'ISBN_13')
  const isbn10 = identifiers.find((i) => i.type === 'ISBN_10')
  return isbn13?.identifier || isbn10?.identifier || null
}

/**
 * Aplana un volumen de Google Books a la forma que usa la app.
 *
 * Las claves de salida están alineadas con las columnas de la tabla `libro`
 * (google_books_id, autor_texto, isbn, portada_url) y de `obra` (titulo,
 * sinopsis, genero) para que insertar al cache local sea un mapeo directo.
 */
export function normalizarVolumen(volumen) {
  if (!volumen) return null
  const info = volumen.volumeInfo ?? {}

  return {
    googleBooksId: volumen.id,
    titulo: info.title ?? 'Sin título',
    subtitulo: info.subtitle ?? null,
    autores: info.authors ?? [],
    autorTexto: info.authors?.length ? info.authors.join(', ') : null,
    sinopsis: info.description ?? null,
    portadaUrl: normalizarPortada(info.imageLinks),
    isbn: extraerIsbn(info.industryIdentifiers),
    editorial: info.publisher ?? null,
    fechaPublicacion: info.publishedDate ?? null,
    cantidadPaginas: info.pageCount ?? null,
    categorias: info.categories ?? [],
    idioma: info.language ?? null,
    enlaceVistaPrevia: info.previewLink ?? null,
  }
}

/**
 * Trae un volumen puntual por su id de Google Books.
 * Devuelve null si el volumen ya no existe (404), porque para la ficha de obra
 * un libro borrado en Google no debería romper la vista: el cache local alcanza.
 */
export async function obtenerVolumenPorId(googleBooksId, { signal } = {}) {
  if (!googleBooksId) return null

  try {
    const datos = await pedir(construirUrl(`/${encodeURIComponent(googleBooksId)}`), signal)
    return normalizarVolumen(datos)
  } catch (error) {
    if (error instanceof GoogleBooksError && error.status === 404) return null
    throw error
  }
}

/** Quita acentos y puntuación para poder comparar títulos y autores. */
function aplanarTexto(texto) {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas diacriticas
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Núcleo del título, sin subtítulo ni ruido de edición.
 *
 * Google Books no agrupa ediciones: devuelve una entrada por cada reimpresión,
 * traducción y edición conmemorativa. Los separadores incluyen "/" porque las
 * ediciones bilingües llegan como "Rayuela / Hopscotch".
 *
 * Exportada para cruzar resultados de Google contra obras ya catalogadas.
 */
export function tituloBaseDeObra(titulo) {
  const recortado = (titulo ?? '')
    // El guion solo corta cuando va suelto ("Rayuela - edicion critica"). Pegado
    // es parte de la palabra: "Monte-Cristo" no debe truncarse en "Monte".
    .split(/\s+[-–—]\s+/)[0]
    .split(/\s*[:([/,;]/)[0]

  return (
    aplanarTexto(recortado)
      // "Rayuela Edicion conmemorativa 50 aniversario" -> "rayuela"
      .replace(/\b(edicion|edition|ed|volumen|tomo|antologia)\b.*$/, '')
      // Se colapsan los espacios: "Monte Cristo" (del guion) y "Montecristo"
      // son el mismo titulo escrito de dos maneras.
      .replace(/\s+/g, '')
  )
}

/**
 * Apellidos utilizables del autor. Se descartan las palabras cortas (nombres de
 * pila abreviados, preposiciones) porque lo que identifica es el apellido.
 */
function tokensDeAutor(autor) {
  return new Set(aplanarTexto(autor).split(' ').filter((palabra) => palabra.length > 3))
}

/**
 * ¿Dos fichas son el mismo libro? Igual núcleo de título y, además, algún
 * apellido en común.
 *
 * La comparación de autor no puede ser por igualdad: la misma obra llega como
 * "Gabriel García Márquez", "Gabriel Márquez" o directamente sin autor. Basta
 * con que compartan un apellido, y si a alguno de los dos le falta el autor se
 * lo considera compatible.
 */
export function esMismaObra(a, b) {
  if (!a || !b) return false
  const tituloA = tituloBaseDeObra(a.titulo)
  if (!tituloA || tituloA !== tituloBaseDeObra(b.titulo)) return false

  const autoresA = tokensDeAutor(a.autor)
  const autoresB = tokensDeAutor(b.autor)
  if (autoresA.size === 0 || autoresB.size === 0) return true

  return [...autoresA].some((apellido) => autoresB.has(apellido))
}

/** Qué tan completa está una ficha, para elegir de dónde tomar los datos faltantes. */
function puntajeDeVolumen(volumen) {
  return (
    (volumen.portadaUrl ? 8 : 0) +
    (volumen.sinopsis ? 4 : 0) +
    (volumen.isbn ? 2 : 0) +
    (volumen.cantidadPaginas ? 1 : 0)
  )
}

/** Año de publicación como número. Sin fecha va último, no primero. */
function anioDeVolumen(volumen) {
  const anio = Number.parseInt(volumen.fechaPublicacion?.slice(0, 4) ?? '', 10)
  return Number.isFinite(anio) ? anio : Number.POSITIVE_INFINITY
}

/**
 * Funde las ediciones de un mismo libro en una ficha sola.
 *
 * Manda la edición más antigua, que es la obra original: no tiene sentido
 * mostrar "El conde de Montecristo (2023)" como si fuese una obra distinta de
 * la de 1846. Pero las ediciones viejas suelen ser registros escaneados sin
 * portada ni sinopsis, así que los huecos se rellenan con la edición más
 * completa del grupo. Queda el año correcto y los mejores datos disponibles.
 */
function fusionarEdiciones(ediciones, idiomaPreferido) {
  const masAntigua = ediciones.reduce((a, b) => (anioDeVolumen(b) < anioDeVolumen(a) ? b : a))
  const masCompleta = ediciones.reduce((a, b) => (puntajeDeVolumen(b) > puntajeDeVolumen(a) ? b : a))

  // La edición más antigua es la obra original, pero puede estar en otro idioma:
  // la de 1846 de El conde de Montecristo es francesa. Para la sinopsis se
  // prefiere una edición en el idioma pedido, sin tocar el año ni la identidad.
  const enIdioma = idiomaPreferido
    ? ediciones.find((e) => e.idioma === idiomaPreferido && e.sinopsis)
    : null

  const sinopsis = enIdioma?.sinopsis ?? masAntigua.sinopsis ?? masCompleta.sinopsis ?? null

  if (masAntigua === masCompleta && sinopsis === masAntigua.sinopsis) return masAntigua

  return {
    ...masAntigua,
    sinopsis,
    portadaUrl: masAntigua.portadaUrl ?? masCompleta.portadaUrl,
    isbn: masAntigua.isbn ?? masCompleta.isbn,
    editorial: masAntigua.editorial ?? masCompleta.editorial,
    cantidadPaginas: masAntigua.cantidadPaginas ?? masCompleta.cantidadPaginas,
    categorias: masAntigua.categorias?.length ? masAntigua.categorias : masCompleta.categorias,
  }
}

/**
 * Colapsa las múltiples ediciones de un mismo libro en una sola. Preserva el
 * orden de relevancia de Google: el grupo queda donde aparecía su primer
 * integrante.
 */
export function agruparEdiciones(volumenes, { idiomaPreferido = null } = {}) {
  // Lista y no Map: la pertenencia al grupo depende de compartir un apellido con
  // los autores ya vistos, no de una clave exacta. Con el tope de 40 volúmenes
  // de la API, el costo cuadrático es irrelevante.
  const grupos = []

  for (const volumen of volumenes) {
    const ficha = { titulo: volumen.titulo, autor: volumen.autores?.[0] ?? volumen.autorTexto }
    const grupo = grupos.find((g) => esMismaObra(g.ficha, ficha))

    if (!grupo) {
      grupos.push({ ficha, ediciones: [volumen] })
      continue
    }

    // El grupo acumula los apellidos vistos, así una edición sin autor tiende un
    // puente entre dos variantes que de otro modo no se habrían tocado.
    for (const apellido of tokensDeAutor(ficha.autor)) {
      grupo.ficha.autor = `${grupo.ficha.autor ?? ''} ${apellido}`
    }

    grupo.ediciones.push(volumen)
  }

  return grupos.map((g) => fusionarEdiciones(g.ediciones, idiomaPreferido))
}

/**
 * Búsqueda de volúmenes. `termino` acepta la sintaxis de Google Books
 * (intitle:, inauthor:, isbn:).
 *
 * Por defecto agrupa ediciones. Como el agrupado reduce la cantidad, se pide a
 * la API bastante más de lo que se quiere mostrar.
 */
export async function buscarVolumenes(
  termino,
  { maxResultados = 10, desde = 0, agrupar = true, idioma = 'es', signal } = {},
) {
  const consulta = termino?.trim()
  if (!consulta) return { total: 0, resultados: [] }

  const pedidos = agrupar ? 40 : Math.min(maxResultados, 40) // 40 es el tope de la API

  const datos = await pedir(
    construirUrl('', {
      q: consulta,
      maxResults: pedidos,
      startIndex: desde,
      printType: 'books',
      orderBy: 'relevance',
      // Prioriza ediciones en castellano, que son las que traen la sinopsis en
      // castellano. No es una garantía: si de un libro no hay edición en ese
      // idioma, Google devuelve igual las que tenga.
      langRestrict: idioma,
    }),
    signal,
  )

  const normalizados = (datos.items ?? []).map(normalizarVolumen).filter(Boolean)
  const resultados = agrupar
    ? agruparEdiciones(normalizados, { idiomaPreferido: idioma })
    : normalizados

  return {
    total: datos.totalItems ?? 0,
    resultados: resultados.slice(0, maxResultados),
  }
}
