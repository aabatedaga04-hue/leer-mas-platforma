export function limpiarValidacion(evento) {
  evento.currentTarget.setCustomValidity('')
}

export function mostrarValidacionEspanol(evento, mensajes = {}) {
  const campo = evento.currentTarget
  const { validity } = campo
  let mensaje = mensajes.generico || 'Revisá este campo.'

  if (validity.valueMissing) mensaje = mensajes.requerido || 'Completá este campo.'
  else if (validity.typeMismatch && campo.type === 'email') mensaje = 'Ingresá un correo electrónico válido.'
  else if (validity.typeMismatch && campo.type === 'url') mensaje = 'Ingresá una dirección web válida, por ejemplo https://sitio.com.'
  else if (validity.patternMismatch) mensaje = mensajes.patron || 'El formato ingresado no es válido.'
  else if (validity.tooShort) mensaje = `Ingresá al menos ${campo.minLength} caracteres.`
  else if (validity.tooLong) mensaje = `Ingresá como máximo ${campo.maxLength} caracteres.`

  campo.setCustomValidity(mensaje)
}
