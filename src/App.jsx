import { useState } from 'react'
import { 
  BookOpen, 
  User, 
  Search, 
  Library, 
  BookMarked, 
  PenTool, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  LogOut,
  ChevronDown,
  Users,
  Trophy,
  List,
  MessageSquare,
  Star,
  FilePlus,
  FileText
} from 'lucide-react'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('LectoEscritor')
  const [openDropdown, setOpenDropdown] = useState(null)

  // Configuración de navegación con Submenús
  const navOptionsByRole = {
    Admin: [
      { label: 'Dashboard', icon: ShieldCheck },
      { label: 'Gestión de Usuarios', icon: User },
      { label: 'Reportes de Sistema', icon: BookOpen }
    ],
    Biblioteca: [
      { label: 'Catálogo General', icon: Library },
      { label: 'Gestión de Préstamos', icon: BookMarked },
      { label: 'Devoluciones y Sanciones', icon: ShieldCheck }
    ],
    Editorial: [
      { label: 'Publicar Novedad', icon: Building2 },
      { label: 'Descubrir Autores', icon: Sparkles },
      { label: 'Mis Publicaciones', icon: BookOpen }
    ],
    LectoEscritor: [
      { 
        label: 'Mis Lecturas', 
        icon: BookMarked,
        subOptions: [
          { label: 'Listas de Lectura', icon: List },
          { label: 'Desafíos de Lectura', icon: Trophy }
        ]
      },
      { 
        label: 'Mis Escritos', 
        icon: PenTool,
        subOptions: [
          { label: 'Mis Obras', icon: FileText },
          { label: 'Publicar Escrito', icon: FilePlus }
        ]
      },
      { 
        label: 'Comunidad', 
        icon: Users,
        subOptions: [
          { label: 'Foros', icon: MessageSquare },
          { label: 'Reseñas', icon: Star }
        ]
      }
    ]
  }

  const toggleDropdown = (label) => {
    setOpenDropdown(openDropdown === label ? null : label)
  }

  // Login Estático
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <BookOpen className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">LEER+ Platform</h1>
          <p className="text-slate-400 text-sm text-center mb-6">Seleccioná un rol simulado para ingresar</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Rol de Usuario
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Admin">Administrador</option>
                <option value="Biblioteca">Biblioteca</option>
                <option value="Editorial">Editorial</option>
                <option value="LectoEscritor">LectoEscritor</option>
              </select>
            </div>

            <button
              onClick={() => setCurrentUser({ name: 'Usuario Demo', role: selectedRole })}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              Ingresar como {selectedRole}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Home Estático
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar Superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold tracking-tight text-white">LEER+</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
              {currentUser.role[0]}
            </div>
            <span className="text-xs font-medium text-slate-300">{currentUser.role}</span>
          </div>

          <button
            onClick={() => {
              setCurrentUser(null)
              setOpenDropdown(null)
            }}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Menú de Opciones y Desplegables */}
      <nav className="bg-slate-900/50 border-b border-slate-800/80 px-6 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-4 overflow-x-visible">
          {navOptionsByRole[currentUser.role]?.map((option, idx) => {
            const Icon = option.icon
            const hasSubOptions = option.subOptions && option.subOptions.length > 0
            const isOpen = openDropdown === option.label

            return (
              <div key={idx} className="relative">
                <button
                  onClick={() => hasSubOptions && toggleDropdown(option.label)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isOpen 
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{option.label}</span>
                  {hasSubOptions && (
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Submenú Desplegable */}
                {hasSubOptions && isOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-50">
                    {option.subOptions.map((sub, subIdx) => {
                      const SubIcon = sub.icon
                      return (
                        <button
                          key={subIdx}
                          onClick={() => setOpenDropdown(null)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors text-left"
                        >
                          <SubIcon className="w-4 h-4 text-blue-400" />
                          {sub.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Barra de Búsqueda Global */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={`Buscar títulos, autores o usuarios en LEER+...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors text-slate-200 placeholder:text-slate-500"
          />
        </div>

        {/* Área Principal del Feed */}
        <div className="flex-1 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-slate-900/20">
          <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
          <h3 className="text-lg font-semibold text-slate-400 mb-1">
            Vista del Rol: {currentUser.role}
          </h3>
          <p className="text-sm text-slate-600 max-w-md">
            Lienzo para componentes dinámicos de este rol.
          </p>
        </div>
      </main>
    </div>
  )
}