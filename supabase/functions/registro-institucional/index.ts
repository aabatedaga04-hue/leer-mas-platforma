import { createClient } from 'npm:@supabase/supabase-js@2'

const MAXIMO_PDF = 10 * 1024 * 1024
const BUCKET = 'documentacion-institucional'

function clavePredeterminada(variableNueva: string, variableAnterior: string) {
  const valorNuevo = Deno.env.get(variableNueva)
  if (valorNuevo) {
    try {
      return JSON.parse(valorNuevo).default
    } catch {
      return null
    }
  }
  return Deno.env.get(variableAnterior)
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const clavePublica = clavePredeterminada('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
const claveSecreta = clavePredeterminada('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
const origenesPermitidos = (Deno.env.get('APP_ORIGIN') || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origen: string) => origen.trim().replace(/\/$/, ''))
  .filter(Boolean)

function cabecerasCors(origen: string | null) {
  const permitido = origen && origenesPermitidos.includes(origen) ? origen : origenesPermitidos[0]
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function responder(origen: string | null, estado: number, cuerpo: Record<string, unknown>) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cabecerasCors(origen), 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function texto(valor: unknown, maximo = 255) {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : ''
}

function validarEntrada(email: string, password: string, metadata: Record<string, unknown>, documentos: File[]) {
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Ingresá un correo electrónico válido.'
  if (password.length < 8 || !/[A-ZÁÉÍÓÚÑ]/.test(password) || !/[a-záéíóúñ]/.test(password) || !/[^\p{L}\p{N}\s]/u.test(password)) {
    return 'La contraseña no cumple todos los requisitos de seguridad.'
  }
  if (!['biblioteca', 'editorial'].includes(texto(metadata.tipo_usuario))) return 'El tipo de institución no es válido.'
  if (!texto(metadata.pais, 100) || !texto(metadata.provincia, 120) || !texto(metadata.localidad, 150)) {
    return 'Completá todos los datos de ubicación.'
  }
  if (metadata.politicas_aceptadas !== 'true') return 'Debés aceptar los Términos y la Política de Privacidad.'
  if (!/^\d{11}$/.test(texto(metadata.cuit).replace(/\D/g, ''))) return 'Ingresá un CUIT válido de 11 dígitos.'
  if (metadata.tipo_usuario === 'biblioteca' && (!texto(metadata.nombre, 100) || !texto(metadata.apellido, 100) || !texto(metadata.nombre_institucion, 150))) {
    return 'Completá los datos de contacto y el nombre de la biblioteca.'
  }
  if (metadata.tipo_usuario === 'editorial' && (!texto(metadata.nombre_fantasia, 150) || !texto(metadata.razon_social, 150))) {
    return 'Ingresá el nombre de fantasía y la razón social de la editorial.'
  }
  if (documentos.length !== 2) return 'Adjuntá exactamente dos archivos PDF.'
  if (documentos.some((archivo) => archivo.type !== 'application/pdf')) return 'Los dos documentos deben estar en formato PDF.'
  if (documentos.some((archivo) => archivo.size < 1 || archivo.size > MAXIMO_PDF)) return 'Cada archivo PDF debe pesar como máximo 10 MB.'
  return null
}

Deno.serve(async (request: Request) => {
  const origen = request.headers.get('origin')?.replace(/\/$/, '') || null

  if (request.method === 'OPTIONS') return new Response('ok', { headers: cabecerasCors(origen) })
  if (request.method !== 'POST') return responder(origen, 405, { error: 'Método no permitido.' })
  if (origen && !origenesPermitidos.includes(origen)) return responder(origen, 403, { error: 'Origen no permitido.' })
  if (!supabaseUrl || !clavePublica || !claveSecreta) {
    return responder(origen, 500, { error: 'El servicio de registro institucional no está configurado.' })
  }

  let usuarioCreado: string | null = null
  let solicitudCreada: number | null = null
  const rutasCargadas: string[] = []
  const administrador = createClient(supabaseUrl, claveSecreta, { auth: { persistSession: false } })

  try {
    const formulario = await request.formData()
    const datosCrudos = formulario.get('datos')
    if (typeof datosCrudos !== 'string') return responder(origen, 400, { error: 'Faltan los datos del registro.' })

    let datos
    try {
      datos = JSON.parse(datosCrudos)
    } catch {
      return responder(origen, 400, { error: 'Los datos del registro no tienen un formato válido.' })
    }

    const email = texto(datos.email, 150).toLowerCase()
    const password = typeof datos.password === 'string' ? datos.password : ''
    const metadata = datos.metadata && typeof datos.metadata === 'object' ? datos.metadata : {}
    const documentos = formulario.getAll('documentos').filter((archivo): archivo is File => archivo instanceof File)
    const errorValidacion = validarEntrada(email, password, metadata, documentos)
    if (errorValidacion) return responder(origen, 400, { error: errorValidacion })
    for (const archivo of documentos) {
      const firma = new TextDecoder().decode(await archivo.slice(0, 5).arrayBuffer())
      if (firma !== '%PDF-') return responder(origen, 400, { error: 'Uno de los archivos no contiene un PDF válido.' })
    }

    const { data: cuentaExistente, error: errorEmail } = await administrador
      .from('usuario')
      .select('id_usuario')
      .ilike('email', email)
      .maybeSingle()
    if (errorEmail) throw errorEmail
    if (cuentaExistente) return responder(origen, 409, { error: 'Ya existe una cuenta asociada a ese correo electrónico.' })

    const cuit = texto(metadata.cuit).replace(/\D/g, '')
    const { data: cuitExistente, error: errorCuit } = await administrador
      .from('cuit_institucional')
      .select('id_usuario')
      .eq('cuit_normalizado', cuit)
      .maybeSingle()
    if (errorCuit) throw errorCuit
    if (cuitExistente) return responder(origen, 409, { error: 'Ya existe una institución registrada con ese CUIT.' })

    const clientePublico = createClient(supabaseUrl, clavePublica, { auth: { persistSession: false } })
    const origenRedireccion = origen && origenesPermitidos.includes(origen) ? origen : origenesPermitidos[0]
    const { data: alta, error: errorAlta } = await clientePublico.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origenRedireccion}/verificar-correo`,
        data: metadata,
      },
    })
    if (errorAlta) {
      if (/already registered/i.test(errorAlta.message)) return responder(origen, 409, { error: 'Ya existe una cuenta asociada a ese correo electrónico.' })
      if (/rate limit/i.test(errorAlta.message)) return responder(origen, 429, { error: 'Se realizaron demasiados intentos. Esperá unos minutos y probá nuevamente.' })
      return responder(origen, 400, { error: 'No fue posible crear la cuenta. Revisá que el CUIT no esté registrado.' })
    }
    if (!alta.user || alta.user.identities?.length === 0) return responder(origen, 409, { error: 'Ya existe una cuenta asociada a ese correo electrónico.' })
    usuarioCreado = alta.user.id

    const metadatosDocumentos = []
    for (const archivo of documentos) {
      const ruta = `${usuarioCreado}/${crypto.randomUUID()}.pdf`
      const { error: errorCarga } = await administrador.storage
        .from(BUCKET)
        .upload(ruta, archivo, { contentType: 'application/pdf', upsert: false })
      if (errorCarga) throw errorCarga
      rutasCargadas.push(ruta)
      metadatosDocumentos.push({
        ruta_storage: ruta,
        nombre_original: archivo.name.slice(0, 255),
        mime_type: 'application/pdf',
        tamano_bytes: archivo.size,
      })
    }

    const { data: solicitud, error: errorSolicitud } = await administrador
      .from('solicitud_rol')
      .insert({ id_usuario: usuarioCreado, tipo_rol: metadata.tipo_usuario })
      .select('id_solicitud')
      .single()
    if (errorSolicitud) throw errorSolicitud
    solicitudCreada = solicitud.id_solicitud

    const { error: errorDocumentos } = await administrador.from('documento_solicitud_rol').insert(
      metadatosDocumentos.map((documento) => ({
        ...documento,
        id_solicitud: solicitud.id_solicitud,
        id_usuario: usuarioCreado,
      })),
    )
    if (errorDocumentos) throw errorDocumentos

    return responder(origen, 201, { ok: true, email })
  } catch {
    if (rutasCargadas.length) await administrador.storage.from(BUCKET).remove(rutasCargadas)
    if (solicitudCreada) {
      await administrador.from('notificacion').delete().eq('tipo', 'solicitud_rol').eq('referencia_id', solicitudCreada)
      await administrador.from('solicitud_rol').delete().eq('id_solicitud', solicitudCreada)
    }
    if (usuarioCreado) await administrador.auth.admin.deleteUser(usuarioCreado)
    return responder(origen, 500, { error: 'No fue posible completar el registro institucional. No se guardaron datos parciales.' })
  }
})
