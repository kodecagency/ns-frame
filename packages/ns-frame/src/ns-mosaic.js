/*! ns-frame/mosaic · mosaico de piezas libres: áreas en L, T o U que encajan con hueco constante */
// <div class="ns-mosaic" data-ns-mosaic style="--ns-areas: 'a a b' 'c d b' 'c d d'">
//   <article data-ns-area="a">…</article> <article data-ns-area="b">…</article> …
//   <div data-ns-orb></div>   ← opcional: orbe que recorta a las piezas vecinas
// </div>
// · Cada área puede tener cualquier forma hecha de celdas (no sólo rectángulos, a diferencia de
//   grid-template-areas). Las esquinas convexas llevan --ns-round y las cóncavas --ns-round + gap,
//   así dos piezas que encajan mantienen el mismo hueco también en la curva.
// · La plantilla es una variable CSS: cámbiala con media queries o container queries y las
//   piezas pasan de una forma a otra con morph.
// · --ns-orb: "columna fila radio" (líneas de la cuadrícula, 1 = borde inicial; admite
//   decimales). Las piezas que toca reciben un recorte circular concéntrico con el orbe.
// · El contenido va dentro del mayor rectángulo libre de cada pieza (padding automático).
// Requiere ns-frame.js (que dibuja las formas). CSP-safe: estilos por constructable stylesheet.

import { styles as inject } from './ns-frame.js'

const CSS = `@layer ns{
.ns-mosaic{display:grid;position:relative;gap:var(--ns-gap,14px);grid-template-columns:repeat(var(--ns-cn,3),minmax(0,1fr));grid-template-rows:repeat(var(--ns-rn,2),var(--ns-row,150px))}
.ns-mosaic>[data-ns-area]{box-sizing:border-box;min-width:0;min-height:0;padding:calc(var(--ns-in-t,0px) + var(--ns-pad,22px)) calc(var(--ns-in-r,0px) + var(--ns-pad,22px)) calc(var(--ns-in-b,0px) + var(--ns-pad,22px)) calc(var(--ns-in-l,0px) + var(--ns-pad,22px))}
.ns-mosaic>[data-ns-area].ns-off-area{display:none}
.ns-mosaic>[data-ns-orb]{position:absolute;margin:0;border-radius:50%;box-sizing:border-box}
}`

const M = new Map()
let ro, raf, styled
const TAU = Math.PI * 2, STEP = Math.PI * 4 / 9 // arcos en tramos de ≤ 80° (el núcleo dibuja cada tramo con un arco SVG)
const fx = n => Math.round(n * 100) / 100 || 0   // sin "-0": un negativo en poly se mediría desde el final

// "'a a b' 'c d b'" -> [['a','a','b'], ['c','d','b']]
export function parseAreas(s) {
  const rows = [...String(s || '').matchAll(/"([^"]*)"|'([^']*)'/g)].map(m => (m[1] ?? m[2]).trim().split(/\s+/))
  const C = Math.max(0, ...rows.map(r => r.length))
  return rows.filter(r => r.length).map(r => Array.from({ length: C }, (_, i) => r[i] || '.'))
}

// contorno de un área (unión de celdas y de los huecos entre celdas de la misma área), en sentido horario
function outline(G, name, xs, ys) {
  const R = G.length, C = G[0].length, has = (r, c) => G[r]?.[c] == name
  const cells = k => k % 2 ? [(k - 1) / 2, (k + 1) / 2] : [k / 2]
  const fill = (i, j) => i >= 0 && j >= 0 && i < 2 * R - 1 && j < 2 * C - 1 && cells(i).every(r => cells(j).every(c => has(r, c)))
  const X = j => xs[j], Y = i => ys[i], E = new Map()
  const edge = (a, b) => E.set(a.join(), [a, b])
  for (let i = 0; i < 2 * R - 1; i++) for (let j = 0; j < 2 * C - 1; j++) {
    if (!fill(i, j)) continue
    const x0 = X(j), x1 = X(j + 1), y0 = Y(i), y1 = Y(i + 1)
    if (!fill(i - 1, j)) edge([x0, y0], [x1, y0])
    if (!fill(i, j + 1)) edge([x1, y0], [x1, y1])
    if (!fill(i + 1, j)) edge([x1, y1], [x0, y1])
    if (!fill(i, j - 1)) edge([x0, y1], [x0, y0])
  }
  // encadenar aristas en lazos; se queda el de mayor área (los agujeros no se admiten)
  let best = [], ba = 0
  while (E.size) {
    const [k0] = E.keys(), loop = []
    let k = k0
    while (E.has(k)) { const [a, b] = E.get(k); E.delete(k); loop.push(a); k = b.join() }
    const P = loop.filter((p, i) => { const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) })
    const A = P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0) / 2
    if (A > ba) { ba = A; best = P }
  }
  return best
}

