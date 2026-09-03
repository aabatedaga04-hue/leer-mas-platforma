import { Component } from 'react'

/**
 * Límite de error de React.
 *
 * Sin uno, cualquier excepción durante el render desmonta el árbol entero y
 * deja la pantalla en blanco, sin ninguna pista de qué pasó salvo la consola
 * del navegador. Con esto, el fallo queda contenido y visible.
 *
 * Tiene que ser una clase: `componentDidCatch` no tiene equivalente en hooks.
 */
export default class LimiteDeError extends Component {
  state = { error: null, claveReinicio: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  /**
   * Al cambiar de ruta se limpia el error: si no, la pantalla de fallo quedaría
   * pegada aunque navegues a otra sección. Va acá y no en componentDidUpdate
   * para no provocar un segundo render por cada actualización.
   */
  static getDerivedStateFromProps(props, state) {
    if (props.claveReinicio === state.claveReinicio) return null
    return { error: null, claveReinicio: props.claveReinicio }
  }

  componentDidCatch(error, info) {
    // Queda en la consola para poder inspeccionar el stack completo.
    console.error('Error de render:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        className="mx-auto max-w-2xl rounded-lg border border-red-900/60 bg-red-950/30 p-6"
      >
        <h2 className="font-serif text-xl text-red-200">Algo se rompió en esta pantalla</h2>
        <p className="mt-2 text-sm text-red-300/80">
          El error está abajo. Si podés, copialo junto con lo que estabas haciendo.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-sm bg-slate-950/80 p-3 text-xs text-red-200">
          {error.name}: {error.message}
        </pre>
        {error.stack && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-slate-400">Ver detalle técnico</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-sm bg-slate-950/80 p-3 text-[0.7rem] leading-relaxed text-slate-400">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
