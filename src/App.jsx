import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import logoLeerMas from './assets/LEER+ LOGOS-03.png'
import LandingPage from './components/LandingPage'
import LimiteDeError from './components/LimiteDeError'
import GestionPrestamos from './features/bibliotecas/GestionPrestamos'
import CatalogoBuscador from './features/contenido/CatalogoBuscador'
import FichaObra from './features/contenido/FichaObra'
import AuthModal from './features/usuarios/AuthModal'
import { useAuth } from './features/usuarios/useAuth'
import DocumentoLegalMvp from './features/usuarios/DocumentoLegalMvp'
import EstadoSolicitud from './features/usuarios/EstadoSolicitud'
import RecuperarContrasena from './features/usuarios/RecuperarContrasena'
import RestablecerContrasena from './features/usuarios/RestablecerContrasena'
import RutaProtegida from './features/usuarios/RutaProtegida'
import VerificarCorreo from './features/usuarios/VerificarCorreo'

const CLASES_FOCO =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

const ETIQUETAS_ROL = {
  lector_escritor: 'Lector-Escritor',
  biblioteca: 'Biblioteca',
  editorial: 'Editorial',
  administrador: 'Administrador',
}

function clasesNav({ isActive }) {
  return `px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${CLASES_FOCO} ${
    isActive
      ? 'bg-(--color-brand-primary) text-white shadow-sm'
      : 'text-slate-400 hover:text-(--color-brand-cream)'
  }`
}

export default function App() {
  const { perfil, cargando, estaAutenticado, estaActivo, estaPendiente, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  // Una institucion pendiente queda encerrada en su vista de seguimiento.
  useEffect(() => {
    if (!cargando && estaAutenticado && estaPendiente) {
      const permitidas = ['/estado-solicitud', '/verificar-correo', '/restablecer-contrasena']
      if (!permitidas.includes(ubicacion.pathname)) navegar('/estado-solicitud', { replace: true })
    }
  }, [cargando, estaAutenticado, estaPendiente, ubicacion.pathname, navegar])

  const salir = async () => {
    await cerrarSesion()
    navegar('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-(--color-brand-primary) selection:text-white">
      <header className="bg-slate-900/90 backdrop-blur-sm border-b border-(--color-brand-secondary)/30 px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <NavLink to={estaPendiente ? '/estado-solicitud' : '/'} className={`flex items-center gap-3 rounded-full hover:opacity-85 transition-opacity cursor-pointer ${CLASES_FOCO}`}>
          <img src={logoLeerMas} alt="Logo LEER+" className="h-10 w-auto object-contain" />
          <span className="text-2xl font-black text-(--color-brand-primary) tracking-wider">LEER<span className="text-(--color-brand-cream)">+</span></span>
        </NavLink>

        {!estaPendiente && (
          <nav aria-label="Navegación principal" className="flex gap-2 text-sm bg-slate-950/80 p-1.5 rounded-full border border-(--color-brand-secondary)/30">
            <NavLink to="/" end className={clasesNav}>Inicio</NavLink>
            <NavLink to="/catalogo" className={clasesNav}>Catálogo</NavLink>
            {estaActivo && perfil?.tipo_usuario === 'biblioteca' && <NavLink to="/gestion-prestamos" className={clasesNav}>Gestión Préstamos</NavLink>}
          </nav>
        )}

        <div>
          {estaAutenticado ? (
            <div className="flex gap-3 items-center bg-slate-800/80 px-4 py-1.5 rounded-full border border-(--color-brand-secondary)/40">
              <span className="text-xs font-semibold text-(--color-brand-cream) bg-(--color-brand-primary)/40 px-2 py-0.5 rounded-md border border-(--color-brand-primary)/50">
                {estaPendiente ? 'Solicitud pendiente' : ETIQUETAS_ROL[perfil?.tipo_usuario] || 'Usuario'}
              </span>
              <span className="hidden text-sm font-medium text-slate-100 sm:inline">{perfil?.nombre || perfil?.email}</span>
              <button onClick={salir} className={`text-red-400 hover:text-red-300 text-xs font-bold bg-red-950/40 hover:bg-red-950/80 px-2.5 py-1 rounded-full border border-red-900/40 transition-colors cursor-pointer ${CLASES_FOCO}`}>Salir</button>
            </div>
          ) : (
            <NavLink to="/ingresar" className={`inline-block bg-(--color-brand-primary) hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer ${CLASES_FOCO}`}>Ingresar / Registrarse</NavLink>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <LimiteDeError claveReinicio={ubicacion.pathname}>
          <Routes>
            <Route path="/" element={<LandingPage onIngresar={() => navegar('/ingresar')} />} />
            <Route path="/ingresar" element={estaActivo ? <Navigate to="/catalogo" replace /> : <AuthModal />} />
            <Route path="/verificar-correo" element={<VerificarCorreo />} />
            <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
            <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
            <Route path="/estado-solicitud" element={<EstadoSolicitud />} />
            <Route path="/terminos" element={<DocumentoLegalMvp tipo="terminos" />} />
            <Route path="/privacidad" element={<DocumentoLegalMvp tipo="privacidad" />} />

            <Route path="/catalogo" element={<CatalogoBuscador />} />
            <Route path="/obra/externa/:googleBooksId" element={<FichaObra />} />
            <Route path="/obra/:idObra" element={<FichaObra />} />

            <Route
              path="/gestion-prestamos"
              element={
                <RutaProtegida roles={['biblioteca']}>
                  <GestionPrestamos />
                </RutaProtegida>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LimiteDeError>
      </main>
    </div>
  )
}
