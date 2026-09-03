/**
 * Vocabulario de géneros de LEER+ y traducción desde las categorías externas.
 *
 * Google Books clasifica con BISAC, un vocabulario en inglés: devuelve "Fiction"
 * o "Juvenile Fiction / Fantasy & Magic" incluso para libros en castellano, y no
 * expone ningún endpoint para listar las categorías. La única forma de tener el
 * selector en español es mantener este mapeo nosotros.
 *
 * Se aplica al catalogar, no al mostrar: `obra.genero` guarda siempre el término
 * en español, así el filtro del catálogo lee un vocabulario consistente sin
 * traducir en cada render.
 */

/** Categorías BISAC de primer nivel. Es una lista cerrada y estable. */
const BISAC = {
  'antiques & collectibles': 'Antigüedades y coleccionismo',
  architecture: 'Arquitectura',
  art: 'Arte',
  bibles: 'Textos bíblicos',
  'biography & autobiography': 'Biografía',
  'body mind & spirit': 'Cuerpo y espiritualidad',
  'business & economics': 'Economía y negocios',
  'comics & graphic novels': 'Historieta y novela gráfica',
  computers: 'Informática',
  cooking: 'Cocina',
  'crafts & hobbies': 'Manualidades y pasatiempos',
  design: 'Diseño',
  drama: 'Teatro',
  education: 'Educación',
  'family & relationships': 'Familia y relaciones',
  fiction: 'Ficción',
  'foreign language study': 'Idiomas',
  'games & activities': 'Juegos y actividades',
  gardening: 'Jardinería',
  'health & fitness': 'Salud y bienestar',
  history: 'Historia',
  'house & home': 'Hogar',
  humor: 'Humor',
  'juvenile fiction': 'Literatura infantil y juvenil',
  'juvenile nonfiction': 'Divulgación infantil y juvenil',
  'language arts & disciplines': 'Lengua y literatura',
  law: 'Derecho',
  'literary collections': 'Antologías literarias',
  'literary criticism': 'Crítica literaria',
  mathematics: 'Matemática',
  medical: 'Medicina',
  music: 'Música',
  nature: 'Naturaleza',
  'performing arts': 'Artes escénicas',
  pets: 'Mascotas',
  philosophy: 'Filosofía',
  photography: 'Fotografía',
  poetry: 'Poesía',
  'political science': 'Ciencia política',
  psychology: 'Psicología',
  reference: 'Obras de referencia',
  religion: 'Religión',
  science: 'Ciencia',
  'self-help': 'Autoayuda',
  'social science': 'Ciencias sociales',
  'sports & recreation': 'Deportes y recreación',
  'study aids': 'Material de estudio',
  'technology & engineering': 'Tecnología e ingeniería',
  transportation: 'Transporte',
  travel: 'Viajes',
  'true crime': 'Crónica policial',
  'young adult fiction': 'Ficción juvenil',
  'young adult nonfiction': 'Divulgación juvenil',
}

/**
 * Google mezcla BISAC con encabezados de materia de biblioteca, que no siguen
 * ese vocabulario. Estos son los que aparecen con frecuencia en el catálogo en
 * castellano; algunos ya vienen en español y solo hay que unificarlos.
 */
const MATERIAS = {
  'argentine fiction': 'Ficción',
  'spanish fiction': 'Ficción',
  'latin american fiction': 'Ficción',
  'short stories': 'Cuento',
  'detective and mystery stories': 'Policial',
  'science fiction': 'Ciencia ficción',
  'historical fiction': 'Novela histórica',
  'love stories': 'Novela romántica',
  'cuentos argentinos': 'Cuento',
  'cuentos espanoles': 'Cuento',
  'novela argentina': 'Novela',
  'novela espanola': 'Novela',
  ensayo: 'Ensayo',
  novela: 'Novela',
  cuento: 'Cuento',
  poesia: 'Poesía',
  teatro: 'Teatro',
}

/**
 * Último recurso, por palabra clave. Google devuelve encabezados de materia
 * libres ("Spanish literature", "Italian drama (Comedy)") que no están en
 * ninguna lista cerrada. El orden importa: se evalúa de más específico a más
 * general, así "historical fiction" no cae en "fiction".
 */
const PALABRAS_CLAVE = [
  [/ciencia ficcion|science fiction/, 'Ciencia ficción'],
  [/historical fiction|novela historica/, 'Novela histórica'],
  [/short stor|cuentos?\b/, 'Cuento'],
  [/poetry|poesia/, 'Poesía'],
  [/drama|teatro/, 'Teatro'],
  [/biograph|biografia/, 'Biografía'],
  [/fiction|ficcion|novel/, 'Ficción'],
  [/history|historia/, 'Historia'],
  [/literature|literatura/, 'Literatura'],
]

function normalizar(texto) {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas diacriticas
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Traduce una categoría externa al vocabulario de la plataforma.
 *
 * Devuelve null si no la reconoce: es preferible dejar el género vacío antes
 * que guardar "Fiction" y ensuciar el selector con dos idiomas mezclados.
 */
export function traducirCategoria(categoria) {
  if (!categoria) return null

  // "Juvenile Fiction / Fantasy & Magic" -> se usa el nivel principal.
  // Se descarta lo que va entre paréntesis: "Italian drama (Comedy)".
  const principal = normalizar(String(categoria).split('/')[0].replace(/\(.*?\)/g, ''))
  if (!principal) return null

  const exacta = BISAC[principal] ?? MATERIAS[principal]
  if (exacta) return exacta

  const porPalabra = PALABRAS_CLAVE.find(([patron]) => patron.test(principal))
  return porPalabra ? porPalabra[1] : null
}

/** Primer género reconocible de la lista de categorías de un volumen. */
export function generoDesdeCategorias(categorias) {
  for (const categoria of categorias ?? []) {
    const traducida = traducirCategoria(categoria)
    if (traducida) return traducida
  }
  return null
}
