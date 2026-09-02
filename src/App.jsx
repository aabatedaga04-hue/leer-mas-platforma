import { useState } from 'react'

// Importación del Logo Oficial desde assets
import logoLeerMas from './assets/LEER+ LOGOS-03.png'

// Componente Compartido Global
import LandingPage from './components/LandingPage'

// Archivos de Módulos (Features)
import AuthModal from './features/usuarios/AuthModal'
import CatalogoBuscador from './features/contenido/CatalogoBuscador'
import GestionPrestamos from './features/bibliotecas/GestionPrestamos'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [vistaActual, setVistaActual] = useState('landing')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[var(--color-brand-primary)] selection:text-white">
      
      {/* HEADER / BARRA DE NAVEGACIÓN */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-[var(--color-brand-secondary)]/30 px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        
        {/* LOGO CON IMAGEN Y NOMBRE */}
        <button 
          onClick={() => setVistaActual('landing')} 
          className="flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer"
        >
          <img 
            src={logoLeerMas} 
            alt="Logo LEER+" 
            className="h-10 w-auto object-contain"
          />
          <span className="text-2xl font-black text-[var(--color-brand-primary)] tracking-wider">
            LEER<span className="text-[var(--color-brand-cream)]">+</span>
          </span>
        </button>

        {/* NAVEGACIÓN PRINCIPAL */}
        <nav className="flex gap-2 text-sm bg-slate-950/80 p-1.5 rounded-full border border-[var(--color-brand-secondary)]/30">
          <button 
            onClick={() => setVistaActual('landing')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              vistaActual === 'landing' 
                ? 'bg-[var(--color-brand-primary)] text-white shadow-sm' 
                : 'text-slate-400 hover:text-[var(--color-brand-cream)]'
            }`}
          >
            Inicio
          </button>
          
          <button 
            onClick={() => setVistaActual('catalogo')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              vistaActual === 'catalogo' 
                ? 'bg-[var(--color-brand-primary)] text-white shadow-sm' 
                : 'text-slate-400 hover:text-[var(--color-brand-cream)]'
            }`}
          >
            Catálogo
          </button>
          
          {usuario && (
            <button 
              onClick={() => setVistaActual('gestion-prestamos')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                vistaActual === 'gestion-prestamos' 
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-sm' 
                  : 'text-slate-400 hover:text-[var(--color-brand-cream)]'
              }`}
            >
              Gestión Préstamos
            </button>
          )}
        </nav>

        {/* ÁREA DE SESIÓN */}
        <div>
          {usuario ? (
            <div className="flex gap-3 items-center bg-slate-800/80 px-4 py-1.5 rounded-full border border-[var(--color-brand-secondary)]/40">
              <span className="text-xs font-semibold text-[var(--color-brand-cream)] bg-[var(--color-brand-primary)]/40 px-2 py-0.5 rounded-md border border-[var(--color-brand-primary)]/50">
                {usuario.rol || 'Usuario'}
              </span>
              <span className="text-sm font-medium text-slate-100">{usuario.nombre}</span>
              <button 
                onClick={() => { setUsuario(null); setVistaActual('landing'); }} 
                className="text-red-400 hover:text-red-300 text-xs font-bold bg-red-950/40 hover:bg-red-950/80 px-2.5 py-1 rounded-full border border-red-900/40 transition-colors cursor-pointer"
              >
                Salir
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setVistaActual('login')} 
              className="bg-[var(--color-brand-primary)] hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Ingresar / Registrarse
            </button>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {vistaActual === 'landing' && (
          <LandingPage onIngresar={() => setVistaActual('login')} />
        )}
        
        {vistaActual === 'login' && (
          <AuthModal onLoginSuccess={(u) => { setUsuario(u); setVistaActual('catalogo'); }} />
        )}
        
        {vistaActual === 'catalogo' && (
          <CatalogoBuscador />
        )}
        
        {vistaActual === 'gestion-prestamos' && (
          <GestionPrestamos />
        )}
      </main>

    </div>
  )
}