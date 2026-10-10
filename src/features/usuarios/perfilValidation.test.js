import assert from 'node:assert/strict'
import test from 'node:test'

import { validarCampoPerfil, validarPerfilBasico } from './perfilValidation.js'

const datos = {
  nombre: 'Ana', apellido: 'Pérez', telefono: '+54 11 1234-5678',
  pais: 'Argentina', provincia: 'Buenos Aires', localidad: 'La Plata',
  apodo: 'ana_lee', direccion: 'Calle 1', nombreFantasia: 'Tinta Norte', sitioWeb: 'https://editorial.example.com',
}

test('acepta el perfil básico de lector-escritor', () => {
  assert.deepEqual(validarPerfilBasico(datos, 'lector_escritor'), [])
})

test('rechaza alias corto y ubicación incompleta', () => {
  const errores = validarPerfilBasico({ ...datos, apodo: 'ab', localidad: ' ' }, 'lector_escritor')
  assert.ok(errores.some((error) => error.includes('alias')))
  assert.ok(errores.some((error) => error.includes('localidad')))
})

test('admite prefijos telefónicos con guion, pero exige número nacional', () => {
  assert.deepEqual(validarPerfilBasico({ ...datos, telefono: '+1-242 555 1234' }, 'biblioteca'), [])
  assert.ok(validarPerfilBasico({ ...datos, telefono: '+54' }, 'biblioteca').length > 0)
})

test('la dirección de biblioteca es obligatoria', () => {
  assert.ok(validarPerfilBasico({ ...datos, direccion: '' }, 'biblioteca').some((error) => error.includes('dirección')))
})

test('la editorial solo acepta sitios HTTP o HTTPS válidos', () => {
  assert.deepEqual(validarPerfilBasico({ ...datos, nombre: '', apellido: '' }, 'editorial'), [])
  assert.ok(validarPerfilBasico({ ...datos, sitioWeb: 'javascript:alert(1)' }, 'editorial').length > 0)
})

test('la editorial exige un nombre de fantasía', () => {
  assert.ok(validarPerfilBasico({ ...datos, nombreFantasia: '' }, 'editorial').some((error) => error.includes('fantasía')))
})

test('validar un campo no bloquea por datos ajenos a la edición', () => {
  const incompleto = { ...datos, localidad: '', apodo: '' }
  assert.deepEqual(validarCampoPerfil(incompleto, 'lector_escritor', 'nombre'), [])
})

test('la ubicación valida también el teléfono porque puede cambiar su prefijo', () => {
  const errores = validarCampoPerfil({ ...datos, telefono: '+54' }, 'lector_escritor', 'ubicacion')
  assert.ok(errores.some((error) => error.includes('teléfono')))
})

test('rechaza campos incompatibles con el tipo de cuenta', () => {
  assert.ok(validarCampoPerfil(datos, 'editorial', 'apodo').some((error) => error.includes('tipo de cuenta')))
  assert.ok(validarCampoPerfil(datos, 'biblioteca', 'nombreFantasia').some((error) => error.includes('tipo de cuenta')))
})
