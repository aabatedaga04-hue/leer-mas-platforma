import { ArrowUp } from 'lucide-react'
import logoLeerMas from '../assets/LEER+ LOGOS-03.png'

export default function PiePagina() {
  return (
    <footer className="border-t border-[#cbbdad] bg-[#eee5d8] text-[#24171a]">
      <div className="mx-auto grid max-w-[1500px] sm:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3 px-5 py-8 sm:px-8">
          <img src={logoLeerMas} alt="" className="h-8 w-auto" />
          <span className="text-lg font-black tracking-[-0.04em]">LEER<span className="text-(--color-brand-primary)">+</span></span>
          <span className="ml-2 hidden border-l border-[#cbbdad] pl-4 text-xs text-[#7c6661] sm:block">Las historias siguen cuando se comparten.</span>
        </div>
        <a href="#top" className="group flex items-center justify-between gap-8 border-t border-[#cbbdad] px-5 py-5 text-[10px] font-bold uppercase tracking-[0.18em] transition hover:bg-[#e5dacb] sm:border-t-0 sm:border-l sm:px-8">
          Volver arriba
          <ArrowUp className="size-4 transition-transform group-hover:-translate-y-1" aria-hidden="true" />
        </a>
      </div>
    </footer>
  )
}
