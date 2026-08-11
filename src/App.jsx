import { BookOpen, Search, Library, UserCheck } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg text-center border border-slate-200">
        
        {/* Ícono principal */}
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-600 text-white p-4 rounded-full shadow-lg">
            <BookOpen className="w-12 h-12" />
          </div>
        </div>

        {/* Título y estado */}
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
          LEER+ Platform
        </h1>
        <p className="text-slate-600 mb-6">
          Entorno base configurado correctamente para el grupo.
        </p>

        {/* Muestra de íconos/módulos para probar Lucide */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-xs text-slate-500">
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col items-center gap-1 border">
            <Search className="w-5 h-5 text-indigo-500" />
            <span>Catálogo</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col items-center gap-1 border">
            <Library className="w-5 h-5 text-indigo-500" />
            <span>Biblioteca</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col items-center gap-1 border">
            <UserCheck className="w-5 h-5 text-indigo-500" />
            <span>Préstamos</span>
          </div>
        </div>

        {/* Etiqueta de estado */}
        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
          ✓ React + TailwindCSS + Lucide OK
        </span>
      </div>
    </div>
  )
}

export default App