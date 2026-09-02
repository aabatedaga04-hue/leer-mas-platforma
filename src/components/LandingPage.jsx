import React from 'react'

export default function LandingPage({ onIngresar }) {
  return (
    <div className="space-y-16 py-6">
      
      {/* SECCIÓN HERO PRINCIPAL */}
      <section className="text-center space-y-6 max-w-4xl mx-auto pt-8">
        <span className="bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-cream)] text-xs font-semibold px-4 py-1.5 rounded-full border border-[var(--color-brand-primary)]/30 uppercase tracking-widest">
          Plataforma de Ecosistema Literario
        </span>
        
        <h1 className="text-4xl sm:text-6xl font-black text-slate-100 tracking-tight leading-tight">
          El punto de encuentro entre <br className="hidden sm:inline" />
          <span className="text-[var(--color-brand-cream)]">lectores</span>,{' '}
          <span className="text-[var(--color-brand-mint)]">escritores</span> y{' '}
          <span className="text-[var(--color-brand-sand)]">bibliotecas</span>
        </h1>

        <p className="text-[var(--color-brand-sand)] text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto font-normal">
          LEER+ simplifica la busqueda de obras, la gestión de préstamos de bibliotecas, la lectura en línea de obras publicadas por la comunidad y ......
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={onIngresar}
            className="bg-[var(--color-brand-primary)] hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Explorar / Iniciar Sesión (CU 01)
          </button>
        </div>
      </section>

      {/* MÓDULOS Y ROLES */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        
        {/* LECTORES */}
        <div className="bg-slate-900/90 border border-[var(--color-brand-secondary)]/30 p-6 rounded-2xl hover:border-[var(--color-brand-primary)] transition-all space-y-4">
          <div className="w-12 h-12 bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-cream)] rounded-xl flex items-center justify-center font-bold text-2xl border border-[var(--color-brand-primary)]/40">
            📖
          </div>
          <h3 className="text-xl font-bold text-[var(--color-brand-cream)]">Para Lectores</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Buscá libros en el catálogo general, gestioná tus préstamos físicos en bibliotecas asociadas y consultá tus sanciones en tiempo real.
          </p>
        </div>

        {/* ESCRITORES */}
        <div className="bg-slate-900/90 border border-[var(--color-brand-secondary)]/30 p-6 rounded-2xl hover:border-[var(--color-brand-mint)] transition-all space-y-4">
          <div className="w-12 h-12 bg-[var(--color-brand-mint)]/20 text-[var(--color-brand-mint)] rounded-xl flex items-center justify-center font-bold text-2xl border border-[var(--color-brand-mint)]/40">
            ✍️
          </div>
          <h3 className="text-xl font-bold text-[var(--color-brand-mint)]">Para Autores</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Publicá tus obras digitales en la plataforma, creá listas de lectura temáticas y recibí calificaciones y opiniones de la comunidad.
          </p>
        </div>

        {/* BIBLIOTECAS */}
        <div className="bg-slate-900/90 border border-[var(--color-brand-secondary)]/30 p-6 rounded-2xl hover:border-[var(--color-brand-sand)] transition-all space-y-4">
          <div className="w-12 h-12 bg-[var(--color-brand-sand)]/20 text-[var(--color-brand-sand)] rounded-xl flex items-center justify-center font-bold text-2xl border border-[var(--color-brand-sand)]/40">
            🏛️
          </div>
          <h3 className="text-xl font-bold text-[var(--color-brand-sand)]">Para Bibliotecas</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Administrá inventarios de ejemplares físicos, controlá las fechas de devolución de préstamos y gestioná las altas del catálogo.
          </p>
        </div>

      </section>

      {/* CALL TO ACTION */}
      <section className="bg-slate-900/90 border border-[var(--color-brand-secondary)]/40 p-8 sm:p-10 rounded-3xl text-center space-y-4 relative overflow-hidden">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-brand-cream)] relative z-10">
          ¿Querés empezar a usar LEER+?
        </h2>
        <p className="text-[var(--color-brand-sand)] max-w-xl mx-auto text-sm sm:text-base relative z-10">
          Ingresá con tu cuenta para acceder al catálogo interactivo y a los módulos de gestión asignados según tu rol.
        </p>
        <div className="pt-2 relative z-10">
          <button
            onClick={onIngresar}
            className="bg-slate-800 hover:bg-slate-700 border border-[var(--color-brand-secondary)] text-[var(--color-brand-cream)] font-semibold px-6 py-2.5 rounded-full text-sm transition-colors cursor-pointer"
          >
            Ir al Login / Registro (CU 01)
          </button>
        </div>
      </section>

    </div>
  )
}