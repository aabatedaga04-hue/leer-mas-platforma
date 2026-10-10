import { supabase } from '../../supabaseClient'
import { AuthError } from './authApi'
import { validarCampoPerfil } from './perfilValidation'

export async function actualizarPerfilBasico(datos, tipoUsuario, campoActivo) {
  const errores = validarCampoPerfil(datos, tipoUsuario, campoActivo)
  if (errores.length) throw new AuthError(errores[0])

  const { error } = await supabase.rpc('fn_actualizar_perfil_basico', {
    p_campo: campoActivo,
    p_nombre: datos.nombre?.trim() || null,
    p_apellido: datos.apellido?.trim() || null,
    p_telefono: datos.telefono.trim(),
    p_pais: datos.pais.trim(),
    p_provincia: datos.provincia.trim(),
    p_localidad: datos.localidad.trim(),
    p_apodo: tipoUsuario === 'lector_escritor' ? datos.apodo.trim() : null,
    p_direccion: tipoUsuario === 'biblioteca' ? datos.direccion.trim() : null,
    p_nombre_fantasia: tipoUsuario === 'editorial' ? datos.nombreFantasia.trim() : null,
    p_sitio_web: tipoUsuario === 'editorial' ? datos.sitioWeb.trim() || null : null,
  })

  if (!error) return
  if (error.code === '23505') throw new AuthError('Ese alias ya está en uso. Elegí otro.')
  if (error.code === 'P0001' && error.message) throw new AuthError(error.message)
  throw new AuthError('No pudimos guardar los cambios. Revisá tu conexión e intentá nuevamente.', { cause: error })
}
