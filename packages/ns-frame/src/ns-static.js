/*! ns-frame/static · formas sin JS en runtime: compila data-ns-static a CSS shape() en el build */
// Para Node (build o SSR), no para el navegador.
//
//   import { extract } from 'ns-frame/static'
//   const { html, css } = extract('<article data-ns-static="card">…</article>')
//   // html: <article class="ns-s-1k9x3">…</article>   css: .ns-s-1k9x3{clip-path:shape(…)}
//
// · Sólo recorte: bordes SVG, morph, animaciones y aperturas necesitan el runtime (usa data-ns para eso).
// · Una clase por forma distinta (hash del texto de la forma): la hoja no crece con las repeticiones.
// · Hoja externa, no estilos en línea: funciona con una CSP estricta (style-src 'self').
// · Las formas que no se pueden expresar con shape() (tamaños en % en esquinas, consultas @<N)
//   se dejan como data-ns para que las resuelva el runtime, y se informan en `skipped`.
import { css as compile } from './ns-css.js'

const hash = s => { let h = 5381; for (const c of s) h = (h * 33) ^ c.charCodeAt(0); return (h >>> 0).toString(36) }
const esc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** Transforma el HTML: devuelve { html, css, skipped }. */
export function extract(html) {
  const rules = new Map(), skipped = []
  const out = html.replace(/<([a-zA-Z][\w-]*)(\s[^<>]*?)?\sdata-ns-static="([^"]*)"([^<>]*)>/g, (tag, name, a = '', value, b) => {
    const shape = esc(value).trim(), clip = shape && compile(shape)
    if (!clip) { skipped.push(shape); return `<${name}${a} data-ns="${value}"${b}>` }
    const cls = 'ns-s-' + hash(shape)
    rules.set(cls, clip)
    let attrs = a + b
    attrs = /\sclass="/.test(attrs) ? attrs.replace(/\sclass="([^"]*)"/, (m, c) => ` class="${c} ${cls}"`) : ` class="${cls}"` + attrs
    return `<${name}${attrs}>`
  })
  const css = [...rules].map(([c, v]) => `.${c}{clip-path:${v}}`).join('\n')
  return { html: out, css, skipped }
}
