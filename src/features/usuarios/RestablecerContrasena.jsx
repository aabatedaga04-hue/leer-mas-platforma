import { useState } from 'react'
import { Link } from 'react-router-dom'

import { actualizarContrasena, validarContrasena } from './authApi'

export default function RestablecerContrasena() {
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [actualizada, setActualizada] = useState(false)
  const [error, setError] = useState(null)

  const enviar = async (evento) => {
    evento.preventDefault()
    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await actualizarContrasena(contrasena)
      setActualizada(true)
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  const errores = contrasena ? validarContrasena(contrasena) : []

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
      <h1 className="font-serif text-3xl text-(--color-brand-cream)">Crear nueva contraseña</h1>
      {actualizada ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-lg bg-emerald-950/40 p-4 text-sm text-emerald-200">La contraseña fue actualizada correctamente.</p>
          <Link to="/ingresar" className="text-sm font-semibold text-(--color-brand-cream) hover:underline">Ir al inicio de sesión</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-6 space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-slate-300">
            <span>Nueva contraseña</span>
            <input type="password" autoComplete="new-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/40" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-300">
            <span>Confirmar contraseña</span>
            <input type="password" autoComplete="new-password" required value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/40" />
          </label>
          <p className={`text-xs ${errores.length ? 'text-amber-300' : 'text-slate-500'}`}>Mínimo 8 caracteres, una mayúscula, una minúscula y un carácter especial.</p>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={enviando} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-2.5 font-semibold text-white disabled:opacity-60">{enviando ? 'Actualizando…' : 'Guardar contraseña'}</button>
        </form>
      )}
    </section>
  )
}

