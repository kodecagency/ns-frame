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

import { styles as inject, path } from './ns-frame.js'
import { flow, unflow } from './ns-flow.js'

const CSS = `@layer ns{
.ns-mosaic{display:grid;position:relative;gap:var(--ns-gap,14px);grid-template-columns:repeat(var(--ns-cn,3),minmax(0,1fr));grid-template-rows:repeat(var(--ns-rn,2),var(--ns-row,150px))}
.ns-mosaic>[data-ns-area]{box-sizing:border-box;min-width:0;min-height:0;padding:calc(var(--ns-in-t,0px) + var(--ns-pad,22px)) calc(var(--ns-in-r,0px) + var(--ns-pad,22px)) calc(var(--ns-in-b,0px) + var(--ns-pad,22px)) calc(var(--ns-in-l,0px) + var(--ns-pad,22px))}
.ns-mosaic>[data-ns-area].ns-off-area{display:none}
.ns-mosaic>.ns-flow{display:flow-root;padding:0}
.ns-flow>.ns-fl,.ns-flow>.ns-fr{display:block;pointer-events:none;margin:0}
.ns-flow>.ns-fl{float:left;clear:left}.ns-flow>.ns-fr{float:right;clear:right}
.ns-mosaic>[data-ns-area]{position:relative;isolation:isolate}
.ns-mosaic:is([data-ns-mosaic~=aurora],[data-ns-mosaic~=dots],[data-ns-mosaic~=grid])>[data-ns-area]::before{content:'';position:absolute;z-index:-1;pointer-events:none;left:calc(-1 * var(--ns-mx,0px));top:calc(-1 * var(--ns-my,0px));width:var(--ns-mw,100%);height:var(--ns-mh,100%);background-image:var(--_d,none),var(--_g,none),var(--_a,none),var(--_b,none);background-size:16px 16px,28px 28px,100% 100%,100% 100%}
.ns-mosaic[data-ns-mosaic~=dots]>[data-ns-area]{--_d:radial-gradient(circle,var(--ns-mo-dot,rgba(255,255,255,.16)) 1px,transparent 1.6px)}
.ns-mosaic[data-ns-mosaic~=grid]>[data-ns-area]{--_g:linear-gradient(90deg,var(--ns-mo-line,rgba(255,255,255,.07)) 1px,transparent 1px),linear-gradient(var(--ns-mo-line,rgba(255,255,255,.07)) 1px,transparent 1px)}
.ns-mosaic[data-ns-mosaic~=grid]:not([data-ns-mosaic~=dots])>[data-ns-area]{--_d:none}
.ns-mosaic[data-ns-mosaic~=aurora]>[data-ns-area]::before{left:calc(-1 * var(--ns-mx,0px) - var(--ns-mw,100%) * .15);top:calc(-1 * var(--ns-my,0px) - var(--ns-mh,100%) * .15);width:calc(var(--ns-mw,100%) * 1.3);height:calc(var(--ns-mh,100%) * 1.3);animation:ns-mo-au calc(var(--ns-mo-time,5s) * 3) ease-in-out infinite alternate}
.ns-mosaic[data-ns-mosaic~=aurora]>[data-ns-area]{--_a:radial-gradient(34% 40% at 32% 36%,color-mix(in srgb,var(--ns-mo-a1,#3de0ff) 30%,transparent),transparent);--_b:radial-gradient(34% 40% at 68% 64%,color-mix(in srgb,var(--ns-mo-a2,#8b7bff) 34%,transparent),transparent)}
.ns-mosaic>[data-ns-orb]{position:absolute;margin:0;border-radius:50%;box-sizing:border-box}
.ns-mosaic>[data-ns-orb].ns-orb-poly{border-radius:0}
.ns-mo-fx{position:absolute;z-index:2;pointer-events:none;overflow:visible}
.ns-mo-sw{transform-box:fill-box;animation:ns-mo-sw var(--ns-mo-time,5s) cubic-bezier(.45,0,.55,1) infinite}
.ns-mo-wv{animation:ns-mo-wv var(--ns-mo-time,4.5s) cubic-bezier(.2,.6,.3,1) infinite backwards}
.ns-mo-fx.ns-off *{animation-play-state:paused}
@keyframes ns-mo-sw{0%{transform:translateX(-50%)}70%,to{transform:translateX(50%)}}
@keyframes ns-mo-wv{0%{transform:scale(0);opacity:1}70%{opacity:1}to{transform:scale(1);opacity:0}}
.ns-mo-sc{transform-box:fill-box;animation:ns-mo-sc var(--ns-mo-time,4.5s) cubic-bezier(.45,0,.55,1) infinite}
.ns-mo-pl{animation:ns-mo-pl var(--ns-mo-time,3.6s) ease-in-out infinite}
.ns-mo-st path{fill:none;stroke:var(--ns-mo-light,var(--ns-motion,#fff));stroke-width:calc(var(--ns-mo-width,1.5px) * 1.6);stroke-linecap:round}
.ns-mo-tr path{fill:none;stroke:var(--ns-mo-light,var(--ns-motion,#fff));stroke-width:calc(var(--ns-mo-width,1.5px) * 1.4);stroke-linecap:round;stroke-dasharray:6 94;animation:ns-mo-tr var(--ns-mo-time,6s) linear infinite}
@keyframes ns-mo-sc{0%{transform:translateY(-50%)}75%,to{transform:translateY(50%)}}
@keyframes ns-mo-pl{0%,to{opacity:.1}50%{opacity:.8}}
@keyframes ns-mo-au{0%{transform:translate(-8%,-5%)}to{transform:translate(8%,5%)}}
@keyframes ns-mo-tr{to{stroke-dashoffset:-100}}
@media (prefers-reduced-motion:reduce){.ns-mo-sw,.ns-mo-wv,.ns-mo-sc,.ns-mo-tr,.ns-mo-st{display:none}.ns-mo-pl{animation:none;opacity:.4}.ns-mosaic>[data-ns-area]::before{animation:none!important}}
@media (forced-colors:active){.ns-mo-fx{display:none}}
@media (hover:none) and (pointer:coarse){.ns-mo-glow{filter:none}}
}`

