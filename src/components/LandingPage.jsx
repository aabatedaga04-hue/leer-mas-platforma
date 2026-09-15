import {
  ArrowRight,
  BookHeart,
  BookOpenText,
  Bookmark,
  Building2,
  LibraryBig,
  MessageCircleHeart,
  PenLine,
  Search,
  Sparkles,
  UsersRound,
} from 'lucide-react'

const perfiles = [
  {
    titulo: 'Lectores',
    descripcion: 'Descubrí nuevas historias, armá tus listas y compartí cada lectura con la comunidad.',
    icono: BookOpenText,
    tono: 'bordo',
  },
  {
    titulo: 'Autores',
    descripcion: 'Publicá tus escritos, construí tu perfil y acercá tu voz a quienes buscan algo nuevo.',
    icono: PenLine,
    tono: 'verde',
  },
  {
    titulo: 'Bibliotecas',
    descripcion: 'Conectá tu catálogo físico, organizá ejemplares y acompañá el recorrido de tus lectores.',
    icono: LibraryBig,
    tono: 'arena',
  },
  {
    titulo: 'Editoriales',
    descripcion: 'Encontrá autores emergentes, recomendá obras y observá tendencias de la comunidad.',
    icono: Building2,
    tono: 'rosa',
  },
]

const recorrido = [
  {
    numero: '01',
    titulo: 'Encontrá tu próxima historia',
    descripcion: 'Buscá por título, autor o género y conocé la disponibilidad en bibliotecas asociadas.',
    icono: Search,
  },
  {
    numero: '02',
    titulo: 'Hacé tuyo el recorrido',
    descripcion: 'Guardá obras, registrá tu progreso y sumate a desafíos que sostienen el hábito lector.',
    icono: Bookmark,
  },
  {
    numero: '03',
    titulo: 'Leé en comunidad',
    descripcion: 'Compartí reseñas y conversaciones que ayudan a que cada obra encuentre nuevos lectores.',
    icono: UsersRound,
  },
]

const estilosTono = {
  bordo: 'bg-(--color-brand-primary)/12 text-(--color-brand-primary) border-(--color-brand-primary)/20',
  verde: 'bg-(--color-brand-mint)/25 text-[#55745f] border-(--color-brand-mint)/45',
  arena: 'bg-(--color-brand-sand)/35 text-[#6f6840] border-(--color-brand-sand)/60',
  rosa: 'bg-(--color-brand-secondary)/15 text-[#8b4652] border-(--color-brand-secondary)/30',
}

function BibliotecaVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-label="Una biblioteca cálida que reúne a la comunidad de LEER+">
      <div className="book-glow absolute -inset-10 rounded-full" />

      <div className="relative overflow-hidden rounded-[2.25rem] border border-(--color-brand-cream)/15 bg-[#211319]/92 p-5 shadow-[0_35px_90px_rgba(20,7,12,0.42)] sm:p-7">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-(--color-brand-sand)/70">
          <span>Tu espacio de lectura</span>
          <Sparkles className="size-4 text-(--color-brand-cream)" aria-hidden="true" />
        </div>

        <div className="relative mx-auto h-[286px] max-w-[390px] sm:h-[330px]">
          <div className="absolute inset-x-2 bottom-0 h-3 rounded-full bg-[#12090d] shadow-[0_14px_28px_rgba(0,0,0,0.55)]" />

          <div className="absolute bottom-3 left-[6%] h-[240px] w-[30%] rotate-[-5deg] rounded-r-xl rounded-l-sm bg-(--color-brand-primary) p-4 shadow-2xl sm:h-[276px]">
            <div className="h-full border-l border-(--color-brand-cream)/25 pl-3">
              <p className="font-editorial text-lg leading-tight text-(--color-brand-cream) sm:text-xl">Historias que encuentran lectores</p>
              <span className="absolute bottom-5 left-7 text-[10px] uppercase tracking-[0.2em] text-white/65">LEER+</span>
            </div>
          </div>

          <div className="absolute bottom-3 left-[34%] z-10 h-[260px] w-[31%] rotate-[2deg] rounded-r-xl rounded-l-sm bg-(--color-brand-cream) p-4 text-[#28171c] shadow-2xl sm:h-[302px]">
            <div className="flex h-full flex-col justify-between border-l border-(--color-brand-secondary)/35 pl-3">
              <BookHeart className="size-7 text-(--color-brand-primary)" aria-hidden="true" />
              <p className="font-editorial text-xl leading-tight sm:text-2xl">Un lugar para cada forma de leer.</p>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#7c565d]">Comunidad literaria</span>
            </div>
          </div>

          <div className="absolute bottom-3 right-[4%] h-[226px] w-[30%] rotate-[7deg] rounded-r-xl rounded-l-sm bg-(--color-brand-mint) p-4 text-[#23352a] shadow-2xl sm:h-[262px]">
            <div className="h-full border-l border-white/25 pl-3">
              <p className="font-editorial text-lg leading-tight sm:text-xl">Bibliotecas, autores y comunidad</p>
              <span className="absolute bottom-5 left-7 text-[10px] uppercase tracking-[0.2em] text-[#314b39]/70">En un mismo estante</span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-(--color-brand-cream)/10 pt-5 text-sm text-(--color-brand-sand)">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-(--color-brand-mint)" />
            Catálogo y comunidad conectados
          </span>
          <span className="font-semibold text-(--color-brand-cream)">LEER+</span>
        </div>
      </div>

      <div className="book-float absolute -bottom-6 -left-3 z-20 hidden items-center gap-3 rounded-2xl border border-[#d8c7ad] bg-[#fff8ed] px-4 py-3 text-[#3a242a] shadow-xl sm:flex">
        <span className="flex size-9 items-center justify-center rounded-xl bg-(--color-brand-primary)/10">
          <MessageCircleHeart className="size-4 text-(--color-brand-primary)" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-xs text-[#84676d]">Una comunidad</span>
          <span className="block text-sm font-semibold">alrededor de los libros</span>
        </span>
      </div>
    </div>
  )
}

