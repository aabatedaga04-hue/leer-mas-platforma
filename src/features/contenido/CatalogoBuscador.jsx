/**
 * CU03 — Buscar Obras.
 *
 * Un único buscador sobre dos fuentes: las obras de LEER+ (tabla `obra` con sus
 * subtipos `escrito` / `libro`) y, en la misma lista de resultados, los libros
 * de Google Books que todavía no están catalogados.
 *
 * Que `libro` sea un cache local es un detalle de implementación del schema y
 * no tiene por qué asomar en la interfaz: para quien busca, es un catálogo solo.
 * Los resultados que aún no están en la plataforma se marcan como tales y se
 * pueden incorporar desde ahí mismo.
 *
 * Los filtros viven en la query string, no en useState: así el botón "atrás"
 * deshace una búsqueda, el enlace se puede compartir y volver desde la ficha
 * (CU04) recupera la búsqueda anterior.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BookPlus,
  Check,
  Loader2,
  Search,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react'

import {
  DIRECCION,
  DIRECCION_POR_DEFECTO,
  ORDEN,
  RESULTADOS_POR_PAGINA,
  TIPO_OBRA,
  buscarCatalogadosPorGoogleIds,
  buscarObras,
  catalogarLibro,
  obtenerGeneros,
} from './catalogoApi'
import { Estrellas, EtiquetaTipo, PortadaObra } from './piezasObra'
import { useDebounce } from './useDebounce'
import { buscarVolumenes, esMismaObra } from '../../services/googleBooksApi'
import { supabase } from '../../supabaseClient'

const TIPOS = [
  { valor: TIPO_OBRA.TODOS, etiqueta: 'Todas' },
  { valor: TIPO_OBRA.ESCRITO, etiqueta: 'Escritos' },
  { valor: TIPO_OBRA.LIBRO, etiqueta: 'Libros' },
]

// Las etiquetas nombran el criterio, no el sentido: con el botón de dirección
// "Más recientes" seria mentira al invertirlo.
const ORDENES = [
  { valor: ORDEN.TITULO, etiqueta: 'Título' },
  { valor: ORDEN.ANIO, etiqueta: 'Año de publicación' },
  { valor: ORDEN.CALIFICACION, etiqueta: 'Calificación' },
]

/** Cómo se lee cada criterio en cada sentido, para el botón que las invierte. */
const SENTIDOS = {
  [ORDEN.TITULO]: { asc: 'de la A a la Z', desc: 'de la Z a la A' },
  [ORDEN.ANIO]: { asc: 'de la más antigua', desc: 'de la más reciente' },
  [ORDEN.CALIFICACION]: { asc: 'de la peor calificada', desc: 'de la mejor calificada' },
}

const SUGERENCIAS_GOOGLE = 6

const CLASES_FOCO =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4ede2]'

const CLASES_CAMPO =
  `w-full border border-[#c5b5a5] bg-[#fffaf0] px-3 py-2.5 text-sm text-[#2d1d20] ` +
  `placeholder:text-[#9a847d] transition-colors hover:border-[#9f8980] ${CLASES_FOCO}`

/** Ventana de páginas alrededor de la actual, con cortes marcados como null. */
function paginasVisibles(actual, totalPaginas) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1)
  }

  const paginas = new Set([1, totalPaginas, actual, actual - 1, actual + 1])
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b)

  return ordenadas.flatMap((pagina, indice) => {
    const anterior = ordenadas[indice - 1]
    return anterior && pagina - anterior > 1 ? [null, pagina] : [pagina]
  })
}

