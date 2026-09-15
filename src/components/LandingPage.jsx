import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  BookOpenText,
  Bookmark,
  Building2,
  Feather,
  LibraryBig,
  MessagesSquare,
  Search,
} from 'lucide-react'

const puertas = [
  {
    numero: '01',
    perfil: 'Soy lector',
    accion: 'Busco mi próxima lectura',
    tono: 'bg-(--color-brand-primary)',
    destino: 'catalogo',
  },
  {
    numero: '02',
    perfil: 'Soy autor',
    accion: 'Quiero compartir una obra',
    tono: 'bg-(--color-brand-mint)',
    destino: 'ingreso',
  },
  {
    numero: '03',
    perfil: 'Represento una biblioteca',
    accion: 'Quiero conectar mi catálogo',
    tono: 'bg-(--color-brand-sand)',
    destino: 'ingreso',
  },
  {
    numero: '04',
    perfil: 'Soy editorial',
    accion: 'Quiero descubrir nuevas voces',
    tono: 'bg-(--color-brand-secondary)',
    destino: 'ingreso',
  },
]

const participantes = [
  {
    clase: 'mapa-lector',
    numero: '01',
    titulo: 'Lector',
    descripcion: 'Descubre, guarda y recomienda.',
    icono: BookMarked,
  },
  {
    clase: 'mapa-autor',
    numero: '02',
    titulo: 'Autor',
    descripcion: 'Publica y encuentra a su audiencia.',
    icono: Feather,
  },
  {
    clase: 'mapa-biblioteca',
    numero: '03',
    titulo: 'Biblioteca',
    descripcion: 'Acerca sus ejemplares a la comunidad.',
    icono: LibraryBig,
  },
  {
    clase: 'mapa-editorial',
    numero: '04',
    titulo: 'Editorial',
    descripcion: 'Observa tendencias y nuevas voces.',
    icono: Building2,
  },
]

const recorrido = [
  {
    numero: '01',
    verbo: 'Encontrar',
    titulo: 'Una búsqueda que entiende de libros.',
    descripcion: 'Explorá por título, autor o género y conocé dónde está disponible cada obra.',
    detalle: 'Catálogo + disponibilidad',
    icono: Search,
  },
  {
    numero: '02',
    verbo: 'Guardar',
    titulo: 'Tu recorrido queda con vos.',
    descripcion: 'Armá listas, registrá avances y construí una biblioteca personal que crece a tu ritmo.',
    detalle: 'Listas + progreso',
    icono: Bookmark,
  },
  {
    numero: '03',
    verbo: 'Conversar',
    titulo: 'La lectura continúa después del punto final.',
    descripcion: 'Compartí reseñas y conversaciones para que una historia llegue a su próximo lector.',
    detalle: 'Reseñas + comunidad',
    icono: MessagesSquare,
  },
]

