const API_BASE = 'https://countriesnow.space/api/v0.1/countries'

let cachePaises
const cacheProvincias = new Map()
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

function nombreProvincia(nombre, codigoPais) {
  if (codigoPais === 'AR' && nombre === 'Autonomous City Of Buenos Aires') {
    return 'Ciudad Autónoma de Buenos Aires'
  }

  return nombre.replace(/\s+(Province|State|Region|Department|District|Territory)$/i, '')
}

export async function cargarProvincias(nombrePaisApi, codigoPais) {
  if (!nombrePaisApi) return []
  if (!cacheProvincias.has(nombrePaisApi)) {
    const solicitud = fetch(`${API_BASE}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: nombrePaisApi }),
    })
      .then(normalizarRespuesta)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data?.states)) throw new Error('No fue posible obtener las provincias.')

        return data.states
          .filter(({ name }) => name)
          .map(({ name, state_code: codigo }) => ({
            value: codigo || name,
            label: nombreProvincia(name, codigoPais),
            nombreApi: name,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es'))
      })
      .catch((error) => {
        cacheProvincias.delete(nombrePaisApi)
        throw error
      })

    cacheProvincias.set(nombrePaisApi, solicitud)
  }

  return cacheProvincias.get(nombrePaisApi)
}

export async function cargarLocalidades(nombrePaisApi, nombreProvinciaApi) {
  if (!nombrePaisApi || !nombreProvinciaApi) return []
  const clave = `${nombrePaisApi}:${nombreProvinciaApi}`
  if (!cacheLocalidades.has(clave)) {
    const solicitud = fetch(`${API_BASE}/state/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: nombrePaisApi, state: nombreProvinciaApi }),
    })
      .then(normalizarRespuesta)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) throw new Error('No fue posible obtener las localidades.')

        return [...new Set(data.filter(Boolean))]
          .map((nombre) => ({ value: nombre, label: nombre }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es'))
      })
      .catch((error) => {
        cacheLocalidades.delete(clave)
        throw error
      })

    cacheLocalidades.set(clave, solicitud)
  }

  return cacheLocalidades.get(clave)
}
