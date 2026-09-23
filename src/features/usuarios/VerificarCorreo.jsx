import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from './useAuth'

export default function VerificarCorreo() {
  const { cargando, estaAutenticado, perfil, refrescar } = useAuth()
  const navegar = useNavigate()

  useEffect(() => {
    if (estaAutenticado) refrescar()
  }, [estaAutenticado, refrescar])

  useEffect(() => {
    if (cargando || !perfil) return
    const destino = perfil.estado === 'activo' ? '/catalogo' : '/estado-solicitud'
    const temporizador = setTimeout(() => navegar(destino, { replace: true }), 1200)
    return () => clearTimeout(temporizador)
  }, [cargando, perfil, navegar])

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center">
      <h1 className="font-serif text-3xl text-(--color-brand-cream)">Verificación de correo</h1>
      {cargando ? (
        <p className="mt-4 text-slate-400">Validando el enlace…</p>
      ) : perfil ? (
        <p className="mt-4 text-slate-300">Correo verificado. Te estamos llevando al siguiente paso.</p>
      ) : (
        <div className="mt-4 space-y-4 text-sm text-slate-400">
          <p>El enlace no pudo validarse o ya venció. Podés ingresar o solicitar un nuevo correo de verificación.</p>
          <Link to="/ingresar" className="font-semibold text-(--color-brand-cream) hover:underline">Volver al ingreso</Link>
        </div>
      )}
    </section>
  )
}
