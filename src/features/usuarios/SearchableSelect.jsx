import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { limpiarValidacion, mostrarValidacionEspanol } from './formValidation'

const INPUT =
  'w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30 disabled:cursor-not-allowed disabled:opacity-60'

function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export default function SearchableSelect({
  id,
  etiqueta,
  value,
  options,
  onSelect,
  placeholder,
  disabled = false,
  loading = false,
  error = null,
  required = false,
}) {
  const contenedor = useRef(null)
  const seleccion = options.find((opcion) => opcion.value === value)
  const [consulta, setConsulta] = useState(seleccion?.label ?? '')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    if (seleccion) setConsulta(seleccion.label)
    else if (!abierto) setConsulta('')
  }, [abierto, seleccion])

  useEffect(() => {
    const cerrar = (evento) => {
      if (!contenedor.current?.contains(evento.target)) {
        setAbierto(false)
        setConsulta(seleccion?.label ?? '')
      }
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [seleccion?.label])

  const filtradas = useMemo(() => {
    const busqueda = normalizar(consulta.trim())
    const resultado = busqueda
      ? options.filter((opcion) => normalizar(`${opcion.label} ${opcion.secondary ?? ''}`).includes(busqueda))
      : options
    return resultado.slice(0, 80)
  }, [consulta, options])

  const elegir = (opcion) => {
    onSelect(opcion)
    setConsulta(opcion.label)
    setAbierto(false)
  }

  const manejarTeclado = (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setAbierto(true)
      setActivo((actual) => Math.min(actual + 1, filtradas.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setActivo((actual) => Math.max(actual - 1, 0))
    } else if (evento.key === 'Enter' && abierto && filtradas[activo]) {
      evento.preventDefault()
      elegir(filtradas[activo])
    } else if (evento.key === 'Escape') {
      setAbierto(false)
      setConsulta(seleccion?.label ?? '')
    }
  }

  const mensaje = loading ? 'Cargando opciones…' : error

  return (
    <div ref={contenedor} className="relative space-y-2.5 text-sm font-medium text-slate-300">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={abierto}
          aria-controls={`${id}-opciones`}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          required={required}
          disabled={disabled || loading}
          placeholder={loading ? 'Cargando…' : placeholder}
          value={consulta}
          onFocus={(evento) => {
            setAbierto(true)
            setActivo(0)
            evento.currentTarget.select()
          }}
          onChange={(evento) => {
            limpiarValidacion(evento)
            setConsulta(evento.target.value)
            setAbierto(true)
            setActivo(0)
            if (value) onSelect(null)
          }}
          onKeyDown={manejarTeclado}
          onInvalid={mostrarValidacionEspanol}
          className={INPUT}
        />
        <ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500 transition ${abierto ? 'rotate-180' : ''}`} />
      </div>

      {mensaje && <p role={error ? 'alert' : 'status'} className={`text-xs ${error ? 'text-red-300' : 'text-slate-500'}`}>{mensaje}</p>}

      {abierto && !loading && !error && (
        <ul id={`${id}-opciones`} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl">
          {filtradas.length ? filtradas.map((opcion, indice) => (
            <li
              id={`${id}-opcion-${indice}`}
              key={opcion.value}
              role="option"
              aria-selected={opcion.value === value}
              onMouseDown={(evento) => evento.preventDefault()}
              onMouseEnter={() => setActivo(indice)}
              onClick={() => elegir(opcion)}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 font-normal ${indice === activo ? 'bg-(--color-brand-primary)/25 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <span>{opcion.label}</span>
              {opcion.secondary && <span className="ml-3 text-xs text-slate-500">{opcion.secondary}</span>}
            </li>
          )) : (
            <li className="px-3 py-3 font-normal text-slate-500">No encontramos coincidencias.</li>
          )}
        </ul>
      )}
    </div>
  )
}
