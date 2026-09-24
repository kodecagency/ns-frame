/*! ns-frame/bento · bento unificado: la cuadrícula se lee como un solo objeto esculpido */
// <div class="ns-bento" data-ns-bento="outer bevel 28; inner round 10">
//   <article class="ns-big">…</article> <article>…</article> <article class="ns-w2">…</article> …
// </div>
// · Las esquinas que tocan el contorno del conjunto reciben el corte "outer"; las interiores, "inner".
// · Columnas según el ancho real del contenedor (no de la ventana): se reacomoda, no se encoge.
// · Espaciado con proporción fija: padding interno = 2 × gap, y respetando los cortes (data-ns-pad).
// Requiere ns-frame.js (que dibuja las formas). CSP-safe: estilos por constructable stylesheet.

import { styles as inject } from './ns-frame.js'

const CSS = `@layer ns{
.ns-bento{display:grid;gap:var(--ns-gap,14px);grid-template-columns:repeat(var(--ns-cols,4),minmax(0,1fr));grid-auto-rows:minmax(var(--ns-row,150px),auto);grid-auto-flow:row dense;--ns-pad:calc(var(--ns-gap,14px) * 2)}
.ns-bento>.ns-w2,.ns-bento>.ns-big{grid-column:span 2}
.ns-bento>.ns-h2,.ns-bento>.ns-big{grid-row:span 2}
.ns-bento>.ns-full{grid-column:1/-1}
.ns-bento[data-ns-cols="2"]>.ns-big{grid-row:span 1}
.ns-bento[data-ns-cols="1"]>*{grid-column:auto;grid-row:auto}
.ns-bento[data-ns-cols="1"]>.ns-big{order:-1}
}`

const B = new Map()
let ro, raf, styled

function styles() {
  if (styled) return
  styled = 1
  inject(CSS)
}

// "outer bevel 28; inner round 10; radius 3" -> { outer: 'bevel 28', inner: 'round 10', extra: 'radius 3' }
function spec(el) {
  const o = { outer: 'bevel 24', inner: 'round 10', extra: '' }
  for (const st of (el.getAttribute('data-ns-bento') || '').split(';')) {
    const m = /^\s*(outer|inner)\s+(bevel|round|scoop|notch|square)\s+([\d.]+)\s*$/.exec(st)
    if (m) o[m[1]] = `${m[2]} ${m[3]}`
    else if (/^\s*radius\s+[\d.]+\s*$/.test(st)) o.extra = st.trim()
  }
  return o
}

function layout() {
  raf = 0
  const jobs = []
  // 1) lecturas
  for (const [el] of B) {
    if (!el.isConnected) { B.delete(el); ro.unobserve(el); continue }
    const cs = getComputedStyle(el), kids = [...el.children].filter(k => k.offsetParent !== null || cs.display == 'contents')
    const min = parseFloat(cs.getPropertyValue('--ns-min')) || 240, max = parseInt(cs.getPropertyValue('--ns-cols-max')) || 4
    const gap = parseFloat(cs.columnGap) || 0, w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    // un bento sigue siendo bento en móvil: al menos --ns-cols-min columnas (2) mientras cada una mida ≥ 130 px
    const lo = Math.min(max, parseInt(cs.getPropertyValue('--ns-cols-min')) || 2), fit = Math.floor((w + gap) / (min + gap))
    jobs.push({ el, kids, cols: Math.max(w + gap >= lo * (130 + gap) ? lo : 1, Math.min(max, fit)), rects: kids.map(k => k.getBoundingClientRect()) })
  }
  // 2) columnas (puede cambiar el layout: se vuelve a medir en el siguiente frame)
  let again = 0
  for (const j of jobs) if (j.el.getAttribute('data-ns-cols') != j.cols) {
    j.el.setAttribute('data-ns-cols', j.cols)
    j.el.style.setProperty('--ns-cols', j.cols)
    again = 1
  }
  if (again) return schedule()
  // 3) formas: esquinas exteriores vs interiores según el contorno del conjunto
  for (const { el, kids, rects } of jobs) {
    if (!rects.length) continue
    const o = spec(el), E = 1.5
    const L = Math.min(...rects.map(r => r.left)), T = Math.min(...rects.map(r => r.top))
    const R = Math.max(...rects.map(r => r.right)), Bt = Math.max(...rects.map(r => r.bottom))
    kids.forEach((k, i) => {
      const r = rects[i], out = []
      if (Math.abs(r.left - L) < E && Math.abs(r.top - T) < E) out.push('tl')
      if (Math.abs(r.right - R) < E && Math.abs(r.top - T) < E) out.push('tr')
      if (Math.abs(r.right - R) < E && Math.abs(r.bottom - Bt) < E) out.push('br')
      if (Math.abs(r.left - L) < E && Math.abs(r.bottom - Bt) < E) out.push('bl')
      const shape = [`all ${o.inner}`, out.length && `${out.join('+')} ${o.outer}`, o.extra, k.getAttribute('data-ns-add')].filter(Boolean).join('; ')
      if (k.getAttribute('data-ns') != shape) k.setAttribute('data-ns', shape)
      if (!k.hasAttribute('data-ns-pad')) k.setAttribute('data-ns-pad', '')
    })
  }
}

const schedule = () => { raf ||= requestAnimationFrame(layout) }

function add(el) {
  if (B.has(el)) return
  styles()
  ro ||= new ResizeObserver(schedule)
  B.set(el, 1)
  ro.observe(el)
  for (const k of el.children) ro.observe(k)
  schedule()
}

/** Recalcula (p. ej. tras reordenar celdas por JS). */
export const refresh = schedule

if (typeof document != 'undefined') {
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-bento]') && add(n); n.querySelectorAll('[data-ns-bento]').forEach(add) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => {
      for (const m of ms) {
        m.addedNodes.forEach(n => { scan(n); if (n.nodeType == 1 && B.has(n.parentElement)) { ro.observe(n); schedule() } })
        if (m.removedNodes.length && B.has(m.target)) schedule()
      }
    }).observe(document.body, { childList: true, subtree: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