const M = new Map()
const TOUCH = typeof matchMedia == 'function' ? matchMedia('(hover: none) and (pointer: coarse)') : { matches: false }
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
// rectángulos de celdas maximales del área (ninguno cabe dentro de otro), de mayor a menor:
// son los sitios candidatos para el contenido (en una L, el brazo largo y el brazo ancho)
function inner(G, name) {
  const R = G.length, C = G[0].length, all = []
  for (let r0 = 0; r0 < R; r0++) for (let c0 = 0; c0 < C; c0++) for (let r1 = r0; r1 < R; r1++) for (let c1 = c0; c1 < C; c1++) {
    let ok = 1
    for (let r = r0; ok && r <= r1; r++) for (let c = c0; ok && c <= c1; c++) ok = G[r][c] == name
    if (ok) all.push([r0, c0, r1, c1])
  }
  const inside = (p, q) => p != q && q[0] <= p[0] && q[1] <= p[1] && q[2] >= p[2] && q[3] >= p[3]
  const size = b => (b[2] - b[0] + 1) * (b[3] - b[1] + 1)
  return all.filter(p => !all.some(q => inside(p, q))).sort((p, q) => size(q) - size(p))
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

// huecos poligonales: n lados y giro base (triángulo y rombo con punta arriba, hexágono de punta)
const SIDES = { tri: [3, -90], diamond: [4, -90], square: [4, -45], hex: [6, -90], oct: [8, -67.5] }
// polígono regular de apotema a (el hueco crece en paralelo a sus lados: gap constante)
function ngon(O, n, rot, a) {
  const R = a / Math.cos(Math.PI / n)
  return Array.from({ length: n }, (_, i) => { const t = (rot + i * 360 / n) * Math.PI / 180; return [O[0] + R * Math.cos(t), O[1] + R * Math.sin(t)] })
}

// resta el polígono convexo K (vértices en ángulo creciente) al contorno P; las uniones con el
// borde reciben radio rho y las esquinas del hueco kr (el núcleo redondea cada vértice de poly)
function biteK(P, K, rho, kr) {
  const n = P.length, m = K.length
  const cr = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const In = p => K.every((k, i) => cr(k, K[(i + 1) % m], [p.x, p.y]) > 1e-6)
  const s = P.findIndex(p => !In(p))
  if (s < 0) return null
  const out = []
  let pend = null
  for (let k = 0; k < n; k++) {
    const A = P[(s + k) % n], B = P[(s + k + 1) % n]
    if (!pend) out.push(A)
    // cortes del segmento AB con cada lado de K, en orden a lo largo de AB
    const hits = []
    for (let i = 0; i < m; i++) {
      const C = K[i], D = K[(i + 1) % m], ex = B.x - A.x, ey = B.y - A.y, fx_ = D[0] - C[0], fy = D[1] - C[1]
      const den = ex * fy - ey * fx_
      if (Math.abs(den) < 1e-9) continue
      const t = ((C[0] - A.x) * fy - (C[1] - A.y) * fx_) / den, u = ((C[0] - A.x) * ey - (C[1] - A.y) * ex) / den
      if (t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u < 1) hits.push({ t, i, u, x: A.x + t * ex, y: A.y + t * ey })
    }
    hits.sort((p, q) => p.t - q.t)
    for (const h of hits) {
      if (!pend) { out.push({ x: h.x, y: h.y, r: rho }); pend = h; continue }
      // se recorre K en sentido contrario (el hueco queda fuera de la pieza) desde el lado de
      // entrada hasta el de salida; si es el mismo lado y la salida queda "delante", vuelta entera
      let j = pend.i, steps = pend.i == h.i ? (h.u < pend.u ? 0 : m) : (pend.i - h.i + m) % m
      for (; steps > 0; steps--, j = (j + m - 1) % m) out.push({ x: K[j][0], y: K[j][1], r: kr })
      out.push({ x: h.x, y: h.y, r: rho })
      pend = null
    }
  }
  return pend ? null : out
}

const setIn = (k, v) => 'trbl'.split('').forEach((s, i) => k.style.setProperty('--ns-in-' + s, v[i]))
// si el contenido no cabe en el rectángulo mayor, prueba los demás candidatos de la pieza y se
// queda con el primero donde cabe; si no cabe en ninguno, con el que menos desborda
const over = k => Math.max(k.scrollHeight - k.clientHeight, k.scrollWidth - k.clientWidth)
function fit(el) {
  for (const k of el.children) {
    const C = k._nsIn
    if (!C || C.length < 2 || k.classList.contains('ns-off-area') || over(k) <= 1) continue
    let best = C[0], bo = over(k)
    for (const v of C.slice(1)) {
      setIn(k, v)
      const o = over(k)
      if (o < bo) { bo = o; best = v }
      if (o <= 1) break
    }
    setIn(k, best)
  }
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
    // pistas explícitas: las piezas aún colocadas según la plantilla anterior pueden crear filas o
    // columnas implícitas de más (se van al recolocarlas aquí mismo); con menos, aún no llegó el estilo
    let cw = tr(cs.gridTemplateColumns), rh = tr(cs.gridTemplateRows)
    const gx = px(cs.columnGap), gy = px(cs.rowGap)
    // (reintento acotado: si el CSS nunca define las pistas, no se queda un bucle de frames)
    if (cw.length < G[0].length || rh.length < G.length) { if ((el._nst = (el._nst || 0) + 1) < 30) schedule(); continue }
    el._nst = 0
    cw = cw.slice(0, G[0].length); rh = rh.slice(0, G.length)
    const xs = [], ys = []
    cw.reduce((x, w) => (xs.push(x, x + w), x + w + gx), 0)
    rh.reduce((y, h) => (ys.push(y, y + h), y + h + gy), 0)
    const W = xs[xs.length - 1], H = ys[ys.length - 1]
    el.style.setProperty('--ns-mw', fx(W) + 'px'); el.style.setProperty('--ns-mh', fx(H) + 'px')
    const r = px(cs.getPropertyValue('--ns-round') || 18), ro_ = px(cs.getPropertyValue('--ns-round-out')) || r
    const concave = cs.getPropertyValue('--ns-round-in') ? px(cs.getPropertyValue('--ns-round-in')) : r + Math.min(gx, gy)
    // orbe: "col fila radio" en líneas de la cuadrícula
    const line = (v, P, gap) => { const k = Math.max(1, Math.min(P.length / 2 + 1, v)), i = Math.floor(k), fr = k - i
      const at = j => j <= 1 ? 0 : j >= P.length / 2 + 1 ? P[P.length - 1] : P[2 * (j - 1)] - gap / 2
      return at(i) + (at(i + 1) - at(i)) * fr }
    // uno o varios orbes, separados por comas: "col fila radio [circle|tri|diamond|square|hex|oct] [giro°]"
    // (cada uno se empareja, en orden, con un hijo [data-ns-orb])
    const og = cs.getPropertyValue('--ns-orb-gap') ? px(cs.getPropertyValue('--ns-orb-gap')) : Math.min(gx, gy)
    const orho = cs.getPropertyValue('--ns-orb-round') ? px(cs.getPropertyValue('--ns-orb-round')) : r
    // radio de las esquinas del orbe poligonal; el hueco las repite concéntricas (+ gap)
    const okr = cs.getPropertyValue('--ns-orb-corner') ? px(cs.getPropertyValue('--ns-orb-corner')) : 10
    const spec = cs.getPropertyValue('--ns-orb').trim()
    const holes = spec.split(',').map(s => {
      const tok = s.trim().split(/\s+/), ob = tok.slice(0, 3).map(parseFloat)
      if (ob.length < 3 || ob.some(isNaN) || ob[2] <= 0) return
      const kind = SIDES[tok[3]] ? tok[3] : 'circle', [n, base] = SIDES[kind] || [0, 0], a = base + (parseFloat(tok[4]) || 0)
      const O = [line(ob[0], xs, gx), line(ob[1], ys, gy)], Ro = ob[2]
      // hueco: círculo concéntrico con el orbe, o el mismo polígono con los lados desplazados gap px
      const K = n && ngon(O, n, a, Ro), Rb = n ? Ro / Math.cos(Math.PI / n) : Ro
      // forma del orbe poligonal (esquinas redondeadas); la luz lo dibuja con esta misma forma
      const sh = K && 'poly ' + K.map(([x, y]) => `${fx(x - O[0] + Rb)} ${fx(y - O[1] + Rb)} r${fx(okr)}`).join(', ')
      return { O, Ro, n, K, Rb, sh, Kc: n && ngon(O, n, a, Ro + og), Rc: n ? (Ro + og) / Math.cos(Math.PI / n) : Ro + og }
    }).filter(Boolean)
    el.querySelectorAll(':scope>[data-ns-orb]').forEach((orbEl, i) => {
      const h = holes[i]
      orbEl.hidden = !h
      if (!h) return
      // en un orbe poligonal el radio es la apotema: la caja mide 2 × el radio circunscrito
      const { O, K, Rb, sh } = h
      Object.assign(orbEl.style, { left: fx(px(cs.paddingLeft) + O[0] - Rb) + 'px', top: fx(px(cs.paddingTop) + O[1] - Rb) + 'px', width: fx(2 * Rb) + 'px', height: fx(2 * Rb) + 'px' })
      orbEl.classList.toggle('ns-orb-poly', !!K)
      if (sh ? orbEl.getAttribute('data-ns') != sh : orbEl.hasAttribute('data-ns')) sh ? orbEl.setAttribute('data-ns', sh) : orbEl.removeAttribute('data-ns')
    })
    const key = [JSON.stringify(G), spec].join('|')
    const same = el._nsk == key
    el._nsk = key
    const parts = [], flows = []
    for (const k of el.children) {
      const name = k.getAttribute('data-ns-area')
      if (name == null) continue
      let r0 = 1e9, c0 = 1e9, r1 = -1, c1 = -1
      G.forEach((row, i) => row.forEach((v, j) => { if (v == name) { r0 = Math.min(r0, i); r1 = Math.max(r1, i); c0 = Math.min(c0, j); c1 = Math.max(c1, j) } }))
      k.classList.toggle('ns-off-area', r1 < 0)
      if (r1 < 0) continue
      k.style.gridArea = `${r0 + 1} / ${c0 + 1} / ${r1 + 2} / ${c1 + 2}`
      const ox = xs[2 * c0], oy = ys[2 * r0]
      // posición de la pieza en el mosaico: los fondos compartidos (::before) se alinean con ella
      k.style.setProperty('--ns-mx', fx(ox) + 'px'); k.style.setProperty('--ns-my', fx(oy) + 'px')
      // contorno con radios: convexos r (o --ns-round-out en el perímetro del mosaico), cóncavos r + gap
      const P = outline(G, name, xs, ys), n = P.length
      let V = P.map((p, i) => {
        const a = P[(i + n - 1) % n], b = P[(i + 1) % n]
        const cx = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])
        const hull = (Math.abs(p[0]) < .5 || Math.abs(p[0] - W) < .5) && (Math.abs(p[1]) < .5 || Math.abs(p[1] - H) < .5)
        return { x: p[0], y: p[1], r: cx > 0 ? (hull ? ro_ : r) : concave }
      })
      for (const { O, Rc, Kc } of holes) {
        const bit = Kc ? biteK(V, Kc, orho, okr + og) : bite(V, O, Rc, orho)
        if (bit) V = bit
      }
      // contenido: va en un rectángulo de celdas de la pieza; si un orbe lo invade, se recorta por
      // el lado que menos pierde (cuerda real, no el radio entero)
      const clear = box => {
        for (const { O, Rc } of holes) {
          const qx = Math.max(box[0], Math.min(O[0], box[2])), qy = Math.max(box[1], Math.min(O[1], box[3]))
          if (Math.hypot(qx - O[0], qy - O[1]) >= Rc) continue
          const reach = (lo, hi, o) => { const d = o < lo ? lo - o : o > hi ? o - hi : 0; return Math.sqrt(Math.max(0, Rc * Rc - d * d)) }
          const ry = reach(box[0], box[2], O[0]), rx = reach(box[1], box[3], O[1])
          const opts = [[O[0] + rx, box[1], box[2], box[3]], [box[0], box[1], O[0] - rx, box[3]], [box[0], O[1] + ry, box[2], box[3]], [box[0], box[1], box[2], O[1] - ry]]
            .filter(b => b[2] - b[0] > 0 && b[3] - b[1] > 0)
          // se prefiere acortar en vertical: un texto corrido de lado se ve desalineado con sus vecinos
          const area = b => (b[2] - b[0]) * (b[3] - b[1]) * (b[0] == box[0] && b[2] == box[2] ? 1.35 : 1)
          if (opts.length) box = opts.reduce((p, q) => area(q) > area(p) ? q : p)
        }
        return box
      }
      const R_ = xs[2 * c1 + 1], B_ = ys[2 * r1 + 1], size = b => (b[2] - b[0]) * (b[3] - b[1])
      // candidatos (en una L: el brazo largo y el brazo ancho), de mayor a menor superficie libre;
      // tras pintar se elige el primero en el que el contenido cabe entero (fit, más abajo)
      k._nsIn = inner(G, name).map(([a, b, c, d]) => clear([xs[2 * b], ys[2 * a], xs[2 * d + 1], ys[2 * c + 1]]))
        .sort((p, q) => size(q) - size(p))
        .map(box => [box[1] - oy, R_ - box[2], B_ - box[3], box[0] - ox].map(v => fx(Math.max(0, v)) + 'px'))
      setIn(k, k._nsIn[0])
      const shape = 'poly ' + V.map(v => `${fx(v.x - ox)} ${fx(v.y - oy)}${v.a ? ' a' + fx(v.a) : ''} r${fx(v.r || 0)}`).join(', ')
      parts.push({ shape, ox, oy, w: xs[2 * c1 + 1] - ox, h: ys[2 * r1 + 1] - oy })
      // piezas que no son un rectángulo (L, T, escalera, mordidas por un orbe): el texto fluye por
      // toda la figura, no sólo por un rectángulo. data-ns-flow="off" (en el mosaico o la pieza) lo desactiva
      const off = /\boff\b/.test(el.getAttribute('data-ns-flow') || '') || k.getAttribute('data-ns-flow') == 'off'
      if (!off && (V.length > 4 || V.some(v => v.a))) flows.push({ k, d: path(shape, R_ - ox, B_ - oy), w: R_ - ox, h: B_ - oy })
      else unflow(k)
      if (k.getAttribute('data-ns') != shape) {
        // al redimensionar, la forma se ajusta al instante; al cambiar de plantilla, se anima (morph)
        same ? k.style.setProperty('--ns-morph-time', '0') : k.style.removeProperty('--ns-morph-time')
        k.setAttribute('data-ns', shape)
      }
    }
    const pad = cs.getPropertyValue('--ns-pad') ? px(cs.getPropertyValue('--ns-pad')) : 22
    for (const f of flows) flow(f, pad) || unflow(f.k)
    fit(el)
    light(el, parts, W, H, holes, matchMedia('(prefers-reduced-motion: reduce)').matches, px(cs.paddingLeft), px(cs.paddingTop), { G, xs, ys, gx, gy, r: ro_, speed: px(cs.getPropertyValue('--ns-mo-speed')) || 160 })
  }
}

