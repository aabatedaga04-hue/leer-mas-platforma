import { supabase } from '../../supabaseClient'

export const VERSION_TERMINOS = 'MVP-1'
export const VERSION_PRIVACIDAD = 'MVP-1'
export const TAMANO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024

export const TIPO_USUARIO = Object.freeze({
  LECTOR_ESCRITOR: 'lector_escritor',
  BIBLIOTECA: 'biblioteca',
  EDITORIAL: 'editorial',
})

const MENSAJES_AUTH = [
  [/invalid login credentials/i, 'El correo o la contraseña no son correctos.'],
  [/email not confirmed/i, 'Primero tenés que verificar tu correo electrónico.'],
  [/user already registered/i, 'Ya existe una cuenta asociada a ese correo electrónico.'],
  [/password should be/i, 'La contraseña no cumple los requisitos de seguridad.'],
  [/rate limit|too many requests/i, 'Se realizaron demasiados intentos. Esperá unos minutos y probá nuevamente.'],
  [/network|failed to fetch|fetch failed/i, 'No pudimos conectarnos con el servicio. Revisá tu conexión e intentá nuevamente.'],
  [/database error saving new user/i, 'No fue posible guardar la cuenta. Revisá que el correo, el alias y el CUIT no estén registrados.'],
  [/email.*invalid|invalid.*email/i, 'Ingresá un correo electrónico válido.'],
  [/weak password/i, 'La contraseña no cumple los requisitos de seguridad.'],
]

export class AuthError extends Error {
  constructor(message, { code, cause } = {}) {
    super(message, { cause })
    this.name = 'AuthError'
    this.code = code
  }
}
export function obtenerEstadoContrasena(contrasena = '') {
  return [
    { id: 'longitud', etiqueta: '8 caracteres como mínimo', cumple: contrasena.length >= 8 },
    { id: 'mayuscula', etiqueta: 'Una letra mayúscula', cumple: /[A-ZÁÉÍÓÚÑ]/.test(contrasena) },
    { id: 'minuscula', etiqueta: 'Una letra minúscula', cumple: /[a-záéíóúñ]/.test(contrasena) },
    { id: 'especial', etiqueta: 'Un carácter especial', cumple: /[^\p{L}\p{N}\s]/u.test(contrasena) },
  ]
}

function traducirError(error, respaldo = 'No fue posible completar la operación.') {
  const mensaje = error?.message ?? ''
  const coincidencia = MENSAJES_AUTH.find(([patron]) => patron.test(mensaje))
  return new AuthError(coincidencia?.[1] ?? respaldo, { cause: error })
}

export function validarContrasena(contrasena) {
  return obtenerEstadoContrasena(contrasena)
    .filter(({ cumple }) => !cumple)
    .map(({ etiqueta }) => etiqueta.toLowerCase())
}

function urlAplicacion(ruta) {
  return new URL(ruta, window.location.origin).toString()
}

function metadataRegistro(datos) {
  const comun = {
    tipo_usuario: datos.tipoUsuario,
    telefono: `${datos.codigoPais} ${datos.telefono}`.trim(),
    pais: datos.pais.trim(),
    provincia: datos.provincia.trim(),
    localidad: datos.localidad.trim(),
    politicas_aceptadas: 'true',
    terminos_version: VERSION_TERMINOS,
    privacidad_version: VERSION_PRIVACIDAD,
  }

  if (datos.tipoUsuario === TIPO_USUARIO.LECTOR_ESCRITOR) {
    return {
      ...comun,
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      apodo: datos.apodo.trim(),
    }
  }

  if (datos.tipoUsuario === TIPO_USUARIO.BIBLIOTECA) {
    return {
      ...comun,
      cuit: datos.cuit.trim(),
      nombre_institucion: datos.nombreInstitucion.trim(),
      direccion: datos.direccion.trim(),
    }
  }

  return {
    ...comun,
    cuit: datos.cuit.trim(),
    nombre_fantasia: datos.nombreFantasia.trim(),
    razon_social: datos.razonSocial.trim(),
    sitio_web: datos.sitioWeb.trim(),
  }
}

async function errorFuncionEnEspanol(error, respaldo) {
  try {
    const respuesta = await error?.context?.json()
    if (respuesta?.error) return new AuthError(respuesta.error, { cause: error })
  } catch {
    // La respuesta puede no contener JSON; se usa el mensaje seguro de respaldo.
  }
  return traducirError(error, respaldo)
}

export async function consultarAliasDisponible(alias) {
  const normalizado = alias.trim()
  if (normalizado.length < 3) return false
  const { data, error } = await supabase.rpc('fn_alias_disponible', { p_alias: normalizado })
  if (error) throw traducirError(error, 'No pudimos verificar si el alias está disponible.')
  return Boolean(data)
}

export async function registrarUsuario(datos, documentos = []) {
  const erroresContrasena = validarContrasena(datos.contrasena)
  if (erroresContrasena.length) {
    throw new AuthError('La contraseña no cumple todos los requisitos de seguridad.')
  }
  if (datos.contrasena !== datos.confirmacion) {
    throw new AuthError('Las contraseñas no coinciden.')
  }
  if (!datos.aceptaPoliticas) {
    throw new AuthError('Debés aceptar los Términos y la Política de Privacidad.')
  }

  const esInstitucion = datos.tipoUsuario !== TIPO_USUARIO.LECTOR_ESCRITOR
  if (esInstitucion) {
    const validacionDocumentos = validarDocumentos(documentos)
    if (validacionDocumentos) throw new AuthError(validacionDocumentos)

    const formulario = new FormData()
    formulario.append('datos', JSON.stringify({
      email: datos.email.trim().toLowerCase(),
      password: datos.contrasena,
      metadata: metadataRegistro(datos),
    }))
    documentos.forEach((archivo) => formulario.append('documentos', archivo, archivo.name))

    const { data, error } = await supabase.functions.invoke('registro-institucional', {
      body: formulario,
    })
    if (error) throw await errorFuncionEnEspanol(error, 'No fue posible registrar la institución.')
    if (data?.error) throw new AuthError(data.error)
    return data
  }

  const { data, error } = await supabase.auth.signUp({
    email: datos.email.trim().toLowerCase(),
    password: datos.contrasena,
    options: {
      emailRedirectTo: urlAplicacion('/verificar-correo'),
      data: metadataRegistro(datos),
    },
  })

  if (error) throw traducirError(error, 'No fue posible crear la cuenta.')
  return data
}

