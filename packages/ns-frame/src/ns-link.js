/*! ns-frame/link · líneas HUD que conectan un elemento con otro: data-ns-link="#destino" */
// Las coordenadas son de página (no de ventana): el scroll no obliga a recalcular nada.
// Se recalcula sólo cuando cambia el tamaño de algún extremo, del <body> o de la ventana.

const NS = 'http://www.w3.org/2000/svg', L = new Map()
let svg, ro, raf

const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e }
const schedule = () => { raf ||= requestAnimationFrame(draw) }

function target(el) {
  try { return document.querySelector(el.getAttribute('data-ns-link')) } catch { return null } // selector inválido
}

function add(el) {
  if (L.has(el)) return
  if (!svg) {
    svg = mk('svg', { class: 'ns-links', 'aria-hidden': 'true' })
    // profundidad configurable: --ns-link-z en :root (p. ej. 0 para que pasen por detrás de elementos con z-index)
    Object.assign(svg.style, { position: 'absolute', left: 0, top: 0, width: '1px', height: '1px', overflow: 'visible', pointerEvents: 'none', zIndex: getComputedStyle(document.documentElement).getPropertyValue('--ns-link-z').trim() || 5 })
    document.body.append(svg)
    ro = new ResizeObserver(schedule)
    ro.observe(document.body)
    addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule)
  }
  const g = mk('g'), p = mk('path', { fill: 'none', 'stroke-linejoin': 'round' }), a = mk('circle', { r: 2.5 }), b = mk('circle', { r: 4, fill: 'none' })
  g.append(p, a, b)
  svg.append(g)
  const o = { g, p, a, b, t: target(el), on: 0 }
  L.set(el, o)
  const hi = v => () => { o.on = v; schedule() }
  for (const n of [el, o.t]) if (n) { n.addEventListener('pointerenter', hi(1)); n.addEventListener('pointerleave', hi(0)); ro.observe(n) }
  if (el.hasAttribute('data-ns-link-flow') && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -18 }], { duration: 900, iterations: Infinity })
  schedule()
}

function draw() {
  raf = 0
  const sx = scrollX, sy = scrollY, jobs = []
  // 1) lecturas
  for (const [el, o] of L) {
    if (!el.isConnected) { o.g.remove(); L.delete(el); continue }
    if (!o.t?.isConnected) o.t = target(el)
    if (!o.t) { o.g.style.display = 'none'; continue }
    const cs = getComputedStyle(el)
    jobs.push([o, el.getBoundingClientRect(), o.t.getBoundingClientRect(), cs.getPropertyValue('--ns-link').trim() || '#3de0ff',
      parseFloat(cs.getPropertyValue('--ns-link-width')) || 1, el.hasAttribute('data-ns-link-flow')])
  }
  // 2) escrituras
  for (const [o, a, b, color, width, flow] of jobs) {
    const ac = [a.left + a.width / 2, a.top + a.height / 2], dx = b.left + b.width / 2 - ac[0], dy = b.top + b.height / 2 - ac[1]
    const side = Math.abs(dx) * a.height > Math.abs(dy) * a.width // sale por un lado (true) o por arriba/abajo
    const A = side ? [dx > 0 ? a.right : a.left, ac[1]] : [ac[0], dy > 0 ? a.bottom : a.top]
    const B = [Math.min(Math.max(A[0], b.left), b.right), Math.min(Math.max(A[1], b.top), b.bottom)]
    const ex = B[0] - A[0], ey = B[1] - A[1], m = Math.min(Math.abs(ex), Math.abs(ey))
    // tramo recto + diagonal a 45° (lenguaje HUD)
    const M = side ? [B[0] - Math.sign(ex) * m, A[1]] : [A[0], B[1] - Math.sign(ey) * m]
    const P = ([x, y]) => `${Math.round((x + sx) * 10) / 10} ${Math.round((y + sy) * 10) / 10}`
    o.g.style.display = ''
    o.g.style.opacity = o.on ? 1 : .7
    o.p.setAttribute('d', `M${P(A)}L${P(M)}L${P(B)}`)
    o.p.style.stroke = color
    o.p.style.strokeWidth = width * (o.on ? 1.8 : 1) + 'px'
    o.p.style.strokeDasharray = flow ? '6 12' : ''
    const [bx, by] = P(B).split(' '), [ax, ay] = P(A).split(' ')
    o.a.setAttribute('cx', ax); o.a.setAttribute('cy', ay); o.a.style.fill = color
    o.b.setAttribute('cx', bx); o.b.setAttribute('cy', by); o.b.style.stroke = color
  }
}

/** Recalcula todas las líneas (p. ej. tras mover elementos con JS o animaciones). */
export const refresh = schedule

if (typeof document != 'undefined') {
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-link]') && add(n); n.querySelectorAll('[data-ns-link]').forEach(add) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => { for (const m of ms) { m.addedNodes.forEach(scan); if (m.removedNodes.length) schedule() } })
      .observe(document.body, { childList: true, subtree: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
