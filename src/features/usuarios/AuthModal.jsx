import { ArrowRight, BookOpenText, Feather, LibraryBig } from 'lucide-react'

const accesos = [
  { icono: BookOpenText, texto: 'Guardar y seguir tus lecturas' },
  { icono: Feather, texto: 'Publicar y compartir escritos' },
  { icono: LibraryBig, texto: 'Conectar con bibliotecas' },
]

export default function AuthModal({ onLoginSuccess }) {
  const ingresarDemo = () => onLoginSuccess({ nombre: 'Usuario Demo', rol: 'LectoEscritor' })

  return (
    <section className="auth-editorial mx-auto grid min-h-[calc(100vh-72px)] max-w-[1500px] border-x border-[#cbbdad] lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <div className="auth-manifiesto relative flex flex-col justify-between overflow-hidden border-b border-[#cbbdad] px-5 py-10 sm:px-10 sm:py-16 lg:border-r lg:border-b-0 lg:px-16 lg:py-20">
        <span className="auth-signo" aria-hidden="true">“</span>

        <div className="relative max-w-2xl">
          <span className="indice-seccion">01 / TU ESPACIO</span>
          <h1 className="font-editorial mt-7 text-[2.65rem] leading-[0.95] font-semibold tracking-[-0.045em] text-[#24171a] sm:mt-8 sm:text-6xl lg:text-7xl">
            Volvé a la historia donde la dejaste.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#705b57] sm:text-lg sm:leading-8">
            Un solo acceso para tu biblioteca personal, tus escritos y las conversaciones que nacen alrededor de cada obra.
          </p>
        </div>

        <div className="relative mt-16 hidden border-t border-[#bcae9e] sm:grid sm:grid-cols-3 lg:mt-20">
          {accesos.map(({ icono: Icono, texto }, indice) => (
            <div key={texto} className="flex gap-3 border-b border-[#bcae9e] py-5 sm:border-r sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:border-r-0">
              <span className="font-editorial text-sm text-(--color-brand-primary)">0{indice + 1}</span>
              <div>
                <Icono className="mb-3 size-5 text-[#765e58]" strokeWidth={1.6} aria-hidden="true" />
                <p className="text-xs font-semibold leading-5 text-[#5f4b48]">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center bg-[#f7f1e7] px-5 py-14 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between border-b border-[#aa9990] pb-5">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-(--color-brand-primary)">Acceso a LEER+</span>
              <h2 className="font-editorial mt-2 text-3xl font-semibold text-[#24171a]">Tu próxima página</h2>
            </div>
            <BookOpenText className="size-7 text-[#8c746e]" strokeWidth={1.4} aria-hidden="true" />
          </div>

          <div className="mt-9">
            <p className="text-sm leading-6 text-[#6e5955]">
              La autenticación definitiva todavía está en desarrollo. Por ahora podés recorrer la experiencia con el usuario de demostración.
            </p>

            <div className="mt-8 hidden border-y border-[#cbbdad] sm:block">
              <div className="grid grid-cols-[110px_1fr] border-b border-[#d8ccbe] py-4 text-sm">
                <span className="text-[#8a746d]">Perfil</span>
                <span className="font-semibold text-[#2d1d20]">Lector y escritor</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] py-4 text-sm">
                <span className="text-[#8a746d]">Modo</span>
                <span className="font-semibold text-[#2d1d20]">Demostración local</span>
              </div>
            </div>

            <button
              type="button"
              onClick={ingresarDemo}
              className="boton-recorte group mt-7 flex w-full items-center justify-between bg-(--color-brand-primary) px-6 py-4 text-sm font-bold text-white transition hover:bg-[#991035] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-brand-primary) sm:mt-8"
            >
              Entrar como usuario demo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>

            <p className="mt-5 text-center text-[10px] uppercase tracking-[0.15em] text-[#927d76]">
              CU01 · Acceso temporal para desarrollo
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
