/**
 * CU04 — Acciones de la ficha, habilitadas según el rol de quien mira.
 *
 * Copiar el enlace y compartir no necesitan sesión. El resto sí, y además
 * depende del rol: favoritos y listas son del lector, registrar ejemplar de la
 * biblioteca, recomendar de la editorial, y gestionar la obra solo de su autor.
 *
 * Sin sesión no se muestran deshabilitadas sino que no se muestran: un botón
 * apagado no aporta nada a quien no puede usarlo.
 */

import { useCallback, useEffect, useState } from 'react'
import { BookMarked, Check, Heart, Library, Link2, Loader2, Share2, Star } from 'lucide-react'

import {
  TIPO_OBRA,
  agregarObraALista,
  alternarFavorito,
  alternarRecomendada,
  estaEnFavoritos,
  estaRecomendadaPorEditorial,
  obtenerListasDelUsuario,
  registrarEjemplar,
} from './catalogoApi'

const CLASES_FOCO =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

const CLASES_BOTON =
  `inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm ` +
  `text-slate-300 transition-colors hover:border-(--color-brand-secondary) ` +
  `hover:text-(--color-brand-cream) disabled:cursor-not-allowed disabled:opacity-40 ${CLASES_FOCO}`

export default function AccionesObra({ obra, perfil, onCambio }) {
  const [favorito, setFavorito] = useState(null)
  const [recomendada, setRecomendada] = useState(false)
  const [listas, setListas] = useState([])
  const [enCurso, setEnCurso] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)

  const esLector = perfil?.tipo === 'lector_escritor'
  const esBiblioteca = perfil?.tipo === 'biblioteca'
  const esEditorial = perfil?.tipo === 'editorial'
  const esAutorPropio = Boolean(obra.idAutor) && obra.idAutor === perfil?.id
  const esLibro = obra.tipo === TIPO_OBRA.LIBRO

  useEffect(() => {
    if (!perfil || !obra.id) return
    const controlador = new AbortController()
    const { signal } = controlador

    if (esLector) {
      estaEnFavoritos(obra.id, { signal })
        .then((valor) => !signal.aborted && setFavorito(valor))
        .catch(() => {})
      obtenerListasDelUsuario({ signal })
        .then((valor) => !signal.aborted && setListas(valor))
        .catch(() => {})
    }

    if (esEditorial) {
      estaRecomendadaPorEditorial(obra.id, perfil.id, { signal })
        .then((valor) => !signal.aborted && setRecomendada(valor))
        .catch(() => {})
    }

    return () => controlador.abort()
  }, [obra.id, perfil, esLector, esEditorial])

  /** Anuncia el resultado en la región viva y lo limpia solo. */
  const anunciar = useCallback((texto) => {
    setAviso(texto)
    setError(null)
    setTimeout(() => setAviso(null), 4000)
  }, [])

  const ejecutar = useCallback(
    async (clave, accion) => {
      setEnCurso(clave)
      setError(null)
      try {
        await accion()
      } catch (fallo) {
        setError(fallo.message)
      } finally {
        setEnCurso(null)
      }
    },
    [],
  )

  const copiarEnlace = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      anunciar('Enlace copiado.')
    } catch {
      // El portapapeles falla sin HTTPS o sin permiso: se muestra la URL para
      // que se pueda copiar a mano en vez de dejar la acción sin respuesta.
      setError(`No se pudo copiar. El enlace es: ${url}`)
    }
  }

  const compartir = async () => {
    const datos = { title: obra.titulo, text: `${obra.titulo} en LEER+`, url: window.location.href }
    // navigator.share solo existe en móviles y contextos seguros.
    if (navigator.share) {
      try {
        await navigator.share(datos)
      } catch {
        // El usuario canceló el diálogo: no es un error que haya que reportar.
      }
      return
    }
    copiarEnlace()
  }

  return (
    <section aria-labelledby="titulo-acciones" className="space-y-3">
      <h2 id="titulo-acciones" className="sr-only">
        Acciones sobre la obra
      </h2>

      <div className="flex flex-wrap gap-2">
        {/* ---- Siempre disponibles, con o sin sesión ---- */}
        <button type="button" onClick={copiarEnlace} className={CLASES_BOTON}>
          <Link2 aria-hidden="true" className="size-4" />
          Copiar enlace
        </button>

        <button type="button" onClick={compartir} className={CLASES_BOTON}>
          <Share2 aria-hidden="true" className="size-4" />
          Compartir
        </button>

        {/* ---- Lector ---- */}
        {esLector && favorito !== null && (
          <button
            type="button"
            disabled={enCurso === 'favorito'}
            aria-pressed={favorito}
            onClick={() =>
              ejecutar('favorito', async () => {
                const nuevo = await alternarFavorito(obra.id, favorito)
                setFavorito(nuevo)
                anunciar(nuevo ? 'Agregada a favoritos.' : 'Quitada de favoritos.')
              })
            }
            className={`${CLASES_BOTON} ${
              favorito
                ? 'border-(--color-brand-primary) text-(--color-brand-cream)'
                : ''
            }`}
          >
            {enCurso === 'favorito' ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Heart
                aria-hidden="true"
                className={`size-4 ${favorito ? 'fill-(--color-brand-primary)' : ''}`}
              />
            )}
            {favorito ? 'En favoritos' : 'Agregar a favoritos'}
          </button>
        )}

        {/* ---- Editorial ---- */}
        {esEditorial && (
          <button
            type="button"
            disabled={enCurso === 'recomendada'}
            aria-pressed={recomendada}
            onClick={() =>
              ejecutar('recomendada', async () => {
                const nuevo = await alternarRecomendada(obra.id, recomendada)
                setRecomendada(nuevo)
                anunciar(nuevo ? 'Agregada a recomendadas.' : 'Quitada de recomendadas.')
              })
            }
            className={CLASES_BOTON}
          >
            {enCurso === 'recomendada' ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Star aria-hidden="true" className={`size-4 ${recomendada ? 'fill-current' : ''}`} />
            )}
            {recomendada ? 'En recomendadas' : 'Recomendar'}
          </button>
        )}

        {/* ---- Autor de la obra ---- */}
        {esAutorPropio && (
          <span className="inline-flex items-center gap-2 rounded-full border border-(--color-brand-mint)/40 px-4 py-2 text-sm text-(--color-brand-mint)">
            <Check aria-hidden="true" className="size-4" />
            Es tu obra
          </span>
        )}
      </div>

      {/* ---- Agregar a una lista ---- */}
      {esLector && listas.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="lista-destino" className="mb-1 block text-xs text-slate-500">
              Agregar a una lista
            </label>
            <select
              id="lista-destino"
              defaultValue=""
              disabled={enCurso === 'lista'}
              onChange={(evento) => {
                const idLista = evento.target.value
                evento.target.value = ''
                if (!idLista) return
                ejecutar('lista', async () => {
                  await agregarObraALista(Number(idLista), obra.id)
                  anunciar('Agregada a la lista.')
                })
              }}
              className={`rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 ${CLASES_FOCO}`}
            >
              <option value="">Elegí una lista…</option>
              {listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ---- Biblioteca: alta de ejemplar ---- */}
      {esBiblioteca && esLibro && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            const datos = new FormData(evento.currentTarget)
            const formulario = evento.currentTarget
            ejecutar('ejemplar', async () => {
              await registrarEjemplar({
                idLibro: obra.id,
                codigoInterno: String(datos.get('codigo') ?? ''),
                ubicacion: String(datos.get('ubicacion') ?? ''),
              })
              formulario.reset()
              anunciar('Ejemplar registrado.')
              onCambio?.()
            })
          }}
        >
          <div>
            <label htmlFor="ejemplar-codigo" className="mb-1 block text-xs text-slate-500">
              Código interno
            </label>
            <input
              id="ejemplar-codigo"
              name="codigo"
              required
              className={`rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 ${CLASES_FOCO}`}
            />
          </div>
          <div>
            <label htmlFor="ejemplar-ubicacion" className="mb-1 block text-xs text-slate-500">
              Ubicación (opcional)
            </label>
            <input
              id="ejemplar-ubicacion"
              name="ubicacion"
              className={`rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 ${CLASES_FOCO}`}
            />
          </div>
          <button type="submit" disabled={enCurso === 'ejemplar'} className={CLASES_BOTON}>
            {enCurso === 'ejemplar' ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Library aria-hidden="true" className="size-4" />
            )}
            Registrar ejemplar
          </button>
        </form>
      )}

      {/* Un ejemplar solo puede colgar de un libro catalogado, no de un escrito. */}
      {esBiblioteca && !esLibro && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <BookMarked aria-hidden="true" className="size-3.5" />
          Los ejemplares se registran sobre libros, no sobre escritos de la comunidad.
        </p>
      )}

      <p role="status" aria-live="polite" className="text-sm text-(--color-brand-mint)">
        {aviso}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  )
}