function PuertaDeEntrada({ puerta, onIngresar, onExplorar }) {
  const entrar = puerta.destino === 'catalogo' ? onExplorar : onIngresar

  return (
    <button type="button" onClick={entrar} className="puerta group w-full text-left">
      <span className={`mt-1 size-2.5 shrink-0 ${puerta.tono}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#846d67]">
          {puerta.numero} · {puerta.perfil}
        </span>
        <span className="mt-1 block font-editorial text-lg leading-tight text-[#24171a] sm:text-xl">
          {puerta.accion}
        </span>
      </span>
      <ArrowUpRight className="mt-2 size-4 shrink-0 text-(--color-brand-primary) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  )
}

function MapaDelEcosistema() {
  return (
    <div className="ecosistema-mapa" aria-label="Una obra conecta a lectores, autores, bibliotecas y editoriales">
      <svg className="mapa-conexiones" viewBox="0 0 900 680" preserveAspectRatio="none" aria-hidden="true">
        <path d="M450 340 C340 300 280 190 165 120" />
        <path d="M450 340 C560 300 620 190 735 120" />
        <path d="M450 340 C340 390 280 500 165 560" />
        <path d="M450 340 C560 390 620 500 735 560" />
      </svg>

      <div className="libro-central">
        <div className="pagina pagina-izquierda">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-(--color-brand-primary)">Una obra</span>
          <BookOpenText className="mt-auto size-7 text-(--color-brand-primary)" aria-hidden="true" />
        </div>
        <div className="pagina pagina-derecha">
          <p className="font-editorial text-xl leading-tight text-[#2c1c20] sm:text-2xl">se vuelve encuentro cuando circula.</p>
          <span className="mt-auto text-[9px] uppercase tracking-[0.18em] text-[#88716b]">LEER+</span>
        </div>
      </div>

      {participantes.map(({ clase, numero, titulo, descripcion, icono: Icono }) => (
        <article key={titulo} className={`mapa-nodo ${clase}`}>
          <div className="flex items-start justify-between gap-4">
            <span className="text-[10px] font-bold tracking-[0.18em] text-(--color-brand-primary)">{numero}</span>
            <Icono className="size-5 text-[#765e58]" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h3 className="font-editorial mt-5 text-2xl font-semibold text-[#24171a]">{titulo}</h3>
          <p className="mt-1 text-sm leading-6 text-[#725d59]">{descripcion}</p>
        </article>
      ))}
    </div>
  )
}

export default function LandingPage({ onIngresar, onExplorar }) {
  return (
    <div id="top" className="landing-v3">
      <section className="portada-lectura relative isolate overflow-hidden border-b border-[#cbbdad]">
        <div className="numero-portada" aria-hidden="true">+</div>
        <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1500px] lg:grid-cols-[96px_minmax(0,1fr)_410px]">
          <aside className="margen-portada hidden border-r border-[#cbbdad] lg:flex">
            <span>LEER MÁS</span>
            <span>COMUNIDAD LITERARIA · ARGENTINA</span>
          </aside>

          <div className="relative flex flex-col justify-between px-5 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-14 xl:px-20">
            <div className="flex items-center justify-between border-b border-[#cbbdad] pb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7e6863]">
              <span>Página de inicio</span>
              <span>Edición 01 — 2026</span>
            </div>

            <div className="max-w-[760px] py-16 sm:py-20 lg:py-12">
              <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-(--color-brand-primary)">
                <span className="h-px w-10 bg-(--color-brand-primary)" />
                Todo empieza con una historia
              </p>
              <h1 className="font-editorial text-[clamp(3.5rem,7.4vw,7.4rem)] leading-[0.86] font-semibold tracking-[-0.055em] text-[#211416]">
                Un libro es<br />un punto de<br /><span className="palabra-encuentro">encuentro.</span>
              </h1>
              <p className="mt-9 max-w-xl text-base leading-7 text-[#6e5855] sm:text-lg sm:leading-8">
                LEER+ conecta las historias con quienes las escriben, las buscan, las cuidan y las hacen circular.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <button type="button" onClick={onExplorar} className="boton-recorte group inline-flex items-center gap-4 bg-(--color-brand-primary) px-6 py-4 text-sm font-bold text-white transition hover:bg-[#991035]">
                  Encontrar una historia
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
                <button type="button" onClick={onIngresar} className="enlace-editorial group inline-flex items-center gap-2 py-2 text-sm font-bold text-[#392629]">
                  Crear mi espacio
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <a href="#ecosistema" className="group flex w-fit items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#806b65]">
              <span className="flex size-8 items-center justify-center border border-[#aa9990] transition group-hover:border-(--color-brand-primary) group-hover:text-(--color-brand-primary)">
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </span>
              Abrir la página
            </a>
          </div>

          <aside className="entrada-por-perfil border-t border-[#cbbdad] px-5 py-10 sm:px-10 lg:border-t-0 lg:border-l lg:px-8 lg:py-14">
            <div className="flex items-center justify-between border-b border-[#aa9990] pb-4">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-(--color-brand-primary)">Entrada directa</span>
                <h2 className="font-editorial mt-1 text-2xl text-[#24171a]">¿Cómo querés entrar?</h2>
              </div>
              <span className="font-editorial text-4xl text-[#c6b7a7]" aria-hidden="true">↳</span>
            </div>
            <div>
              {puertas.map((puerta) => (
                <PuertaDeEntrada key={puerta.numero} puerta={puerta} onIngresar={onIngresar} onExplorar={onExplorar} />
              ))}
            </div>
            <p className="mt-8 max-w-xs text-xs leading-5 text-[#806b65]">
              Sin recorridos genéricos: cada persona llega primero a lo que vino a hacer.
            </p>
          </aside>
        </div>
      </section>

      <section id="ecosistema" className="scroll-mt-20 border-b border-[#cbbdad] bg-[#f7f1e7] px-5 py-20 sm:px-10 lg:px-14 lg:py-28">
        <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-16">
          <header className="lg:pt-12">
            <span className="indice-seccion">02 / EL ECOSISTEMA</span>
            <h2 className="font-editorial mt-6 text-4xl leading-[1.02] font-semibold tracking-[-0.035em] text-[#24171a] sm:text-5xl">
              No son cuatro mundos.
              <span className="mt-2 block text-(--color-brand-primary)">Es una misma historia.</span>
            </h2>
            <p className="mt-6 text-base leading-7 text-[#705b57]">
              El centro no es la plataforma: es la obra. LEER+ organiza alrededor de ella todo lo que cada participante necesita.
            </p>
          </header>

          <MapaDelEcosistema />
        </div>
      </section>

      <section id="recorrido" className="bg-[#eee5d8] px-5 py-20 sm:px-10 lg:px-14 lg:py-28">
        <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-16">
          <header className="lg:sticky lg:top-28 lg:self-start">
            <span className="indice-seccion">03 / EL RECORRIDO</span>
            <h2 className="font-editorial mt-6 text-4xl leading-tight font-semibold tracking-[-0.035em] text-[#24171a] sm:text-5xl">Simple para que leer siga siendo lo importante.</h2>
            <p className="mt-6 text-base leading-7 text-[#705b57]">Tres movimientos, sin ruido alrededor.</p>
          </header>

          <div className="hilo-lectura">
            {recorrido.map(({ numero, verbo, titulo, descripcion, detalle, icono: Icono }) => (
              <article key={numero} className="paso-lectura group">
                <div className="paso-marca">
                  <span>{numero}</span>
                  <span className="paso-punto"><Icono className="size-4" strokeWidth={1.7} aria-hidden="true" /></span>
                </div>
                <div className="pb-12 sm:pb-16">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--color-brand-primary)">{verbo}</span>
                  <h3 className="font-editorial mt-3 max-w-2xl text-3xl leading-tight font-semibold text-[#24171a] sm:text-4xl">{titulo}</h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <p className="max-w-xl text-sm leading-6 text-[#705b57] sm:text-base sm:leading-7">{descripcion}</p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b756e]">{detalle}</span>
                  </div>
                </div>
              </article>
            ))}

            <div className="cierre-recorrido">
              <span className="font-editorial text-6xl text-(--color-brand-primary) sm:text-7xl" aria-hidden="true">+</span>
              <div>
                <p className="font-editorial text-3xl leading-tight font-semibold text-[#24171a] sm:text-4xl">Tu próxima página puede empezar acá.</p>
                <button type="button" onClick={onIngresar} className="enlace-editorial group mt-5 inline-flex items-center gap-3 py-2 text-sm font-bold text-[#392629]">
                  Ingresar o crear una cuenta
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
