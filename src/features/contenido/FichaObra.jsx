/**
 * CU04 — Ficha de Obra.
 *
 * Atiende dos rutas:
 *   /obra/:idObra              obra ya catalogada en LEER+
 *   /obra/externa/:googleBooksId  obra encontrada en la búsqueda pero todavía
 *                                 no incorporada al catálogo
 *
 * En el primer caso combina Supabase (obra + subtipo, reseñas, ejemplares) con
 * la API externa, que solo se consulta si falta portada o sinopsis en el cache
 * local; los datos locales siempre tienen prioridad y si la API falla la ficha
 * se muestra igual.
 *
 * En el segundo no hay fila en la base, así que se arma con los datos externos
 * y se ofrece incorporarla. No hay reseñas ni ejemplares que mostrar: una obra
 * que no está en el catálogo no puede tener ninguno.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, BookPlus, BookX, Library, Loader2 } from 'lucide-react'

import {
  TIPO_OBRA,
  buscarCatalogadosPorGoogleIds,
  catalogarLibro,
  obtenerDisponibilidad,
  obtenerObraPorId,
  obtenerObrasRelacionadas,
  obtenerPerfilActual,
  obtenerResenasDeObra,
  obraDesdeVolumen,
  registrarVisualizacion,
  resolverAnioPublicacion,
} from './catalogoApi'
import AccionesObra from './AccionesObra'
import { Estrellas, EtiquetaTipo, PortadaObra } from './piezasObra'
import { obtenerVolumenPorId } from '../../services/googleBooksApi'
import { supabase } from '../../supabaseClient'

const CLASES_FOCO =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function formatearFecha(valor) {
  if (!valor) return null

  // La API externa suele dar solo el año ("1846") o año-mes ("1846-08").
  // new Date() los completaría al 1 de enero, inventando una precisión que el
  // dato no tiene, así que se muestran tal cual.
  const texto = String(valor)
  if (/^\d{4}$/.test(texto)) return texto
  if (/^\d{4}-\d{2}$/.test(texto)) return texto

  const fecha = new Date(texto)
  return Number.isNaN(fecha.getTime()) ? null : formatoFecha.format(fecha)
}

/**
 * Nombre del idioma en castellano. Intl.DisplayNames evita mantener un mapa
 * propio; si el entorno no lo soporta se muestra el codigo tal cual.
 */
function nombreDeIdioma(codigo) {
  if (!codigo) return null
  try {
    return new Intl.DisplayNames(['es'], { type: 'language' }).of(codigo) ?? codigo
  } catch {
    return codigo
  }
}

function EnlaceVolver() {
  return (
    <Link
      to="/catalogo"
      className={`inline-flex items-center gap-1.5 rounded-sm text-sm text-slate-400 transition-colors hover:text-(--color-brand-cream) ${CLASES_FOCO}`}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Volver al catálogo
    </Link>
  )
}

function Dato({ etiqueta, children }) {
  if (!children) return null
  return (
    <div className="flex justify-between gap-4 border-b border-slate-800 py-2 text-sm last:border-b-0">
      <dt className="shrink-0 text-slate-500">{etiqueta}</dt>
      <dd className="text-right text-slate-300">{children}</dd>
    </div>
  )
}

