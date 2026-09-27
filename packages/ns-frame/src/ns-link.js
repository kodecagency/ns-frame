/*! ns-frame/link · líneas HUD que conectan un elemento con otro: data-ns-link="#destino" */
// Las coordenadas son de página (no de ventana): el scroll no obliga a recalcular nada.
// Se recalcula sólo cuando cambia el tamaño de algún extremo, la altura del documento o la ventana,
// y sólo las líneas cerca de la pantalla (las de lejos se dibujan al acercarse).

const NS = 'http://www.w3.org/2000/svg', L = new Map()
// near: los orígenes cerca de la pantalla (medio alto de margen). Sólo esas líneas se miden y se
// dibujan: una sección de callouts al final de la página no cuesta nada al cargar
let svg, ro, raf, raf2, io, check
const near = new Set()

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
    // Lo que mueve los extremos sin cambiarles el tamaño (algo encima que crece: una imagen que
    // carga, una sección con content-visibility que se pinta) cambia la altura del documento. No se
    // observa el <body> con ResizeObserver: al ser tan poco profundo, cualquier cambio de altura
    // durante otro ResizeObserver quedaba sin entregar y el navegador lo lanzaba como error global
    // ("ResizeObserver loop…"). Se compara la altura en eventos baratos y sólo se redibuja si cambió.
    // fotograma propio (no el de draw): si coincidiera con un cambio de tamaño, ése se perdería
    // (como mucho tres veces por segundo: leer la altura justo después de que otro módulo escriba
    // estilos obliga a maquetar antes de tiempo, y en el desplazamiento eso era cada fotograma)
    let H = 0, at = 0
    check = () => {
      if (raf2) return
      // (dentro del intervalo, una comprobación al final: el último cambio no se pierde)
      const wait = 330 - (performance.now() - at)
      if (wait > 0) { raf2 = setTimeout(() => { raf2 = 0; check() }, wait); return }
      raf2 = requestAnimationFrame(() => { raf2 = 0; at = performance.now(); const h = document.documentElement.scrollHeight; if (h != H) { H = h; schedule() } })
    }
    io = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? near.add(e.target) : near.delete(e.target); schedule() }, { rootMargin: '50% 0px' })
    addEventListener('resize', schedule)
    addEventListener('scroll', e => {
      if (e.target == document) return check()
      // el scroll de un contenedor mueve los extremos que lleva dentro
      for (const [el, o] of L) if (e.target.contains?.(el) != e.target.contains?.(o.t)) return schedule()
    }, { passive: true, capture: true })
    addEventListener('load', check, true)
    ;(globalThis.requestIdleCallback || setTimeout)(() => document.fonts?.ready.then(schedule), { timeout: 1500 })
  }
  const g = mk('g'), p = mk('path', { fill: 'none', 'stroke-linejoin': 'round' }), a = mk('circle', { r: 2.5 }), b = mk('circle', { r: 4, fill: 'none' })
  g.append(p, a, b)
  svg.append(g)
  const o = { g, p, a, b, t: null, on: 0 }
  o.in = () => { o.on = 1; schedule() }; o.out = () => { o.on = 0; schedule() }
  L.set(el, o)
  io.observe(el)
  hook(el, o, 1)
  bind(o, target(el))
  // (el flujo: un ciclo de guiones cada --ns-link-time, 900 ms; "900", "900ms" o ".9s")
  if (el.hasAttribute('data-ns-link-flow') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const raw = getComputedStyle(el).getPropertyValue('--ns-link-time').trim(), v = parseFloat(raw)
    p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -18 }], { duration: isNaN(v) ? 900 : /[^m]s$/.test(raw) ? v * 1000 : v, iterations: Infinity })
  }
  schedule()
}
// un extremo: resaltado al pasar el puntero y redibujo al cambiar de tamaño
function hook(n, o, on) {
  n[on ? 'addEventListener' : 'removeEventListener']('pointerenter', o.in)
  n[on ? 'addEventListener' : 'removeEventListener']('pointerleave', o.out)
  on ? ro.observe(n) : ro.unobserve(n)
}
// el destino puede aparecer después, desaparecer o cambiar (otro selector en data-ns-link)
function bind(o, t) {
  if (t == o.t) return
  o.t && hook(o.t, o, 0)
  o.t = t
  t && hook(t, o, 1)
}
function drop(el) {
  const o = L.get(el)
  hook(el, o, 0); bind(o, null); o.g.remove(); L.delete(el); io.unobserve(el); near.delete(el)
}

function draw() {
  raf = 0
  const jobs = []
  // (sin capa o con las líneas ocultas por CSS, p. ej. en el móvil, no se mide nada)
  if (!svg || getComputedStyle(svg).display == 'none') return
  // 1) lecturas. El origen es el propio svg: vale aunque el <body> tenga margen o sea relative
  const S = svg.getBoundingClientRect(), sx = -S.left, sy = -S.top
  for (const [el, o] of L) {
    if (!el.isConnected || !el.hasAttribute('data-ns-link')) { drop(el); continue }
    // (lejos de la pantalla no se mide: se dibuja al acercarse)
    if (!near.has(el)) continue
    if (!o.t?.isConnected) bind(o, target(el))
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
    new MutationObserver(ms => {
      for (const m of ms) {
        m.addedNodes.forEach(scan)
        // otro destino en data-ns-link (o se quita: la línea se va en el siguiente dibujo)
        if (m.type == 'attributes') { const o = L.get(m.target); if (o) { m.target.hasAttribute('data-ns-link') && bind(o, target(m.target)); schedule() } else scan(m.target) }
      }
      // (un cambio en cualquier parte de la página sólo redibuja si movió algo: la altura del
      // documento; antes redibujaba con cada mutación, y al cargar la página cambia sin parar)
      if (L.size) check?.()
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ns-link'] })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