export default function LandingPage({ onIngresar, onExplorar }) {
  return (
    <div className="landing-v2">
      <section className="relative isolate overflow-hidden px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="paper-orbit paper-orbit-one" />
        <div className="paper-orbit paper-orbit-two" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-12">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-(--color-brand-secondary)/25 bg-(--color-brand-cream)/7 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--color-brand-cream)">
              <BookOpenText className="size-4" aria-hidden="true" />
              Ecosistema literario argentino
            </div>

            <h1 className="font-editorial text-balance text-5xl leading-[0.98] font-semibold tracking-[-0.035em] text-[#fff8ed] sm:text-6xl lg:text-[5.2rem]">
              Donde las historias encuentran su{' '}
              <span className="text-(--color-brand-cream)">comunidad.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-[#dccbc3] sm:text-xl">
              LEER+ reúne lectores, autores, bibliotecas y editoriales en un espacio pensado para descubrir, compartir y acompañar cada recorrido de lectura.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onExplorar}
                className="focus-brand group inline-flex items-center justify-center gap-2 rounded-full bg-(--color-brand-primary) px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_35px_rgba(185,17,63,0.3)] transition hover:-translate-y-0.5 hover:bg-[#cf1748]"
              >
                Explorar el catálogo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
              <a
                href="#ecosistema"
                className="focus-brand inline-flex items-center justify-center rounded-full border border-(--color-brand-cream)/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-(--color-brand-cream) transition hover:border-(--color-brand-cream)/45 hover:bg-white/8"
              >
                Conocer la plataforma
              </a>
            </div>

            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 border-t border-(--color-brand-cream)/10 pt-6 text-sm text-[#bea9a4]">
              <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-(--color-brand-mint)" />Catálogo vivo</span>
              <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-(--color-brand-sand)" />Autores emergentes</span>
              <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-(--color-brand-secondary)" />Bibliotecas conectadas</span>
            </div>
          </div>

          <BibliotecaVisual />
        </div>
      </section>

      <section id="ecosistema" className="paper-section scroll-mt-24 px-5 py-20 text-[#2d1b21] sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 border-b border-[#cdbba4] pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-brand-primary)">Un mismo ecosistema</span>
              <h2 className="font-editorial mt-3 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Cuatro maneras de formar parte.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#735b60] lg:justify-self-end lg:text-lg">
              Cada perfil tiene su propio recorrido, pero todos se encuentran alrededor de las obras y de las conversaciones que nacen de ellas.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perfiles.map(({ titulo, descripcion, icono: Icono, tono }) => (
              <article key={titulo} className="group rounded-[1.6rem] border border-[#d9c9b4] bg-[#fffaf1]/85 p-6 transition duration-300 hover:-translate-y-1 hover:border-[#bca38a] hover:shadow-[0_18px_42px_rgba(71,42,34,0.1)]">
                <span className={`mb-8 flex size-12 items-center justify-center rounded-2xl border ${estilosTono[tono]}`}>
                  <Icono className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-editorial text-2xl font-semibold">{titulo}</h3>
                <p className="mt-3 text-sm leading-6 text-[#745f62]">{descripcion}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="recorrido" className="relative overflow-hidden px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-brand-mint)">Simple desde el comienzo</span>
            <h2 className="font-editorial mt-3 text-4xl leading-tight font-semibold text-[#fff8ed] sm:text-5xl">Tu recorrido, en un solo lugar.</h2>
            <p className="mt-5 text-lg leading-7 text-[#cbb8b3]">La tecnología acompaña la experiencia sin ponerse por delante de los libros.</p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[2rem] border border-(--color-brand-cream)/10 bg-(--color-brand-cream)/10 lg:grid-cols-3">
            {recorrido.map(({ numero, titulo, descripcion, icono: Icono }) => (
              <article key={numero} className="group bg-[#1b1015] p-7 sm:p-9">
                <div className="flex items-center justify-between">
                  <span className="font-editorial text-lg text-(--color-brand-secondary)">{numero}</span>
                  <span className="flex size-11 items-center justify-center rounded-full border border-(--color-brand-cream)/12 bg-(--color-brand-cream)/5 text-(--color-brand-cream) transition group-hover:border-(--color-brand-mint)/35 group-hover:text-(--color-brand-mint)">
                    <Icono className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="font-editorial mt-12 text-2xl font-semibold text-[#fff8ed]">{titulo}</h3>
                <p className="mt-4 text-sm leading-6 text-[#bca7a3]">{descripcion}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-(--color-brand-primary) px-6 py-12 text-center shadow-[0_28px_75px_rgba(81,7,29,0.35)] sm:px-10 lg:py-16">
          <div className="cta-rings absolute inset-0" />
          <div className="relative mx-auto max-w-2xl">
            <BookHeart className="mx-auto size-8 text-(--color-brand-cream)" aria-hidden="true" />
            <h2 className="font-editorial mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">Hay una historia esperando encontrarte.</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#ffe2d7]">Creá tu espacio en LEER+ y empezá a construir un recorrido de lectura propio y compartido.</p>
            <button
              type="button"
              onClick={onIngresar}
              className="focus-brand mt-8 inline-flex items-center gap-2 rounded-full bg-(--color-brand-cream) px-7 py-3.5 text-sm font-bold text-[#5d1129] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Ingresar o crear una cuenta
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
