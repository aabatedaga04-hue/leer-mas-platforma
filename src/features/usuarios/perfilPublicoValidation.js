export const FORMATOS_IMAGEN_PERFIL = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024
export const MAXIMO_SELECCIONES = 12
export const MAXIMO_ENLACES = 5

export const GENEROS_PERFIL = [
  'Novela',
  'Cuento',
  'Poesía',
  'Ensayo',
  'Teatro',
  'Ciencia ficción',
  'Fantasía',
  'Policial',
  'Novela histórica',
  'Novela romántica',
  'Terror',
  'Biografía',
  'Historieta y novela gráfica',
  'Literatura infantil y juvenil',
  'Literatura académica',
  'Artículos y papers científicos',
  'Tesis y trabajos de investigación',
  'Divulgación científica',
  'Ciencias naturales y exactas',
  'Ciencias sociales',
  'Humanidades',
  'Tecnología e ingeniería',
  'Salud y medicina',
  'Derecho',
  'Economía y negocios',
  'Educación',
  'Historia',
  'Filosofía',
  'Psicología',
  'Arte y diseño',
  'Actualidad y periodismo',
  'Manuales y textos técnicos',
]

export const INTERESES_LECTURA = [
  'Descubrir autores emergentes',
  'Participar en clubes de lectura',
  'Escribir reseñas',
  'Publicar escritos propios',
  'Completar desafíos de lectura',
  'Conversar en foros',
  'Encontrar libros en bibliotecas',
  'Recibir recomendaciones',
  'Leer artículos y papers científicos',
  'Investigar temas académicos',
  'Consultar tesis y trabajos de investigación',
  'Encontrar fuentes y bibliografía',
  'Seguir novedades científicas',
  'Acceder a material de estudio',
  'Aprender sobre temas técnicos o profesionales',
  'Explorar contenidos de divulgación',
  'Conocer novedades editoriales',
  'Asistir a actividades literarias',
  'Buscar oportunidades de publicación',
  'Conectar con editoriales y bibliotecas',
]

export function datosPublicosDesdePerfil(perfil) {
  const publico = perfil?.publico ?? {}
  return {
    imagenPerfilUrl: publico.imagen_url ?? '',
    biografia: publico.biografia ?? '',
    generos: Array.isArray(publico.generos) ? publico.generos : [],
    intereses: Array.isArray(publico.intereses) ? publico.intereses : [],
    enlacesExternos: Array.isArray(publico.enlaces_externos) ? publico.enlaces_externos : [],
    emailContacto: publico.email_contacto ?? '',
    telefonoContacto: publico.telefono_contacto ?? '',
    horariosAtencion: publico.horarios_atencion ?? '',
    perfilVisible: publico.perfil_visible ?? true,
    ubicacionVisible: publico.ubicacion_visible ?? false,
    contactoVisible: publico.contacto_visible ?? false,
  }
}

export function validarImagenPerfil(archivo) {
  if (!archivo) return 'Seleccioná una imagen.'
  if (!FORMATOS_IMAGEN_PERFIL.includes(archivo.type)) {
    return 'La imagen debe estar en formato JPG, PNG o WebP.'
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return 'La imagen no puede superar los 5 MB.'
  }
  return null
}

export function validarCampoPublico(datos, tipoUsuario, campo) {
  if (campo === 'biografia') {
    const limite = tipoUsuario === 'lector_escritor' ? 400 : 600
    if (datos.biografia.trim().length > limite) {
      return [`La ${tipoUsuario === 'lector_escritor' ? 'biografía' : 'descripción'} no puede superar los ${limite} caracteres.`]
    }
  }

  if (campo === 'generos' && datos.generos.length > MAXIMO_SELECCIONES) {
    return [`Podés seleccionar hasta ${MAXIMO_SELECCIONES} géneros.`]
  }

  if (campo === 'intereses' && datos.intereses.length > MAXIMO_SELECCIONES) {
    return [`Podés seleccionar hasta ${MAXIMO_SELECCIONES} intereses.`]
  }

  if (campo === 'horariosAtencion' && datos.horariosAtencion.trim().length > 300) {
    return ['Los horarios de atención no pueden superar los 300 caracteres.']
  }

  if (campo === 'contacto') {
    if (datos.emailContacto.trim() && !/^\S+@\S+\.\S+$/.test(datos.emailContacto.trim())) {
      return ['Ingresá un correo público válido.']
    }
    if (datos.telefonoContacto.trim().length > 30) {
      return ['El teléfono público no puede superar los 30 caracteres.']
    }
    if (datos.contactoVisible && !datos.emailContacto.trim() && !datos.telefonoContacto.trim()) {
      return ['Completá al menos un medio de contacto antes de hacerlo visible.']
    }
  }

  if (campo === 'enlacesExternos') {
    if (datos.enlacesExternos.length > MAXIMO_ENLACES) {
      return [`Podés agregar hasta ${MAXIMO_ENLACES} enlaces externos.`]
    }
    for (const enlace of datos.enlacesExternos) {
      if (!enlace.etiqueta?.trim() || enlace.etiqueta.trim().length > 50) {
        return ['Cada enlace debe tener un nombre de hasta 50 caracteres.']
      }
      try {
        const url = new URL(enlace.url?.trim() ?? '')
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
      } catch {
        return ['Cada enlace debe contener una dirección válida que comience con http:// o https://.']
      }
    }
  }

  return []
}
