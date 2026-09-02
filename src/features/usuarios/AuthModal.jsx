import React from 'react'

export default function AuthModal({ onLoginSuccess }) {
  return (
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto text-center space-y-4">
      <h3 className="text-xl font-bold text-white">Iniciar Sesión (CU 01)</h3>
      <p className="text-slate-400 text-sm">Simulador de inicio de sesión de usuario</p>
      <button 
        onClick={() => onLoginSuccess({ nombre: 'Usuario Demo', rol: 'LectoEscritor' })}
        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full font-semibold transition-colors"
      >
        Simular Ingreso
      </button>
    </div>
  )
}