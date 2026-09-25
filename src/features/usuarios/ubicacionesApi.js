const API_BASE = 'https://countriesnow.space/api/v0.1/countries'

let cachePaises
const cacheLocalidades = new Map()

function normalizarRespuesta(respuesta) {
  if (!respuesta.ok) throw new Error('El servicio geográfico no respondió correctamente.')
  return respuesta.json()
}

function nombrePaisEnEspanol(codigo, nombreAlternativo) {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) || nombreAlternativo
  } catch {
    return nombreAlternativo
  }
}

export async function cargarPaises() {
  if (!cachePaises) {
    cachePaises = fetch(`${API_BASE}/codes`)
      .then(normalizarRespuesta)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) throw new Error('No fue posible obtener los países.')

        return data
          .filter(({ code, dial_code: codigoTelefonico }) => code && codigoTelefonico)
          .map(({ name: nombreApi, code, dial_code: codigoTelefonico }) => ({
            value: code,
            label: nombrePaisEnEspanol(code, nombreApi),
            nombreApi,
            codigoTelefonico,
            secondary: codigoTelefonico,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es'))
      })
      .catch((error) => {
        cachePaises = undefined
        throw error
      })
  }

  return cachePaises
}

export async function cargarLocalidades(nombrePaisApi) {
  if (!nombrePaisApi) return []
  if (!cacheLocalidades.has(nombrePaisApi)) {
    const solicitud = fetch(`${API_BASE}/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: nombrePaisApi }),
    })
      .then(normalizarRespuesta)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) throw new Error('No fue posible obtener las localidades.')

        return [...new Set(data.filter(Boolean))]
          .map((nombre) => ({ value: nombre, label: nombre }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es'))
      })
      .catch((error) => {
        cacheLocalidades.delete(nombrePaisApi)
        throw error
      })

    cacheLocalidades.set(nombrePaisApi, solicitud)
  }

  return cacheLocalidades.get(nombrePaisApi)
}
