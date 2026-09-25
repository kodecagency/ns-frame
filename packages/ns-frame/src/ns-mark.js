/*! ns-frame/mark · resaltado continuo de texto en varias líneas, con curvas cóncavas y convexas nítidas */
// <h2>Diseña con <mark data-ns-mark>formas que se adaptan a cada línea del texto</mark></h2>
//
// Un fondo por línea es fácil (box-decoration-break); uno solo que abrace todas las líneas, con
// esquinas redondeadas hacia fuera y hacia dentro donde una línea es más corta que otra (el
// resaltado de las stories de Instagram), en la web sólo se imitaba con un filtro de desenfoque +
// contraste: bordes borrosos, caro de repintar y sin trazo posible. Aquí es geometría: la unión de
// los rectángulos de cada línea, con un fillet en cada vértice (convexo o cóncavo) calculado por el
// motor de ns-frame. Un solo <path> SVG, detrás del texto, que se redibuja al cambiar el ajuste.
// · --ns-mark: color (Mark por defecto: el del sistema, legible en alto contraste).
// · --ns-mark-pad: margen alrededor del texto, "vertical horizontal" (2px 6px).
// · --ns-mark-round: radio de las curvas (8px). Las que no caben se ajustan solas.
// · --ns-mark-border / --ns-mark-width: trazo opcional del contorno.
// · data-ns-mark="draw": se dibuja de izquierda a derecha al entrar en pantalla.
// · Líneas que no se tocan en horizontal quedan como piezas separadas.
// Sin dependencias (salvo el núcleo) y CSP-safe: sólo CSSOM y atributos SVG.

import { styles, path } from './ns-frame.js'

const CSS = `@layer ns{
.ns-mark-host{position:relative;isolation:isolate}
.ns-mark-fx{position:absolute;z-index:-1;pointer-events:none;overflow:visible}
.ns-mark-fx path{fill:var(--ns-mark,Mark);stroke:var(--ns-mark-border,none);stroke-width:var(--ns-mark-width,1.5px)}
[data-ns-mark~=draw]:not(.ns-in)+.ns-mark-fx{clip-path:inset(0 100% 0 0)}
.ns-mark-fx{transition:clip-path var(--ns-mark-time,.9s) cubic-bezier(.65,0,.35,1)}
@media (prefers-reduced-motion:reduce){.ns-mark-fx{transition:none}}
@media (forced-colors:active){.ns-mark-fx path{fill:Mark;stroke:none}}
}`
const SVG = 'http://www.w3.org/2000/svg'
const r2 = n => Math.round(n * 100) / 100 || 0
let styled = 0

/**
 * Contorno de un texto resaltado. `rects`: rectángulos de cada línea (getClientRects, en px de un
 * mismo origen), `px`/`py`: margen, `r`: radio. Devuelve polígonos (listas de [x, y]) sin fillets.
 */
export function outline(rects, px = 6, py = 2) {
  // una franja por línea (los rectángulos de una misma línea se unen)
  const L = []
  for (const q of [...rects].filter(q => q.width > .5 && q.height > .5).sort((a, b) => a.top - b.top || a.left - b.left)) {
    const last = L[L.length - 1]
    if (last && q.top < last.b - q.height / 2) { last.l = Math.min(last.l, q.left); last.r = Math.max(last.r, q.right); last.b = Math.max(last.b, q.bottom); continue }
    L.push({ l: q.left, r: q.right, t: q.top, b: q.bottom })
  }
  // las franjas se tocan a mitad del espacio entre líneas; si no se solapan en horizontal, pieza nueva
  const groups = []
  let g = null
  L.forEach(q => {
    const b = { x0: q.l - px, x1: q.r + px, y0: q.t - py, y1: q.b + py }
    const p = g?.[g.length - 1]
    if (p && Math.min(p.x1, b.x1) - Math.max(p.x0, b.x0) > 1) { const m = (p.y1 + b.y0) / 2; p.y1 = b.y0 = m; g.push(b) }
    else groups.push(g = [b])
  })
  // polígono ortogonal: bajando por la derecha y subiendo por la izquierda (sin vértices colineales)
  return groups.map(G => {
    const P = []
    const add = (x, y) => { const n = P.length; if (n && P[n - 1][0] == x && P[n - 1][1] == y) return; if (n > 1 && (P[n - 2][0] == P[n - 1][0]) == (P[n - 1][0] == x) && (P[n - 2][1] == P[n - 1][1]) == (P[n - 1][1] == y)) P.pop(); P.push([x, y]) }
    G.forEach(b => { add(b.x1, b.y0); add(b.x1, b.y1) })
    for (let i = G.length - 1; i >= 0; i--) { add(G[i].x0, G[i].y1); add(G[i].x0, G[i].y0) }
    return P
  })
}

