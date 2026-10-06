import { useState } from 'react'

import MiPerfil from './MiPerfil'

const EJEMPLOS = {
  lector_escritor: {
    tipo_usuario: 'lector_escritor', estado: 'activo',
    nombre: 'Alex', apellido: 'López', email: 'alex@ejemplo.com',
    telefono: '+54 11 1234-5678', pais: 'Argentina', provincia: 'Buenos Aires', localidad: 'La Plata',
    detalle: { apodo: 'alexlee' },
  },
  biblioteca: {
    tipo_usuario: 'biblioteca', estado: 'activo',
    nombre: 'Marina', apellido: 'García', email: 'biblioteca@ejemplo.com',
    telefono: '+54 11 1234-5678', pais: 'Argentina', provincia: 'Buenos Aires', localidad: 'La Plata',
    detalle: { nombre: 'Biblioteca del Encuentro', cuit: '30-00000000-0', direccion: 'Calle Ejemplo 123' },
  },
  editorial: {
    tipo_usuario: 'editorial', estado: 'activo',
    nombre: null, apellido: null, email: 'editorial@ejemplo.com',
    telefono: '+54 11 1234-5678', pais: 'Argentina', provincia: 'Buenos Aires', localidad: 'La Plata',
    detalle: { nombre_fantasia: 'Tinta Norte', razon_social: 'Editorial de Ejemplo S.A.', cuit: '30-00000000-0', sitio_web: 'https://ejemplo.com' },
  },
}

const TIPOS = [
  ['lector_escritor', 'Lector / escritor'],
  ['biblioteca', 'Biblioteca'],
  ['editorial', 'Editorial'],
]

export default function VistaPreviaPerfil() {
  const [tipo, setTipo] = useState('lector_escritor')
  const [perfil, setPerfil] = useState(EJEMPLOS.lector_escritor)

  const elegirTipo = (siguienteTipo) => {
    setTipo(siguienteTipo)
    setPerfil(EJEMPLOS[siguienteTipo])
  }

  const guardarLocalmente = (datos) => {
    setPerfil((actual) => ({
      ...actual,
      nombre: tipo === 'editorial' ? null : datos.nombre,
      apellido: tipo === 'editorial' ? null : datos.apellido,
      telefono: datos.telefono,
      pais: datos.pais,
      provincia: datos.provincia,
      localidad: datos.localidad,
      detalle: {
        ...actual.detalle,
        ...(tipo === 'lector_escritor' && { apodo: datos.apodo }),
        ...(tipo === 'biblioteca' && { direccion: datos.direccion }),
        ...(tipo === 'editorial' && { nombre_fantasia: datos.nombreFantasia, sitio_web: datos.sitioWeb }),
      },
    }))
  }

  return (
    <div>
      <aside className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-600/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        <div><p className="font-semibold">Vista previa local de CU02</p><p className="text-xs text-amber-100/70">Datos ficticios · Sin acceso a Supabase</p></div>
        <div role="group" aria-label="Tipo de perfil de ejemplo" className="flex flex-wrap gap-2">
          {TIPOS.map(([valor, etiqueta]) => (
            <button key={valor} type="button" onClick={() => elegirTipo(valor)} aria-pressed={tipo === valor}
              className={`rounded-full px-4 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${tipo === valor ? 'bg-amber-100 text-slate-950' : 'border border-amber-100/40 text-amber-100 hover:bg-amber-100/10'}`}>
              {etiqueta}
            </button>
          ))}
        </div>
      </aside>
      <MiPerfil key={tipo} perfilDemostracion={perfil} onGuardarVistaPrevia={guardarLocalmente} />
    </div>
  )
}
