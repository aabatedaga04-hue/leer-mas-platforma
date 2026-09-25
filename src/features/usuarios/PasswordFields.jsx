import { Check, Eye, EyeOff, X } from 'lucide-react'
import { useState } from 'react'

import { obtenerEstadoContrasena } from './authApi'
import { limpiarValidacion, mostrarValidacionEspanol } from './formValidation'

const INPUT =
  'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 pr-11 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30'

export function PasswordInput({ id, etiqueta, value, onChange, autoComplete, describedBy, invalid = false }) {
  const [visible, setVisible] = useState(false)
  return (
    <label htmlFor={id} className="block space-y-2.5 text-sm font-medium text-slate-300">
      <span>{etiqueta}</span>
      <span className="relative block">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={onChange}
          onInput={limpiarValidacion}
          onInvalid={mostrarValidacionEspanol}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={INPUT}
        />
        <button
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-(--color-brand-secondary)"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </span>
    </label>
  )
}

export function PasswordChecklist({ contrasena, id = 'requisitos-contrasena' }) {
  const requisitos = obtenerEstadoContrasena(contrasena)
  return (
    <div id={id} aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tu contraseña debe tener</p>
      <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {requisitos.map(({ id: clave, etiqueta, cumple }) => (
          <li key={clave} className={`flex items-center gap-2 ${cumple ? 'text-emerald-300' : 'text-slate-500'}`}>
            <span className={`grid size-5 place-items-center rounded-full ${cumple ? 'bg-emerald-500/15' : 'bg-slate-800'}`}>
              {cumple ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3" />}
            </span>
            {etiqueta}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PasswordMatch({ contrasena, confirmacion, id = 'coincidencia-contrasena' }) {
  if (!confirmacion) return null
  const coinciden = contrasena === confirmacion
  return (
    <p id={id} role="status" className={`flex items-center gap-2 text-xs ${coinciden ? 'text-emerald-300' : 'text-red-300'}`}>
      {coinciden ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
      {coinciden ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}
    </p>
  )
}
