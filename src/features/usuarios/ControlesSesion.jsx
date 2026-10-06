import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from './useAuth'

const CLASES_FOCO =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

const ETIQUETAS_ROL = {
  lector_escritor: 'Lector-Escritor',
  biblioteca: 'Biblioteca',
  editorial: 'Editorial',
  administrador: 'Administrador',
}

export function DesviarCuentaPendiente() {
  const { cargando, estaAutenticado, estaPendiente } = useAuth()
  const ubicacion = useLocation()
  const permitidas = ['/estado-solicitud', '/verificar-correo', '/restablecer-contrasena']

  if (!cargando && estaAutenticado && estaPendiente && !permitidas.includes(ubicacion.pathname)) {
    return <Navigate to="/estado-solicitud" replace />
  }
  return null
}

export function ControlesSesion() {
  const { perfil, estaAutenticado, estaPendiente, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const nombreCuenta = perfil?.tipo_usuario === 'editorial'
    ? perfil?.detalle?.nombre_fantasia
    : perfil?.nombre

  const salir = async () => {
    await cerrarSesion()
    navegar('/')
  }

  if (!estaAutenticado) {
    return (
      <NavLink
        to="/ingresar"
        className={`inline-block bg-(--color-brand-primary) hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer ${CLASES_FOCO}`}
      >
        Ingresar / Registrarse
      </NavLink>
    )
  }

  return (
    <div className="flex gap-3 items-center bg-slate-800/80 px-4 py-1.5 rounded-full border border-(--color-brand-secondary)/40">
      <span className="text-xs font-semibold text-(--color-brand-cream) bg-(--color-brand-primary)/40 px-2 py-0.5 rounded-md border border-(--color-brand-primary)/50">
        {estaPendiente ? 'Solicitud pendiente' : ETIQUETAS_ROL[perfil?.tipo_usuario] || 'Usuario'}
      </span>
      <span className="hidden text-sm font-medium text-slate-100 sm:inline">{nombreCuenta || perfil?.email}</span>
      <button
        type="button"
        onClick={salir}
        className={`text-red-400 hover:text-red-300 text-xs font-bold bg-red-950/40 hover:bg-red-950/80 px-2.5 py-1 rounded-full border border-red-900/40 transition-colors cursor-pointer ${CLASES_FOCO}`}
      >
        Salir
      </button>
    </div>
  )
}
