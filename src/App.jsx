import { useState } from 'react'
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

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const cerrarSesion = () => {
    setUsuario(null)
    navegar('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-(--color-brand-primary) selection:text-white">

      {/* HEADER / BARRA DE NAVEGACIÓN */}
      <header className="bg-slate-900/90 backdrop-blur-sm border-b border-(--color-brand-secondary)/30 px-6 py-3 flex justify-between items-center sticky top-0 z-50">

        {/* LOGO CON IMAGEN Y NOMBRE */}
        <NavLink
          to="/"
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

          {usuario && (
            <NavLink to="/gestion-prestamos" className={clasesNav}>
              Gestión Préstamos
            </NavLink>
          )}
        </nav>

        {/* ÁREA DE SESIÓN */}
        <div>
          {usuario ? (
            <div className="flex gap-3 items-center bg-slate-800/80 px-4 py-1.5 rounded-full border border-(--color-brand-secondary)/40">
              <span className="text-xs font-semibold text-(--color-brand-cream) bg-(--color-brand-primary)/40 px-2 py-0.5 rounded-md border border-(--color-brand-primary)/50">
                {usuario.rol || 'Usuario'}
              </span>
              <span className="text-sm font-medium text-slate-100">{usuario.nombre}</span>
              <button
                onClick={cerrarSesion}
                className={`text-red-400 hover:text-red-300 text-xs font-bold bg-red-950/40 hover:bg-red-950/80 px-2.5 py-1 rounded-full border border-red-900/40 transition-colors cursor-pointer ${CLASES_FOCO}`}
              >
                Salir
              </button>
            </div>
          ) : (
            <NavLink
              to="/ingresar"
              className={`inline-block bg-(--color-brand-primary) hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer ${CLASES_FOCO}`}
            >
              Ingresar / Registrarse
            </NavLink>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Contiene los fallos de render: sin esto, una excepción en cualquier
            vista deja la pantalla en blanco sin explicación. */}
        <LimiteDeError claveReinicio={ubicacion.pathname}>
        <Routes>
          <Route path="/" element={<LandingPage onIngresar={() => navegar('/ingresar')} />} />

          <Route
            path="/ingresar"
            element={
              <AuthModal
                onLoginSuccess={(u) => {
                  setUsuario(u)
                  navegar('/catalogo')
                }}
              />
            }
          />

          {/* Módulo Contenido: CU03 catálogo, CU04 ficha.
              La ruta "externa" va primero: cubre las obras que aparecen en la
              búsqueda pero todavía no se incorporaron al catálogo. */}
          <Route path="/catalogo" element={<CatalogoBuscador />} />
          <Route path="/obra/externa/:googleBooksId" element={<FichaObra />} />
          <Route path="/obra/:idObra" element={<FichaObra />} />

          <Route
            path="/gestion-prestamos"
            element={usuario ? <GestionPrestamos /> : <Navigate to="/ingresar" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LimiteDeError>
      </main>

    </div>
  )
}
