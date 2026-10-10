const CAMPOS_EDITABLES = {
  nombre: ['nombre'],
  apellido: ['apellido'],
  telefono: ['telefono'],
  ubicacion: ['pais', 'provincia', 'localidad', 'telefono'],
  apodo: ['apodo'],
  direccion: ['direccion'],
  nombreFantasia: ['nombreFantasia'],
  sitioWeb: ['sitioWeb'],
}

const CAMPOS_POR_TIPO = {
  lector_escritor: new Set(['nombre', 'apellido', 'telefono', 'ubicacion', 'apodo']),
  biblioteca: new Set(['nombre', 'apellido', 'telefono', 'ubicacion', 'direccion']),
  editorial: new Set(['telefono', 'ubicacion', 'nombreFantasia', 'sitioWeb']),
}

export function validarPerfilBasico(datos, tipoUsuario, campoActivo = null) {
  const errores = []
  const camposSeleccionados = campoActivo ? new Set(CAMPOS_EDITABLES[campoActivo] ?? []) : null
  const incluir = (campo) => !camposSeleccionados || camposSeleccionados.has(campo)

  if (campoActivo && !CAMPOS_EDITABLES[campoActivo]) {
    return ['El dato seleccionado no admite edición.']
  }

  if (campoActivo && !CAMPOS_POR_TIPO[tipoUsuario]?.has(campoActivo)) {
    return ['Este dato no puede modificarse para el tipo de cuenta actual.']
  }

  const obligatorios = [
    ['pais', 'país', 100],
    ['provincia', 'provincia o región', 120],
    ['localidad', 'localidad', 150],
  ]

  if (tipoUsuario !== 'editorial') {
    obligatorios.unshift(['nombre', 'nombre', 100], ['apellido', 'apellido', 100])
  }

  for (const [campo, etiqueta, maximo] of obligatorios) {
    if (!incluir(campo)) continue
    const valor = datos[campo]?.trim() ?? ''
    if (!valor) errores.push(`Completá ${etiqueta}.`)
    else if (valor.length > maximo) errores.push(`${etiqueta} no puede superar ${maximo} caracteres.`)
  }

  if (incluir('telefono') && !/^\+[0-9-]{1,8}\s[0-9 ()-]{6,20}$/.test(datos.telefono?.trim() ?? '')) {
    errores.push('Ingresá un teléfono con código de país y entre 6 y 20 caracteres para el número.')
  }

  if (tipoUsuario === 'lector_escritor' && incluir('apodo')) {
    const alias = datos.apodo?.trim() ?? ''
    if (alias.length < 3 || alias.length > 50) errores.push('El alias debe tener entre 3 y 50 caracteres.')
  }

  if (tipoUsuario === 'biblioteca' && incluir('direccion')) {
    const direccion = datos.direccion?.trim() ?? ''
    if (!direccion) errores.push('Completá la dirección de la biblioteca.')
    else if (direccion.length > 255) errores.push('La dirección no puede superar 255 caracteres.')
  }

  if (tipoUsuario === 'editorial' && incluir('nombreFantasia')) {
    const nombreFantasia = datos.nombreFantasia?.trim() ?? ''
    if (!nombreFantasia) errores.push('Completá el nombre de fantasía de la editorial.')
    else if (nombreFantasia.length > 150) errores.push('El nombre de fantasía no puede superar 150 caracteres.')
  }

  if (tipoUsuario === 'editorial' && incluir('sitioWeb') && datos.sitioWeb?.trim()) {
    try {
      const sitio = datos.sitioWeb.trim()
      const url = new URL(sitio)
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || sitio.length > 255) {
        throw new Error()
      }
    } catch {
      errores.push('Ingresá un sitio web válido que comience con http:// o https:// y no supere 255 caracteres.')
    }
  }

  return errores
}

export function validarCampoPerfil(datos, tipoUsuario, campoActivo) {
  return validarPerfilBasico(datos, tipoUsuario, campoActivo)
}
