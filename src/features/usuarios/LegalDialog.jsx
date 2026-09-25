import { X } from 'lucide-react'
import { useEffect } from 'react'

import { CONTENIDO_LEGAL } from './legalContent'

export default function LegalDialog({ tipo, onClose }) {
  const documento = tipo ? CONTENIDO_LEGAL[tipo] : null

  useEffect(() => {
    if (!documento) return undefined
    const cerrarConEscape = (evento) => {
      if (evento.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', cerrarConEscape)
    return () => document.removeEventListener('keydown', cerrarConEscape)
  }, [documento, onClose])

  if (!documento) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={(evento) => evento.target === evento.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-documento-legal" className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <button type="button" autoFocus onClick={onClose} aria-label="Cerrar documento" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-(--color-brand-secondary)">
          <X aria-hidden="true" className="size-5" />
        </button>
        <p className="pr-12 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Versión provisoria MVP-1</p>
        <h2 id="titulo-documento-legal" className="mt-2 pr-12 font-serif text-3xl text-(--color-brand-cream)">{documento.titulo}</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
          {documento.parrafos.map((parrafo) => <p key={parrafo}>{parrafo}</p>)}
        </div>
        <button type="button" onClick={onClose} className="mt-8 rounded-lg bg-(--color-brand-primary) px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Entendido</button>
      </section>
    </div>
  )
}
