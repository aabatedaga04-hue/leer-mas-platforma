export function validarPerfilBasico(datos, tipoUsuario) {
  const errores = []
  const obligatorios = [
    ['pais', 'país', 100],
    ['provincia', 'provincia o región', 120],
    ['localidad', 'localidad', 150],
  ]

  if (tipoUsuario !== 'editorial') {
    obligatorios.unshift(['nombre', 'nombre', 100], ['apellido', 'apellido', 100])
  }

  for (const [campo, etiqueta, maximo] of obligatorios) {
    const valor = datos[campo]?.trim() ?? ''
    if (!valor) errores.push(`Completá ${etiqueta}.`)
    else if (valor.length > maximo) errores.push(`${etiqueta} no puede superar ${maximo} caracteres.`)
  }

  if (!/^\+[0-9-]{1,8}\s[0-9 ()-]{6,20}$/.test(datos.telefono?.trim() ?? '')) {
    errores.push('Ingresá un teléfono con código de país y entre 6 y 20 caracteres para el número.')
  }

  if (tipoUsuario === 'lector_escritor') {
    const alias = datos.apodo?.trim() ?? ''
    if (alias.length < 3 || alias.length > 50) errores.push('El alias debe tener entre 3 y 50 caracteres.')
  }

  if (tipoUsuario === 'biblioteca') {
    const direccion = datos.direccion?.trim() ?? ''
    if (!direccion) errores.push('Completá la dirección de la biblioteca.')
    else if (direccion.length > 255) errores.push('La dirección no puede superar 255 caracteres.')
  }

  if (tipoUsuario === 'editorial') {
    const nombreFantasia = datos.nombreFantasia?.trim() ?? ''
    if (!nombreFantasia) errores.push('Completá el nombre de fantasía de la editorial.')
    else if (nombreFantasia.length > 150) errores.push('El nombre de fantasía no puede superar 150 caracteres.')
  }

  if (tipoUsuario === 'editorial' && datos.sitioWeb?.trim()) {
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
