import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAXIMO_SELECCIONES,
  datosPublicosDesdePerfil,
  validarCampoPublico,
  validarImagenPerfil,
} from './perfilPublicoValidation.js'

test('normaliza un perfil público incompleto con valores seguros', () => {
  assert.deepEqual(datosPublicosDesdePerfil({}), {
    imagenPerfilUrl: '', biografia: '', generos: [], intereses: [], horariosAtencion: '',
    enlacesExternos: [], emailContacto: '', telefonoContacto: '',
    perfilVisible: true, ubicacionVisible: false, contactoVisible: false,
  })
})

test('acepta imágenes JPG, PNG o WebP de hasta 5 MB', () => {
  assert.equal(validarImagenPerfil({ type: 'image/webp', size: 1024 }), null)
  assert.match(validarImagenPerfil({ type: 'image/gif', size: 1024 }), /JPG, PNG o WebP/)
  assert.match(validarImagenPerfil({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/)
})

test('limita selecciones y extensiones según el tipo de perfil', () => {
  const demasiados = Array.from({ length: MAXIMO_SELECCIONES + 1 }, (_, indice) => `Género ${indice}`)
  assert.match(validarCampoPublico({ generos: demasiados }, 'lector_escritor', 'generos')[0], /hasta 12/)
  assert.match(validarCampoPublico({ biografia: 'a'.repeat(401) }, 'lector_escritor', 'biografia')[0], /400/)
  assert.deepEqual(validarCampoPublico({ biografia: 'a'.repeat(500) }, 'editorial', 'biografia'), [])
})

test('valida contacto público y enlaces externos', () => {
  assert.match(validarCampoPublico({ emailContacto: 'no-es-email', telefonoContacto: '', contactoVisible: true }, 'lector_escritor', 'contacto')[0], /correo público/)
  assert.match(validarCampoPublico({ emailContacto: '', telefonoContacto: '', contactoVisible: true }, 'lector_escritor', 'contacto')[0], /al menos un medio/)
  assert.deepEqual(validarCampoPublico({ emailContacto: 'autora@ejemplo.com', telefonoContacto: '', contactoVisible: true }, 'lector_escritor', 'contacto'), [])
  assert.deepEqual(validarCampoPublico({ enlacesExternos: [{ etiqueta: 'Sitio', url: 'https://ejemplo.com' }] }, 'lector_escritor', 'enlacesExternos'), [])
  assert.match(validarCampoPublico({ enlacesExternos: [{ etiqueta: 'Sitio', url: 'javascript:alert(1)' }] }, 'lector_escritor', 'enlacesExternos')[0], /http/)
})
