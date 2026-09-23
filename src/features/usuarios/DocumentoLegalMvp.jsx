import { Link } from 'react-router-dom'

const CONTENIDO = {
  terminos: {
    titulo: 'Términos y Condiciones',
    parrafos: [
      'Este texto corresponde a una versión provisoria para el MVP académico de LEER+ y deberá ser reemplazado por una versión revisada antes de una publicación real.',
      'La cuenta debe utilizarse con información verdadera y respetando los derechos de autor, las normas de convivencia y los permisos correspondientes a cada tipo de usuario.',
      'La FLC podrá revisar solicitudes institucionales, moderar contenido y restringir cuentas ante usos contrarios al objetivo de la plataforma.',
    ],
  },
  privacidad: {
    titulo: 'Política de Privacidad',
    parrafos: [
      'Este texto corresponde a una versión provisoria para el MVP académico de LEER+ y no constituye una política jurídica definitiva.',
      'Los datos de registro se utilizan para identificar la cuenta, habilitar funciones según el perfil y proteger el acceso. Las contraseñas son administradas por Supabase Auth y no se almacenan en la base de perfiles.',
      'Los documentos institucionales se almacenan de forma privada y solo pueden ser consultados por el solicitante y los administradores responsables de la aprobación.',
    ],
  },
}

export default function DocumentoLegalMvp({ tipo }) {
  const documento = CONTENIDO[tipo]
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Versión provisoria MVP-1</p>
      <h1 className="mt-2 font-serif text-3xl text-(--color-brand-cream)">{documento.titulo}</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
        {documento.parrafos.map((parrafo) => <p key={parrafo}>{parrafo}</p>)}
      </div>
      <Link to="/ingresar" className="mt-8 inline-block text-sm font-semibold text-(--color-brand-cream) hover:underline">Volver al registro</Link>
    </article>
  )
}

