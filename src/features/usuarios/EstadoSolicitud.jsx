import { Navigate } from 'react-router-dom'

import { useAuth } from './useAuth'

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente de revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

export default function EstadoSolicitud() {
  const { cargando, estaAutenticado, perfil, solicitud, cerrarSesion } = useAuth()

  if (cargando) return <p className="py-16 text-center text-slate-400">Consultando tu solicitud…</p>
  if (!estaAutenticado) return <Navigate to="/ingresar" replace />
  if (perfil?.estado === 'activo') return <Navigate to="/catalogo" replace />

  const esInstitucion = perfil?.tipo_usuario === 'biblioteca' || perfil?.tipo_usuario === 'editorial'
  if (!esInstitucion) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Cuenta pendiente de verificación</h1>
        <p className="mt-3 text-slate-400">Revisá tu correo electrónico para activar la cuenta.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-brand-secondary)">Registro institucional</p>
        <h1 className="mt-2 font-serif text-3xl text-(--color-brand-cream)">Estado de tu solicitud</h1>
        <p className="mt-2 text-sm text-slate-400">Esta cuenta solo puede consultar y completar el proceso de verificación.</p>
      </header>

      {solicitud ? (
        <div className="rounded-xl border border-(--color-brand-sand)/25 bg-(--color-brand-sand)/10 p-5">
          <p className="text-sm text-slate-400">Estado actual</p>
          <p className="mt-1 text-xl font-bold text-(--color-brand-cream)">{ETIQUETAS_ESTADO[solicitud.estado] ?? solicitud.estado}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {solicitud.estado === 'pendiente' && 'La FLC revisará los datos y los dos documentos enviados.'}
            {solicitud.estado === 'rechazada' && 'La solicitud fue rechazada. Contactá a la FLC para conocer los pasos siguientes.'}
            {solicitud.estado === 'aprobada' && 'La solicitud fue aprobada. Cerrá sesión e ingresá nuevamente para habilitar las funciones institucionales.'}
          </p>
        </div>
      ) : (
        <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-sm leading-6 text-red-100">
          No encontramos la solicitud institucional asociada. Los documentos se adjuntan durante el registro; contactá a la administración para revisar esta cuenta.
        </div>
      )}

      <button type="button" onClick={cerrarSesion} className="text-sm font-semibold text-slate-400 hover:text-white">Cerrar sesión</button>
    </section>
  )
}