const M = new Map()
let ro, raf = 0, io
const hostOf = el => { let n = el.parentElement; while (n && n != document.body && getComputedStyle(n).display.startsWith('inline') && !/inline-(block|flex|grid|table)/.test(getComputedStyle(n).display)) n = n.parentElement; return n }
function run() {
  raf = 0
  const jobs = []
  for (const [el, st] of M) {
    if (!el.isConnected) { st.svg?.remove(); M.delete(el); continue }
    const host = st.host ||= hostOf(el)
    if (!host) continue
    const H = host.getBoundingClientRect(), cs = getComputedStyle(el)
    const [py, px = py] = (cs.getPropertyValue('--ns-mark-pad').trim() || '2px 6px').split(/\s+/).map(parseFloat)
    const R = parseFloat(cs.getPropertyValue('--ns-mark-round')) || 8
    // origen: la esquina del padding del anfitrión (donde se coloca un hijo absoluto)
    const ox = H.left + host.clientLeft - host.scrollLeft, oy = H.top + host.clientTop - host.scrollTop
    const rects = [...el.getClientRects()].map(q => ({ left: q.left - ox, right: q.right - ox, top: q.top - oy, bottom: q.bottom - oy, width: q.width, height: q.height }))
    // el svg es hermano del resaltado: sus variables (color, trazo, tiempo) se copian
    const vars = ['--ns-mark', '--ns-mark-border', '--ns-mark-width', '--ns-mark-time'].map(k => [k, cs.getPropertyValue(k).trim()])
    jobs.push({ el, st, host, polys: outline(rects, px, py), R, vars })
  }
  for (const { el, st, host, polys, R, vars } of jobs) {
    if (!st.svg) {
      st.svg = document.createElementNS(SVG, 'svg')
      st.svg.setAttribute('class', 'ns-mark-fx'); st.svg.setAttribute('aria-hidden', 'true'); st.svg.setAttribute('focusable', 'false')
      st.svg.append(document.createElementNS(SVG, 'path'))
      host.classList.add('ns-mark-host')
    }
    // el svg va justo después del resaltado (el selector de "draw" lo usa) y dentro del anfitrión
    if (st.svg.previousSibling != el || st.svg.parentNode != el.parentNode) el.after(st.svg)
    const pts = polys.flat()
    if (!pts.length) { st.svg.firstChild.removeAttribute('d'); continue }
    const x0 = Math.min(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1]))
    const W = Math.max(...pts.map(p => p[0])) - x0, Hh = Math.max(...pts.map(p => p[1])) - y0
    // cada pieza con el motor de ns-frame: poly con un fillet en cada vértice (convexo o cóncavo)
    const d = polys.map(P => path('poly ' + P.map(([x, y]) => `${r2(x - x0)} ${r2(y - y0)} r${R}`).join(', '), W, Hh)).join('')
    for (const [k, v] of vars) v ? st.svg.style.setProperty(k, v) : st.svg.style.removeProperty(k)
    Object.assign(st.svg.style, { left: r2(x0) + 'px', top: r2(y0) + 'px', width: r2(W) + 'px', height: r2(Hh) + 'px' })
    st.svg.setAttribute('viewBox', `0 0 ${r2(W)} ${r2(Hh)}`)
    st.svg.firstChild.setAttribute('d', d)
  }
}
const schedule = () => { raf ||= requestAnimationFrame(run) }
/** Vuelve a dibujar todos los resaltados (p. ej. tras cambiar el texto por JS). */
export const refresh = schedule

if (typeof document != 'undefined') {
  const add = el => {
    if (M.has(el)) return
    if (!styled) { styled = 1; styles(CSS); document.fonts?.ready.then(schedule) }
    M.set(el, {})
    ro ||= new ResizeObserver(schedule)
    ro.observe(el.parentElement || el)
    if (/(^|\s)draw(\s|$)/.test(el.getAttribute('data-ns-mark'))) {
      io ||= new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('ns-in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -15% 0px' })
      io.observe(el)
    }
    schedule()
  }
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-mark]') && add(n); n.querySelectorAll('[data-ns-mark]').forEach(add) }
  const boot = () => {
    scan(document.body)
    // texto que cambia dentro de un resaltado, o resaltados nuevos
    new MutationObserver(ms => { for (const m of ms) { m.addedNodes.forEach(scan); for (const el of M.keys()) if (el.contains(m.target)) { schedule(); break } } })
      .observe(document.body, { childList: true, subtree: true, characterData: true })
    addEventListener('resize', schedule, { passive: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
