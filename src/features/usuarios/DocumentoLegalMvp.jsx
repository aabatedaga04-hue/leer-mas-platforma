import { Link } from 'react-router-dom'

import { CONTENIDO_LEGAL } from './legalContent'

export default function DocumentoLegalMvp({ tipo }) {
  const documento = CONTENIDO_LEGAL[tipo]
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Versión provisoria MVP-1</p>
      <h1 className="mt-2 font-serif text-3xl text-(--color-brand-cream)">{documento.titulo}</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
        {documento.parrafos.map((parrafo) => <p key={parrafo}>{parrafo}</p>)}
      </div>
      <Link to="/ingresar" className="mt-8 inline-block text-sm font-semibold text-(--color-brand-cream) hover:underline">Volver al registro</Link>
    </article>
  )
}

