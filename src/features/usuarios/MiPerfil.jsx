import { Check, Pencil, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { consultarAliasDisponible } from './authApi'
import { limpiarValidacion, mostrarValidacionEspanol } from './formValidation'
import { actualizarPerfilBasico } from './perfilApi'
import { validarPerfilBasico } from './perfilValidation'
import SearchableSelect from './SearchableSelect'
import { cargarLocalidades, cargarPaises, cargarProvincias } from './ubicacionesApi'
import { useAuth } from './useAuth'

const CAMPO =
  'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30'

const TIPOS = {
  lector_escritor: 'Lector y escritor',
  biblioteca: 'Biblioteca',
  editorial: 'Editorial',
}

function datosDesdePerfil(perfil) {
  return {
    nombre: perfil?.nombre ?? '',
    apellido: perfil?.apellido ?? '',
    telefono: perfil?.telefono ?? '',
    pais: perfil?.pais ?? '',
    provincia: perfil?.provincia ?? '',
    localidad: perfil?.localidad ?? '',
    apodo: perfil?.detalle?.apodo ?? '',
    direccion: perfil?.detalle?.direccion ?? '',
    sitioWeb: perfil?.detalle?.sitio_web ?? '',
  }
}

function Campo({ id, etiqueta, ...props }) {
  return (
    <label htmlFor={id} className="block space-y-2.5 text-sm font-medium text-slate-300">
      <span>{etiqueta}</span>
      <input
        id={id}
        className={CAMPO}
        onInput={limpiarValidacion}
        onInvalid={mostrarValidacionEspanol}
        {...props}
      />
    </label>
  )
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="min-w-0 border-b border-slate-800/80 py-3 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{etiqueta}</dt>
      <dd className="mt-1 break-words text-sm text-slate-100">{valor || 'Sin completar'}</dd>
    </div>
  )
}

