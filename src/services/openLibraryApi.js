/**
 * Cliente de Open Library, usado para una sola cosa: el año de primera
 * publicación de una obra.
 *
 * Por qué otra fuente además de Google Books: Google no modela la "obra", solo
 * ediciones sueltas, así que lo más antiguo que devuelve suele ser una
 * reedición. Medido contra ocho clásicos latinoamericanos, acertaba cero.
 * Open Library sí separa la obra de sus ediciones y expone `first_publish_year`;
 * en la misma prueba acertó siete de ocho (el restante, Ficciones, difiere en un
 * año por la reedición de 1945).
 *
 * No necesita API key y responde con `access-control-allow-origin: *`.
 * Google Books sigue siendo la fuente de portada, sinopsis y metadatos.
 */

const BASE_URL = 'https://openlibrary.org/search.json'

/**
 * Busca la obra y devuelve el candidato más relevante, sin validar que
 * corresponda: esa decisión queda en quien llama, que conoce el título y el
 * autor con los que está comparando.
 *
 * @returns {Promise<{anio: string, titulo: string, autor: string|null}|null>}
 */
export async function buscarPrimeraPublicacion({ titulo, autor, isbn }, { signal } = {}) {
  // El ISBN identifica una edición concreta y es más preciso cuando está en el
  // catálogo, pero Open Library no tiene todas las ediciones en castellano, así
  // que el título con el autor queda como alternativa.
  const consultas = [isbn && `isbn:${isbn}`, [titulo, autor].filter(Boolean).join(' ')].filter(
    Boolean,
  )

  for (const consulta of consultas) {
    const url = new URL(BASE_URL)
    url.searchParams.set('q', consulta)
    url.searchParams.set('fields', 'title,author_name,first_publish_year')
    url.searchParams.set('limit', '1')

    let respuesta
    try {
      respuesta = await fetch(url, { signal })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      return null // el año es un dato accesorio: si la fuente no responde, se sigue
    }

    if (!respuesta.ok) continue

    const datos = await respuesta.json()
    const candidato = datos.docs?.[0]

    if (candidato?.first_publish_year) {
      return {
        anio: String(candidato.first_publish_year),
        titulo: candidato.title ?? '',
        autor: candidato.author_name?.[0] ?? null,
      }
    }
  }

  return null
}
