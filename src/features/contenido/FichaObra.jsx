/**
 * CU04 — Ficha de Obra.
 *
 * Combina tres fuentes:
 *   1. Supabase: obra + subtipo (escrito/libro), reseñas y ejemplares.
 *   2. Google Books: solo si la obra es un Libro y falta portada o sinopsis
 *      en el cache local. Los datos locales siempre tienen prioridad.
 *   3. Nada más: si Google Books falla, la ficha se muestra igual con lo local.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, BookX, ExternalLink, Library } from 'lucide-react'

import {
  TIPO_OBRA,
  obtenerDisponibilidad,
  obtenerObraPorId,
  obtenerResenasDeObra,
} from './catalogoApi'
import { Estrellas, EtiquetaTipo, PortadaObra } from './piezasObra'
import { obtenerVolumenPorId } from '../../services/googleBooksApi'

const CLASES_FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function formatearFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : formatoFecha.format(fecha)
}

function EnlaceVolver() {
  return (
    <Link
      to="/catalogo"
      className={`inline-flex items-center gap-1.5 rounded text-sm text-slate-400 transition-colors hover:text-[var(--color-brand-cream)] ${CLASES_FOCO}`}
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
  const { idObra } = useParams()

  const [obra, setObra] = useState(null)
  const [complemento, setComplemento] = useState(null) // datos traídos de Google Books
  const [resenas, setResenas] = useState([])
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [noEncontrada, setNoEncontrada] = useState(false)
  const [intento, setIntento] = useState(0)

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador

    setCargando(true)
    setError(null)
    setNoEncontrada(false)
    setComplemento(null)
    setDisponibilidad(null)

    async function cargar() {
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

      // Las reseñas son parte de la ficha pero no deben bloquear su render.
      obtenerResenasDeObra(datosObra.id, { signal })
        .then(setResenas)
        .catch(() => setResenas([]))

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
  }, [idObra, intento])

  if (cargando) {
    return (
      <div role="status" className="space-y-6 py-4">
        <EnlaceVolver />
        <p className="text-sm text-slate-400">Cargando la ficha de la obra…</p>
        <div aria-hidden="true" className="flex animate-pulse gap-8">
          <div className="h-72 w-48 shrink-0 rounded-sm bg-slate-800/60" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-8 w-2/3 rounded bg-slate-800/60" />
            <div className="h-4 w-1/3 rounded bg-slate-800/60" />
            <div className="h-24 w-full rounded bg-slate-800/40" />
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
            className={`mt-4 rounded-full bg-[var(--color-brand-primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${CLASES_FOCO}`}
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

  return (
    <article className="space-y-8 py-4">
      <EnlaceVolver />

      <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
        {/* ---------- COLUMNA IZQUIERDA: PORTADA Y METADATOS ---------- */}
        <div className="space-y-5">
          <PortadaObra obra={{ ...obra, portadaUrl }} className="h-72 w-48" />

          <dl className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2">
            <Dato etiqueta="Género">{obra.genero}</Dato>
            <Dato etiqueta="Publicación">{formatearFecha(obra.fechaPublicacion)}</Dato>
            <Dato etiqueta="ISBN">{obra.isbn ?? complemento?.isbn}</Dato>
            <Dato etiqueta="Editorial">{complemento?.editorial}</Dato>
            <Dato etiqueta="Páginas">{complemento?.cantidadPaginas}</Dato>
          </dl>

          {esLibro && disponibilidad && disponibilidad.total > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--color-brand-mint)]/30 bg-[var(--color-brand-mint)]/5 px-3 py-2.5 text-sm text-[var(--color-brand-mint)]">
              <Library aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {disponibilidad.disponibles} de {disponibilidad.total}{' '}
                {disponibilidad.total === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'} en
                bibliotecas
              </span>
            </p>
          )}

          {obra.contenidoUrl && (
            <a
              href={obra.contenidoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${CLASES_FOCO}`}
            >
              Leer el escrito
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          )}
        </div>

        {/* ---------- COLUMNA DERECHA: CONTENIDO ---------- */}
        <div className="min-w-0 space-y-8">
          <header className="space-y-2 border-b border-[var(--color-brand-secondary)]/25 pb-5">
            <EtiquetaTipo tipo={obra.tipo} />
            <h1 className="font-serif text-3xl leading-tight text-[var(--color-brand-cream)]">
              {obra.titulo}
            </h1>
            <p className="text-slate-400">
              {obra.autor ?? complemento?.autorTexto ?? (
                <span className="italic text-slate-500">Autoría no disponible</span>
              )}
            </p>
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

          {/* ---------- RESEÑAS ---------- */}
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
                Todavía nadie reseñó esta obra.
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
        </div>
      </div>
    </article>
  )
}
