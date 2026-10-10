import { BookOpen, Camera, Check, ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  GENEROS_PERFIL,
  INTERESES_LECTURA,
  MAXIMO_ENLACES,
  MAXIMO_SELECCIONES,
  datosPublicosDesdePerfil,
  validarCampoPublico,
  validarImagenPerfil,
} from './perfilPublicoValidation'

const INPUT =
  'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-(--color-brand-secondary) focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary)/30'

function CampoPublico({ etiqueta, valor, nota, activo, bloqueado = false, onEditar, onGuardar, onCancelar, children, amplio = false }) {
  return (
    <article className={`min-w-0 rounded-xl border px-4 py-3 ${amplio ? 'min-[620px]:col-span-2' : ''} ${activo ? 'border-(--color-brand-secondary)/60 bg-slate-950/70' : 'border-slate-800/80 bg-slate-950/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{etiqueta}</h3>
          {!activo && <div className="mt-1 text-sm leading-6 text-slate-100">{valor}</div>}
          {!activo && nota && <p className="mt-1 text-xs leading-5 text-slate-500">{nota}</p>}
        </div>
        {!activo && (
          <button type="button" onClick={onEditar} disabled={bloqueado} aria-label={`Editar ${etiqueta.toLowerCase()}`} title={`Editar ${etiqueta.toLowerCase()}`}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-(--color-brand-secondary) hover:bg-slate-800 hover:text-(--color-brand-cream) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) disabled:cursor-not-allowed disabled:opacity-35">
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      {activo && (
        <form onSubmit={onGuardar} className="mt-3 space-y-3">
          {children}
          {nota && <p className="text-xs leading-5 text-slate-400">{nota}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelar} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"><X aria-hidden="true" className="size-3.5" /> Cancelar</button>
            <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-(--color-brand-primary) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"><Check aria-hidden="true" className="size-3.5" /> Guardar</button>
          </div>
        </form>
      )}
    </article>
  )
}

function ResumenEtiquetas({ valores, vacio }) {
  if (!valores.length) return <span className="text-slate-500">{vacio}</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((valor) => <span key={valor} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">{valor}</span>)}
    </div>
  )
}

function ResumenEnlaces({ enlaces }) {
  if (!enlaces.length) return <span className="text-slate-500">Todavía no agregaste enlaces.</span>
  return (
    <ul className="flex flex-wrap gap-2">
      {enlaces.map((enlace) => (
        <li key={`${enlace.etiqueta}-${enlace.url}`}>
          <a href={enlace.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:text-(--color-brand-cream)">
            {enlace.etiqueta}<ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </li>
      ))}
    </ul>
  )
}

function ObrasPublicadas({ obras }) {
  return (
    <article className="min-[620px]:col-span-2 rounded-xl border border-slate-800/80 bg-slate-950/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Obras publicadas</h3>
          <p className="mt-1 text-sm text-slate-100">{obras.length ? `${obras.length} obras vinculadas a tu perfil` : 'Todavía no publicaste obras en LEER+.'}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-(--color-brand-primary)/20 text-(--color-brand-cream)"><BookOpen aria-hidden="true" className="size-4" /></span>
      </div>
      {obras.length > 0 && (
        <details className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 open:pb-2">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-(--color-brand-cream)">Ver listado de obras</summary>
          <ul className="divide-y divide-slate-800 px-3">
            {obras.map((obra) => (
              <li key={obra.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-medium text-slate-100">{obra.titulo}</p><p className="mt-0.5 text-xs text-slate-500">{obra.tipo} · {obra.fecha}</p></div>
                <span className="rounded-full border border-emerald-700/40 bg-emerald-950/25 px-2.5 py-1 text-xs text-emerald-200">{obra.estado}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-2 text-xs text-slate-500">Este acceso muestra las obras asociadas. Su publicación y administración corresponden al CU12.</p>
    </article>
  )
}

function SelectorEtiquetas({ opciones, seleccionadas, onChange, etiqueta }) {
  const [busqueda, setBusqueda] = useState('')
  const normalizar = (texto) => texto.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const opcionesVisibles = opciones.filter((opcion) => normalizar(opcion).includes(normalizar(busqueda.trim())))
  const alternar = (opcion) => {
    if (seleccionadas.includes(opcion)) onChange(seleccionadas.filter((valor) => valor !== opcion))
    else if (seleccionadas.length < MAXIMO_SELECCIONES) onChange([...seleccionadas, opcion])
  }

  return (
    <fieldset>
      <legend className="sr-only">{etiqueta}</legend>
      <label className="mb-3 block space-y-1.5 text-xs font-semibold text-slate-300">
        Buscar entre las opciones
        <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} className={INPUT} placeholder="Ej.: papers, historia, tecnología…" />
      </label>
      <div className="flex flex-wrap gap-2">
        {opcionesVisibles.map((opcion) => {
          const elegida = seleccionadas.includes(opcion)
          return (
            <button key={opcion} type="button" aria-pressed={elegida} onClick={() => alternar(opcion)}
              className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-cream) ${elegida ? 'border-(--color-brand-secondary) bg-(--color-brand-primary)/25 text-(--color-brand-cream)' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
              {elegida && <span aria-hidden="true">✓ </span>}{opcion}
            </button>
          )
        })}
      </div>
      {!opcionesVisibles.length && <p className="text-sm text-slate-500">No encontramos opciones con esa búsqueda.</p>}
      <p className="mt-2 text-xs text-slate-500">{seleccionadas.length} de {MAXIMO_SELECCIONES} seleccionados</p>
    </fieldset>
  )
}

function OpcionVisibilidad({ visible, visibleTexto, privadoTexto, onChange, disabled = false }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" disabled={disabled} aria-pressed={visible} onClick={() => onChange(true)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45 ${visible ? 'border-emerald-600/60 bg-emerald-950/25 text-emerald-100' : 'border-slate-700 text-slate-400'}`}><Eye aria-hidden="true" className="size-4" />{visibleTexto}</button>
      <button type="button" disabled={disabled} aria-pressed={!visible} onClick={() => onChange(false)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45 ${!visible ? 'border-(--color-brand-secondary)/60 bg-(--color-brand-primary)/15 text-(--color-brand-cream)' : 'border-slate-700 text-slate-400'}`}><EyeOff aria-hidden="true" className="size-4" />{privadoTexto}</button>
    </div>
  )
}

export default function PerfilPublico({ perfil, onGuardar }) {
  const tipo = perfil.tipo_usuario
  const [datos, setDatos] = useState(() => datosPublicosDesdePerfil(perfil))
  const [campoActivo, setCampoActivo] = useState(null)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const selectorImagen = useRef(null)

  useEffect(() => {
    if (!campoActivo) setDatos(datosPublicosDesdePerfil(perfil))
  }, [perfil, campoActivo])

  const editar = (campo) => {
    setDatos(datosPublicosDesdePerfil(perfil))
    setCampoActivo(campo)
    setError(null)
    setAviso(null)
  }

  const cancelar = () => {
    setDatos(datosPublicosDesdePerfil(perfil))
    setCampoActivo(null)
    setError(null)
  }

  const actualizarEnlace = (indice, campo, valor) => {
    setDatos((actual) => ({
      ...actual,
      enlacesExternos: actual.enlacesExternos.map((enlace, posicion) => posicion === indice ? { ...enlace, [campo]: valor } : enlace),
    }))
  }

  const agregarEnlace = () => {
    setDatos((actual) => actual.enlacesExternos.length >= MAXIMO_ENLACES ? actual : ({
      ...actual,
      enlacesExternos: [...actual.enlacesExternos, { etiqueta: '', url: '' }],
    }))
  }

  const quitarEnlace = (indice) => {
    setDatos((actual) => ({ ...actual, enlacesExternos: actual.enlacesExternos.filter((_, posicion) => posicion !== indice) }))
  }

  const guardar = (campo) => (evento) => {
    evento.preventDefault()
    const errores = validarCampoPublico(datos, tipo, campo)
    if (errores.length) { setError(errores[0]); return }
    const siguientes = campo === 'ubicacionVisible' && !datos.perfilVisible
      ? { ...datos, ubicacionVisible: false }
      : datos
    setDatos(siguientes)
    onGuardar(siguientes)
    setCampoActivo(null)
    setError(null)
    setAviso('La vista previa del perfil público quedó actualizada.')
  }

  const elegirImagen = (evento) => {
    const archivo = evento.target.files?.[0]
    const fallo = validarImagenPerfil(archivo)
    if (fallo) { setError(fallo); evento.target.value = ''; return }

    const lector = new FileReader()
    lector.onload = () => {
      const siguientes = { ...datos, imagenPerfilUrl: lector.result }
      setDatos(siguientes)
      onGuardar(siguientes)
      setError(null)
      setAviso('La imagen se actualizó en esta vista previa.')
    }
    lector.onerror = () => setError('No pudimos leer la imagen seleccionada.')
    lector.readAsDataURL(archivo)
    evento.target.value = ''
  }

  const etiquetaPresentacion = tipo === 'lector_escritor' ? 'Biografía breve' : 'Descripción institucional'
  const textoPresentacion = datos.biografia || <span className="text-slate-500">Contá quién sos y qué lugar ocupan los libros en tu recorrido.</span>
  const visibilidadPerfil = datos.perfilVisible
    ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><Eye aria-hidden="true" className="size-4" /> Perfil visible</span>
    : <span className="inline-flex items-center gap-1.5 text-slate-400"><EyeOff aria-hidden="true" className="size-4" /> Perfil privado</span>
  const contactoPublico = datos.contactoVisible
    ? <div className="space-y-0.5"><p className="text-emerald-300">Contacto visible</p><p className="text-xs text-slate-400">{[datos.emailContacto, datos.telefonoContacto].filter(Boolean).join(' · ')}</p></div>
    : <span className="inline-flex items-center gap-1.5 text-slate-400"><EyeOff aria-hidden="true" className="size-4" /> Contacto oculto</span>

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5" aria-labelledby="perfil-publico-titulo">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="perfil-publico-titulo" className="font-serif text-xl text-(--color-brand-cream)">Perfil público</h2>
          <p className="mt-1 text-xs text-slate-500">Así te presentás ante la comunidad, separado de tus datos privados.</p>
        </div>
        <span className="rounded-full border border-amber-600/35 bg-amber-950/25 px-3 py-1 text-[11px] font-semibold text-amber-200">Etapa 2 · vista previa</span>
      </div>

      {aviso && <p role="status" className="mb-3 rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200">{aviso}</p>}
      {error && <p role="alert" className="mb-3 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">{error}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/30 p-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-700 bg-(--color-brand-primary)/20">
          {datos.imagenPerfilUrl ? <img src={datos.imagenPerfilUrl} alt="Vista previa de la imagen del perfil" className="size-full object-cover" /> : <Camera aria-hidden="true" className="size-7 text-(--color-brand-cream)" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-100">{tipo === 'lector_escritor' ? 'Foto de perfil' : 'Logotipo institucional'}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">JPG, PNG o WebP · máximo 5 MB. Recomendamos una imagen cuadrada.</p>
        </div>
        <input ref={selectorImagen} type="file" accept="image/jpeg,image/png,image/webp" onChange={elegirImagen} className="sr-only" aria-label="Seleccionar imagen del perfil" />
        <button type="button" disabled={Boolean(campoActivo)} onClick={() => selectorImagen.current?.click()} className="rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-(--color-brand-secondary) hover:text-(--color-brand-cream) disabled:cursor-not-allowed disabled:opacity-40">Cambiar imagen</button>
      </div>

      <div className="grid gap-2 min-[620px]:grid-cols-2">
        <CampoPublico etiqueta={etiquetaPresentacion} valor={textoPresentacion} activo={campoActivo === 'biografia'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('biografia')} onGuardar={guardar('biografia')} onCancelar={cancelar} amplio>
          <textarea autoFocus rows="4" maxLength={tipo === 'lector_escritor' ? 400 : 600} value={datos.biografia} onChange={(evento) => setDatos((actual) => ({ ...actual, biografia: evento.target.value }))} className={INPUT} placeholder={tipo === 'lector_escritor' ? 'Tus lecturas, tu escritura o lo que quieras contarle a la comunidad…' : 'Historia, propósito y propuesta de la institución…'} />
          <p className="text-right text-xs text-slate-500">{datos.biografia.length} / {tipo === 'lector_escritor' ? 400 : 600}</p>
        </CampoPublico>

        {tipo !== 'biblioteca' && (
          <CampoPublico etiqueta={tipo === 'editorial' ? 'Géneros, áreas y formatos de interés' : 'Géneros, áreas y formatos'} valor={<ResumenEtiquetas valores={datos.generos} vacio="Todavía no seleccionaste géneros, áreas o formatos." />} activo={campoActivo === 'generos'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('generos')} onGuardar={guardar('generos')} onCancelar={cancelar} amplio>
            <SelectorEtiquetas etiqueta="Seleccionar géneros, áreas y formatos" opciones={GENEROS_PERFIL} seleccionadas={datos.generos} onChange={(generos) => setDatos((actual) => ({ ...actual, generos }))} />
          </CampoPublico>
        )}

        {tipo === 'lector_escritor' && (
          <CampoPublico etiqueta="Intereses de lectura" valor={<ResumenEtiquetas valores={datos.intereses} vacio="Todavía no seleccionaste intereses." />} activo={campoActivo === 'intereses'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('intereses')} onGuardar={guardar('intereses')} onCancelar={cancelar} amplio>
            <SelectorEtiquetas etiqueta="Seleccionar intereses" opciones={INTERESES_LECTURA} seleccionadas={datos.intereses} onChange={(intereses) => setDatos((actual) => ({ ...actual, intereses }))} />
          </CampoPublico>
        )}

        {tipo === 'biblioteca' && (
          <CampoPublico etiqueta="Horarios de atención" valor={datos.horariosAtencion || <span className="text-slate-500">Sin completar</span>} activo={campoActivo === 'horariosAtencion'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('horariosAtencion')} onGuardar={guardar('horariosAtencion')} onCancelar={cancelar} amplio>
            <textarea autoFocus rows="3" maxLength="300" value={datos.horariosAtencion} onChange={(evento) => setDatos((actual) => ({ ...actual, horariosAtencion: evento.target.value }))} className={INPUT} placeholder="Ej.: lunes a viernes de 9 a 18 h; sábados de 9 a 13 h." />
          </CampoPublico>
        )}

        <CampoPublico etiqueta="Enlaces externos" valor={<ResumenEnlaces enlaces={datos.enlacesExternos} />} nota="Podés vincular un sitio, catálogo institucional, red profesional, ORCID u otro espacio relevante." activo={campoActivo === 'enlacesExternos'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('enlacesExternos')} onGuardar={guardar('enlacesExternos')} onCancelar={cancelar} amplio>
          <div className="space-y-2">
            {datos.enlacesExternos.map((enlace, indice) => (
              <div key={indice} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:grid-cols-[0.7fr_1.3fr_auto]">
                <input aria-label={`Nombre del enlace ${indice + 1}`} maxLength="50" value={enlace.etiqueta} onChange={(evento) => actualizarEnlace(indice, 'etiqueta', evento.target.value)} className={INPUT} placeholder="Ej.: Sitio oficial" />
                <input aria-label={`Dirección del enlace ${indice + 1}`} type="url" value={enlace.url} onChange={(evento) => actualizarEnlace(indice, 'url', evento.target.value)} className={INPUT} placeholder="https://..." />
                <button type="button" onClick={() => quitarEnlace(indice)} aria-label={`Quitar enlace ${indice + 1}`} className="grid size-10 place-items-center self-center rounded-lg text-slate-400 hover:bg-red-950/40 hover:text-red-300"><Trash2 aria-hidden="true" className="size-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" disabled={datos.enlacesExternos.length >= MAXIMO_ENLACES} onClick={agregarEnlace} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-(--color-brand-secondary) disabled:cursor-not-allowed disabled:opacity-40"><Plus aria-hidden="true" className="size-3.5" /> Agregar enlace</button>
          <p className="text-xs text-slate-500">{datos.enlacesExternos.length} de {MAXIMO_ENLACES} enlaces</p>
        </CampoPublico>

        {tipo === 'lector_escritor' && <ObrasPublicadas obras={perfil.publico?.obras_publicadas ?? []} />}

        <CampoPublico etiqueta="Datos de contacto públicos" valor={contactoPublico} nota="Son independientes del correo y teléfono utilizados para acceder a la cuenta." activo={campoActivo === 'contacto'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('contacto')} onGuardar={guardar('contacto')} onCancelar={cancelar} amplio>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-slate-300">Correo público<input type="email" value={datos.emailContacto} onChange={(evento) => setDatos((actual) => ({ ...actual, emailContacto: evento.target.value }))} className={INPUT} placeholder="contacto@ejemplo.com" /></label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-300">Teléfono público<input type="tel" maxLength="30" value={datos.telefonoContacto} onChange={(evento) => setDatos((actual) => ({ ...actual, telefonoContacto: evento.target.value }))} className={INPUT} placeholder="+54 ..." /></label>
          </div>
          <OpcionVisibilidad disabled={!datos.perfilVisible} visible={datos.contactoVisible} onChange={(contactoVisible) => setDatos((actual) => ({ ...actual, contactoVisible }))} visibleTexto="Mostrar contacto" privadoTexto="Mantener contacto oculto" />
          {!datos.perfilVisible && <p className="text-xs text-amber-200">Primero hacé visible el perfil para publicar datos de contacto.</p>}
        </CampoPublico>

        <CampoPublico etiqueta="Visibilidad general" valor={visibilidadPerfil} nota="Si el perfil es privado, no aparecerá en búsquedas ni tendrá una página pública." activo={campoActivo === 'perfilVisible'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('perfilVisible')} onGuardar={guardar('perfilVisible')} onCancelar={cancelar}>
          <OpcionVisibilidad visible={datos.perfilVisible} onChange={(perfilVisible) => setDatos((actual) => ({ ...actual, perfilVisible, ubicacionVisible: perfilVisible ? actual.ubicacionVisible : false, contactoVisible: perfilVisible ? actual.contactoVisible : false }))} visibleTexto="Visible para la comunidad" privadoTexto="Mantener perfil privado" />
        </CampoPublico>

        <CampoPublico etiqueta="Ubicación en el perfil" valor={datos.ubicacionVisible && datos.perfilVisible ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><Eye aria-hidden="true" className="size-4" /> Mostrar ciudad y país</span> : <span className="inline-flex items-center gap-1.5 text-slate-400"><EyeOff aria-hidden="true" className="size-4" /> Ubicación oculta</span>} nota="Nunca mostramos el domicilio ni otros datos privados." activo={campoActivo === 'ubicacionVisible'} bloqueado={Boolean(campoActivo)} onEditar={() => editar('ubicacionVisible')} onGuardar={guardar('ubicacionVisible')} onCancelar={cancelar}>
          <OpcionVisibilidad disabled={!datos.perfilVisible} visible={datos.ubicacionVisible} onChange={(ubicacionVisible) => setDatos((actual) => ({ ...actual, ubicacionVisible }))} visibleTexto="Mostrar ciudad y país" privadoTexto="Ocultar ubicación" />
          {!datos.perfilVisible && <p className="text-xs text-amber-200">Primero hacé visible el perfil para publicar la ubicación.</p>}
        </CampoPublico>
      </div>
    </section>
  )
}
