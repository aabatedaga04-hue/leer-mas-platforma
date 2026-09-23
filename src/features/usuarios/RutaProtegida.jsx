import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

export default function RutaProtegida({ children, roles }) {
  const { cargando, estaAutenticado, estaActivo, perfil } = useAuth()
  const ubicacion = useLocation()

  if (cargando) {
    return <p className="py-16 text-center text-slate-400">Comprobando la sesión…</p>
  }

  if (!estaAutenticado) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />
  }

  if (!estaActivo) return <Navigate to="/estado-solicitud" replace />

  if (roles?.length && !roles.includes(perfil?.tipo_usuario)) {
    return <Navigate to="/catalogo" replace />
  }

  return children
}
