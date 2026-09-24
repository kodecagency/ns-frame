/*! ns-frame/audit · herramienta de desarrollo: detecta texto o controles recortados por la forma */
// En la consola:  (await import('/ns-frame/ns-audit.js')).audit()
// Devuelve la lista de problemas y, con { mark: true }, los resalta en la página.
import { path, shapeOf } from './ns-frame.js'

const TEXT = n => n.nodeType == 3 && n.textContent.trim()

// clearance: además avisa (tipo 'tight') si el texto queda a menos de N px del borde de la forma
export function audit({ root = document, mark = false, margin = 2, clearance = 0 } = {}) {
  const ctx = document.createElement('canvas').getContext('2d'), issues = []
  for (const el of root.querySelectorAll('[data-ns],[data-ns-nest],ns-frame')) {
    const shape = shapeOf(el) ?? el.getAttribute('data-ns') ?? el.getAttribute('shape') ?? ''
    const r = el.getBoundingClientRect()
    // un marco oculto (visibility: hidden, p. ej. un menú cerrado) no se ve: no puede verse recortado
    if (!r.width || !r.height || /^(img|video|canvas|input|textarea|select)$/i.test(el.localName) || getComputedStyle(el).visibility == 'hidden') continue
    // la capa de borde y foco se coloca respecto al marco; un reset como `all: unset` le quita el
    // position: relative y la capa acaba en otro sitio (el recorte la oculta: el borde "no sale")
    const svg = el.querySelector(':scope > .ns-svg')?.getBoundingClientRect()
    if (svg && (Math.abs(svg.left - r.left - el.clientLeft) > 1.5 || Math.abs(svg.top - r.top - el.clientTop) > 1.5)) {
      issues.push({ el, what: 'capa de borde fuera del marco: ¿position: static? (p. ej. por all: unset)', shape, type: 'unanchored' })
      if (mark) el.style.outline = '2px dashed #ff3d6e'
    }
    // vía rápida nativa: el borde es una sombra interior; un box-shadow propio (o all: unset) lo tapa
    const cs = getComputedStyle(el), bd = cs.getPropertyValue('--ns-border').trim()
    if (el.classList.contains('ns-fast') && bd && bd != 'none' && bd != 'transparent' && cs.boxShadow == 'none') {
      issues.push({ el, what: 'borde anulado: box-shadow: none sobre la vía rápida (¿all: unset?)', shape, type: 'reset' })
      if (mark) el.style.outline = '2px dashed #ff3d6e'
    }
    const p = new Path2D(path(shape, r.width, r.height))
    const inside = (x, y) => ctx.isPointInPath(p, x - r.left, y - r.top)
    // cajas de texto y de controles descendientes (sin entrar en otros marcos)
    const boxes = []
    const walk = (n, sc) => {
      for (const c of n.childNodes) {
        if (c.nodeType == 1 && (c.matches('[data-ns],[data-ns-nest],ns-frame,.ns-svg') || getComputedStyle(c).visibility == 'hidden')) continue
        if (TEXT(c)) { const rg = document.createRange(); rg.selectNodeContents(c); boxes.push(...[...rg.getClientRects()].map(b => [b, c.textContent.trim().slice(0, 40), sc])) }
        else if (c.nodeType == 1 && c.matches('button,a,input,select,textarea,img,svg')) {
          // recortes intencionados: un medio que va de borde a borde del marco (a sangre, o la foto
          // de cabecera de una tarjeta redondeada) y un control que llena el marco (la forma es el botón)
          const b = c.getBoundingClientRect(), E = 1.5
          const wide = b.left <= r.left + E && b.right >= r.right - E, tall = b.top <= r.top + E && b.bottom >= r.bottom - E
          if (!(c.matches('img,video') ? wide || tall : wide && tall)) boxes.push([b, '<' + c.localName + '>', sc])
        }
        if (c.nodeType == 1) walk(c, /auto|scroll|hidden/.test(getComputedStyle(c).overflow) ? c : sc)
      }
    }
    walk(el, /auto|scroll/.test(getComputedStyle(el).overflow) ? el : undefined)
    for (const [b0, what, sc] of boxes) {
      // lo que queda fuera de un contenedor con scroll no es visible: se recorta a su caja
      const v = sc?.getBoundingClientRect(), b = v ? { left: Math.max(b0.left, v.left), top: Math.max(b0.top, v.top), right: Math.min(b0.right, v.right), bottom: Math.min(b0.bottom, v.bottom) } : b0
      b.width = b.right - b.left; b.height = b.bottom - b.top
      if (b.width <= 2 * margin || b.height <= 2 * margin) continue
      const m = margin, pts = [[b.left + m, b.top + m], [b.right - m, b.top + m], [b.right - m, b.bottom - m], [b.left + m, b.bottom - m]]
      const c = clearance, near = c && [[b.left - c, b.top - c], [b.right + c, b.top - c], [b.right + c, b.bottom + c], [b.left - c, b.bottom + c]].some(([x, y]) => !inside(x, y))
      if (pts.every(([x, y]) => inside(x, y)) && !near) continue
      issues.push({ el, what, shape, type: pts.every(([x, y]) => inside(x, y)) ? 'tight' : 'clipped' })
      if (mark) el.style.outline = '2px dashed #ff3d6e'
      break
    }
  }
  return issues
}