// ── Luz conectada: una sola capa SVG sobre todo el mosaico. Sus máscaras son los contornos de
// todas las piezas (y del orbe), así un barrido o una onda recorre la figura entera como un
// solo objeto: bordes (máscara de trazo) y fondos (máscara de relleno, tenue).
// data-ns-mosaic="sweep wave ripple glow" · color --ns-mo-light · grosor --ns-mo-width ·
// tiempo --ns-mo-time · intensidad del fondo --ns-mo-fill
const SVG = 'http://www.w3.org/2000/svg'
let uid = 0
function mk(tag, a = {}, st = {}, ...kids) {
  const e = document.createElementNS(SVG, tag)
  for (const k in a) e.setAttribute(k, a[k])
  for (const k in st) e.style.setProperty(k, st[k])
  e.append(...kids)
  return e
}
const LIGHT = 'var(--ns-mo-light,var(--ns-motion,#fff))'
const stops = (...s) => s.map(([o, a]) => mk('stop', { offset: o }, { 'stop-color': LIGHT, 'stop-opacity': a }))

function light(el, parts, W, H, holes, reduce, pl, pt, grid) {
  // efectos por tipo de pantalla: en táctil manda data-ns-mosaic-touch si existe; si no, se quitan
  // los que dependen de un puntero que flota (glow sigue al cursor; ripple es una onda al tocar,
  // incómoda en el móvil, donde cada toque también es scroll)
  const touch = TOUCH.matches, tl = el.getAttribute('data-ns-mosaic-touch')
  const want = (touch && tl != null ? tl : el.getAttribute('data-ns-mosaic') || '').split(/\s+/).filter(k => k && !(touch && tl == null && (k == 'glow' || k == 'ripple')))
  let L = el._nsl
  if (!want.length) { if (L) { L.svg.remove(); lightIO.unobserve?.(el) } el._nsl = null; return }
  if (!L) {
    const id = 'nsmo' + ++uid, box = { maskUnits: 'userSpaceOnUse', x: -40, y: -40 }
    const lines = mk('g', {}, { fill: 'none', stroke: '#fff', 'stroke-width': 'var(--ns-mo-width,1.5px)' })
    const fills = mk('g', {}, { fill: '#fff', stroke: 'none' })
    const ml = mk('mask', { id: id + 'l', ...box }, { 'mask-type': 'alpha' }, lines)
    const mf = mk('mask', { id: id + 'f', ...box }, { 'mask-type': 'alpha' }, fills)
    const gg = mk('radialGradient', { id: id + 'g', gradientUnits: 'userSpaceOnUse', cx: -9e3, cy: -9e3, r: 240 }, {}, ...stops([0, .9], [1, 0]))
    // capas, de atrás hacia delante: luz de fondo, luz de bordes y trazo libre (aurora, puntos y
    // retícula van en CSS, en un ::before de cada pieza, por detrás del contenido)
    const bg = mk('g', { mask: `url(#${id}f)` }, { opacity: 'var(--ns-mo-fill,.07)' })
    const top = mk('g', { mask: `url(#${id}l)` }), tr = mk('g', { class: 'ns-mo-tr' }), st = mk('g', { class: 'ns-mo-st' })
    const svg = mk('svg', { class: 'ns-mo-fx', 'aria-hidden': 'true', focusable: 'false' }, {},
      mk('defs', {}, {}, ml, mf, gg,
        mk('linearGradient', { id: id + 'b', gradientUnits: 'objectBoundingBox', x1: 0, y1: 0, x2: 1, y2: .35 }, {}, ...stops([0, 0], [.47, 0], [.5, 1], [.53, 0], [1, 0])),
        mk('linearGradient', { id: id + 's', gradientUnits: 'objectBoundingBox', x1: 0, y1: 0, x2: 0, y2: 1 }, {}, ...stops([0, 0], [.46, 0], [.5, 1], [.54, 0], [1, 0])),
        mk('radialGradient', { id: id + 'r' }, {}, ...stops([0, 0], [.8, 0], [.93, 1], [1, 0])),
        // foco de la corriente: luz suave que se apaga hacia fuera
        mk('radialGradient', { id: id + 'p' }, {}, ...stops([0, .95], [.3, .45], [.65, .12], [1, 0])),
        // resplandor: la luz del borde es un núcleo nítido más un halo difuminado, no una línea plana
        mk('filter', { id: id + 'o', x: '-5%', y: '-5%', width: '110%', height: '110%' }, {},
          mk('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 3.5, result: 'b' }),
          mk('feMerge', {}, {}, mk('feMergeNode', { in: 'b' }), mk('feMergeNode', { in: 'b' }), mk('feMergeNode', { in: 'SourceGraphic' })))),
      bg, mk('g', { class: 'ns-mo-glow', filter: `url(#${id}o)` }, {}, top, tr, st))
    L = el._nsl = { id, svg, lines, fills, ml, mf, gg, top, bg, tr, st }
    el.append(svg)
    lightIO.observe(el)
  }
  // eventos (una vez por contenedor; leen la capa actual, que puede quitarse y volver): una onda
  // nace donde tocas y cruza toda la figura; la luz de fondo sigue al puntero
  if (!el._nse) {
    el._nse = 1
    el.addEventListener('pointerdown', e => {
      const L = el._nsl
      if (!L?.on.includes('ripple') || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const r = L.svg.getBoundingClientRect()
      ring(L, e.clientX - r.left, e.clientY - r.top, Math.hypot(L.W, L.H), 1100)
    })
    el.addEventListener('pointermove', e => {
      const L = el._nsl
      if (!L?.on.includes('glow')) return
      const r = L.svg.getBoundingClientRect()
      L.gg.setAttribute('cx', fx(e.clientX - r.left)); L.gg.setAttribute('cy', fx(e.clientY - r.top))
    }, { passive: true })
    el.addEventListener('pointerleave', () => { const L = el._nsl; L?.gg.setAttribute('cx', -9e3); L?.gg.setAttribute('cy', -9e3) })
  }
  L.on = want; L.W = W; L.H = H
  Object.assign(L.svg.style, { left: fx(pl) + 'px', top: fx(pt) + 'px', width: fx(W) + 'px', height: fx(H) + 'px' })
  L.svg.setAttribute('viewBox', `0 0 ${fx(W)} ${fx(H)}`)
  for (const m of [L.ml, L.mf]) { m.setAttribute('width', fx(W + 80)); m.setAttribute('height', fx(H + 80)) }
  // contornos: piezas y orbes (los orbes no se repiten en el trazo libre: ya los rodea su hueco)
  const ds = parts.map(p => [path(p.shape, p.w, p.h), `translate(${fx(p.ox)} ${fx(p.oy)})`])
  const os = holes.map(({ O, Ro, sh, Rb }) => sh ? [path(sh, 2 * Rb, 2 * Rb), `translate(${fx(O[0] - Rb)} ${fx(O[1] - Rb)})`] : [`M${fx(O[0] - Ro)} ${fx(O[1])}a${fx(Ro)} ${fx(Ro)} 0 1 0 ${fx(2 * Ro)} 0a${fx(Ro)} ${fx(Ro)} 0 1 0 ${fx(-2 * Ro)} 0Z`, ''])
  // misma figura y mismos efectos: nada que rehacer. Rehacer las capas reinicia sus animaciones, y
  // en el móvil cada vez que la barra del navegador aparece o se esconde llega un resize
  const key = [want, reduce, fx(W), fx(H), ...ds.flat(), ...os.flat()].join('|')
  if (L._k == key) return
  L._k = key
  const P = (list, a = {}) => list.map(([d, t]) => mk('path', t ? { d, transform: t, ...a } : { d, ...a }))
  L.lines.replaceChildren(...P([...ds, ...os])); L.fills.replaceChildren(...P([...ds, ...os]))
  // trazo libre: una luz corta recorre a la vez el contorno de cada pieza, al mismo ritmo
  L.tr.replaceChildren(...(want.includes('trace') && !reduce ? P(ds, { pathLength: 100 }) : []))
  // corriente: dos o tres luces que recorren la figura entera, por fuera y por los huecos del centro
  const SM = want.includes('stream') && !reduce && grid ? streams([...ds, ...os], Math.min(grid.gx, grid.gy), grid.speed, L.id, L.svg) : null
  L.st.replaceChildren(...(SM ? SM.lines : []))
  const has = k => want.includes(k), full = (a = {}) => mk('rect', { x: 0, y: 0, width: fx(W), height: fx(H), ...a })
  const C = holes[0]?.O || [W / 2, H / 2], S = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - C[0], y - C[1])))
  const layer = (g, fill) => {
    const kids = []
    // barrido: una banda de 2·W que se desplaza su propio ancho (de -W a +W): cruza toda la figura
    if (has('sweep') && !reduce) kids.push(mk('rect', { class: 'ns-mo-sw', x: fx(-W * .5), y: -40, width: fx(W * 2), height: fx(H + 80), fill: `url(#${L.id}b)` }))
    // escaneo: una línea horizontal que baja por toda la figura
    if (has('scan') && !reduce) kids.push(mk('rect', { class: 'ns-mo-sc', x: -40, y: fx(-H * .5), width: fx(W + 80), height: fx(H * 2), fill: `url(#${L.id}s)` }))
    // ondas: anillos ya a su tamaño final que crecen desde el primer orbe (scale 0 → 1)
    if (has('wave') && !reduce) for (const d of [0, .5]) kids.push(ringEl(L, C[0], C[1], S, { class: 'ns-mo-wv' }, { 'animation-delay': `calc(${d} * var(--ns-mo-time,4.5s))` }))
    // pulso: todos los bordes respiran juntos
    if (has('pulse') && !fill) kids.push(full({ class: 'ns-mo-pl', fill: LIGHT }))
    if (has('glow')) kids.push(full({ fill: `url(#${L.id}g)`, opacity: fill ? 1 : .8 }))
    // los focos de la corriente encienden los bordes (y, tenue, el fondo) por donde pasan
    if (SM) for (const s of SM.spots) kids.push(s(fill ? 70 : 110, fill ? .5 : 1))
    g.replaceChildren(...kids)
  }
  layer(L.top, 0); layer(L.bg, 1)
}

