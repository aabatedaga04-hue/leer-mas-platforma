import { useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logoLeerMas from '../assets/LEER+ LOGOS-03.png'

const clasesFoco =
  'focus-brand focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-[#160c11]'

function clasesNav({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${clasesFoco} ${
    isActive
      ? 'bg-(--color-brand-cream) text-[#4b1728]'
      : 'text-[#cfbbb6] hover:bg-white/6 hover:text-(--color-brand-cream)'
  }`
}

export default function EncabezadoPrincipal({ usuario, onCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <header className="sticky top-0 z-50 border-b border-(--color-brand-cream)/10 bg-[#160c11]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <NavLink to="/" onClick={cerrarMenu} className={`flex shrink-0 items-center gap-3 rounded-xl ${clasesFoco}`}>
          <img src={logoLeerMas} alt="LEER+" className="h-10 w-auto object-contain" />
          <span className="hidden border-l border-(--color-brand-cream)/15 pl-3 text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-[#a9908f] sm:block">
            Comunidad<br />literaria
          </span>
        </NavLink>

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 rounded-full border border-(--color-brand-cream)/10 bg-black/12 p-1.5 lg:flex">
          <NavLink to="/" end className={clasesNav}>Inicio</NavLink>
          <NavLink to="/catalogo" className={clasesNav}>Catálogo</NavLink>
          <a href="/#ecosistema" className={`rounded-full px-4 py-2 text-sm font-semibold text-[#cfbbb6] transition hover:bg-white/6 hover:text-(--color-brand-cream) ${clasesFoco}`}>
            La plataforma
          </a>
          {usuario && <NavLink to="/gestion-prestamos" className={clasesNav}>Préstamos</NavLink>}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {usuario ? (
            <>
              <div className="text-right">
                <span className="block text-sm font-semibold text-[#fff8ed]">{usuario.nombre}</span>
                <span className="block text-xs text-[#a9908f]">{usuario.rol || 'Usuario'}</span>
              </div>
              <button type="button" onClick={onCerrarSesion} className={`flex size-10 items-center justify-center rounded-full border border-(--color-brand-cream)/15 text-[#cfbbb6] transition hover:border-red-400/35 hover:text-red-300 ${clasesFoco}`} aria-label="Cerrar sesión">
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <NavLink to="/ingresar" className={`rounded-full bg-(--color-brand-primary) px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(185,17,63,0.24)] transition hover:bg-[#cf1748] ${clasesFoco}`}>
              Ingresar
            </NavLink>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          className={`flex size-11 items-center justify-center rounded-full border border-(--color-brand-cream)/15 text-(--color-brand-cream) lg:hidden ${clasesFoco}`}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuAbierto ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {menuAbierto && (
        <nav id="menu-movil" aria-label="Navegación móvil" className="border-t border-(--color-brand-cream)/10 bg-[#160c11] px-5 py-5 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <NavLink to="/" end onClick={cerrarMenu} className={clasesNav}>Inicio</NavLink>
            <NavLink to="/catalogo" onClick={cerrarMenu} className={clasesNav}>Catálogo</NavLink>
            <a href="/#ecosistema" onClick={cerrarMenu} className={`rounded-full px-4 py-2 text-sm font-semibold text-[#cfbbb6] ${clasesFoco}`}>La plataforma</a>
            {usuario && <NavLink to="/gestion-prestamos" onClick={cerrarMenu} className={clasesNav}>Préstamos</NavLink>}
            <div className="mt-3 border-t border-(--color-brand-cream)/10 pt-4">
              {usuario ? (
                <button type="button" onClick={() => { cerrarMenu(); onCerrarSesion() }} className={`flex w-full items-center justify-center gap-2 rounded-full border border-(--color-brand-secondary)/30 px-5 py-3 text-sm font-semibold text-[#f0d8d3] ${clasesFoco}`}>
                  <LogOut className="size-4" aria-hidden="true" />Cerrar sesión
                </button>
              ) : (
                <NavLink to="/ingresar" onClick={cerrarMenu} className={`block rounded-full bg-(--color-brand-primary) px-5 py-3 text-center text-sm font-bold text-white ${clasesFoco}`}>Ingresar o registrarse</NavLink>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