// mayor rectángulo de celdas del área (para el contenido)
function inner(G, name) {
  let best, ba = -1
  const R = G.length, C = G[0].length
  for (let r0 = 0; r0 < R; r0++) for (let c0 = 0; c0 < C; c0++) for (let r1 = r0; r1 < R; r1++) for (let c1 = c0; c1 < C; c1++) {
    let ok = 1
    for (let r = r0; ok && r <= r1; r++) for (let c = c0; ok && c <= c1; c++) ok = G[r][c] == name
    const a = (r1 - r0 + 1) * (c1 - c0 + 1)
    if (ok && a > ba) { ba = a; best = [r0, c0, r1, c1] }
  }
  return best
}

// arco de centro Q y radio r de a0 a a1 (dir 1 = horario, -1 = antihorario) en tramos ≤ 80°
function arc(out, Q, r, a0, a1, dir) {
  const span = ((dir > 0 ? a1 - a0 : a0 - a1) % TAU + TAU) % TAU, n = Math.max(1, Math.ceil(span / STEP))
  for (let k = 1; k <= n; k++) { const a = a0 + dir * span * k / n; out.push({ x: Q[0] + r * Math.cos(a), y: Q[1] + r * Math.sin(a), a: dir * r }) }
}

// resta el disco (centro O, radio Rc) al contorno P, con curvas de radio rho donde el borde se une al arco
function bite(P, O, Rc, rho) {
  const n = P.length, d2 = p => (p.x - O[0]) ** 2 + (p.y - O[1]) ** 2, In = p => d2(p) < Rc * Rc - 1e-6
  const s = P.findIndex(p => !In(p))
  if (s < 0) return null
  const out = []
  let pend = null
  for (let k = 0; k < n; k++) {
    const A = P[(s + k) % n], B = P[(s + k + 1) % n]
    if (!pend) out.push(A)
    const L = Math.hypot(B.x - A.x, B.y - A.y)
    if (L < 1e-9) continue
    const u = [(B.x - A.x) / L, (B.y - A.y) / L], nn = [-u[1], u[0]] // normal hacia el interior (contorno horario)
    // cortes del segmento con el círculo
    const D = [A.x - O[0], A.y - O[1]], b = D[0] * u[0] + D[1] * u[1], disc = b * b - (D[0] ** 2 + D[1] ** 2 - Rc * Rc)
    if (disc <= 0) continue
    const q = Math.sqrt(disc), hits = [-b - q, -b + q].filter(t => t > 1e-6 && t < L - 1e-6)
    for (const t0 of hits) {
      const enter = !pend
      // curva de enlace: círculo de radio r tangente a la recta (por dentro) y al disco (por fuera)
      let fit = null
      for (let r = rho; r >= 0 && !fit; r = r > 1 ? r / 2 : r ? 0 : -1) {
        const Dd = [A.x + r * nn[0] - O[0], A.y + r * nn[1] - O[1]], bb = Dd[0] * u[0] + Dd[1] * u[1]
        const dd = bb * bb - (Dd[0] ** 2 + Dd[1] ** 2 - (Rc + r) ** 2)
        if (dd < 0) continue
        const t = enter ? -bb - Math.sqrt(dd) : -bb + Math.sqrt(dd)
        if (t < 0 || t > L || (enter ? t > t0 + 1e-6 : t < t0 - 1e-6)) continue
        const Q = [A.x + t * u[0] + r * nn[0], A.y + t * u[1] + r * nn[1]], k2 = Rc / (Rc + r)
        fit = { r, T: [A.x + t * u[0], A.y + t * u[1]], Q, C: [O[0] + (Q[0] - O[0]) * k2, O[1] + (Q[1] - O[1]) * k2] }
      }
      if (!fit) fit = { r: 0, T: [A.x + t0 * u[0], A.y + t0 * u[1]], C: [A.x + t0 * u[0], A.y + t0 * u[1]] }
      const ang = (Q, p) => Math.atan2(p[1] - Q[1], p[0] - Q[0])
      if (enter) {
        out.push({ x: fit.T[0], y: fit.T[1], r: 0 })
        if (fit.r) arc(out, fit.Q, fit.r, ang(fit.Q, fit.T), ang(fit.Q, fit.C), 1)
        pend = fit
      } else {
        // arco del disco (antihorario: el orbe queda fuera de la pieza), luego la curva de salida
        arc(out, O, Rc, ang(O, pend.C), ang(O, fit.C), -1)
        if (fit.r) arc(out, fit.Q, fit.r, ang(fit.Q, fit.C), ang(fit.Q, fit.T), 1)
        out[out.length - 1].r = 0
        pend = null
      }
    }
  }
  return pend ? null : out
}

