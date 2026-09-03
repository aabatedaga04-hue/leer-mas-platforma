/**
 * Piezas visuales compartidas entre el catálogo (CU03) y la ficha de obra (CU04).
 * Viven acá para que ambas vistas muestren una obra de la misma manera.
 */

import { Star } from 'lucide-react'
import { TIPO_OBRA } from './catalogoApi'

/**
 * Calificación promedio. El detalle de estrellas es decorativo (aria-hidden):
 * el valor se anuncia una sola vez con un texto legible.
 */
export function Estrellas({ valor, tamano = 14, mostrarNumero = true }) {
  const promedio = Number(valor ?? 0)
  const llenas = Math.round(promedio)

  if (!promedio) {
    return <span className="text-xs text-slate-500">Sin calificaciones</span>
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((posicion) => (
          <Star
            key={posicion}
            size={tamano}
            className={
              posicion <= llenas
                ? 'fill-[var(--color-brand-cream)] text-[var(--color-brand-cream)]'
                : 'text-slate-700'
            }
          />
        ))}
      </span>
      {mostrarNumero && (
        <span className="text-xs font-medium text-slate-400">
          <span className="sr-only">Calificación promedio: </span>
          {promedio.toFixed(1)} de 5
        </span>
      )}
    </span>
  )
}

/** Etiqueta de subtipo. El color es redundante con el texto, nunca el único indicador. */
export function EtiquetaTipo({ tipo }) {
  const esEscrito = tipo === TIPO_OBRA.ESCRITO

  return (
    <span
      className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
        esEscrito ? 'text-[var(--color-brand-mint)]' : 'text-[var(--color-brand-sand)]'
      }`}
    >
      {esEscrito ? 'Escrito de la comunidad' : 'Libro catalogado'}
    </span>
  )
}

/**
 * Portada. Los Escritos no tienen columna de imagen en el schema, así que para
 * ellos (y para los Libros sin portada cacheada) se compone una tapa
 * tipográfica con la inicial del título en lugar de un ícono genérico.
 */
export function PortadaObra({ obra, className = 'h-24 w-16' }) {
  if (obra.portadaUrl) {
    return (
      <img
        src={obra.portadaUrl}
        alt={`Portada de ${obra.titulo}`}
        loading="lazy"
        className={`${className} shrink-0 rounded-sm object-cover ring-1 ring-slate-700/70`}
      />
    )
  }

  const inicial = obra.titulo?.trim()?.charAt(0)?.toUpperCase() ?? '?'
  const esEscrito = obra.tipo === TIPO_OBRA.ESCRITO

  return (
    <div
      role="img"
      aria-label={`Sin portada disponible para ${obra.titulo}`}
      className={`${className} flex shrink-0 items-center justify-center rounded-sm ring-1 ring-slate-700/70 ${
        esEscrito
          ? 'bg-gradient-to-br from-[var(--color-brand-primary)]/70 to-slate-900'
          : 'bg-gradient-to-br from-[var(--color-brand-secondary)]/60 to-slate-900'
      }`}
    >
      <span className="font-serif text-2xl text-[var(--color-brand-cream)]/80">{inicial}</span>
    </div>
  )
}
