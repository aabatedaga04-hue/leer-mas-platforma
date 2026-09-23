import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from './useAuth'
import {
  reenviarVerificacion,
  registrarUsuario,
  TIPO_USUARIO,
  validarContrasena,
} from './authApi'

const CAMPO =
  'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30'

const VACIO = {
  nombre: '', apellido: '', telefono: '', pais: 'Argentina', localidad: '', email: '',
  contrasena: '', confirmacion: '', tipoUsuario: TIPO_USUARIO.LECTOR_ESCRITOR,
  apodo: '', cuit: '', nombreInstitucion: '', direccion: '', razonSocial: '', sitioWeb: '',
  aceptaPoliticas: false,
}

function Campo({ id, etiqueta, ...props }) {
  return (
    <label htmlFor={id} className="block space-y-1.5 text-sm font-medium text-slate-300">
      <span>{etiqueta}</span>
      <input id={id} className={CAMPO} {...props} />
    </label>
  )
}

function Ingreso() {
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
      setError(fallo.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Campo id="login-email" etiqueta="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Campo id="login-password" etiqueta="Contraseña" type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
      <div className="flex justify-end">
        <Link to="/recuperar-contrasena" className="text-sm text-(--color-brand-cream) hover:underline">Olvidé mi contraseña</Link>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      <button type="submit" disabled={enviando} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}

function Registro() {
  const [datos, setDatos] = useState(VACIO)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [correoEnviado, setCorreoEnviado] = useState(null)
  const [avisoReenvio, setAvisoReenvio] = useState(null)

  const actualizar = (campo) => (evento) => {
    const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value
    setDatos((actual) => ({ ...actual, [campo]: valor }))
  }

  const esInstitucion = datos.tipoUsuario !== TIPO_USUARIO.LECTOR_ESCRITOR
  const erroresContrasena = datos.contrasena ? validarContrasena(datos.contrasena) : []

  const enviar = async (evento) => {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await registrarUsuario(datos)
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
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Enviamos el enlace de verificación a <strong className="text-slate-200">{correoEnviado}</strong>.
          </p>
          {esInstitucion && <p className="mt-2 text-sm leading-6 text-slate-400">Después de verificarlo vas a poder adjuntar los dos PDF y consultar el estado de la solicitud.</p>}
        </div>
        {avisoReenvio && <p className="text-sm text-(--color-brand-mint)">{avisoReenvio}</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="button" onClick={reenviar} className="text-sm font-semibold text-(--color-brand-cream) hover:underline">Reenviar correo de verificación</button>
      </section>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-200">Tipo de cuenta</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[[TIPO_USUARIO.LECTOR_ESCRITOR, 'Lector-Escritor'], [TIPO_USUARIO.BIBLIOTECA, 'Biblioteca'], [TIPO_USUARIO.EDITORIAL, 'Editorial']].map(([valor, etiqueta]) => (
            <label key={valor} className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${datos.tipoUsuario === valor ? 'border-(--color-brand-primary) bg-(--color-brand-primary)/20 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              <input type="radio" name="tipo-usuario" value={valor} checked={datos.tipoUsuario === valor} onChange={actualizar('tipoUsuario')} className="sr-only" />
              {etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="registro-nombre" etiqueta="Nombre" required value={datos.nombre} onChange={actualizar('nombre')} />
        <Campo id="registro-apellido" etiqueta="Apellido" required value={datos.apellido} onChange={actualizar('apellido')} />
        <Campo id="registro-telefono" etiqueta="Teléfono" type="tel" required value={datos.telefono} onChange={actualizar('telefono')} />
        <Campo id="registro-pais" etiqueta="País" required value={datos.pais} onChange={actualizar('pais')} />
        <Campo id="registro-localidad" etiqueta="Localidad" required value={datos.localidad} onChange={actualizar('localidad')} />
        <Campo id="registro-email" etiqueta="Correo electrónico" type="email" autoComplete="email" required value={datos.email} onChange={actualizar('email')} />
      </div>

      {datos.tipoUsuario === TIPO_USUARIO.LECTOR_ESCRITOR && <Campo id="registro-apodo" etiqueta="Apodo público" required maxLength={50} value={datos.apodo} onChange={actualizar('apodo')} />}

      {datos.tipoUsuario === TIPO_USUARIO.BIBLIOTECA && (
        <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:grid-cols-2">
          <Campo id="registro-biblioteca" etiqueta="Nombre de la biblioteca" required value={datos.nombreInstitucion} onChange={actualizar('nombreInstitucion')} />
          <Campo id="registro-cuit-biblioteca" etiqueta="CUIT" inputMode="numeric" required pattern="[0-9-]{11,13}" value={datos.cuit} onChange={actualizar('cuit')} />
          <div className="sm:col-span-2"><Campo id="registro-direccion" etiqueta="Dirección" required value={datos.direccion} onChange={actualizar('direccion')} /></div>
        </div>
      )}

      {datos.tipoUsuario === TIPO_USUARIO.EDITORIAL && (
        <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:grid-cols-2">
          <Campo id="registro-editorial" etiqueta="Razón social" required value={datos.razonSocial} onChange={actualizar('razonSocial')} />
          <Campo id="registro-cuit-editorial" etiqueta="CUIT" inputMode="numeric" required pattern="[0-9-]{11,13}" value={datos.cuit} onChange={actualizar('cuit')} />
          <div className="sm:col-span-2"><Campo id="registro-web" etiqueta="Sitio web (opcional)" type="url" value={datos.sitioWeb} onChange={actualizar('sitioWeb')} /></div>
        </div>
      )}

      {esInstitucion && <p className="rounded-lg border border-(--color-brand-sand)/25 bg-(--color-brand-sand)/10 p-3 text-sm leading-6 text-(--color-brand-cream)">Luego de verificar el correo deberás adjuntar exactamente dos documentos PDF que acrediten la institución.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="registro-password" etiqueta="Contraseña" type="password" autoComplete="new-password" required value={datos.contrasena} onChange={actualizar('contrasena')} />
        <Campo id="registro-confirmacion" etiqueta="Confirmar contraseña" type="password" autoComplete="new-password" required value={datos.confirmacion} onChange={actualizar('confirmacion')} />
      </div>
      <p className={`text-xs ${erroresContrasena.length ? 'text-amber-300' : 'text-slate-500'}`}>Mínimo 8 caracteres, con una mayúscula, una minúscula y un carácter especial.</p>

      <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
        <input type="checkbox" required checked={datos.aceptaPoliticas} onChange={actualizar('aceptaPoliticas')} className="mt-1 size-4 accent-(--color-brand-primary)" />
        <span>Acepto los <Link to="/terminos" target="_blank" className="text-(--color-brand-cream) hover:underline">Términos y Condiciones</Link> y la <Link to="/privacidad" target="_blank" className="text-(--color-brand-cream) hover:underline">Política de Privacidad</Link> provisorios del MVP.</span>
      </label>

      {error && <p role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      <button type="submit" disabled={enviando} className="w-full rounded-lg bg-(--color-brand-primary) px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
    </form>
  )
}

export default function AuthModal() {
  const [vista, setVista] = useState('ingreso')
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
      <header className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-(--color-brand-secondary)">Tu espacio en LEER+</p>
        <h1 className="mt-2 font-serif text-3xl text-(--color-brand-cream)">{vista === 'ingreso' ? 'Volver a tus lecturas' : 'Crear una cuenta'}</h1>
      </header>
      <div className="mb-7 grid grid-cols-2 rounded-xl bg-slate-950/70 p-1" role="tablist" aria-label="Acceso a la cuenta">
        {[['ingreso', 'Ingresar'], ['registro', 'Registrarse']].map(([valor, etiqueta]) => (
          <button key={valor} type="button" role="tab" aria-selected={vista === valor} onClick={() => setVista(valor)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${vista === valor ? 'bg-(--color-brand-primary) text-white' : 'text-slate-400 hover:text-white'}`}>{etiqueta}</button>
        ))}
      </div>
      {vista === 'ingreso' ? <Ingreso /> : <Registro />}
    </section>
  )
}