// ── corriente (stream): la luz corre por los bordes de las propias piezas y salta de una a otra ──
// Cada pieza (y el anillo de cada orbe) se muestrea por su contorno real. Donde dos piezas quedan
// a la distancia del hueco hay un relevo: la luz que recorre el borde de una cruza el hueco y sigue
// por el borde de la vecina, en el sentido que conserva su marcha, y así de pieza en pieza. Tres
// rutas que empiezan en piezas distintas y a destiempo; todas a --ns-mo-speed (px/s).
function streams(shapes, gap, speed, id, host) {
  // 1) contornos muestreados cada ~4 px, en coordenadas del mosaico
  const probe = mk('path')
  host.append(probe)
  const C = shapes.map(([d, t]) => {
    probe.setAttribute('d', d)
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(t || ''), ox = m ? +m[1] : 0, oy = m ? +m[2] : 0
    const L = probe.getTotalLength(), n = Math.max(12, Math.round(L / 4)), P = []
    for (let i = 0; i < n; i++) { const q = probe.getPointAtLength(i / n * L); P.push([q.x + ox, q.y + oy]) }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    return { P, L, box: [x0, y0, x1, y1] }
  })
  probe.remove()
  // 2) relevos: para cada par de piezas vecinas, el punto medio de su frontera en cada lado
  const reach = gap + 5, H = C.map(() => new Map()) // H[a]: índice de muestra → [pieza b, índice en b]
  for (let a = 0; a < C.length; a++) for (let b = a + 1; b < C.length; b++) {
    const A = C[a], B = C[b]
    if (A.box[0] > B.box[2] + reach || B.box[0] > A.box[2] + reach || A.box[1] > B.box[3] + reach || B.box[1] > A.box[3] + reach) continue
    const near = []
    A.P.forEach(([x, y], i) => {
      let best = 1e9, bj = -1
      B.P.forEach(([u, v], j) => { const d = (x - u) ** 2 + (y - v) ** 2; if (d < best) { best = d; bj = j } })
      if (best < reach * reach) near.push([i, bj])
    })
    if (near.length < 3) continue
    const [i, j] = near[near.length >> 1]
    H[a].set(i, [b, j]); H[b].set(j, [a, i])
  }
  // 3) rutas: por el borde de una pieza hasta un relevo, cruzar, seguir por la vecina…
  const step = (Q, i, dir) => (i + dir + Q.P.length) % Q.P.length
  const walk = (start, dir0) => {
    const pts = []
    let a = start, i = 0, dir = dir0, prev = -1, len = 0, since = 0, hops = 0, guard = 0
    const target = 2.2 * C.reduce((s, q) => s + q.L, 0) / Math.max(1, C.length) * 3
    while (len < target && hops < 9 && guard++ < 20000) {
      const Q = C[a], p = Q.P[i]
      if (pts.length) { const l = pts[pts.length - 1]; len += Math.hypot(p[0] - l[0], p[1] - l[1]) }
      pts.push(p)
      const h = H[a].get(i)
      if (h && h[0] != prev && since > 70) {
        // cruza el hueco y sigue en el sentido que conserva la marcha
        const [b, j] = h, B = C[b], t = [Q.P[step(Q, i, dir)][0] - p[0], Q.P[step(Q, i, dir)][1] - p[1]]
        const f = B.P[step(B, j, 1)], bd = (f[0] - B.P[j][0]) * t[0] + (f[1] - B.P[j][1]) * t[1] >= 0 ? 1 : -1
        prev = a; a = b; i = j; dir = bd; since = 0; hops++
        continue
      }
      since += Q.L / Q.P.length
      if (since > Q.L * 1.05) break // una vuelta entera sin relevo: fin de la ruta
      i = step(Q, i, dir)
    }
    return { pts, len }
  }
  const lines = [], spots = []
  // Una luz = varias capas de trazo que terminan en el mismo punto, cada vez más largas y tenues:
  // la cola se desvanece en degradado. Y un foco que viaja con la cabeza e ilumina los bordes de
  // las piezas por donde pasa (va en la capa de bordes, como la luz que sigue al puntero).
  const TAIL = [[210, .06], [150, .12], [96, .22], [58, .45], [28, 1]]
  const comet = ({ pts, len: L }, delay) => {
    if (pts.length < 3 || L < 80) return
    const d = 'M' + pts.map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L')
    const acc = [0]
    for (let k = 1; k < pts.length; k++) acc.push(acc[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]))
    const pt = f => {
      const s = f * acc[acc.length - 1]
      let lo = 0, hi = acc.length - 1
      while (hi - lo > 1) { const m = (lo + hi) >> 1; acc[m] <= s ? lo = m : hi = m }
      const k = (s - acc[lo]) / (acc[hi] - acc[lo] || 1)
      return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * k, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * k]
    }
    const dur = L / speed * 1000, u = 100 / L, ch = Math.min(40, 28 * u), opt = { duration: dur, iterations: Infinity, delay: delay * dur, easing: 'linear' }
    for (const [len, op] of TAIL) {
      // la estela termina donde termina la cabeza: se desplaza hacia atrás lo que mide de más
      const c = Math.min(60, len * u), sh = c - ch
      const e = mk('path', { d, pathLength: 100 }, { 'stroke-dasharray': `${fx(c)} 300`, opacity: op })
      // Web Animations (no var() dentro de @keyframes: en Safari no es fiable): la luz entra por un
      // extremo de la ruta y sale por el otro
      e.animate([{ strokeDashoffset: ch + sh }, { strokeDashoffset: -100 + sh }], opt)
      lines.push(e)
    }
    // el foco: la posición de la cabeza en cada instante del mismo ciclo
    spots.push((rad, op) => {
      const K = []
      for (let i = 0; i <= 96; i++) {
        const t = i / 96, f = ((100 + ch) * t - ch / 2) / 100
        const fade = Math.min(1, Math.max(0, Math.min(f, 1 - f) * 10))
        const [x, y] = pt(Math.min(1, Math.max(0, f)))
        K.push({ offset: t, transform: `translate(${fx(x)}px,${fx(y)}px)`, opacity: fade * op })
      }
      const e = mk('circle', { r: rad, cx: 0, cy: 0, fill: `url(#${id}p)` })
      e.animate(K, opt)
      return e
    })
  }
  // tres rutas desde piezas repartidas, en sentidos alternos y a destiempo
  const n = C.length, starts = [...new Set([0, Math.floor(n / 2), n - 1])]
  starts.forEach((s, k) => comet(walk(s, k % 2 ? -1 : 1), -k / starts.length))
  return { lines, spots }
}

