import { useState } from 'react'

// Import de componentes base de los 3 módulos
import AuthModal from './features/usuarios/AuthModal'
import CatalogoBuscador from './features/contenido/CatalogoBuscador'
import GestionPrestamos from './features/bibliotecas/GestionPrestamos'

// Reemplazá 'logo.svg' por tu archivo real en src/assets/
import logoApp from './assets/LEER+ LOGOS-03.png' 

export default function App() {
  const [vistaActual, setVistaActual] = useState('catalogo')

  return (
    <div className="min-h-screen bg-[#181619] text-[#ffe3b3] flex flex-col font-sans selection:bg-[#b9113f] selection:text-[#ffe3b3]">
      
      {/* HEADER: BARRA DE NAVEGACIÓN SUPERIOR */}
      <header className="bg-[#211d22] border-b border-[#a8636e]/20 px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
        
        {/* Identidad de Marca */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#b9113f]/10 border border-[#b9113f]/30 rounded-xl">
            <img src={logoApp} alt="LEER+ Logo" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-[#ffe3b3]">LEER+</h1>
              <span className="text-[10px] bg-[#97b59d]/20 text-[#97b59d] px-2 py-0.5 rounded-full border border-[#97b59d]/30 font-semibold">v1.0</span>
            </div>
            <p className="text-xs text-[#cfcca8]/80 font-medium">Plataforma de Lectura y Escritura</p>
          </div>
        </div>

        {/* Selector de Módulos (Estilo Tabs) */}
        <nav className="flex items-center bg-[#181619] p-1 rounded-2xl border border-[#a8636e]/20">
          <button 
            onClick={() => setVistaActual('login')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              vistaActual === 'login' 
                ? 'bg-[#b9113f] text-[#ffe3b3] shadow-lg shadow-[#b9113f]/30' 
                : 'text-[#cfcca8] hover:text-[#ffe3b3] hover:bg-[#211d22]'
            }`}
          >
            Usuarios
          </button>

          <button 
            onClick={() => setVistaActual('catalogo')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              vistaActual === 'catalogo' 
                ? 'bg-[#b9113f] text-[#ffe3b3] shadow-lg shadow-[#b9113f]/30' 
                : 'text-[#cfcca8] hover:text-[#ffe3b3] hover:bg-[#211d22]'
            }`}
          >
            Contenido
          </button>

          <button 
            onClick={() => setVistaActual('prestamos')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              vistaActual === 'prestamos' 
                ? 'bg-[#b9113f] text-[#ffe3b3] shadow-lg shadow-[#b9113f]/30' 
                : 'text-[#cfcca8] hover:text-[#ffe3b3] hover:bg-[#211d22]'
            }`}
          >
            Bibliotecas
          </button>
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 flex flex-col gap-6">
        
        {/* Banner Informativo de Contexto */}
        <div className="flex items-center justify-between bg-[#211d22] border border-[#a8636e]/30 rounded-xl px-5 py-3 text-xs">
          <span className="text-[#cfcca8]">
            Entorno de desarrollo base &bull; Cambiar de vista usando las pestañas superiores.
          </span>
          <span className="text-[#97b59d] font-mono">
            Estado: {vistaActual.toUpperCase()}
          </span>
        </div>

        {/* Tarjeta Contenedora Principal */}
        <div className="bg-[#211d22] border border-[#a8636e]/20 rounded-2xl p-6 sm:p-8 shadow-2xl flex-1 backdrop-blur-sm">
          {vistaActual === 'login' && <AuthModal />}
          {vistaActual === 'catalogo' && <CatalogoBuscador />}
          {vistaActual === 'prestamos' && <GestionPrestamos />}
        </div>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="border-t border-[#a8636e]/15 py-4 px-8 text-center text-xs text-[#cfcca8]/60 flex flex-col sm:flex-row justify-between items-center gap-2 max-w-7xl w-full mx-auto">
        <span>LEER+ Platform &copy; 2026</span>
        <span className="text-[#97b59d]">Conectando lectores, autores y bibliotecas</span>
      </footer>
    </div>
  )
}