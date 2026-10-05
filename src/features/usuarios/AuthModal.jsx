import { BookOpen, Building2, Check, Library } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from './useAuth'
import {
  consultarAliasDisponible,
  reenviarVerificacion,
  registrarUsuario,
  TIPO_USUARIO,
  validarContrasena,
  validarDocumentos,
} from './authApi'
import { limpiarValidacion, mostrarValidacionEspanol } from './formValidation'
import LegalDialog from './LegalDialog'
import { PasswordChecklist, PasswordInput, PasswordMatch } from './PasswordFields'
import SearchableSelect from './SearchableSelect'
import { cargarLocalidades, cargarPaises, cargarProvincias } from './ubicacionesApi'

const CAMPO =
  'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30 disabled:cursor-not-allowed disabled:opacity-60'

const VACIO = {
  nombre: '', apellido: '', telefono: '', codigoPais: '', pais: '', paisCodigo: '', paisApi: '',
  provincia: '', provinciaCodigo: '', provinciaApi: '', localidad: '', email: '', contrasena: '', confirmacion: '',
  tipoUsuario: TIPO_USUARIO.LECTOR_ESCRITOR, apodo: '', cuit: '', nombreInstitucion: '',
  direccion: '', razonSocial: '', sitioWeb: '', aceptaPoliticas: false,
}

const PERFILES = [
  {
    valor: TIPO_USUARIO.LECTOR_ESCRITOR,
    titulo: 'Lector y escritor',
    descripcion: 'Descubrí libros, compartí lecturas y publicá tus escritos.',
    Icono: BookOpen,
  },
  {
    valor: TIPO_USUARIO.BIBLIOTECA,
    titulo: 'Biblioteca',
    descripcion: 'Representá una biblioteca y conectá su catálogo con la comunidad.',
    Icono: Library,
  },
  {
    valor: TIPO_USUARIO.EDITORIAL,
    titulo: 'Editorial',
    descripcion: 'Gestioná la presencia institucional y difundí publicaciones.',
    Icono: Building2,
  },
]

function Campo({ id, etiqueta, ayuda, mensajePatron, ...props }) {
  const ayudaId = ayuda ? `${id}-ayuda` : undefined
  return (
    <label htmlFor={id} className="block space-y-2.5 text-sm font-medium text-slate-300">
      <span>{etiqueta}</span>
      <input
        id={id}
        className={CAMPO}
        aria-describedby={ayudaId}
        onInput={limpiarValidacion}
        onInvalid={(evento) => mostrarValidacionEspanol(evento, { patron: mensajePatron })}
        {...props}
      />
      {ayuda && <span id={ayudaId} className="block text-xs font-normal leading-5 text-slate-500">{ayuda}</span>}
    </label>
  )
}

function Ingreso({ onRegistrarse }) {
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const enviar = async (evento) => {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const perfil = await iniciarSesion({ email, contrasena })
      if (!perfil) throw new Error('La cuenta existe, pero el perfil no pudo cargarse.')
      if (perfil.estado !== 'activo') navegar('/estado-solicitud', { replace: true })
      else navegar(ubicacion.state?.desde || '/catalogo', { replace: true })
    } catch (fallo) {
      setError(fallo)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <Campo id="login-email" etiqueta="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(evento) => setEmail(evento.target.value)} />
      <PasswordInput id="login-password" etiqueta="Contraseña" autoComplete="current-password" value={contrasena} onChange={(evento) => setContrasena(evento.target.value)} />
      <div className="flex justify-end">
        <Link to="/recuperar-contrasena" className="text-sm font-semibold text-(--color-brand-cream) hover:underline">¿Olvidaste tu contraseña?</Link>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200">
          <p>{error.message}</p>
          {error.code === 'usuario_no_registrado' && (
            <button type="button" onClick={onRegistrarse} className="mt-2 font-semibold text-(--color-brand-cream) underline underline-offset-4">Crear mi cuenta</button>
          )}
        </div>
      )}
      <button type="submit" disabled={enviando} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-3 font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-brand-secondary) focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60">
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}