export default function CatalogoBuscador() {
  const [params, setParams] = useSearchParams()

  // Fuente de verdad de los filtros: la URL.
  const titulo = params.get('titulo') ?? ''
  const autor = params.get('autor') ?? ''
  const genero = params.get('genero') ?? ''
  const tipo = params.get('tipo') ?? TIPO_OBRA.TODOS
  const orden = params.get('orden') ?? ORDEN.TITULO
  // Cada criterio arranca con el sentido que se espera al elegirlo; el botón lo invierte.
  const direccion = params.get('dir') ?? DIRECCION_POR_DEFECTO[orden] ?? DIRECCION.ASC
  const pagina = Math.max(1, Number(params.get('pagina') ?? 1) || 1)

  // Los campos de texto se escriben localmente y bajan a la URL con retraso,
  // para no disparar una consulta por cada tecla.
  const [textoTitulo, setTextoTitulo] = useState(titulo)
  const [textoAutor, setTextoAutor] = useState(autor)
  const tituloRetrasado = useDebounce(textoTitulo)
  const autorRetrasado = useDebounce(textoAutor)

  const [generos, setGeneros] = useState([])
  const [resultado, setResultado] = useState({ obras: [], total: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  // Sugerencias de Google Books (libros aún no catalogados).
  const [sugerencias, setSugerencias] = useState([])
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false)
  const [errorSugerencias, setErrorSugerencias] = useState(null)
  const [reciencatalogados, setRecienCatalogados] = useState(new Map())
  const [enProceso, setEnProceso] = useState(null)
  const [errorAlta, setErrorAlta] = useState(null)

  // No hay contexto de auth en el proyecto todavía. AuthModal es un simulador y
  // no crea sesión: sin un signIn real contra Supabase, `haySesion` queda false
  // y el alta al catálogo no está disponible.
  const [haySesion, setHaySesion] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHaySesion(Boolean(data?.session)))
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) =>
      setHaySesion(Boolean(sesion)),
    )
    return () => data?.subscription?.unsubscribe()
  }, [])

  const actualizarFiltro = useCallback(
    (cambios) => {
      setParams(
        (anteriores) => {
          const siguientes = new URLSearchParams(anteriores)
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor) siguientes.set(clave, String(valor))
            else siguientes.delete(clave)
          }
          // Cualquier cambio de filtro invalida la página actual.
          if (!('pagina' in cambios)) siguientes.delete('pagina')
          return siguientes
        },
        { replace: true },
      )
    },
    [setParams],
  )

  // Texto tipeado -> URL.
  useEffect(() => {
    if (tituloRetrasado !== titulo) actualizarFiltro({ titulo: tituloRetrasado })
  }, [tituloRetrasado, titulo, actualizarFiltro])

  useEffect(() => {
    if (autorRetrasado !== autor) actualizarFiltro({ autor: autorRetrasado })
  }, [autorRetrasado, autor, actualizarFiltro])

  // URL -> texto tipeado, para que "atrás" y "limpiar filtros" se reflejen en los inputs.
  useEffect(() => setTextoTitulo((actual) => (actual === titulo ? actual : titulo)), [titulo])
  useEffect(() => setTextoAutor((actual) => (actual === autor ? actual : autor)), [autor])

  // Géneros del filtro. Si falla no rompe la búsqueda: el select queda vacío.
  useEffect(() => {
    const controlador = new AbortController()
    obtenerGeneros({ signal: controlador.signal })
      .then(setGeneros)
      .catch(() => setGeneros([]))
    return () => controlador.abort()
  }, [])

  // ---------- Búsqueda en el catálogo de LEER+ ----------
  useEffect(() => {
    const controlador = new AbortController()
    setCargando(true)
    setError(null)

    buscarObras({ titulo, autor, genero, tipo, orden, direccion, pagina, signal: controlador.signal })
      .then((datos) => {
        setResultado(datos)
        setCargando(false)
      })
      .catch((fallo) => {
        if (fallo.name === 'AbortError') return
        setError(fallo)
        setResultado({ obras: [], total: 0 })
        setCargando(false)
      })

    return () => controlador.abort()
  }, [titulo, autor, genero, tipo, orden, direccion, pagina, intento])

  const hayTermino = Boolean(titulo.trim() || autor.trim())

  // Google no conoce nuestros géneros ni tiene escritos de la comunidad, así que
  // esos dos filtros excluyen la fuente externa en lugar de contradecirla.
  const consultarGoogle = hayTermino && tipo !== TIPO_OBRA.ESCRITO && !genero

  // ---------- Sugerencias de Google Books ----------
  // Sin `pagina` en las dependencias: se consulta una vez por término y se
  // muestra al final de la última página de resultados locales.
  useEffect(() => {
    if (!consultarGoogle) {
      setSugerencias([])
      setErrorSugerencias(null)
      return
    }

    const controlador = new AbortController()
    setCargandoSugerencias(true)
    setErrorSugerencias(null)

    // La sintaxis de Google permite mapear nuestros campos uno a uno.
    const consulta = [
      titulo.trim() && `intitle:${titulo.trim()}`,
      autor.trim() && `inauthor:${autor.trim()}`,
    ]
      .filter(Boolean)
      .join(' ')

    buscarVolumenes(consulta, {
      maxResultados: SUGERENCIAS_GOOGLE * 3, // margen para descartar los ya catalogados
      signal: controlador.signal,
    })
      .then(async ({ resultados }) => {
        if (controlador.signal.aborted) return

        // Descarta por id exacto los que ya están en `libro`.
        const yaCatalogados = await buscarCatalogadosPorGoogleIds(
          resultados.map((v) => v.googleBooksId),
          { signal: controlador.signal },
        )
        if (controlador.signal.aborted) return

        setSugerencias(resultados.filter((v) => !yaCatalogados.has(v.googleBooksId)))
        setCargandoSugerencias(false)
      })
      .catch((fallo) => {
        if (fallo.name === 'AbortError') return
        setErrorSugerencias(fallo)
        setSugerencias([])
        setCargandoSugerencias(false)
      })

    return () => controlador.abort()
  }, [consultarGoogle, titulo, autor])

  const { obras, total } = resultado
  const totalPaginas = Math.max(1, Math.ceil(total / RESULTADOS_POR_PAGINA))
  const esUltimaPagina = pagina >= totalPaginas
  const hayFiltros = Boolean(titulo || autor || genero || tipo !== TIPO_OBRA.TODOS)

  // Descarta las ediciones que ya aparecen como obra local. El cruce por id de
  // Google no alcanza: una edición distinta del mismo libro trae otro id, así
  // que se compara título y autor.
  const sugerenciasFiltradas = useMemo(
    () =>
      sugerencias
        .filter(
          (volumen) =>
            !obras.some((obra) =>
              esMismaObra({ titulo: obra.titulo, autor: obra.autor }, {
                titulo: volumen.titulo,
                autor: volumen.autorTexto,
              }),
            ),
        )
        .slice(0, SUGERENCIAS_GOOGLE),
    [sugerencias, obras],
  )

  // Se listan al final de la última página, pero cuentan en el total desde la
  // primera: si no, el recuento cambiaría al pasar de página.
  const sugerenciasVisibles = esUltimaPagina ? sugerenciasFiltradas : []
  const totalEncontrado = total + sugerenciasFiltradas.length

  const agregarAlCatalogo = useCallback(async (volumen) => {
    setEnProceso(volumen.googleBooksId)
    setErrorAlta(null)
    try {
      const idObra = await catalogarLibro(volumen)
      setRecienCatalogados((previos) => new Map(previos).set(volumen.googleBooksId, idObra))
    } catch (fallo) {
      setErrorAlta({ id: volumen.googleBooksId, mensaje: fallo.message })
    } finally {
      setEnProceso(null)
    }
  }, [])

  const limpiarFiltros = () => {
    setTextoTitulo('')
    setTextoAutor('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const sinNingunResultado =
    !cargando && obras.length === 0 && sugerenciasVisibles.length === 0 && !cargandoSugerencias

  return (
    <div className="catalogo-editorial space-y-10">
      <header className="grid gap-7 border-b border-[#bcae9e] pb-9 lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:items-end">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#806b65]">
          <span className="h-px w-10 bg-(--color-brand-primary)" />
          02 / Catálogo
        </div>
        <div>
          <h2 className="font-editorial text-5xl leading-none font-semibold tracking-[-0.04em] text-[#24171a] sm:text-6xl">
            Encontrá una historia.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#705b57] sm:text-base">
            Escritos de la comunidad y libros de todo el mundo, reunidos en una misma búsqueda.
          </p>
        </div>
        <Search className="hidden size-12 text-[#aa9990] lg:block" strokeWidth={1.2} aria-hidden="true" />
      </header>

      {/* ---------- FILTROS (CU03) ---------- */}
      <search>
        <form
          role="search"
          aria-label="Buscar obras en el catálogo"
          onSubmit={(evento) => evento.preventDefault()}
          className="grid gap-x-5 gap-y-6 border-y border-[#bcae9e] bg-[#f7f1e7] px-5 py-6 md:grid-cols-2 lg:grid-cols-4 lg:px-7"
        >
          <div className="flex items-center gap-2 md:col-span-2 lg:col-span-4">
            <SlidersHorizontal className="size-4 text-(--color-brand-primary)" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#725d58]">Afinar la búsqueda</span>
          </div>
          <div>
            <label htmlFor="filtro-titulo" className="mb-1.5 block text-sm font-semibold text-[#3e2b2e]">
              Título
            </label>
            <input
              id="filtro-titulo"
              type="search"
              value={textoTitulo}
              onChange={(evento) => setTextoTitulo(evento.target.value)}
              placeholder="Ej.: Rayuela"
              className={CLASES_CAMPO}
            />
          </div>

          <div>
            <label htmlFor="filtro-autor" className="mb-1.5 block text-sm font-semibold text-[#3e2b2e]">
              Autor
            </label>
            <input
              id="filtro-autor"
              type="search"
              value={textoAutor}
              onChange={(evento) => setTextoAutor(evento.target.value)}
              placeholder="Nombre o apodo"
              aria-describedby="ayuda-autor"
              className={CLASES_CAMPO}
            />
            <p id="ayuda-autor" className="mt-1 text-xs text-[#8a746d]">
              En Escritos busca por apodo de la plataforma.
            </p>
          </div>

          <div>
            <label htmlFor="filtro-genero" className="mb-1.5 block text-sm font-semibold text-[#3e2b2e]">
              Género
            </label>
            <select
              id="filtro-genero"
              value={genero}
              onChange={(evento) => actualizarFiltro({ genero: evento.target.value })}
              aria-describedby="ayuda-genero"
              className={CLASES_CAMPO}
            >
              <option value="">Todos los géneros</option>
              {generos.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
            <p id="ayuda-genero" className="mt-1 text-xs text-[#8a746d]">
              Filtra solo obras ya catalogadas.
            </p>
          </div>

          <div>
            <label htmlFor="filtro-orden" className="mb-1.5 block text-sm font-semibold text-[#3e2b2e]">
              Ordenar por
            </label>
            <div className="flex gap-2">
              <select
                id="filtro-orden"
                value={orden}
                onChange={(evento) =>
                  // Al cambiar de criterio se vuelve a su sentido natural: la
                  // dirección elegida para "Título" no significa lo mismo en "Año".
                  actualizarFiltro({ orden: evento.target.value, dir: null })
                }
                className={CLASES_CAMPO}
              >
                {ORDENES.map(({ valor, etiqueta }) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  actualizarFiltro({
                    dir: direccion === DIRECCION.ASC ? DIRECCION.DESC : DIRECCION.ASC,
                  })
                }
                // El ícono es decorativo: lo que se anuncia es el sentido actual
                // y el título describe la acción del botón.
                aria-label={`Orden ${SENTIDOS[orden][direccion]}. Invertir.`}
                title={`Ordenado ${SENTIDOS[orden][direccion]}`}
                className={`shrink-0 border border-[#c5b5a5] bg-[#fffaf0] px-3 text-[#6d5753] transition-colors hover:border-(--color-brand-primary) hover:text-(--color-brand-primary) ${CLASES_FOCO}`}
              >
                {direccion === DIRECCION.ASC ? (
                  <ArrowUpNarrowWide aria-hidden="true" className="size-4" />
                ) : (
                  <ArrowDownWideNarrow aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#8a746d]">{SENTIDOS[orden][direccion]}</p>
          </div>

          {/* Radios reales: el navegador ya da navegación con flechas y anuncio de grupo. */}
          <fieldset className="lg:col-span-3">
            <legend className="mb-1.5 text-sm font-semibold text-[#3e2b2e]">Tipo de obra</legend>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(({ valor, etiqueta }) => {
                const activo = tipo === valor
                return (
                  <label
                    key={valor}
                    className={`cursor-pointer border px-4 py-2 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-(--color-brand-primary) has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-[#f4ede2] ${
                      activo
                        ? 'border-(--color-brand-primary) bg-(--color-brand-primary) font-semibold text-white'
                        : 'border-[#c5b5a5] bg-[#fffaf0] text-[#6e5955] hover:border-[#8f7770] hover:text-[#2d1d20]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo-obra"
                      value={valor}
                      checked={activo}
                      onChange={() => actualizarFiltro({ tipo: valor })}
                      className="sr-only"
                    />
                    {etiqueta}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={!hayFiltros}
              className={`border border-[#c5b5a5] bg-transparent px-4 py-2 text-sm text-[#6e5955] transition-colors hover:border-(--color-brand-primary) hover:text-(--color-brand-primary) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#c5b5a5] disabled:hover:text-[#6e5955] ${CLASES_FOCO}`}
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </search>

      {/* ---------- ESTADO DE LA BÚSQUEDA ---------- */}
      <section aria-labelledby="titulo-resultados" aria-busy={cargando || cargandoSugerencias}>
        <h3 id="titulo-resultados" className="sr-only">
          Resultados de la búsqueda
        </h3>

        <div className="flex items-center justify-between gap-4 border-b border-[#bcae9e] pb-4">
          {/* Región viva: los lectores de pantalla anuncian el recuento al cambiar filtros. */}
          <p role="status" aria-live="polite" className="flex items-center gap-3 text-sm font-medium text-[#6f5955]">
            <span className="size-1.5 bg-(--color-brand-primary)" aria-hidden="true" />
            {cargando
              ? 'Buscando obras…'
              : error
                ? 'La búsqueda no se pudo completar.'
                : totalEncontrado === 0
                  ? 'Sin resultados.'
                  : [
                      `${totalEncontrado} ${
                        totalEncontrado === 1 ? 'obra encontrada' : 'obras encontradas'
                      }`,
                      totalPaginas > 1 && `página ${pagina} de ${totalPaginas}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
          </p>
          {(cargando || cargandoSugerencias) && (
            <Loader2
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin text-(--color-brand-primary)"
            />
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="border border-[#cf9a9a] bg-[#fff1ed] p-7 text-center"
          >
            <AlertCircle aria-hidden="true" className="mx-auto size-6 text-[#a22842]" />
            <p className="mt-3 font-medium text-[#6f2636]">{error.message}</p>
            <p className="mt-1 text-sm text-[#94606b]">
              Puede ser un problema de conexión o que el servidor no esté respondiendo.
            </p>
            <button
              type="button"
              onClick={() => setIntento((n) => n + 1)}
              className={`boton-recorte mt-4 bg-(--color-brand-primary) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#991035] ${CLASES_FOCO}`}
            >
              Reintentar
            </button>
          </div>
        )}

        {!error && sinNingunResultado && (
          <div className="border border-dashed border-[#b8a89a] bg-[#f7f1e7] p-10 text-center">
            <SearchX aria-hidden="true" className="mx-auto size-7 text-[#9a847d]" />
            <p className="mt-3 font-medium text-[#352326]">
              {hayFiltros
                ? 'Ninguna obra coincide con esos filtros'
                : 'Todavía no hay obras en el catálogo'}
            </p>
            <p className="mt-1 text-sm text-[#806b65]">
              {hayFiltros
                ? 'Probá con menos filtros o revisá la ortografía del título.'
                : 'Buscá por título o autor para encontrar obras.'}
            </p>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className={`mt-4 border border-(--color-brand-primary) px-5 py-2 text-sm font-medium text-(--color-brand-primary) transition-colors hover:bg-(--color-brand-primary) hover:text-white ${CLASES_FOCO}`}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ---------- RESULTADOS: catalogadas y sin catalogar, en una sola lista ---------- */}
        {(obras.length > 0 || sugerenciasVisibles.length > 0) && (
          <ul
            className={`divide-y divide-[#d0c2b4] border-b border-[#bcae9e] transition-opacity ${
              cargando ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {obras.map((obra) => (
              <li key={`obra-${obra.id}`}>
                <Link
                  to={`/obra/${obra.id}`}
                  className={`group flex gap-4 border-l-2 border-transparent py-5 pl-4 pr-2 transition-colors hover:border-(--color-brand-primary) hover:bg-[#f7f1e7] ${CLASES_FOCO}`}
                >
                  <PortadaObra obra={obra} tema="claro" />

                  <div className="min-w-0 flex-1">
                    <EtiquetaTipo tipo={obra.tipo} tema="claro" />
                    <h4 className="font-editorial mt-1 truncate text-xl text-[#2d1d20] group-hover:text-(--color-brand-primary)">
                      {obra.titulo}
                    </h4>
                    <p className="mt-0.5 text-sm text-[#725d58]">
                      {obra.autor ?? (
                        <span className="italic text-[#907b74]">Autoría no disponible</span>
                      )}
                      {/* El año que se muestra es el de la obra, no el del alta
                          en la plataforma. Los escritos no lo llevan: para ellos
                          ambas fechas son la misma. */}
                      {obra.fechaPublicacionOriginal && (
                        <span className="text-[#907b74]">
                          {' '}
                          · {obra.fechaPublicacionOriginal.slice(0, 4)}
                        </span>
                      )}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {obra.genero && (
                        <span className="text-xs uppercase tracking-wider text-[#806b65]">
                          {obra.genero}
                        </span>
                      )}
                      <Estrellas valor={obra.promedioCalificacion} tema="claro" />
                    </div>

                    {obra.sinopsis && (
                      <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-[#806b65]">
                        {obra.sinopsis}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}

            {/* Mismo listado: los que todavía no están en LEER+ se marcan y se
                pueden incorporar sin salir de la búsqueda. */}
            {sugerenciasVisibles.map((volumen) => {
              const idObra = reciencatalogados.get(volumen.googleBooksId)
              const procesando = enProceso === volumen.googleBooksId
              const falloAlta = errorAlta?.id === volumen.googleBooksId ? errorAlta.mensaje : null

              return (
                <li
                  key={`google-${volumen.googleBooksId}`}
                  className="flex border-l-2 border-transparent transition-colors hover:border-(--color-brand-secondary) hover:bg-[#f7f1e7]"
                >
                  {/* El botón de agregar queda FUERA del enlace: un <button>
                      dentro de un <a> es HTML inválido y rompe el teclado. */}
                  <Link
                    to={
                      idObra ? `/obra/${idObra}` : `/obra/externa/${volumen.googleBooksId}`
                    }
                    // El volumen viaja ya fusionado para que la ficha no pierda
                    // la portada o la sinopsis tomadas de otra edición.
                    state={idObra ? undefined : { volumen }}
                    className={`group flex min-w-0 flex-1 gap-4 py-4 pl-4 pr-2 ${CLASES_FOCO}`}
                  >
                    <PortadaObra
                      tema="claro"
                      obra={{
                        titulo: volumen.titulo,
                        portadaUrl: volumen.portadaUrl,
                        tipo: TIPO_OBRA.LIBRO,
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <EtiquetaTipo tipo={TIPO_OBRA.LIBRO} tema="claro" />
                      <h4 className="font-editorial mt-1 text-xl text-[#2d1d20] group-hover:text-(--color-brand-primary)">
                        {volumen.titulo}
                      </h4>
                      <p className="mt-0.5 text-sm text-[#725d58]">
                        {volumen.autorTexto ?? (
                          <span className="italic text-[#907b74]">Autoría no informada</span>
                        )}
                        {volumen.fechaPublicacion && (
                          <span className="text-[#907b74]">
                            {' '}
                            · {volumen.fechaPublicacion.slice(0, 4)}
                          </span>
                        )}
                      </p>
                      {/* Mismo tratamiento que las obras del catálogo: el
                          promedio se muestra siempre, y sin calificaciones lo
                          dice en lugar de omitirse. */}
                      <div className="mt-2">
                        <Estrellas valor={0} tema="claro" />
                      </div>

                      {volumen.sinopsis && (
                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-[#806b65]">
                          {volumen.sinopsis}
                        </p>
                      )}
                      {falloAlta && (
                        <p role="alert" className="mt-2 text-sm text-[#a22842]">
                          {falloAlta}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* La acción de alta solo existe para quien tiene sesión. Sin
                      ella no se muestra nada: un botón deshabilitado delataría
                      que esta obra todavía no está en la base. */}
                  <div className="flex shrink-0 items-start py-4 pr-2">
                    {idObra ? (
                      <Link
                        to={`/obra/${idObra}`}
                        className={`inline-flex items-center gap-1.5 border border-[#6f8f77] px-4 py-2 text-sm text-[#55745f] transition-colors hover:bg-(--color-brand-mint)/20 ${CLASES_FOCO}`}
                      >
                        <Check aria-hidden="true" className="size-4" />
                        Ver ficha
                      </Link>
                    ) : haySesion ? (
                      <button
                        type="button"
                        onClick={() => agregarAlCatalogo(volumen)}
                        disabled={procesando}
                        className={`inline-flex items-center gap-1.5 border border-(--color-brand-secondary) px-4 py-2 text-sm font-medium text-[#7b3f49] transition-colors hover:bg-(--color-brand-secondary)/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${CLASES_FOCO}`}
                      >
                        {procesando ? (
                          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        ) : (
                          <BookPlus aria-hidden="true" className="size-4" />
                        )}
                        {procesando ? 'Agregando…' : 'Agregar'}
                        <span className="sr-only"> {volumen.titulo}</span>
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {errorSugerencias && obras.length > 0 && (
          <p className="pt-3 text-sm text-[#806b65]">
            No se pudieron traer más resultados: {errorSugerencias.message}
          </p>
        )}



        {/* ---------- PAGINACIÓN (solo el catálogo local) ---------- */}
        {totalPaginas > 1 && !error && (
          <nav aria-label="Paginación de resultados" className="flex justify-center pt-6">
            <ul className="flex flex-wrap items-center gap-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => actualizarFiltro({ pagina: pagina - 1 })}
                  disabled={pagina === 1}
                  className={`border border-transparent px-3 py-2 text-sm text-[#65504d] transition-colors hover:border-[#c5b5a5] hover:bg-[#f7f1e7] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent ${CLASES_FOCO}`}
                >
                  Anterior
                </button>
              </li>

              {paginasVisibles(pagina, totalPaginas).map((numero, indice) =>
                numero === null ? (
                  <li key={`corte-${indice}`} aria-hidden="true" className="px-1 text-[#a18b84]">
                    …
                  </li>
                ) : (
                  <li key={numero}>
                    <button
                      type="button"
                      onClick={() => actualizarFiltro({ pagina: numero })}
                      aria-current={numero === pagina ? 'page' : undefined}
                      aria-label={`Página ${numero}`}
                    className={`min-w-9 border px-3 py-2 text-sm transition-colors ${
                      numero === pagina
                          ? 'border-(--color-brand-primary) bg-(--color-brand-primary) font-semibold text-white'
                          : 'border-transparent text-[#6e5955] hover:border-[#c5b5a5] hover:bg-[#f7f1e7] hover:text-[#2d1d20]'
                      } ${CLASES_FOCO}`}
                    >
                      {numero}
                    </button>
                  </li>
                ),
              )}

              <li>
                <button
                  type="button"
                  onClick={() => actualizarFiltro({ pagina: pagina + 1 })}
                  disabled={pagina >= totalPaginas}
                  className={`border border-transparent px-3 py-2 text-sm text-[#65504d] transition-colors hover:border-[#c5b5a5] hover:bg-[#f7f1e7] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent ${CLASES_FOCO}`}
                >
                  Siguiente
                </button>
              </li>
            </ul>
          </nav>
        )}
      </section>
    </div>
  )
}
