import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

// Componente Compartido Global
import EncabezadoPrincipal from './components/EncabezadoPrincipal'
import LandingPage from './components/LandingPage'
import LimiteDeError from './components/LimiteDeError'
import PiePagina from './components/PiePagina'

// Archivos de Módulos (Features)
import AuthModal from './features/usuarios/AuthModal'
import CatalogoBuscador from './features/contenido/CatalogoBuscador'
import FichaObra from './features/contenido/FichaObra'
import GestionPrestamos from './features/bibliotecas/GestionPrestamos'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const cerrarSesion = () => {
    setUsuario(null)
    navegar('/')
  }

  return (
    <div className={`flex min-h-screen flex-col font-sans selection:bg-(--color-brand-primary) selection:text-white ${
      ubicacion.pathname === '/' ? 'bg-[#f4ede2] text-[#24171a]' : 'bg-slate-950 text-slate-100'
    }`}>
      <EncabezadoPrincipal usuario={usuario} onCerrarSesion={cerrarSesion} />

      {/* CONTENIDO PRINCIPAL */}
      <main className={ubicacion.pathname === '/' ? 'flex-1' : 'mx-auto w-full max-w-6xl flex-1 p-6'}>
        {/* Contiene los fallos de render: sin esto, una excepción en cualquier
            vista deja la pantalla en blanco sin explicación. */}
        <LimiteDeError claveReinicio={ubicacion.pathname}>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onIngresar={() => navegar('/ingresar')}
                onExplorar={() => navegar('/catalogo')}
              />
            }
          />

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
      {ubicacion.pathname === '/' && <PiePagina />}
    </div>
  )
}
