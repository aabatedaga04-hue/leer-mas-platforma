export const FORMATOS_IMAGEN_PERFIL = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024
export const MAXIMO_SELECCIONES = 8

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
]

export function datosPublicosDesdePerfil(perfil) {
  const publico = perfil?.publico ?? {}
  return {
    imagenPerfilUrl: publico.imagen_url ?? '',
    biografia: publico.biografia ?? '',
    generos: Array.isArray(publico.generos) ? publico.generos : [],
    intereses: Array.isArray(publico.intereses) ? publico.intereses : [],
    horariosAtencion: publico.horarios_atencion ?? '',
    perfilVisible: publico.perfil_visible ?? true,
    ubicacionVisible: publico.ubicacion_visible ?? false,
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

  return []
}