function layout() {
  raf = 0
  const jobs = []
  // 1) lecturas
  for (const [el] of M) {
    if (!el.isConnected) { M.delete(el); ro.unobserve(el); continue }
    const cs = getComputedStyle(el), G = parseAreas(cs.getPropertyValue('--ns-areas'))
    jobs.push({ el, cs, G })
  }
  // 2) número de pistas (puede cambiar el layout: se mide en el siguiente frame)
  let again = 0
  for (const { el, G } of jobs) {
    const cn = String(G[0]?.length || 1), rn = String(G.length || 1)
    if (el.style.getPropertyValue('--ns-cn') != cn || el.style.getPropertyValue('--ns-rn') != rn) {
      el.style.setProperty('--ns-cn', cn); el.style.setProperty('--ns-rn', rn); again = 1
    }
  }
  if (again) return schedule()
  // 3) formas
  for (const { el, cs, G } of jobs) {
    if (!G.length) continue
    const px = v => parseFloat(v) || 0, tr = v => v.split(/\s+/).map(parseFloat).filter(x => !isNaN(x))
    const cw = tr(cs.gridTemplateColumns), rh = tr(cs.gridTemplateRows), gx = px(cs.columnGap), gy = px(cs.rowGap)
    if (cw.length != G[0].length || rh.length != G.length) { schedule(); continue }
    const xs = [], ys = []
    cw.reduce((x, w) => (xs.push(x, x + w), x + w + gx), 0)
    rh.reduce((y, h) => (ys.push(y, y + h), y + h + gy), 0)
    const W = xs[xs.length - 1], H = ys[ys.length - 1]
    const r = px(cs.getPropertyValue('--ns-round') || 18), ro_ = px(cs.getPropertyValue('--ns-round-out')) || r
    const concave = cs.getPropertyValue('--ns-round-in') ? px(cs.getPropertyValue('--ns-round-in')) : r + Math.min(gx, gy)
    // orbe: "col fila radio" en líneas de la cuadrícula
    const line = (v, P, gap) => { const k = Math.max(1, Math.min(P.length / 2 + 1, v)), i = Math.floor(k), fr = k - i
      const at = j => j <= 1 ? 0 : j >= P.length / 2 + 1 ? P[P.length - 1] : P[2 * (j - 1)] - gap / 2
      return at(i) + (at(i + 1) - at(i)) * fr }
    const ob = cs.getPropertyValue('--ns-orb').trim().split(/\s+/).map(parseFloat)
    const orbEl = el.querySelector(':scope>[data-ns-orb]')
    let O = null, Ro = 0
    if (ob.length >= 3 && ob.every(x => !isNaN(x)) && ob[2] > 0) {
      O = [line(ob[0], xs, gx), line(ob[1], ys, gy)]; Ro = ob[2]
    }
    const og = cs.getPropertyValue('--ns-orb-gap') ? px(cs.getPropertyValue('--ns-orb-gap')) : Math.min(gx, gy)
    const orho = cs.getPropertyValue('--ns-orb-round') ? px(cs.getPropertyValue('--ns-orb-round')) : r
    if (orbEl) {
      orbEl.hidden = !O
      if (O) Object.assign(orbEl.style, { left: fx(px(cs.paddingLeft) + O[0] - Ro) + 'px', top: fx(px(cs.paddingTop) + O[1] - Ro) + 'px', width: fx(2 * Ro) + 'px', height: fx(2 * Ro) + 'px' })
    }
    const key = [JSON.stringify(G), O && ob.join()].join('|')
    const same = el._nsk == key
    el._nsk = key
    for (const k of el.children) {
      const name = k.getAttribute('data-ns-area')
      if (name == null) continue
      let r0 = 1e9, c0 = 1e9, r1 = -1, c1 = -1
      G.forEach((row, i) => row.forEach((v, j) => { if (v == name) { r0 = Math.min(r0, i); r1 = Math.max(r1, i); c0 = Math.min(c0, j); c1 = Math.max(c1, j) } }))
      k.classList.toggle('ns-off-area', r1 < 0)
      if (r1 < 0) continue
      k.style.gridArea = `${r0 + 1} / ${c0 + 1} / ${r1 + 2} / ${c1 + 2}`
      const ox = xs[2 * c0], oy = ys[2 * r0]
      // contorno con radios: convexos r (o --ns-round-out en el perímetro del mosaico), cóncavos r + gap
      const P = outline(G, name, xs, ys), n = P.length
      let V = P.map((p, i) => {
        const a = P[(i + n - 1) % n], b = P[(i + 1) % n]
        const cx = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])
        const hull = (Math.abs(p[0]) < .5 || Math.abs(p[0] - W) < .5) && (Math.abs(p[1]) < .5 || Math.abs(p[1] - H) < .5)
        return { x: p[0], y: p[1], r: cx > 0 ? (hull ? ro_ : r) : concave }
      })
      // contenido: mayor rectángulo de celdas; si el orbe lo invade, se recorta por el lado que menos pierde
      const [ir0, ic0, ir1, ic1] = inner(G, name)
      let box = [xs[2 * ic0], ys[2 * ir0], xs[2 * ic1 + 1], ys[2 * ir1 + 1]]
      if (O) {
        const Rc = Ro + og, bit = bite(V, O, Rc, orho)
        if (bit) V = bit
        const hit = b => { const qx = Math.max(b[0], Math.min(O[0], b[2])), qy = Math.max(b[1], Math.min(O[1], b[3])); return Math.hypot(qx - O[0], qy - O[1]) < Rc }
        if (hit(box)) {
          // cuánto hay que mover cada lado para salir del disco (cuerda real, no el radio entero)
          const reach = (lo, hi, o) => { const d = o < lo ? lo - o : o > hi ? o - hi : 0; return Math.sqrt(Math.max(0, Rc * Rc - d * d)) }
          const ry = reach(box[0], box[2], O[0]), rx = reach(box[1], box[3], O[1])
          const opts = [[O[0] + rx, box[1], box[2], box[3]], [box[0], box[1], O[0] - rx, box[3]], [box[0], O[1] + ry, box[2], box[3]], [box[0], box[1], box[2], O[1] - ry]]
            .filter(b => b[2] - b[0] > 0 && b[3] - b[1] > 0)
          const area = b => (b[2] - b[0]) * (b[3] - b[1])
          if (opts.length) box = opts.reduce((p, q) => area(q) > area(p) ? q : p)
        }
      }
      const shape = 'poly ' + V.map(v => `${fx(v.x - ox)} ${fx(v.y - oy)}${v.a ? ' a' + fx(v.a) : ''} r${fx(v.r || 0)}`).join(', ')
      const ins = [box[1] - oy, xs[2 * c1 + 1] - box[2], ys[2 * r1 + 1] - box[3], box[0] - ox]
      'trbl'.split('').forEach((s, i) => k.style.setProperty('--ns-in-' + s, fx(Math.max(0, ins[i])) + 'px'))
      if (k.getAttribute('data-ns') != shape) {
        // al redimensionar, la forma se ajusta al instante; al cambiar de plantilla, se anima (morph)
        same ? k.style.setProperty('--ns-morph-time', '0') : k.style.removeProperty('--ns-morph-time')
        k.setAttribute('data-ns', shape)
      }
    }
  }
}

const schedule = () => { raf ||= requestAnimationFrame(layout) }

function add(el) {
  if (M.has(el)) return
  if (!styled) { styled = 1; inject(CSS) }
  // dentro del callback del ResizeObserver: la forma nueva llega en el mismo frame que el tamaño nuevo
  ro ||= new ResizeObserver(() => { cancelAnimationFrame(raf); layout() })
  M.set(el, 1)
  ro.observe(el)
  schedule()
}

/** Recalcula (p. ej. tras cambiar --ns-areas o --ns-orb por JS). */
export const refresh = schedule

if (typeof document != 'undefined') {
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-mosaic]') && add(n); n.querySelectorAll('[data-ns-mosaic]').forEach(add) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => {
      for (const m of ms) {
        m.addedNodes.forEach(scan)
        // piezas añadidas o quitadas, una pieza que cambia de área o el contenedor que cambia de clase
        if (M.has(m.type == 'attributes' && m.attributeName == 'data-ns-area' ? m.target.parentElement : m.target)) schedule()
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ns-area', 'class'] })
    // las media queries cambian --ns-areas sin cambiar siempre el tamaño
    addEventListener('resize', schedule, { passive: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
