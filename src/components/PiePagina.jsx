import { BookOpenText } from 'lucide-react'
import logoLeerMas from '../assets/LEER+ LOGOS-03.png'

export default function PiePagina() {
  return (
    <footer className="border-t border-(--color-brand-cream)/10 bg-[#12090d] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img src={logoLeerMas} alt="LEER+" className="h-10 w-auto" />
          <p className="max-w-xs border-l border-(--color-brand-cream)/12 pl-4 text-xs leading-5 text-[#9f8988]">Un espacio común para descubrir, publicar y compartir historias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#9f8988]">
          <span className="flex items-center gap-2"><BookOpenText className="size-4 text-(--color-brand-secondary)" aria-hidden="true" />Fundación Literaria Comunitaria</span>
          <span>Proyecto Final · 2026</span>
        </div>
      </div>
    </footer>
  )
}
