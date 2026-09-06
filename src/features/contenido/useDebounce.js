import { useEffect, useState } from 'react'

/**
 * Retrasa la propagación de un valor que cambia rápido (texto tipeado) para no
 * disparar una consulta por cada tecla. Compartido por el buscador del catálogo
 * local y el de Google Books.
 */
export function useDebounce(valor, milisegundos = 350) {
  const [retrasado, setRetrasado] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setRetrasado(valor), milisegundos)
    return () => clearTimeout(temporizador)
  }, [valor, milisegundos])

  return retrasado
}
