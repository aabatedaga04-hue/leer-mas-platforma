import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configuracionCompleta = Boolean(supabaseUrl && supabaseAnonKey)

// Sin las variables de entorno, createClient lanza durante el import y la app
// entera queda en pantalla blanca, sin pista de qué pasó. Con valores de
// relleno la app arranca, las consultas fallan como error de red y cada vista
// muestra su propio mensaje de "no se pudo conectar".
if (!configuracionCompleta) {
  console.error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env.local y completá los valores del proyecto.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://sin-configurar.supabase.co',
  supabaseAnonKey || 'sin-configurar',
)