export async function iniciarSesion({ email, contrasena }) {
  const correo = email.trim().toLowerCase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  })
  if (error && /invalid login credentials/i.test(error.message ?? '')) {
    const { data: registrado, error: errorConsulta } = await supabase.rpc('fn_email_registrado', {
      p_email: correo,
    })
    if (!errorConsulta && !registrado) {
      throw new AuthError('No encontramos una cuenta con ese correo electrónico. Para continuar, primero tenés que registrarte.', {
        code: 'usuario_no_registrado',
        cause: error,
      })
    }
    if (!errorConsulta && registrado) {
      throw new AuthError('La contraseña ingresada no es correcta. Volvé a intentarlo o recuperá tu contraseña.', {
        code: 'contrasena_incorrecta',
        cause: error,
      })
    }
  }
  if (error) throw traducirError(error, 'No fue posible iniciar sesión. Revisá los datos e intentá nuevamente.')
  return data
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut()
  if (error) throw traducirError(error, 'No fue posible cerrar la sesión.')
}

export async function reenviarVerificacion(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: urlAplicacion('/verificar-correo') },
  })
  if (error) throw traducirError(error, 'No fue posible reenviar el correo.')
}

export async function solicitarRecuperacion(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: urlAplicacion('/restablecer-contrasena'),
  })
  if (error) throw traducirError(error, 'No fue posible enviar el correo de recuperación.')
}

export async function actualizarContrasena(contrasena) {
  const errores = validarContrasena(contrasena)
  if (errores.length) throw new AuthError('La contraseña no cumple todos los requisitos de seguridad.')

  const { error } = await supabase.auth.updateUser({ password: contrasena })
  if (error) throw traducirError(error, 'No fue posible actualizar la contraseña.')
}

export async function obtenerPerfil(idUsuario) {
  if (!idUsuario) return null

  const { data: usuario, error } = await supabase
    .from('usuario')
    .select(
      'id_usuario, email, nombre, apellido, telefono, pais, provincia, localidad, estado, tipo_usuario, fecha_registro',
    )
    .eq('id_usuario', idUsuario)
    .single()

  if (error) throw traducirError(error, 'No fue posible cargar el perfil.')

  const tabla = usuario.tipo_usuario
  if (![TIPO_USUARIO.LECTOR_ESCRITOR, TIPO_USUARIO.BIBLIOTECA, TIPO_USUARIO.EDITORIAL].includes(tabla)) {
    return usuario
  }

  const { data: detalle, error: errorDetalle } = await supabase
    .from(tabla)
    .select('*')
    .eq('id_usuario', idUsuario)
    .maybeSingle()
  if (errorDetalle) throw traducirError(errorDetalle, 'No fue posible cargar los datos específicos del perfil.')
  return { ...usuario, detalle: detalle ?? null }
}

export async function obtenerSolicitudInstitucional(idUsuario) {
  if (!idUsuario) return null
  const { data, error } = await supabase
    .from('solicitud_rol')
    .select('id_solicitud, tipo_rol, estado, fecha_solicitud, fecha_resolucion')
    .eq('id_usuario', idUsuario)
    .order('fecha_solicitud', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw traducirError(error, 'No fue posible consultar la solicitud.')
  return data
}

export function validarDocumentos(documentos) {
  const archivos = [...(documentos ?? [])].filter(Boolean)
  if (archivos.length !== 2) return 'Debés seleccionar exactamente dos archivos PDF.'
  if (archivos.some((archivo) => archivo.type !== 'application/pdf')) {
    return 'Los dos archivos deben estar en formato PDF.'
  }
  if (archivos.some((archivo) => archivo.size > TAMANO_MAXIMO_DOCUMENTO)) {
    return 'Cada archivo PDF puede pesar como máximo 10 MB.'
  }
  return null
}

export async function enviarDocumentacionInstitucional(documentos, idUsuario) {
  const archivos = [...documentos]
  const validacion = validarDocumentos(archivos)
  if (validacion) throw new AuthError(validacion)

  const cargados = []
  try {
    for (const archivo of archivos) {
      const idArchivo = crypto.randomUUID()
      const ruta = `${idUsuario}/${idArchivo}.pdf`
      const { error } = await supabase.storage
        .from('documentacion-institucional')
        .upload(ruta, archivo, { contentType: 'application/pdf', upsert: false })
      if (error) throw error
      cargados.push({
        ruta,
        nombre_original: archivo.name,
        mime_type: 'application/pdf',
        tamano_bytes: archivo.size,
      })
    }

    const { error } = await supabase.rpc('fn_completar_solicitud_institucional', {
      p_documentos: cargados,
    })
    if (error) throw error
  } catch (error) {
    if (cargados.length) {
      await supabase.storage
        .from('documentacion-institucional')
        .remove(cargados.map(({ ruta }) => ruta))
    }
    throw traducirError(error, 'No fue posible enviar la documentación.')
  }
}