export default function MiPerfil() {
  const { perfil, refrescar } = useAuth()
  const [editando, setEditando] = useState(false)
  const [datos, setDatos] = useState(() => datosDesdePerfil(perfil))
  const [cambiarUbicacion, setCambiarUbicacion] = useState(false)
  const [paises, setPaises] = useState([])
  const [provincias, setProvincias] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [paisElegido, setPaisElegido] = useState(null)
  const [provinciaElegida, setProvinciaElegida] = useState(null)
  const [cargandoLugar, setCargandoLugar] = useState(false)
  const [errorLugar, setErrorLugar] = useState(null)
  const [estadoAlias, setEstadoAlias] = useState(null)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const solicitudLugar = useRef(0)

  useEffect(() => {
    if (!editando) setDatos(datosDesdePerfil(perfil))
  }, [perfil, editando])

  useEffect(() => {
    if (!editando || perfil?.tipo_usuario !== 'lector_escritor') return undefined
    const original = perfil.detalle?.apodo?.trim().toLocaleLowerCase('es')
    const nuevo = datos.apodo.trim()
    if (nuevo.toLocaleLowerCase('es') === original) return undefined
    if (nuevo.length < 3) return undefined

    let vigente = true
    const temporizador = setTimeout(() => {
      consultarAliasDisponible(nuevo)
        .then((disponible) => vigente && setEstadoAlias(disponible ? 'disponible' : 'ocupado'))
        .catch(() => vigente && setEstadoAlias('error'))
    }, 450)
    return () => { vigente = false; clearTimeout(temporizador) }
  }, [datos.apodo, editando, perfil])

  const actualizar = (campo) => (evento) => {
    setDatos((actual) => ({ ...actual, [campo]: evento.target.value }))
    setError(null)
    if (campo === 'apodo') setEstadoAlias(null)
  }

  const iniciarEdicion = () => {
    setDatos(datosDesdePerfil(perfil))
    setEditando(true)
    setError(null)
    setAviso(null)
  }

  const descartar = () => {
    solicitudLugar.current += 1
    setDatos(datosDesdePerfil(perfil))
    setEditando(false)
    setCambiarUbicacion(false)
    setConfirmarDescarte(false)
    setError(null)
    setErrorLugar(null)
    setEstadoAlias(null)
    setCargandoLugar(false)
  }

  const cancelar = () => {
    if (JSON.stringify(datos) !== JSON.stringify(datosDesdePerfil(perfil))) setConfirmarDescarte(true)
    else descartar()
  }

  const iniciarCambioUbicacion = async () => {
    const solicitud = ++solicitudLugar.current
    setCambiarUbicacion(true)
    setCargandoLugar(true)
    setErrorLugar(null)
    try {
      const opciones = await cargarPaises()
      if (solicitud === solicitudLugar.current) setPaises(opciones)
    } catch {
      if (solicitud === solicitudLugar.current) setErrorLugar('No pudimos cargar los países. Podés conservar tu ubicación actual e intentar más tarde.')
    } finally {
      if (solicitud === solicitudLugar.current) setCargandoLugar(false)
    }
  }

  const seleccionarPais = async (opcion) => {
    const solicitud = ++solicitudLugar.current
    setPaisElegido(opcion)
    setProvinciaElegida(null)
    setProvincias([])
    setLocalidades([])
    setDatos((actual) => ({
      ...actual,
      pais: opcion?.label ?? '', provincia: '', localidad: '',
      telefono: opcion
        ? `${opcion.codigoTelefonico} ${actual.telefono.replace(/^\+[0-9-]{1,8}\s*/, '')}`
        : actual.telefono,
    }))
    if (!opcion) { setCargandoLugar(false); return }

    setCargandoLugar(true)
    setErrorLugar(null)
    try {
      const opciones = await cargarProvincias(opcion.nombreApi, opcion.value)
      if (solicitud === solicitudLugar.current) setProvincias(opciones)
    } catch {
      if (solicitud === solicitudLugar.current) setErrorLugar('No pudimos cargar las provincias. Volvé a seleccionar el país para reintentar.')
    } finally {
      if (solicitud === solicitudLugar.current) setCargandoLugar(false)
    }
  }

  const seleccionarProvincia = async (opcion) => {
    const solicitud = ++solicitudLugar.current
    setProvinciaElegida(opcion)
    setLocalidades([])
    setDatos((actual) => ({ ...actual, provincia: opcion?.label ?? '', localidad: '' }))
    if (!opcion || !paisElegido) { setCargandoLugar(false); return }

    setCargandoLugar(true)
    setErrorLugar(null)
    try {
      const opciones = await cargarLocalidades(paisElegido.nombreApi, opcion.nombreApi)
      if (solicitud === solicitudLugar.current) setLocalidades(opciones)
    } catch {
      if (solicitud === solicitudLugar.current) setErrorLugar('No pudimos cargar las localidades. Volvé a seleccionar la provincia para reintentar.')
    } finally {
      if (solicitud === solicitudLugar.current) setCargandoLugar(false)
    }
  }

  const cancelarCambioUbicacion = () => {
    solicitudLugar.current += 1
    const anterior = datosDesdePerfil(perfil)
    const numero = datos.telefono.replace(/^\+[0-9-]{1,8}\s*/, '')
    const codigoAnterior = anterior.telefono.match(/^(\+[0-9-]{1,8})\s/)?.[1] ?? ''
    setDatos((actual) => ({
      ...actual, pais: anterior.pais, provincia: anterior.provincia,
      localidad: anterior.localidad, telefono: `${codigoAnterior} ${numero}`.trim(),
    }))
    setCambiarUbicacion(false)
    setPaisElegido(null)
    setProvinciaElegida(null)
    setErrorLugar(null)
    setCargandoLugar(false)
  }

  const guardar = async (evento) => {
    evento.preventDefault()
    setError(null)
    if (cambiarUbicacion && (!paisElegido || !provinciaElegida || !datos.localidad)) {
      setError('Seleccioná un país, una provincia y una localidad de las listas, o conservá la ubicación anterior.')
      return
    }
    const errores = validarPerfilBasico(datos, perfil.tipo_usuario)
    if (errores.length) { setError(errores[0]); return }
    if (estadoAlias === 'ocupado') { setError('Ese alias ya está en uso. Elegí otro.'); return }

    setGuardando(true)
    try {
      await actualizarPerfilBasico(datos, perfil.tipo_usuario)
      const actualizado = await refrescar()
      if (!actualizado) throw new Error('Guardamos los cambios, pero no pudimos volver a cargar el perfil. Recargá la página para comprobarlos.')
      setAviso('Tu perfil se actualizó correctamente.')
      setEditando(false)
      setCambiarUbicacion(false)
      setEstadoAlias(null)
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setGuardando(false)
    }
  }

  if (!perfil) return <p className="py-16 text-center text-slate-400">No pudimos cargar tu perfil. Recargá la página para intentarlo nuevamente.</p>

  const esPersonal = perfil.tipo_usuario === 'lector_escritor'
  const esBiblioteca = perfil.tipo_usuario === 'biblioteca'
  const esEditorial = perfil.tipo_usuario === 'editorial'
  const telefono = datos.telefono.match(/^(\+[0-9-]{1,8})\s*(.*)$/)

  return (
    <section className="mx-auto max-w-4xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-(--color-brand-secondary)">Tu espacio en LEER+</p>
          <h1 className="mt-2 font-serif text-4xl text-(--color-brand-cream)">Mi perfil</h1>
          <p className="mt-2 text-sm text-slate-400">{TIPOS[perfil.tipo_usuario] ?? 'Cuenta'} · Datos de tu cuenta</p>
        </div>
        {!editando && (
          <button type="button" onClick={iniciarEdicion} className="inline-flex items-center gap-2 rounded-full border border-(--color-brand-secondary)/50 px-4 py-2 text-sm font-semibold text-(--color-brand-cream) transition hover:bg-(--color-brand-primary)/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-cream)">
            <Pencil aria-hidden="true" className="size-4" /> Editar perfil
          </button>
        )}
      </header>

      {aviso && <p role="status" className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">{aviso}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>}

      {!editando ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="font-serif text-2xl text-(--color-brand-cream)">Identidad y contacto</h2>
            <dl className="mt-4">
              <Dato etiqueta="Nombre" valor={perfil.nombre} />
              <Dato etiqueta="Apellido" valor={perfil.apellido} />
              <Dato etiqueta="Correo de acceso" valor={perfil.email} />
              <Dato etiqueta="Teléfono" valor={perfil.telefono} />
              <Dato etiqueta="Ubicación" valor={[perfil.localidad, perfil.provincia, perfil.pais].filter(Boolean).join(', ')} />
            </dl>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="font-serif text-2xl text-(--color-brand-cream)">{esPersonal ? 'Tu nombre en la comunidad' : 'Datos de la institución'}</h2>
            <dl className="mt-4">
              {esPersonal && <Dato etiqueta="Alias público" valor={perfil.detalle?.apodo} />}
              {esBiblioteca && <><Dato etiqueta="Nombre verificado" valor={perfil.detalle?.nombre} /><Dato etiqueta="CUIT verificado" valor={perfil.detalle?.cuit} /><Dato etiqueta="Dirección" valor={perfil.detalle?.direccion} /></>}
              {esEditorial && <><Dato etiqueta="Razón social verificada" valor={perfil.detalle?.razon_social} /><Dato etiqueta="CUIT verificado" valor={perfil.detalle?.cuit} /><Dato etiqueta="Sitio web" valor={perfil.detalle?.sitio_web} /></>}
            </dl>
            {!esPersonal && <p className="mt-5 text-xs leading-5 text-slate-500">Los datos institucionales verificados no se pueden cambiar directamente desde el perfil.</p>}
          </div>
        </div>
      ) : (
        <form onSubmit={guardar} className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-(--color-brand-cream)">Datos de contacto</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Campo id="perfil-nombre" etiqueta="Nombre" required maxLength={100} autoComplete="given-name" value={datos.nombre} onChange={actualizar('nombre')} />
              <Campo id="perfil-apellido" etiqueta="Apellido" required maxLength={100} autoComplete="family-name" value={datos.apellido} onChange={actualizar('apellido')} />
              <div className="space-y-2.5 text-sm font-medium text-slate-300">
                <span>Correo de acceso</span>
                <p className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-slate-400">{perfil.email}</p>
                <p className="text-xs font-normal text-slate-500">El cambio de correo requiere verificación y se incorporará en otra etapa de CU02.</p>
              </div>
              <div className="space-y-2.5 text-sm font-medium text-slate-300">
                <label htmlFor="perfil-telefono">Teléfono</label>
                <div className="flex gap-2">
                  <input aria-label="Código de país" readOnly tabIndex={-1} value={telefono?.[1] ?? ''} className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2.5 text-center text-sm text-slate-300" />
                  <input id="perfil-telefono" type="tel" inputMode="tel" required pattern="[0-9 ()-]{6,20}" title="Ingresá entre 6 y 20 caracteres usando números, espacios, paréntesis o guiones." value={telefono?.[2] ?? datos.telefono} onChange={(evento) => setDatos((actual) => ({ ...actual, telefono: `${telefono?.[1] ?? ''} ${evento.target.value}`.trim() }))} onInput={limpiarValidacion} onInvalid={(evento) => mostrarValidacionEspanol(evento, { patron: 'Ingresá entre 6 y 20 caracteres usando números, espacios, paréntesis o guiones.' })} className={CAMPO} />
                </div>
              </div>
            </div>

            <div className="mt-7 border-t border-slate-800 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Ubicación</h3>
                  {!cambiarUbicacion && <p className="mt-1 text-sm text-slate-400">{[datos.localidad, datos.provincia, datos.pais].filter(Boolean).join(', ')}</p>}
                </div>
                <button type="button" onClick={cambiarUbicacion ? cancelarCambioUbicacion : iniciarCambioUbicacion} className="text-sm font-semibold text-(--color-brand-cream) hover:underline">
                  {cambiarUbicacion ? 'Conservar ubicación actual' : 'Cambiar ubicación'}
                </button>
              </div>
              {cambiarUbicacion && (
                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <SearchableSelect id="perfil-pais" etiqueta="País" value={paisElegido?.value ?? ''} options={paises} onSelect={seleccionarPais} placeholder="Buscá tu país" loading={cargandoLugar && !paises.length} error={errorLugar && !paises.length ? errorLugar : null} required />
                  <SearchableSelect id="perfil-provincia" etiqueta="Provincia o región" value={provinciaElegida?.value ?? ''} options={provincias} onSelect={seleccionarProvincia} placeholder="Seleccioná una provincia" disabled={!paisElegido || cargandoLugar} required />
                  <SearchableSelect id="perfil-localidad" etiqueta="Localidad" value={datos.localidad} options={localidades} onSelect={(opcion) => setDatos((actual) => ({ ...actual, localidad: opcion?.value ?? '' }))} placeholder="Seleccioná una localidad" disabled={!provinciaElegida || cargandoLugar} required />
                </div>
              )}
              {errorLugar && paises.length > 0 && <p role="alert" className="mt-3 text-xs text-red-300">{errorLugar}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-(--color-brand-cream)">{esPersonal ? 'Nombre en la comunidad' : 'Institución'}</h2>
            <div className="mt-5 space-y-5">
              {esPersonal && (
                <div>
                  <Campo id="perfil-apodo" etiqueta="Alias o nombre de usuario" required minLength={3} maxLength={50} value={datos.apodo} onChange={actualizar('apodo')} />
                  {estadoAlias && <p role="status" className={`mt-2 text-xs ${estadoAlias === 'disponible' ? 'text-emerald-300' : estadoAlias === 'ocupado' || estadoAlias === 'error' ? 'text-red-300' : 'text-slate-500'}`}>{estadoAlias === 'disponible' ? '✓ El alias está disponible.' : estadoAlias === 'ocupado' ? 'Ese alias ya está en uso.' : 'No pudimos comprobar la disponibilidad. Se verificará al guardar.'}</p>}
                </div>
              )}
              {esBiblioteca && <><p className="text-sm text-slate-400">{perfil.detalle?.nombre} · CUIT {perfil.detalle?.cuit}</p><Campo id="perfil-direccion" etiqueta="Dirección" required maxLength={255} autoComplete="street-address" value={datos.direccion} onChange={actualizar('direccion')} /></>}
              {esEditorial && <><p className="text-sm text-slate-400">{perfil.detalle?.razon_social} · CUIT {perfil.detalle?.cuit}</p><Campo id="perfil-sitio" etiqueta="Sitio web" type="url" maxLength={255} placeholder="https://..." value={datos.sitioWeb} onChange={actualizar('sitioWeb')} /></>}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={cancelar} disabled={guardando} className="rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={guardando || cargandoLugar} className="inline-flex items-center gap-2 rounded-full bg-(--color-brand-primary) px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"><Check aria-hidden="true" className="size-4" />{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>
      )}

      {confirmarDescarte && (
        <div role="dialog" aria-modal="true" aria-labelledby="descartar-titulo" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button type="button" onClick={() => setConfirmarDescarte(false)} aria-label="Cerrar" className="float-right text-slate-400 hover:text-white"><X aria-hidden="true" className="size-5" /></button>
            <h2 id="descartar-titulo" className="font-serif text-xl text-(--color-brand-cream)">¿Descartar cambios?</h2>
            <p className="mt-3 text-sm text-slate-400">Los cambios que no guardaste se perderán.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmarDescarte(false)} className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200">Seguir editando</button>
              <button type="button" onClick={descartar} className="rounded-full bg-(--color-brand-primary) px-4 py-2 text-sm font-semibold text-white">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
