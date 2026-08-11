import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { BookOpen, Database } from 'lucide-react'

export default function App() {
  const [dbStatus, setDbStatus] = useState('Conectando a Supabase...')

  useEffect(() => {
    async function checkConnection() {
      const { error } = await supabase.from('test').select('*').limit(1)
      
      // Si el error es 42P01 (tabla 'test' no existe) o es null, la API Key y conexión son correctas
      if (!error || error.code === '42P01') {
        setDbStatus('¡Conexión exitosa a Supabase!')
      } else {
        setDbStatus(`Error de conexión: ${error.message}`)
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <BookOpen className="w-12 h-12 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">LEER+</h1>
        <p className="text-slate-400 text-sm mb-6">Entorno configurado correctamente.</p>
        
        <div className="flex items-center justify-center gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700">
          <Database className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">{dbStatus}</span>
        </div>
      </div>
    </div>
  )
}