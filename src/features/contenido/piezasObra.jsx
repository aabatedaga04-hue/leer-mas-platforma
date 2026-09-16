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
export function Estrellas({ valor, tamano = 14, mostrarNumero = true, tema = 'oscuro' }) {
  const promedio = Number(valor ?? 0)
  const llenas = Math.round(promedio)
  const sinCalificar = !promedio
  const esClaro = tema === 'claro'

  // Las cinco estrellas se dibujan siempre, también sin calificaciones: el
  // promedio tiene que ser visible en todas las obras, y una obra sin calificar
  // se lee como cinco estrellas vacías, no como la ausencia del indicador.
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((posicion) => (
          <Star
            key={posicion}
            size={tamano}
            className={
              posicion <= llenas
                ? esClaro
                  ? 'fill-(--color-brand-primary) text-(--color-brand-primary)'
                  : 'fill-(--color-brand-cream) text-(--color-brand-cream)'
                : esClaro
                  ? 'text-[#c5b5a5]'
                  : 'text-slate-700'
            }
          />
        ))}
      </span>
      {mostrarNumero && (
        <span className={`text-xs font-medium ${esClaro ? 'text-[#725d58]' : 'text-slate-400'}`}>
          {sinCalificar ? (
            <span className={esClaro ? 'text-[#8a746d]' : 'text-slate-500'}>Sin calificaciones</span>
          ) : (
            <>
              <span className="sr-only">Calificación promedio: </span>
              {promedio.toFixed(1)} de 5
            </>
          )}
        </span>
      )}
      {/* Sin el número visible, el dato igual tiene que llegar al lector de pantalla. */}
      {!mostrarNumero && (
        <span className="sr-only">
          {sinCalificar ? 'Sin calificaciones' : `Calificación: ${promedio.toFixed(1)} de 5`}
        </span>
      )}
    </span>
  )
}

/** Etiqueta de subtipo. El color es redundante con el texto, nunca el único indicador. */
export function EtiquetaTipo({ tipo, tema = 'oscuro' }) {
  const esEscrito = tipo === TIPO_OBRA.ESCRITO
  const esClaro = tema === 'claro'

  return (
    <span
      className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
        esEscrito
          ? esClaro ? 'text-[#55745f]' : 'text-(--color-brand-mint)'
          : esClaro ? 'text-[#8b4652]' : 'text-(--color-brand-sand)'
      }`}
    >
      {/* El estado de catalogación es interno: al lector solo le importa si es
          un libro o un escrito de la comunidad. */}
      {esEscrito ? 'Escrito de la comunidad' : 'Libro'}
    </span>
  )
}

/**
 * Portada. Los Escritos no tienen columna de imagen en el schema, así que para
 * ellos (y para los Libros sin portada cacheada) se compone una tapa
 * tipográfica con la inicial del título en lugar de un ícono genérico.
 */
export function PortadaObra({ obra, className = 'h-24 w-16', tema = 'oscuro' }) {
  const esClaro = tema === 'claro'

  if (obra.portadaUrl) {
    return (
      <img
        src={obra.portadaUrl}
        alt={`Portada de ${obra.titulo}`}
        loading="lazy"
        className={`${className} shrink-0 object-cover ring-1 ${esClaro ? 'ring-[#bcae9e]' : 'rounded-sm ring-slate-700/70'}`}
      />
    )
  }

  const inicial = obra.titulo?.trim()?.charAt(0)?.toUpperCase() ?? '?'
  const esEscrito = obra.tipo === TIPO_OBRA.ESCRITO

  return (
    <div
      role="img"
      aria-label={`Sin portada disponible para ${obra.titulo}`}
      className={`${className} flex shrink-0 items-center justify-center ring-1 ${esClaro ? 'ring-[#bcae9e]' : 'rounded-sm ring-slate-700/70'} ${
        esEscrito
          ? esClaro
            ? 'bg-linear-to-br from-(--color-brand-primary) to-[#4b1f2c]'
            : 'bg-linear-to-br from-(--color-brand-primary)/70 to-slate-900'
          : esClaro
            ? 'bg-linear-to-br from-(--color-brand-secondary) to-[#3d292c]'
            : 'bg-linear-to-br from-(--color-brand-secondary)/60 to-slate-900'
      }`}
    >
      <span className="font-serif text-2xl text-(--color-brand-cream)/80">{inicial}</span>
    </div>
  )
}
