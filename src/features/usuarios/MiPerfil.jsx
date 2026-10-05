import { Check, LockKeyhole, Pencil, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { consultarAliasDisponible } from './authApi'
import { limpiarValidacion, mostrarValidacionEspanol } from './formValidation'
import { actualizarPerfilBasico } from './perfilApi'
import { validarPerfilBasico } from './perfilValidation'
import SearchableSelect from './SearchableSelect'
import { cargarLocalidades, cargarPaises, cargarProvincias } from './ubicacionesApi'
import { useAuth } from './useAuth'

const INPUT =
  'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30'

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

function CampoPerfil({ etiqueta, valor, editable = true, activo = false, onEditar, onGuardar, onCancelar, guardando, editor, nota, amplio = false }) {
  return (
    <div className={`min-w-0 rounded-xl border px-4 py-3 transition-colors ${amplio ? 'min-[520px]:col-span-2' : ''} ${activo ? 'border-(--color-brand-secondary)/60 bg-slate-950/70' : 'border-slate-800/80 bg-slate-950/30 hover:border-slate-700'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{etiqueta}</p>
          {!activo && <p className="mt-1 break-words text-[15px] leading-6 text-slate-100">{valor || <span className="text-slate-500">Sin completar</span>}</p>}
        </div>
        {editable ? (
          !activo && <button type="button" onClick={onEditar} disabled={guardando} aria-label={`Editar ${etiqueta.toLowerCase()}`} title={`Editar ${etiqueta.toLowerCase()}`} className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-(--color-brand-secondary) hover:bg-slate-800 hover:text-(--color-brand-cream) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) disabled:cursor-not-allowed disabled:opacity-40"><Pencil aria-hidden="true" className="size-3.5" /></button>
        ) : <LockKeyhole aria-label="Dato no editable" className="mt-1 size-4 shrink-0 text-slate-600" />}
      </div>
      {activo && (
        <form onSubmit={onGuardar} className="mt-3 space-y-3">
          {editor}
          {nota && <p className="text-xs leading-5 text-slate-400">{nota}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onCancelar} disabled={guardando} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"><X aria-hidden="true" className="size-3.5" /> Cancelar</button>
            <button type="submit" disabled={guardando} className="inline-flex items-center gap-1 rounded-lg bg-(--color-brand-primary) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"><Check aria-hidden="true" className="size-3.5" /> {guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function MiPerfil({ perfilDemostracion = null, onGuardarVistaPrevia = null }) {
  const { perfil: perfilReal, refrescar } = useAuth()
  const perfil = perfilDemostracion ?? perfilReal
  const [campoActivo, setCampoActivo] = useState(null)
  const [campoPendiente, setCampoPendiente] = useState(null)
  const [datos, setDatos] = useState(() => datosDesdePerfil(perfil))
  const [paises, setPaises] = useState([])
  const [provincias, setProvincias] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [paisElegido, setPaisElegido] = useState(null)
  const [provinciaElegida, setProvinciaElegida] = useState(null)
  const [localidadElegida, setLocalidadElegida] = useState('')
  const [cargandoLugar, setCargandoLugar] = useState(false)
  const [errorLugar, setErrorLugar] = useState(null)
  const [estadoAlias, setEstadoAlias] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const solicitudLugar = useRef(0)

  useEffect(() => {
    if (!campoActivo) setDatos(datosDesdePerfil(perfil))
  }, [perfil, campoActivo])

  useEffect(() => {
    if (perfilDemostracion || campoActivo !== 'apodo' || perfil?.tipo_usuario !== 'lector_escritor') return undefined
    const original = perfil.detalle?.apodo?.trim().toLocaleLowerCase('es')
    const nuevo = datos.apodo.trim()
    if (nuevo.toLocaleLowerCase('es') === original || nuevo.length < 3) return undefined

    let vigente = true
    const temporizador = setTimeout(() => {
      consultarAliasDisponible(nuevo)
        .then((disponible) => vigente && setEstadoAlias(disponible ? 'disponible' : 'ocupado'))
        .catch(() => vigente && setEstadoAlias('error'))
    }, 450)
    return () => { vigente = false; clearTimeout(temporizador) }
  }, [datos.apodo, campoActivo, perfil, perfilDemostracion])

  const actualizar = (campo) => (evento) => {
    setDatos((actual) => ({ ...actual, [campo]: evento.target.value }))
    setError(null)
    if (campo === 'apodo') setEstadoAlias(null)
  }

  const cargarOpcionesPais = async () => {
    const solicitud = ++solicitudLugar.current
    setCargandoLugar(true)
    setErrorLugar(null)
    try {
      const opciones = await cargarPaises()
      if (solicitud === solicitudLugar.current) setPaises(opciones)
    } catch {
      if (solicitud === solicitudLugar.current) setErrorLugar('No pudimos cargar los países. Intentá nuevamente más tarde.')
    } finally {
      if (solicitud === solicitudLugar.current) setCargandoLugar(false)
    }
  }

  const activar = (campo) => {
    setDatos(datosDesdePerfil(perfil))
    setCampoActivo(campo)
    setError(null)
    setAviso(null)
    setErrorLugar(null)
    setEstadoAlias(null)
    setPaisElegido(null)
    setProvinciaElegida(null)
    setLocalidadElegida('')
    if (campo === 'ubicacion') cargarOpcionesPais()
  }

  const solicitarEdicion = (campo) => {
    if (campoActivo && JSON.stringify(datos) !== JSON.stringify(datosDesdePerfil(perfil))) {
      setCampoPendiente(campo)
      return
    }
    activar(campo)
  }

  const descartar = (siguienteCampo = null) => {
    solicitudLugar.current += 1
    setDatos(datosDesdePerfil(perfil))
    setCampoActivo(null)
    setCampoPendiente(null)
    setCargandoLugar(false)
    setErrorLugar(null)
    setError(null)
    setEstadoAlias(null)
    if (siguienteCampo) activar(siguienteCampo)
  }

  const cancelar = () => {
    if (JSON.stringify(datos) !== JSON.stringify(datosDesdePerfil(perfil))) setCampoPendiente('cancelar')
    else descartar()
  }

  const seleccionarPais = async (opcion) => {
    const solicitud = ++solicitudLugar.current
    setPaisElegido(opcion)
    setProvinciaElegida(null)
    setLocalidadElegida('')
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
    setLocalidadElegida('')
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

  const guardar = async (evento) => {
    evento.preventDefault()
    setError(null)
    if (campoActivo === 'ubicacion' && (!paisElegido || !provinciaElegida || !localidadElegida)) {
      setError('Seleccioná un país, una provincia y una localidad de las listas.')
      return
    }
    const errores = validarPerfilBasico(datos, perfil.tipo_usuario)
    if (errores.length) { setError(errores[0]); return }
    if (estadoAlias === 'ocupado') { setError('Ese alias ya está en uso. Elegí otro.'); return }

    if (onGuardarVistaPrevia) {
      onGuardarVistaPrevia(datos)
      setAviso('Cambio aplicado solo a esta vista previa. No se guardó en Supabase.')
      setCampoActivo(null)
      setEstadoAlias(null)
      return
    }

    setGuardando(true)
    try {
      await actualizarPerfilBasico(datos, perfil.tipo_usuario)
      const actualizado = await refrescar()
      if (!actualizado) throw new Error('Guardamos el cambio, pero no pudimos volver a cargar el perfil. Recargá la página para comprobarlo.')
      setAviso('Cambio guardado correctamente.')
      setCampoActivo(null)
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
  const ubicacion = [perfil.localidad, perfil.provincia, perfil.pais].filter(Boolean).join(', ')
  const campo = (clave, etiqueta, valor, editor, opciones = {}) => (
    <CampoPerfil key={clave} etiqueta={etiqueta} valor={valor} activo={campoActivo === clave}
      onEditar={() => solicitarEdicion(clave)} onGuardar={guardar} onCancelar={cancelar}
      guardando={guardando || cargandoLugar} editor={editor} {...opciones} />
  )
  const entrada = (clave, etiqueta, opciones = {}) => (
    <input id={`perfil-${clave}`} aria-label={etiqueta} className={INPUT} value={datos[clave]}
      onChange={actualizar(clave)} onInput={limpiarValidacion} onInvalid={mostrarValidacionEspanol} {...opciones} />
  )

  return (
    <section className="mx-auto max-w-4xl space-y-4 pb-10">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4">
        <div aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-(--color-brand-primary)/25 font-serif text-xl text-(--color-brand-cream)">{perfil.nombre?.[0]}{perfil.apellido?.[0]}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-(--color-brand-secondary)">Tu espacio en LEER+</p>
          <h1 className="font-serif text-2xl leading-tight text-(--color-brand-cream)">Mi perfil</h1>
        </div>
        <span className="rounded-full border border-(--color-brand-secondary)/35 bg-(--color-brand-primary)/10 px-3 py-1 text-xs font-medium text-(--color-brand-cream)">{TIPOS[perfil.tipo_usuario] ?? 'Cuenta'}</span>
      </header>

      {aviso && <p role="status" className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{aviso}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-(--color-brand-cream)">Datos de la cuenta</h2>
          <p className="text-xs text-slate-500">Usá el lápiz para cambiar un dato</p>
        </div>
        <div className="grid gap-2 min-[520px]:grid-cols-2">
          {campo('nombre', 'Nombre', perfil.nombre, entrada('nombre', 'Nombre', { required: true, maxLength: 100, autoComplete: 'given-name', autoFocus: true }))}
          {campo('apellido', 'Apellido', perfil.apellido, entrada('apellido', 'Apellido', { required: true, maxLength: 100, autoComplete: 'family-name', autoFocus: true }))}
          {esPersonal && campo('apodo', 'Alias o nombre de usuario', perfil.detalle?.apodo, <>
            {entrada('apodo', 'Alias o nombre de usuario', { required: true, minLength: 3, maxLength: 50, autoFocus: true })}
            {estadoAlias && <p role="status" className={`mt-2 text-xs ${estadoAlias === 'disponible' ? 'text-emerald-300' : 'text-red-300'}`}>{estadoAlias === 'disponible' ? '✓ El alias está disponible.' : estadoAlias === 'ocupado' ? 'Ese alias ya está en uso.' : 'No pudimos comprobarlo. Se verificará al guardar.'}</p>}
          </>, { nota: perfilDemostracion ? 'La disponibilidad del alias no se comprueba en la vista previa.' : null })}
          {campo('email', 'Correo de acceso', perfil.email, null, { editable: false, nota: 'El cambio de correo requiere verificación; llegará en otra etapa.' })}
          {campo('telefono', 'Teléfono', perfil.telefono, <div className="flex gap-2">
            <input aria-label="Código de país" readOnly tabIndex={-1} value={telefono?.[1] ?? ''} className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center text-sm text-slate-300" />
            <input id="perfil-telefono" aria-label="Número de teléfono" type="tel" inputMode="tel" required pattern="[0-9 ()-]{6,20}" title="Ingresá entre 6 y 20 caracteres usando números, espacios, paréntesis o guiones." value={telefono?.[2] ?? datos.telefono} onChange={(evento) => setDatos((actual) => ({ ...actual, telefono: `${telefono?.[1] ?? ''} ${evento.target.value}`.trim() }))} onInput={limpiarValidacion} onInvalid={(evento) => mostrarValidacionEspanol(evento, { patron: 'Ingresá entre 6 y 20 caracteres usando números, espacios, paréntesis o guiones.' })} className={INPUT} autoFocus />
          </div>)}
          {campo('ubicacion', 'Ubicación', ubicacion, <div className="grid gap-3 sm:grid-cols-3">
            <SearchableSelect id="perfil-pais" etiqueta="País" value={paisElegido?.value ?? ''} options={paises} onSelect={seleccionarPais} placeholder="Buscá tu país" loading={cargandoLugar && !paises.length} error={errorLugar && !paises.length ? errorLugar : null} required />
            <SearchableSelect id="perfil-provincia" etiqueta="Provincia o región" value={provinciaElegida?.value ?? ''} options={provincias} onSelect={seleccionarProvincia} placeholder="Seleccioná una provincia" disabled={!paisElegido || cargandoLugar} required />
            <SearchableSelect id="perfil-localidad" etiqueta="Localidad" value={localidadElegida} options={localidades} onSelect={(opcion) => { setLocalidadElegida(opcion?.value ?? ''); setDatos((actual) => ({ ...actual, localidad: opcion?.value ?? '' })) }} placeholder="Seleccioná una localidad" disabled={!provinciaElegida || cargandoLugar} required />
            {errorLugar && paises.length > 0 && <p role="alert" className="text-xs text-red-300 sm:col-span-3">{errorLugar}</p>}
          </div>, { amplio: campoActivo === 'ubicacion' || !esPersonal, nota: 'Al cambiar de país se actualiza el prefijo telefónico.' })}
        </div>
      </div>

      {(esBiblioteca || esEditorial) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-(--color-brand-cream)">Institución</h2>
            <p className="text-xs text-slate-500">Los datos verificados no se editan desde acá</p>
          </div>
          <div className="grid gap-2 min-[520px]:grid-cols-2">
            {esBiblioteca && campo('institucion', 'Nombre verificado', perfil.detalle?.nombre, null, { editable: false })}
            {esEditorial && campo('institucion', 'Razón social verificada', perfil.detalle?.razon_social, null, { editable: false })}
            {campo('cuit', 'CUIT verificado', perfil.detalle?.cuit, null, { editable: false })}
            {esBiblioteca && campo('direccion', 'Dirección', perfil.detalle?.direccion, entrada('direccion', 'Dirección', { required: true, maxLength: 255, autoComplete: 'street-address', autoFocus: true }), { amplio: true })}
            {esEditorial && campo('sitioWeb', 'Sitio web', perfil.detalle?.sitio_web, entrada('sitioWeb', 'Sitio web', { type: 'url', maxLength: 255, placeholder: 'https://...', autoFocus: true }), { amplio: true })}
          </div>
        </div>
      )}

      {campoPendiente !== null && (
        <div role="dialog" aria-modal="true" aria-labelledby="descartar-titulo" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 id="descartar-titulo" className="font-serif text-xl text-(--color-brand-cream)">¿Descartar el cambio?</h2>
            <p className="mt-3 text-sm text-slate-400">El dato que estás editando volverá a su valor anterior.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setCampoPendiente(null)} className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200">Seguir editando</button>
              <button type="button" onClick={() => descartar(campoPendiente === 'cancelar' ? null : campoPendiente)} className="rounded-full bg-(--color-brand-primary) px-4 py-2 text-sm font-semibold text-white">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
