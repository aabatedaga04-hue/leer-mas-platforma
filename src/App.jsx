import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

// Importación del Logo Oficial desde assets
import logoLeerMas from './assets/LEER+ LOGOS-03.png'

// Componente Compartido Global
import LandingPage from './components/LandingPage'
import LimiteDeError from './components/LimiteDeError'

// Archivos de Módulos (Features)
import AuthModal from './features/usuarios/AuthModal'
import CatalogoBuscador from './features/contenido/CatalogoBuscador'
import FichaObra from './features/contenido/FichaObra'
import GestionPrestamos from './features/bibliotecas/GestionPrestamos'
import { AuthProvider } from './features/usuarios/AuthProvider'
import { ControlesSesion, DesviarCuentaPendiente } from './features/usuarios/ControlesSesion'
import DocumentoLegalMvp from './features/usuarios/DocumentoLegalMvp'
import EstadoSolicitud from './features/usuarios/EstadoSolicitud'
import RecuperarContrasena from './features/usuarios/RecuperarContrasena'
import RestablecerContrasena from './features/usuarios/RestablecerContrasena'
import RutaProtegida from './features/usuarios/RutaProtegida'
import VerificarCorreo from './features/usuarios/VerificarCorreo'
import { useAuth } from './features/usuarios/useAuth'

const CLASES_FOCO =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

// La navegación pasó de useState a rutas reales para que la ficha de obra
// (CU04) tenga URL propia y el botón "atrás" del navegador funcione.
function clasesNav({ isActive }) {
  return `px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${CLASES_FOCO} ${
    isActive
      ? 'bg-(--color-brand-primary) text-white shadow-sm'
      : 'text-slate-400 hover:text-(--color-brand-cream)'
  }`
}

function AppContent() {
  const { perfil, estaActivo, estaPendiente } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-(--color-brand-primary) selection:text-white">

      <DesviarCuentaPendiente />

      {/* HEADER / BARRA DE NAVEGACIÓN */}
      <header className="bg-slate-900/90 backdrop-blur-sm border-b border-(--color-brand-secondary)/30 px-6 py-3 flex justify-between items-center sticky top-0 z-50">

        {/* LOGO CON IMAGEN Y NOMBRE */}
        <NavLink
          to={estaPendiente ? '/estado-solicitud' : '/'}
          className={`flex items-center gap-3 rounded-full hover:opacity-85 transition-opacity cursor-pointer ${CLASES_FOCO}`}
        >
          <img
            src={logoLeerMas}
            alt="Logo LEER+"
            className="h-10 w-auto object-contain"
          />
          <span className="text-2xl font-black text-(--color-brand-primary) tracking-wider">
            LEER<span className="text-(--color-brand-cream)">+</span>
          </span>
        </NavLink>

        {/* NAVEGACIÓN PRINCIPAL */}
        {!estaPendiente && (
          <nav
            aria-label="Navegación principal"
            className="flex gap-2 text-sm bg-slate-950/80 p-1.5 rounded-full border border-(--color-brand-secondary)/30"
          >
            <NavLink to="/" end className={clasesNav}>
              Inicio
            </NavLink>

            <NavLink to="/catalogo" className={clasesNav}>
              Catálogo
            </NavLink>

            {estaActivo && perfil?.tipo_usuario === 'biblioteca' && (
              <NavLink to="/gestion-prestamos" className={clasesNav}>
                Gestión Préstamos
              </NavLink>
            )}
          </nav>
        )}

        {/* ÁREA DE SESIÓN */}
        <div><ControlesSesion /></div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Contiene los fallos de render: sin esto, una excepción en cualquier
            vista deja la pantalla en blanco sin explicación. */}
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

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}
