import { useState } from 'react'
import { ArrowUpRight, LogOut, Menu, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logoLeerMas from '../assets/LEER+ LOGOS-03.png'

const clasesFoco =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4ede2]'

function clasesNav({ isActive }) {
  return `nav-editorial ${clasesFoco} ${isActive ? 'nav-editorial-activo' : ''}`
}

export default function EncabezadoPrincipal({ usuario, onCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#cbbdad] bg-[#f4ede2]/95 text-[#24171a] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-stretch">
        <NavLink to="/" onClick={cerrarMenu} className={`flex min-w-[170px] items-center gap-2.5 border-r border-[#cbbdad] px-5 transition hover:bg-white/35 sm:px-7 ${clasesFoco}`}>
          <img src={logoLeerMas} alt="" className="h-9 w-auto object-contain" />
          <span className="text-xl font-black tracking-[-0.04em] text-[#2a191d]">
            LEER<span className="text-(--color-brand-primary)">+</span>
          </span>
        </NavLink>

        <nav aria-label="Navegación principal" className="hidden flex-1 items-stretch lg:flex">
          <NavLink to="/" end className={clasesNav}>Inicio</NavLink>
          <NavLink to="/catalogo" className={clasesNav}>Catálogo</NavLink>
          <a href="/#ecosistema" className={`nav-editorial ${clasesFoco}`}>La plataforma</a>
          {usuario && <NavLink to="/gestion-prestamos" className={clasesNav}>Préstamos</NavLink>}
        </nav>

        <div className="ml-auto hidden items-stretch border-l border-[#cbbdad] lg:flex">
          {usuario ? (
            <>
              <div className="flex min-w-[170px] flex-col justify-center px-6">
                <span className="text-sm font-bold">{usuario.nombre}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#806b65]">{usuario.rol || 'Usuario'}</span>
              </div>
              <button type="button" onClick={onCerrarSesion} className={`flex w-[72px] items-center justify-center border-l border-[#cbbdad] text-[#6f5955] transition hover:bg-(--color-brand-primary) hover:text-white ${clasesFoco}`} aria-label="Cerrar sesión">
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <NavLink to="/ingresar" className={`group flex items-center gap-3 bg-(--color-brand-primary) px-7 text-sm font-bold text-white transition hover:bg-[#991035] ${clasesFoco}`}>
              Ingresar
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </NavLink>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          className={`ml-auto flex w-[72px] items-center justify-center border-l border-[#cbbdad] transition hover:bg-white/40 lg:hidden ${clasesFoco}`}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuAbierto ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {menuAbierto && (
        <nav id="menu-movil" aria-label="Navegación móvil" className="border-t border-[#cbbdad] bg-[#f4ede2] lg:hidden">
          <div className="grid sm:grid-cols-2">
            <NavLink to="/" end onClick={cerrarMenu} className={clasesNav}>Inicio</NavLink>
            <NavLink to="/catalogo" onClick={cerrarMenu} className={clasesNav}>Catálogo</NavLink>
            <a href="/#ecosistema" onClick={cerrarMenu} className={`nav-editorial ${clasesFoco}`}>La plataforma</a>
            {usuario && <NavLink to="/gestion-prestamos" onClick={cerrarMenu} className={clasesNav}>Préstamos</NavLink>}
          </div>
          <div className="border-t border-[#cbbdad] p-4">
            {usuario ? (
              <button type="button" onClick={() => { cerrarMenu(); onCerrarSesion() }} className={`flex w-full items-center justify-center gap-2 bg-[#2a191d] px-5 py-3 text-sm font-bold text-white ${clasesFoco}`}>
                <LogOut className="size-4" aria-hidden="true" />Cerrar sesión
              </button>
            ) : (
              <NavLink to="/ingresar" onClick={cerrarMenu} className={`block bg-(--color-brand-primary) px-5 py-3 text-center text-sm font-bold text-white ${clasesFoco}`}>Ingresar o registrarse</NavLink>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