export default function FichaObra() {
  const { idObra, googleBooksId } = useParams()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  // El buscador ya fusionó las ediciones y pudo haber tomado prestada la portada
  // o la sinopsis de una edición hermana. Pedir el volumen otra vez por id
  // devolvería solo esa edición y perdería lo prestado, así que el resultado ya
  // fusionado viaja en el state del enlace. En una recarga o un enlace directo
  // no está, y ahí sí se consulta la API.
  // El `googleBooksId &&` del principio no es redundante: en una obra del
  // catálogo ese parámetro es undefined y, sin esta guarda, la comparación
  // `undefined === undefined` daba verdadera y se terminaba leyendo
  // `ubicacion.state.volumen` sobre un state null.
  const volumenPrecargado =
    googleBooksId && ubicacion.state?.volumen?.googleBooksId === googleBooksId
      ? ubicacion.state.volumen
      : null

  const [obra, setObra] = useState(null)
  const [complemento, setComplemento] = useState(null) // datos traídos de la API externa
  const [resenas, setResenas] = useState([])
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [noEncontrada, setNoEncontrada] = useState(false)
  const [intento, setIntento] = useState(0)
  const [redireccion, setRedireccion] = useState(null)
  const [relacionadas, setRelacionadas] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [refrescos, setRefrescos] = useState(0)

  // Alta al catálogo, disponible solo en la ficha de una obra no catalogada.
  const [catalogando, setCatalogando] = useState(false)
  const [errorAlta, setErrorAlta] = useState(null)
  const [haySesion, setHaySesion] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHaySesion(Boolean(data?.session)))
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) =>
      setHaySesion(Boolean(sesion)),
    )
    return () => data?.subscription?.unsubscribe()
  }, [])

  // El rol decide que acciones se muestran. Sin sesion queda null y no se
  // muestra ninguna accion que requiera identidad.
  useEffect(() => {
    const controlador = new AbortController()
    obtenerPerfilActual({ signal: controlador.signal })
      .then((datos) => !controlador.signal.aborted && setPerfil(datos))
      .catch(() => setPerfil(null))
    return () => controlador.abort()
  }, [haySesion])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador

    setCargando(true)
    setError(null)
    setNoEncontrada(false)
    setComplemento(null)
    setDisponibilidad(null)
    setResenas([])
    setRelacionadas([])
    setRedireccion(null)

    async function cargar() {
      // ---- Obra todavía no catalogada ----
      if (googleBooksId) {
        // Pudo haberse catalogado entre la búsqueda y este click: en ese caso
        // la ficha buena es la de la obra real, con sus reseñas.
        const catalogados = await buscarCatalogadosPorGoogleIds([googleBooksId], { signal })
        const idExistente = catalogados.get(googleBooksId)
        if (idExistente) {
          if (!signal.aborted) setRedireccion(`/obra/${idExistente}`)
          return
        }

        const volumen = volumenPrecargado ?? (await obtenerVolumenPorId(googleBooksId, { signal }))
        if (signal.aborted) return

        if (!volumen) {
          setNoEncontrada(true)
          setCargando(false)
          return
        }

        const obraExterna = obraDesdeVolumen(volumen)
        setObra(obraExterna)
        setComplemento(volumen)
        setCargando(false)

        obtenerObrasRelacionadas(obraExterna, { signal })
          .then((datos) => !signal.aborted && setRelacionadas(datos))
          .catch(() => setRelacionadas([]))

        // El año de la obra se refina aparte, sin bloquear la ficha: mientras
        // tanto se muestra el de la edición que trajo la búsqueda.
        resolverAnioPublicacion(volumen, { signal })
          .then((anio) => {
            if (!signal.aborted && anio) {
              setObra((actual) => (actual ? { ...actual, fechaPublicacionOriginal: anio } : actual))
            }
          })
          .catch(() => {})
        return
      }

      // ---- Obra del catálogo ----
      const datosObra = await obtenerObraPorId(idObra, { signal })

      if (!datosObra) {
        if (!signal.aborted) {
          setNoEncontrada(true)
          setCargando(false)
        }
        return
      }

      if (signal.aborted) return
      setObra(datosObra)
      setCargando(false)

      // Metrica: se registra una vez por visita. No espera respuesta ni la
      // reporta, porque un fallo de metricas no es asunto del usuario.
      registrarVisualizacion(datosObra.id)

      // Las reseñas son parte de la ficha pero no deben bloquear su render.
      obtenerResenasDeObra(datosObra.id, { signal })
        .then(setResenas)
        .catch(() => setResenas([]))

      obtenerObrasRelacionadas(datosObra, { signal })
        .then((datos) => !signal.aborted && setRelacionadas(datos))
        .catch(() => setRelacionadas([]))

      if (datosObra.tipo === TIPO_OBRA.LIBRO) {
        obtenerDisponibilidad(datosObra.id, { signal })
          .then(setDisponibilidad)
          .catch(() => setDisponibilidad(null))

        // Solo salimos a la API externa si el cache local está incompleto.
        const faltaInfo = !datosObra.portadaUrl || !datosObra.sinopsis
        if (faltaInfo && datosObra.googleBooksId) {
          obtenerVolumenPorId(datosObra.googleBooksId, { signal })
            .then(setComplemento)
            .catch(() => setComplemento(null)) // degradación silenciosa: lo local alcanza
        }
      }
    }

    cargar().catch((fallo) => {
      if (fallo.name === 'AbortError' || signal.aborted) return
      setError(fallo)
      setCargando(false)
    })

    return () => controlador.abort()
  }, [idObra, googleBooksId, volumenPrecargado, intento, refrescos])

  const incorporarAlCatalogo = useCallback(async () => {
    if (!complemento) return
    setCatalogando(true)
    setErrorAlta(null)
    try {
      const nuevoId = await catalogarLibro(complemento)
      // replace: la ficha externa deja de tener sentido una vez catalogada, y
      // no queremos que "atrás" vuelva a ella.
      navegar(`/obra/${nuevoId}`, { replace: true })
    } catch (fallo) {
      setErrorAlta(fallo.message)
      setCatalogando(false)
    }
  }, [complemento, navegar])

  if (redireccion) return <Navigate to={redireccion} replace />

  if (cargando) {
    return (
      <div role="status" className="space-y-6 py-4">
        <EnlaceVolver />
        <p className="text-sm text-slate-400">Cargando la ficha de la obra…</p>
        <div aria-hidden="true" className="flex animate-pulse gap-8">
          <div className="h-72 w-48 shrink-0 rounded-sm bg-slate-800/60" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-8 w-2/3 rounded-sm bg-slate-800/60" />
            <div className="h-4 w-1/3 rounded-sm bg-slate-800/60" />
            <div className="h-24 w-full rounded-sm bg-slate-800/40" />
          </div>
        </div>
      </div>
    )
  }

  if (noEncontrada) {
    return (
      <div className="space-y-6 py-4">
        <EnlaceVolver />
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
          <BookX aria-hidden="true" className="mx-auto size-7 text-slate-600" />
          <h2 className="mt-3 font-serif text-xl text-slate-200">Esta obra no existe</h2>
          <p className="mt-1 text-sm text-slate-500">
            Puede que haya sido dada de baja del catálogo o que el enlace esté mal.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 py-4">
        <EnlaceVolver />
        <div role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 p-8 text-center">
          <AlertCircle aria-hidden="true" className="mx-auto size-6 text-red-400" />
          <p className="mt-3 font-medium text-red-200">{error.message}</p>
          <button
            type="button"
            onClick={reintentar}
            className={`mt-4 rounded-full bg-(--color-brand-primary) px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${CLASES_FOCO}`}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!obra) return null

  // Lo local manda; Google Books solo rellena huecos.
  const portadaUrl = obra.portadaUrl ?? complemento?.portadaUrl ?? null
  const sinopsis = obra.sinopsis ?? complemento?.sinopsis ?? null
  const esLibro = obra.tipo === TIPO_OBRA.LIBRO
  // Sin id no hay fila en la base: la obra todavía no forma parte del catálogo.
  const estaCatalogada = obra.id !== null

  return (
    <article className="space-y-8 py-4">
      <EnlaceVolver />

      <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
        {/* ---------- COLUMNA IZQUIERDA: PORTADA Y METADATOS ---------- */}
        <div className="space-y-5">
          <PortadaObra obra={{ ...obra, portadaUrl }} className="h-72 w-48" />

          <dl className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2">
            {/* El género abre el catálogo ya filtrado, en vez de ser texto muerto. */}
            <Dato etiqueta="Género">
              {obra.genero && (
                <Link
                  to={`/catalogo?genero=${encodeURIComponent(obra.genero)}`}
                  className={`rounded-sm underline decoration-slate-600 underline-offset-2 hover:text-(--color-brand-cream) ${CLASES_FOCO}`}
                >
                  {obra.genero}
                </Link>
              )}
            </Dato>
            {/* En un libro importa cuándo se publicó la obra, no cuándo entró al
                catálogo. En un escrito de la comunidad es al revés: la fecha de
                publicación en LEER+ es la única que existe. */}
            {esLibro ? (
              <Dato etiqueta="Publicación">
                {formatearFecha(obra.fechaPublicacionOriginal ?? complemento?.fechaPublicacion)}
              </Dato>
            ) : (
              <Dato etiqueta="Publicado">{formatearFecha(obra.fechaPublicacion)}</Dato>
            )}
            <Dato etiqueta="Idioma">{nombreDeIdioma(obra.idioma ?? complemento?.idioma)}</Dato>
            <Dato etiqueta="ISBN">{obra.isbn ?? complemento?.isbn}</Dato>
            <Dato etiqueta="Editorial">{obra.editorial ?? complemento?.editorial}</Dato>
            <Dato etiqueta="Páginas">{complemento?.cantidadPaginas}</Dato>
          </dl>

          {esLibro && disponibilidad && disponibilidad.total > 0 && (
            <section
              aria-labelledby="titulo-disponibilidad"
              className="rounded-lg border border-(--color-brand-mint)/30 bg-(--color-brand-mint)/5 px-3 py-2.5"
            >
              <h2
                id="titulo-disponibilidad"
                className="flex items-center gap-2 text-sm font-medium text-(--color-brand-mint)"
              >
                <Library aria-hidden="true" className="size-4 shrink-0" />
                {disponibilidad.disponibles} de {disponibilidad.total}{' '}
                {disponibilidad.total === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}
              </h2>

              <ul className="mt-2 space-y-2">
                {disponibilidad.bibliotecas.map((biblioteca) => (
                  <li key={biblioteca.id} className="text-sm">
                    <p className="text-slate-200">{biblioteca.nombre}</p>
                    {biblioteca.direccion && (
                      <p className="text-xs text-slate-500">{biblioteca.direccion}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {biblioteca.disponibles > 0
                        ? `${biblioteca.disponibles} de ${biblioteca.total} disponible${
                            biblioteca.disponibles === 1 ? '' : 's'
                          }`
                        : 'Sin ejemplares disponibles'}
                      {biblioteca.ubicaciones.length > 0 && ` · ${biblioteca.ubicaciones.join(', ')}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}


          {!estaCatalogada && haySesion && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={incorporarAlCatalogo}
                disabled={catalogando}
                className={`flex w-full items-center justify-center gap-2 rounded-full bg-(--color-brand-primary) px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${CLASES_FOCO}`}
              >
                {catalogando ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <BookPlus aria-hidden="true" className="size-4" />
                )}
                {catalogando ? 'Agregando…' : 'Agregar al catálogo'}
              </button>

              {errorAlta && (
                <p role="alert" className="text-sm text-red-300">
                  {errorAlta}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ---------- COLUMNA DERECHA: CONTENIDO ---------- */}
        <div className="min-w-0 space-y-8">
          <header className="space-y-2 border-b border-(--color-brand-secondary)/25 pb-5">
            <EtiquetaTipo tipo={obra.tipo} />
            <h1 className="font-serif text-3xl leading-tight text-(--color-brand-cream)">
              {obra.titulo}
            </h1>
            {/* La atribución textual se mantiene siempre. El enlace al perfil solo
                si el autor lo tiene público: si lo desactivó, se lee el apodo
                pero no se navega. */}
            <p className="text-slate-400">
              {obra.idAutor && obra.perfilAutorPublico ? (
                <Link
                  to={`/autor/${obra.idAutor}`}
                  className={`rounded-sm underline decoration-slate-600 underline-offset-2 hover:text-(--color-brand-cream) ${CLASES_FOCO}`}
                >
                  {obra.autor}
                </Link>
              ) : (
                (obra.autor ?? complemento?.autorTexto ?? (
                  <span className="italic text-slate-500">Autoría no disponible</span>
                ))
              )}
            </p>

            {/* Etiquetas navegables. El catálogo todavía no filtra por etiqueta,
                así que se busca por texto, que es lo que hay hoy. */}
            {obra.etiquetas?.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {obra.etiquetas.map((etiqueta) => (
                  <li key={etiqueta}>
                    <Link
                      to={`/catalogo?titulo=${encodeURIComponent(etiqueta)}`}
                      className={`inline-block rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 transition-colors hover:border-(--color-brand-secondary) hover:text-(--color-brand-cream) ${CLASES_FOCO}`}
                    >
                      {etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {/* Siempre visible: con calificaciones muestra el promedio sobre 5,
                y sin ellas lo dice explícitamente. */}
            <div className="pt-1">
              <Estrellas valor={obra.promedioCalificacion} tamano={16} />
            </div>
          </header>

          <section aria-labelledby="titulo-sinopsis">
            <h2 id="titulo-sinopsis" className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Sinopsis
            </h2>
            {sinopsis ? (
              <p className="max-w-2xl whitespace-pre-line leading-relaxed text-slate-300">
                {sinopsis}
              </p>
            ) : (
              <p className="text-sm italic text-slate-500">
                Esta obra todavía no tiene una sinopsis cargada.
              </p>
            )}
          </section>

          {/* ---------- ACCIONES SEGÚN ROL ---------- */}
          <AccionesObra obra={obra} perfil={perfil} onCambio={() => setRefrescos((n) => n + 1)} />

          {/* ---------- FRAGMENTO AUTORIZADO ---------- */}
          {/* Solo para escritos: de un libro catalogado no tenemos texto propio,
              y la obra completa nunca se expone acá. */}
          {obra.tipo === TIPO_OBRA.ESCRITO && (
            <section aria-labelledby="titulo-fragmento">
              <h2
                id="titulo-fragmento"
                className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500"
              >
                Fragmento
              </h2>
              {obra.fragmento ? (
                <blockquote className="max-w-2xl whitespace-pre-line border-l-2 border-(--color-brand-secondary)/40 pl-4 leading-relaxed text-slate-300">
                  {obra.fragmento}
                </blockquote>
              ) : (
                <p className="text-sm italic text-slate-500">
                  El autor todavía no publicó un fragmento de esta obra.
                </p>
              )}
            </section>
          )}

          {/* ---------- RESEÑAS ---------- */}
          {/* Siempre presente, incluso vacía: forma parte de la ficha y hay que
              decir que todavía no hay reseñas en vez de omitir la sección. */}
          <section aria-labelledby="titulo-resenas">
            <h2
              id="titulo-resenas"
              className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500"
            >
              Reseñas de la comunidad
              {resenas.length > 0 && (
                <span className="ml-2 font-normal normal-case tracking-normal text-slate-600">
                  ({resenas.length})
                </span>
              )}
            </h2>

            {resenas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                Todavía nadie reseñó esta obra. Sé la primera persona en calificarla.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800 border-t border-slate-800">
                {resenas.map((resena) => (
                  <li key={resena.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-slate-200">
                        {resena.autor ?? 'Lector de la comunidad'}
                      </span>
                      <Estrellas valor={resena.calificacion} tamano={12} mostrarNumero={false} />
                      <span className="sr-only">
                        Calificó con {resena.calificacion} de 5 estrellas.
                      </span>
                      {formatearFecha(resena.fechaCreacion) && (
                        <time
                          dateTime={resena.fechaCreacion}
                          className="text-xs text-slate-500"
                        >
                          {formatearFecha(resena.fechaCreacion)}
                        </time>
                      )}
                      {resena.fechaEdicion && (
                        <span className="text-xs text-slate-600">(editada)</span>
                      )}
                    </div>
                    {resena.comentario && (
                      <p className="mt-2 max-w-2xl leading-relaxed text-slate-400">
                        {resena.comentario}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- MÁS DEL AUTOR ---------- */}
          {/* Se arman con el catálogo y se completan con obras de afuera, así la
              sección no queda vacía por tener el catálogo chico. Sin autoría
              conocida no hay nada que buscar y la sección no se muestra. */}
          {obra.autor && (
          <section aria-labelledby="titulo-relacionadas">
              <h2
                id="titulo-relacionadas"
                className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500"
              >
                Más del autor
              </h2>

              {relacionadas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                  No encontramos otras obras de esta autoría.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {relacionadas.map((otra) => (
                    <li key={otra.id ?? otra.googleBooksId}>
                      <Link
                        to={
                          otra.id
                            ? `/obra/${otra.id}`
                            : `/obra/externa/${otra.googleBooksId}`
                        }
                        state={otra.id ? undefined : { volumen: otra.volumen }}
                        className={`group flex gap-3 rounded-lg border border-slate-800 p-3 transition-colors hover:border-(--color-brand-secondary)/50 hover:bg-slate-900/60 ${CLASES_FOCO}`}
                      >
                        <PortadaObra obra={otra} className="h-20 w-14" />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-serif text-sm text-(--color-brand-cream) group-hover:underline">
                            {otra.titulo}
                          </h3>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {otra.autor ?? 'Autoría no disponible'}
                          </p>
                          <div className="mt-1.5">
                            <Estrellas valor={otra.promedioCalificacion} tamano={11} />
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </article>
  )
}