// onda puntual (ripple): mismo anillo en bordes y fondo, con Web Animations (nada que limpiar en CSS)
const ringEl = (L, x, y, S, a = {}, st = {}) => mk('rect', { x: fx(x - S), y: fx(y - S), width: fx(2 * S), height: fx(2 * S), fill: `url(#${L.id}r)`, ...a }, { 'transform-origin': `${fx(x)}px ${fx(y)}px`, ...st })
function ring(L, x, y, S, dur) {
  for (const g of [L.top, L.bg]) {
    const r = ringEl(L, x, y, S)
    g.append(r)
    r.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.2,.6,.3,1)' }).onfinish = () => r.remove()
  }
}

// fuera de pantalla, las animaciones de la capa se pausan
const lightIO = typeof IntersectionObserver != 'undefined' && new IntersectionObserver(es => es.forEach(e => {
  const svg = e.target._nsl?.svg
  if (!svg) return
  svg.classList.toggle('ns-off', !e.isIntersecting)
  // las luces de la corriente son Web Animations: se pausan a mano (siguen donde iban al volver)
  for (const a of svg.getAnimations?.({ subtree: true }) || []) if (!a.animationName) e.isIntersecting ? a.play() : a.pause()
}))

const schedule = () => { raf ||= requestAnimationFrame(layout) }

function add(el) {
  if (M.has(el)) return
  // las fuentes web cambian lo que mide el texto: al cargar, se vuelve a elegir dónde cabe
  if (!styled) { styled = 1; inject(CSS); document.fonts?.ready.then(schedule) }
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
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ns-area', 'data-ns-mosaic', 'data-ns-mosaic-touch', 'data-ns-flow', 'class'] })
    // pasar de ratón a táctil (tabletas con teclado, modo escritorio) cambia la lista de efectos
    TOUCH.addEventListener?.('change', schedule)
    // las media queries cambian --ns-areas sin cambiar siempre el tamaño
    addEventListener('resize', schedule, { passive: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
