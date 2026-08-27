import { useState } from 'react'

// Import de componentes base de los 3 módulos
import AuthModal from './features/usuarios/AuthModal'
import CatalogoBuscador from './features/contenido/CatalogoBuscador'
import GestionPrestamos from './features/bibliotecas/GestionPrestamos'

export default function App() {
  const [vistaActual, setVistaActual] = useState('catalogo')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-bold text-blue-400">LEER+ Platform</h1>
        <nav className="flex gap-2">
          <button 
            onClick={() => setVistaActual('login')}
            className={`px-3 py-1.5 rounded text-xs ${vistaActual === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Login / Registro (Dev 1)
          </button>
          <button 
            onClick={() => setVistaActual('catalogo')}
            className={`px-3 py-1.5 rounded text-xs ${vistaActual === 'catalogo' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Catálogo / Buscar (Dev 2)
          </button>
          <button 
            onClick={() => setVistaActual('prestamos')}
            className={`px-3 py-1.5 rounded text-xs ${vistaActual === 'prestamos' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Préstamos (Dev 3)
          </button>
        </nav>
      </header>

      <main className="flex-1">
        {vistaActual === 'login' && <AuthModal />}
        {vistaActual === 'catalogo' && <CatalogoBuscador />}
        {vistaActual === 'prestamos' && <GestionPrestamos />}
      </main>
    </div>
  )
}