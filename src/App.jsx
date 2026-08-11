import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { BookOpen, CheckCircle, Database, AlertCircle } from 'lucide-react'

export default function App() {
  const [dbStatus, setDbStatus] = useState('Conectando a Supabase...')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    async function checkConnection() {
      try {
        // Consultamos la sesión actual de la base de datos para verificar que las API Keys son válidas y hay respuesta del servidor
        const { error } = await supabase.auth.getSession()
        
        if (error) {
          setDbStatus(`Error de autenticación: ${error.message}`)
          setIsConnected(false)
        } else {
          setDbStatus('¡Conexión exitosa y activa a Supabase!')
          setIsConnected(true)
        }
      } catch (err) {
        setDbStatus('No se pudo establecer comunicación con el servidor.')
        setIsConnected(false)
      }
    }
    
    checkConnection()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <BookOpen className="w-12 h-12 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">LEER+ Platform</h1>
        <p className="text-slate-400 text-sm mb-6">Entorno local configurado correctamente.</p>
        
        <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
          isConnected 
            ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300' 
            : 'bg-amber-950/50 border-amber-700/50 text-amber-300'
        }`}>
          {isConnected ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Database className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          )}
          <span className="text-sm font-medium">{dbStatus}</span>
        </div>
      </div>
    </div>
  )
}