function Registro() {
  const [datos, setDatos] = useState(VACIO)
  const [paises, setPaises] = useState([])
  const [provincias, setProvincias] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [documentos, setDocumentos] = useState([null, null])
  const [cargandoPaises, setCargandoPaises] = useState(true)
  const [cargandoProvincias, setCargandoProvincias] = useState(false)
  const [cargandoLocalidades, setCargandoLocalidades] = useState(false)
  const [errorPaises, setErrorPaises] = useState(null)
  const [errorProvincias, setErrorProvincias] = useState(null)
  const [errorLocalidades, setErrorLocalidades] = useState(null)
  const [estadoAlias, setEstadoAlias] = useState(null)
  const [documentoLegal, setDocumentoLegal] = useState(null)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [correoEnviado, setCorreoEnviado] = useState(null)
  const [avisoReenvio, setAvisoReenvio] = useState(null)

  useEffect(() => {
    let vigente = true
    cargarPaises()
      .then((resultado) => vigente && setPaises(resultado))
      .catch(() => vigente && setErrorPaises('No pudimos cargar los países. Recargá la página para intentarlo otra vez.'))
      .finally(() => vigente && setCargandoPaises(false))
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    if (!datos.paisApi) {
      setProvincias([])
      return undefined
    }

    let vigente = true
    setCargandoProvincias(true)
    setErrorProvincias(null)
    cargarProvincias(datos.paisApi, datos.paisCodigo)
      .then((resultado) => vigente && setProvincias(resultado))
      .catch(() => vigente && setErrorProvincias('No pudimos cargar las provincias. Volvé a elegir el país para reintentar.'))
      .finally(() => vigente && setCargandoProvincias(false))
    return () => { vigente = false }
  }, [datos.paisApi, datos.paisCodigo])

  useEffect(() => {
    if (!datos.paisApi || !datos.provinciaApi) {
      setLocalidades([])
      return undefined
    }

    let vigente = true
    setCargandoLocalidades(true)
    setErrorLocalidades(null)
    cargarLocalidades(datos.paisApi, datos.provinciaApi)
      .then((resultado) => vigente && setLocalidades(resultado))
      .catch(() => vigente && setErrorLocalidades('No pudimos cargar las localidades. Volvé a elegir el país para reintentar.'))
      .finally(() => vigente && setCargandoLocalidades(false))
    return () => { vigente = false }
  }, [datos.paisApi, datos.provinciaApi])

  useEffect(() => {
    if (datos.tipoUsuario !== TIPO_USUARIO.LECTOR_ESCRITOR || datos.apodo.trim().length < 3) {
      setEstadoAlias(null)
      return undefined
    }

    let vigente = true
    setEstadoAlias('consultando')
    const temporizador = setTimeout(() => {
      consultarAliasDisponible(datos.apodo)
        .then((disponible) => vigente && setEstadoAlias(disponible ? 'disponible' : 'ocupado'))
        .catch(() => vigente && setEstadoAlias('error'))
    }, 450)

    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [datos.apodo, datos.tipoUsuario])

  const actualizar = (campo) => (evento) => {
    const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value
    setDatos((actual) => ({ ...actual, [campo]: valor }))
  }

  const seleccionarPais = (opcion) => {
    setDatos((actual) => ({
      ...actual,
      pais: opcion?.label ?? '',
      paisCodigo: opcion?.value ?? '',
      paisApi: opcion?.nombreApi ?? '',
      codigoPais: opcion?.codigoTelefonico ?? '',
      provincia: '',
      provinciaCodigo: '',
      provinciaApi: '',
      localidad: '',
    }))
  }

  const seleccionarProvincia = (opcion) => {
    setDatos((actual) => ({
      ...actual,
      provincia: opcion?.label ?? '',
      provinciaCodigo: opcion?.value ?? '',
      provinciaApi: opcion?.nombreApi ?? '',
      localidad: '',
    }))
  }

  const seleccionarLocalidad = (opcion) => {
    setDatos((actual) => ({ ...actual, localidad: opcion?.value ?? '' }))
  }

  const seleccionarDocumento = (indice) => (evento) => {
    const archivo = evento.target.files?.[0] ?? null
    setDocumentos((actuales) => actuales.map((actual, posicion) => posicion === indice ? archivo : actual))
    setError(null)
    limpiarValidacion(evento)
  }

  const esInstitucion = datos.tipoUsuario !== TIPO_USUARIO.LECTOR_ESCRITOR
  const contrasenaValida = validarContrasena(datos.contrasena).length === 0
  const contrasenasCoinciden = datos.contrasena === datos.confirmacion

  const enviar = async (evento) => {
    evento.preventDefault()
    setError(null)
    if (!datos.paisCodigo) {
      setError('Seleccioná un país de la lista.')
      return
    }
    if (!datos.provinciaCodigo) {
      setError('Seleccioná una provincia o región de la lista.')
      return
    }
    if (!datos.localidad) {
      setError('Seleccioná una localidad de la lista.')
      return
    }
    if (!contrasenaValida || !contrasenasCoinciden) {
      setError('Revisá los requisitos de contraseña antes de continuar.')
      return
    }
    if (!esInstitucion && estadoAlias !== 'disponible') {
      setError('Elegí un alias disponible antes de continuar.')
      return
    }
    if (esInstitucion) {
      const errorDocumentos = validarDocumentos(documentos.filter(Boolean))
      if (errorDocumentos) {
        setError(errorDocumentos)
        return
      }
    }

    setEnviando(true)
    try {
      await registrarUsuario(datos, documentos.filter(Boolean))
      setCorreoEnviado(datos.email.trim().toLowerCase())
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    setAvisoReenvio(null)
    setError(null)
    try {
      await reenviarVerificacion(correoEnviado)
      setAvisoReenvio('Enviamos un nuevo enlace de verificación.')
    } catch (fallo) {
      setError(fallo.message)
    }
  }

  if (correoEnviado) {
    return (
      <section className="space-y-5 text-center" aria-live="polite">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-(--color-brand-mint)/20 text-2xl text-(--color-brand-mint)">✓</div>
        <div>
          <h2 className="text-xl font-bold text-white">Revisá tu correo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Enviamos el enlace de verificación a <strong className="text-slate-200">{correoEnviado}</strong>.</p>
          {esInstitucion && <p className="mt-2 text-sm leading-6 text-slate-400">Recibimos los dos PDF. Después de verificar el correo podrás consultar el estado de la solicitud.</p>}
        </div>
        {avisoReenvio && <p className="text-sm text-(--color-brand-mint)">{avisoReenvio}</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="button" onClick={reenviar} className="text-sm font-semibold text-(--color-brand-cream) hover:underline">Reenviar correo de verificación</button>
      </section>
    )
  }

  return (
    <>
      <form onSubmit={enviar} className="space-y-7">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-slate-200">¿Cómo vas a usar LEER+?</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {PERFILES.map(({ valor, titulo, descripcion, Icono }) => {
              const seleccionado = datos.tipoUsuario === valor
              return (
                <label key={valor} className={`group relative cursor-pointer rounded-xl border p-4 text-left transition ${seleccionado ? 'border-(--color-brand-secondary) bg-(--color-brand-primary)/20 shadow-lg shadow-(--color-brand-primary)/10' : 'border-slate-700 bg-slate-950/30 hover:border-slate-500 hover:bg-slate-800/60'}`}>
                  <input type="radio" name="tipo-usuario" value={valor} checked={seleccionado} onChange={actualizar('tipoUsuario')} className="sr-only" />
                  <span className={`mb-3 grid size-9 place-items-center rounded-lg ${seleccionado ? 'bg-(--color-brand-primary) text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}><Icono aria-hidden="true" className="size-5" /></span>
                  <span className="block pr-6 text-sm font-semibold text-white">{titulo}</span>
                  <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-400">{descripcion}</span>
                  {seleccionado && <Check aria-hidden="true" className="absolute right-3 top-3 size-5 text-(--color-brand-secondary)" />}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="registro-nombre" etiqueta="Nombre" autoComplete="given-name" required value={datos.nombre} onChange={actualizar('nombre')} />
          <Campo id="registro-apellido" etiqueta="Apellido" autoComplete="family-name" required value={datos.apellido} onChange={actualizar('apellido')} />
          <SearchableSelect id="registro-pais" etiqueta="País" value={datos.paisCodigo} options={paises} onSelect={seleccionarPais} placeholder="Buscá y seleccioná tu país" loading={cargandoPaises} error={errorPaises} required />
          <SearchableSelect id="registro-provincia" etiqueta="Provincia o región" value={datos.provinciaCodigo} options={provincias} onSelect={seleccionarProvincia} placeholder={datos.paisCodigo ? 'Buscá y seleccioná tu provincia' : 'Primero seleccioná un país'} disabled={!datos.paisCodigo} loading={cargandoProvincias} error={errorProvincias} required />
          <SearchableSelect id="registro-localidad" etiqueta="Localidad" value={datos.localidad} options={localidades} onSelect={seleccionarLocalidad} placeholder={datos.provinciaCodigo ? 'Buscá y seleccioná tu localidad' : 'Primero seleccioná una provincia'} disabled={!datos.provinciaCodigo} loading={cargandoLocalidades} error={errorLocalidades} required />
          <div className="space-y-2.5 text-sm font-medium text-slate-300">
            <label htmlFor="registro-telefono">Teléfono</label>
            <div className="flex gap-2">
              <input aria-label="Código de país" readOnly tabIndex={-1} value={datos.codigoPais} placeholder="+--" className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2.5 text-center text-sm text-slate-300" />
              <input id="registro-telefono" type="tel" inputMode="tel" autoComplete="tel-national" required disabled={!datos.paisCodigo} pattern="[0-9 ()-]{6,20}" title="Ingresá entre 6 y 20 caracteres usando números, espacios, paréntesis o guiones." value={datos.telefono} onChange={actualizar('telefono')} onInput={limpiarValidacion} onInvalid={(evento) => mostrarValidacionEspanol(evento, { patron: 'Ingresá entre 6 y 20 caracteres usando números, espacios, paréntesis o guiones.' })} placeholder="Número sin código de país" className={CAMPO} />
            </div>
          </div>
          <Campo id="registro-email" etiqueta="Correo electrónico" type="email" autoComplete="email" required value={datos.email} onChange={actualizar('email')} />
        </div>

        {datos.tipoUsuario === TIPO_USUARIO.LECTOR_ESCRITOR && (
          <div>
            <Campo id="registro-apodo" etiqueta="Alias" ayuda="Será el nombre visible para otros lectores y escritores." autoComplete="username" required minLength={3} maxLength={50} value={datos.apodo} onChange={actualizar('apodo')} />
            {estadoAlias && (
              <p role="status" className={`mt-2 text-xs ${estadoAlias === 'disponible' ? 'text-emerald-300' : estadoAlias === 'ocupado' || estadoAlias === 'error' ? 'text-red-300' : 'text-slate-500'}`}>
                {estadoAlias === 'consultando' && 'Comprobando disponibilidad…'}
                {estadoAlias === 'disponible' && '✓ El alias está disponible.'}
                {estadoAlias === 'ocupado' && 'Ese alias ya está en uso. Probá con otro.'}
                {estadoAlias === 'error' && 'No pudimos comprobar el alias. Intentá nuevamente.'}
              </p>
            )}
          </div>
        )}

        {datos.tipoUsuario === TIPO_USUARIO.BIBLIOTECA && (
          <div className="grid gap-5 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:grid-cols-2">
            <Campo id="registro-biblioteca" etiqueta="Nombre de la biblioteca" required value={datos.nombreInstitucion} onChange={actualizar('nombreInstitucion')} />
            <Campo id="registro-cuit-biblioteca" etiqueta="CUIT" inputMode="numeric" required pattern="[0-9-]{11,13}" mensajePatron="Ingresá un CUIT de 11 dígitos, con o sin guiones." value={datos.cuit} onChange={actualizar('cuit')} />
            <div className="sm:col-span-2"><Campo id="registro-direccion" etiqueta="Dirección" autoComplete="street-address" required value={datos.direccion} onChange={actualizar('direccion')} /></div>
          </div>
        )}

        {datos.tipoUsuario === TIPO_USUARIO.EDITORIAL && (
          <div className="grid gap-5 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:grid-cols-2">
            <Campo id="registro-editorial" etiqueta="Razón social" required value={datos.razonSocial} onChange={actualizar('razonSocial')} />
            <Campo id="registro-cuit-editorial" etiqueta="CUIT" inputMode="numeric" required pattern="[0-9-]{11,13}" mensajePatron="Ingresá un CUIT de 11 dígitos, con o sin guiones." value={datos.cuit} onChange={actualizar('cuit')} />
            <div className="sm:col-span-2"><Campo id="registro-web" etiqueta="Sitio web (opcional)" type="url" value={datos.sitioWeb} onChange={actualizar('sitioWeb')} /></div>
          </div>
        )}

        {esInstitucion && (
          <fieldset className="rounded-xl border border-(--color-brand-sand)/25 bg-(--color-brand-sand)/8 p-4 sm:p-5">
            <legend className="px-2 text-sm font-semibold text-(--color-brand-cream)">Documentación respaldatoria</legend>
            <p className="mb-4 text-sm leading-6 text-slate-400">Adjuntá ahora dos archivos PDF que acrediten la existencia o representación de la institución. Cada archivo puede pesar hasta 10 MB.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((indice) => (
                <label key={indice} className="block space-y-2 text-sm font-medium text-slate-300">
                  <span className="block">Documento {indice + 1}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={seleccionarDocumento(indice)}
                    className="sr-only"
                  />
                  <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-600 bg-slate-950/50 p-3 transition hover:border-(--color-brand-secondary)">
                    <span className="shrink-0 rounded-md bg-(--color-brand-primary) px-3 py-2 text-xs font-semibold text-white">Seleccionar PDF</span>
                    <span className={`min-w-0 truncate text-xs font-normal ${documentos[indice] ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {documentos[indice] ? `✓ ${documentos[indice].name}` : 'Ningún archivo seleccionado'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordInput id="registro-password" etiqueta="Contraseña" autoComplete="new-password" value={datos.contrasena} onChange={actualizar('contrasena')} describedBy="requisitos-registro" invalid={Boolean(datos.contrasena) && !contrasenaValida} />
          <div className="space-y-2.5">
            <PasswordInput id="registro-confirmacion" etiqueta="Confirmar contraseña" autoComplete="new-password" value={datos.confirmacion} onChange={actualizar('confirmacion')} describedBy="coincidencia-registro" invalid={Boolean(datos.confirmacion) && !contrasenasCoinciden} />
            <PasswordMatch contrasena={datos.contrasena} confirmacion={datos.confirmacion} id="coincidencia-registro" />
          </div>
        </div>
        <PasswordChecklist contrasena={datos.contrasena} id="requisitos-registro" />

        <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
          <input type="checkbox" required checked={datos.aceptaPoliticas} onChange={actualizar('aceptaPoliticas')} onInput={limpiarValidacion} onInvalid={(evento) => mostrarValidacionEspanol(evento, { requerido: 'Debés aceptar los Términos y la Política de Privacidad para continuar.' })} className="mt-1 size-4 shrink-0 accent-(--color-brand-primary)" />
          <span>
            Acepto los <button type="button" onClick={() => setDocumentoLegal('terminos')} className="font-semibold text-(--color-brand-cream) underline-offset-4 hover:underline">Términos y Condiciones</button> y la <button type="button" onClick={() => setDocumentoLegal('privacidad')} className="font-semibold text-(--color-brand-cream) underline-offset-4 hover:underline">Política de Privacidad</button> provisorios del MVP.
          </span>
        </label>

        {error && <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
        <button type="submit" disabled={enviando || cargandoPaises || cargandoProvincias || cargandoLocalidades} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-3 font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-brand-secondary) focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60">{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
      <LegalDialog tipo={documentoLegal} onClose={() => setDocumentoLegal(null)} />
    </>
  )
}

export default function AuthModal() {
  const [vista, setVista] = useState('ingreso')
  const esIngreso = vista === 'ingreso'
  return (
    <section className={`mx-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl transition-[max-width] sm:p-8 ${esIngreso ? 'max-w-lg' : 'max-w-4xl'}`}>
      <header className="mb-7 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-(--color-brand-secondary)">Tu espacio en LEER+</p>
        <h1 className="mt-2 font-serif text-3xl text-(--color-brand-cream)">{esIngreso ? 'Ingresá a LEER+' : 'Creá tu cuenta'}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{esIngreso ? 'Accedé a tu biblioteca, tus escritos y tu comunidad.' : 'Elegí cómo querés participar de la comunidad y completá tus datos.'}</p>
      </header>
      <div className="mb-8 grid grid-cols-2 rounded-xl bg-slate-950/70 p-1" role="tablist" aria-label="Acceso a la cuenta">
        {[['ingreso', 'Ingresar'], ['registro', 'Registrarse']].map(([valor, etiqueta]) => (
          <button key={valor} type="button" role="tab" aria-selected={vista === valor} onClick={() => setVista(valor)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${vista === valor ? 'bg-(--color-brand-primary) text-white shadow' : 'text-slate-400 hover:text-white'}`}>{etiqueta}</button>
        ))}
      </div>
      {esIngreso ? <Ingreso onRegistrarse={() => setVista('registro')} /> : <Registro />}
    </section>
  )
}
