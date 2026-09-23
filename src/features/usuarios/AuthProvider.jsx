import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '../../supabaseClient'
import { AuthContext } from './authContext'
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
  obtenerPerfil,
  obtenerSolicitudInstitucional,
} from './authApi'

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [solicitud, setSolicitud] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarCuenta = useCallback(async (sesionActual) => {
    setSesion(sesionActual ?? null)
    setError(null)

    if (!sesionActual?.user) {
      setPerfil(null)
      setSolicitud(null)
      setCargando(false)
      return null
    }

    setCargando(true)
    try {
      const perfilActual = await obtenerPerfil(sesionActual.user.id)
      const solicitudActual =
        perfilActual?.tipo_usuario === 'biblioteca' || perfilActual?.tipo_usuario === 'editorial'
          ? await obtenerSolicitudInstitucional(sesionActual.user.id)
          : null
      setPerfil(perfilActual)
      setSolicitud(solicitudActual)
      return perfilActual
    } catch (fallo) {
      setError(fallo)
      setPerfil(null)
      setSolicitud(null)
      return null
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let vigente = true

    supabase.auth.getSession().then(({ data }) => {
      if (vigente) cargarCuenta(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_evento, siguienteSesion) => {
      // Se difiere la consulta de perfil para no bloquear internamente el callback de Auth.
      setTimeout(() => {
        if (vigente) cargarCuenta(siguienteSesion)
      }, 0)
    })

    return () => {
      vigente = false
      data.subscription.unsubscribe()
    }
  }, [cargarCuenta])

  const iniciarSesion = useCallback(
    async (credenciales) => {
      const datos = await iniciarSesionApi(credenciales)
      const perfilActual = await cargarCuenta(datos.session)
      return perfilActual
    },
    [cargarCuenta],
  )

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionApi()
    await cargarCuenta(null)
  }, [cargarCuenta])

  const refrescar = useCallback(async () => cargarCuenta(sesion), [cargarCuenta, sesion])

  const valor = useMemo(
    () => ({
      sesion,
      usuarioAuth: sesion?.user ?? null,
      perfil,
      solicitud,
      cargando,
      error,
      estaAutenticado: Boolean(sesion?.user),
      estaActivo: perfil?.estado === 'activo',
      estaPendiente: perfil?.estado === 'pendiente',
      iniciarSesion,
      cerrarSesion,
      refrescar,
    }),
    [sesion, perfil, solicitud, cargando, error, iniciarSesion, cerrarSesion, refrescar],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
