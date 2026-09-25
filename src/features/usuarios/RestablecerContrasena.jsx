import { useState } from 'react'
import { Link } from 'react-router-dom'

import { actualizarContrasena, validarContrasena } from './authApi'
import { PasswordChecklist, PasswordInput, PasswordMatch } from './PasswordFields'

export default function RestablecerContrasena() {
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [actualizada, setActualizada] = useState(false)
  const [error, setError] = useState(null)
  const contrasenaValida = validarContrasena(contrasena).length === 0
  const coinciden = contrasena === confirmacion

  const enviar = async (evento) => {
    evento.preventDefault()
    if (!contrasenaValida) {
      setError('La contraseña no cumple todos los requisitos de seguridad.')
      return
    }
    if (!coinciden) {
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

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
      <h1 className="font-serif text-3xl text-(--color-brand-cream)">Crear nueva contraseña</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Elegí una clave segura que no uses en otros servicios.</p>
      {actualizada ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-lg bg-emerald-950/40 p-4 text-sm text-emerald-200">La contraseña fue actualizada correctamente.</p>
          <Link to="/ingresar" className="text-sm font-semibold text-(--color-brand-cream) hover:underline">Ir al inicio de sesión</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-7 space-y-5">
          <PasswordInput id="nueva-password" etiqueta="Nueva contraseña" autoComplete="new-password" value={contrasena} onChange={(evento) => setContrasena(evento.target.value)} describedBy="requisitos-restablecer" invalid={Boolean(contrasena) && !contrasenaValida} />
          <PasswordChecklist contrasena={contrasena} id="requisitos-restablecer" />
          <div className="space-y-2.5">
            <PasswordInput id="confirmar-nueva-password" etiqueta="Confirmar contraseña" autoComplete="new-password" value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} describedBy="coincidencia-restablecer" invalid={Boolean(confirmacion) && !coinciden} />
            <PasswordMatch contrasena={contrasena} confirmacion={confirmacion} id="coincidencia-restablecer" />
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={enviando} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{enviando ? 'Actualizando…' : 'Guardar contraseña'}</button>
        </form>
      )}
    </section>
  )
}
