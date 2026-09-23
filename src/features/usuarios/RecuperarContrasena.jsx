import { useState } from 'react'
import { Link } from 'react-router-dom'

import { solicitarRecuperacion } from './authApi'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState(null)

  const enviar = async (evento) => {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await solicitarRecuperacion(email)
      setEnviado(true)
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
      <h1 className="font-serif text-3xl text-(--color-brand-cream)">Recuperar contraseña</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Ingresá tu correo y te enviaremos un enlace para crear una contraseña nueva.</p>

      {enviado ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-lg bg-emerald-950/40 p-4 text-sm text-emerald-200">Si existe una cuenta asociada, recibirás el correo de recuperación.</p>
          <Link to="/ingresar" className="text-sm font-semibold text-(--color-brand-cream) hover:underline">Volver al ingreso</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-5">
          <label htmlFor="recuperar-email" className="block space-y-1.5 text-sm font-medium text-slate-300">
            <span>Correo electrónico</span>
            <input id="recuperar-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/40" />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={enviando} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-2.5 font-semibold text-white disabled:opacity-60">{enviando ? 'Enviando…' : 'Enviar enlace'}</button>
        </form>
      )}
    </section>
  )
}

