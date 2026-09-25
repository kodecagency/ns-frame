/*! ns-frame/liquid · formas líquidas: elementos cercanos se funden con un puente curvo, con borde vectorial nítido */
// <nav data-ns-liquid style="--ns-liquid: 14px; --ns-liquid-fill: #1c1c1f">
//   <button>…</button> <button>…</button> <button>…</button>     ← se ven como una sola gota
// </nav>
//
// El efecto "gooey" de la web es un filtro: desenfoque + contraste sobre píxeles. Borde borroso,
// caro de repintar, sin trazo y con problemas en Safari. Aquí es geometría: cada hijo es un
// rectángulo redondeado (con su border-radius real y su posición real, transformaciones incluidas),
// se calcula el campo de distancias de todos, se unen con un mínimo suave de radio --ns-liquid (las
// formas a menos de esa distancia se funden con un puente cóncavo, como dos gotas) y el contorno se
// traza con marching squares y se suaviza en curvas. Un <path> SVG detrás de los hijos.
// · --ns-liquid: hueco máximo (px) que se funde (14): más cerca, puente más grueso; más lejos, gotas
//   separadas. 0 = unión sin fundido.
// · --ns-liquid-fill / --ns-liquid-border / --ns-liquid-width: relleno y trazo del conjunto.
// · Los hijos no llevan fondo: el conjunto lo pinta. data-ns-blob marca cuáles cuentan (si no, todos).
// · Mientras algún hijo se anima (transiciones, Web Animations, hover), se redibuja cada frame; en
//   reposo no hace nada. Un grupo típico (una barra con 4–6 botones) cuesta < 1 ms por frame.
// · El resultado respeta prefers-reduced-motion (las transiciones de los hijos son tuyas) y en alto
//   contraste deja un trazo del sistema.
// Sin dependencias (salvo el núcleo) y CSP-safe: sólo CSSOM y atributos SVG.

import { styles } from './ns-frame.js'

const CSS = `@layer ns{
.ns-liquid{position:relative;isolation:isolate}
.ns-liquid-fx{position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none;overflow:visible}
.ns-liquid-fx path{fill:var(--ns-liquid-fill,currentColor);stroke:var(--ns-liquid-border,none);stroke-width:var(--ns-liquid-width,1.5px)}
@media (forced-colors:active){.ns-liquid-fx path{fill:Canvas;stroke:CanvasText}}
}`
const SVG = 'http://www.w3.org/2000/svg'
const r2 = n => Math.round(n * 100) / 100 || 0
let styled = 0

// distancia con signo a un rectángulo redondeado (centro cx, cy; semiejes hx, hy; radio r), con su
// gradiente (hacia fuera): G = [d, gx, gy]
const G = [0, 0, 0]
function sdBox(x, y, b) {
  const dx = x - b.cx, dy = y - b.cy, sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1
  const qx = Math.abs(dx) - b.hx + b.r, qy = Math.abs(dy) - b.hy + b.r
  if (qx > 0 || qy > 0) {
    const ux = Math.max(qx, 0), uy = Math.max(qy, 0), L = Math.hypot(ux, uy)
    G[0] = L - b.r; G[1] = ux / L * sx; G[2] = uy / L * sy
  } else if (qx > qy) { G[0] = qx - b.r; G[1] = sx; G[2] = 0 } else { G[0] = qy - b.r; G[1] = 0; G[2] = sy }
  return G
}
// unión suave que mira el ángulo: el mínimo suave de siempre (a menos de k, las distancias se
// mezclan y nace el puente) pero escalado por lo opuestos que son los dos gradientes. Entre dos
// formas separadas se miran de frente (puente completo); en un borde que comparten apuntan igual
// (nada que mezclar: no se "infla" donde dos formas se solapan alineadas).
function blendAt(x, y, B, k) {
  let [d, gx, gy] = sdBox(x, y, B[0])
  for (let n = 1; n < B.length; n++) {
    const [e, hx, hy] = sdBox(x, y, B[n])
    const w = (1 - (gx * hx + gy * hy)) / 2, kk = k * w
    const h = kk > 0 ? Math.max(kk - Math.abs(d - e), 0) / kk : 0
    const t = e < d ? 1 : 0
    d = Math.min(d, e) - h * h * kk / 4
    // gradiente de la mezcla: el de la más cercana, promediado dentro del puente
    const mx = t ? hx : gx, my = t ? hy : gy, ox = t ? gx : hx, oy = t ? gy : hy, s = h / 2
    gx = mx * (1 - s) + ox * s; gy = my * (1 - s) + oy * s
    const L = Math.hypot(gx, gy) || 1; gx /= L; gy /= L
  }
  return d
}

/**
 * Contorno fundido de un grupo de rectángulos redondeados ({ x, y, w, h, r }), con alcance `k` y
 * resolución `step` px. Devuelve el `d` de un path SVG (en las mismas coordenadas).
 */
export function blend(boxes, k = 14, step = 2) {
  const B = boxes.filter(b => b.w > 0 && b.h > 0).map(b => { const r = Math.min(b.r || 0, b.w / 2, b.h / 2); return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, hx: b.w / 2, hy: b.h / 2, r } })
  if (!B.length) return ''
  const m = k + step * 2
  const X0 = Math.min(...B.map(b => b.cx - b.hx)) - m, Y0 = Math.min(...B.map(b => b.cy - b.hy)) - m
  const nx = Math.ceil((Math.max(...B.map(b => b.cx + b.hx)) + m - X0) / step) + 1
  const ny = Math.ceil((Math.max(...B.map(b => b.cy + b.hy)) + m - Y0) / step) + 1
  // campo en los nodos de la rejilla
  const F = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    const y = Y0 + j * step
    for (let i = 0; i < nx; i++) {
      const x = X0 + i * step
      F[j * nx + i] = blendAt(x, y, B, k)
    }
  }
  // marching squares: cada arista cortada es un punto; cada celda une 1 o 2 pares de aristas
  const at = (i, j) => F[j * nx + i]
  const pt = new Map(), next = new Map()
  const edge = (i, j, h) => {
    const key = (j * nx + i) * 2 + h
    if (!pt.has(key)) {
      const a = at(i, j), b = h ? at(i + 1, j) : at(i, j + 1), t = a / (a - b)
      pt.set(key, h ? [X0 + (i + t) * step, Y0 + j * step] : [X0 + i * step, Y0 + (j + t) * step])
    }
    return key
  }
  // segmentos orientados (dentro a la izquierda), así se encadenan en un solo sentido
  const seg = (p, q) => next.set(p, q)
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1)
    const s = (a < 0 ? 8 : 0) | (b < 0 ? 4 : 0) | (c < 0 ? 2 : 0) | (d < 0 ? 1 : 0)
    if (!s || s == 15) continue
    const T = () => edge(i, j, 1), R = () => edge(i + 1, j, 0), Bo = () => edge(i, j + 1, 1), L = () => edge(i, j, 0)
    switch (s) {
      case 1: seg(Bo(), L()); break
      case 2: seg(R(), Bo()); break
      case 3: seg(R(), L()); break
      case 4: seg(T(), R()); break
      case 5: if ((a + b + c + d) / 4 < 0) { seg(T(), L()); seg(Bo(), R()) } else { seg(T(), R()); seg(Bo(), L()) } break
      case 6: seg(T(), Bo()); break
      case 7: seg(T(), L()); break
      case 8: seg(L(), T()); break
      case 9: seg(Bo(), T()); break
      case 10: if ((a + b + c + d) / 4 < 0) { seg(L(), Bo()); seg(R(), T()) } else { seg(L(), T()); seg(R(), Bo()) } break
      case 11: seg(R(), T()); break
      case 12: seg(L(), R()); break
      case 13: seg(Bo(), R()); break
      case 14: seg(L(), Bo()); break
    }
  }
  // encadenar en lazos cerrados; cada lazo, en curvas cuadráticas por los puntos medios: la curva
  // queda siempre dentro del polígono de control (nunca se pasa de largo junto a un lado recto) y
  // se desvía como mucho un cuarto del tramo más corto (≤ step/4 en las curvas)
  let d = ''
  const seen = new Set()
  for (const start of next.keys()) {
    if (seen.has(start)) continue
    const P = []
    for (let e = start; e != null && !seen.has(e); e = next.get(e)) { seen.add(e); P.push(pt.get(e)) }
    if (P.length < 3) continue
    const Q = simplify(P, .05), n = Q.length
    const mid = i => { const a = Q[i % n], b = Q[(i + 1) % n]; return `${r2((a[0] + b[0]) / 2)} ${r2((a[1] + b[1]) / 2)}` }
    d += 'M' + mid(0)
    for (let i = 1; i <= n; i++) d += `Q${r2(Q[i % n][0])} ${r2(Q[i % n][1])} ${mid(i)}`
    d += 'Z'
  }
  return d
}

// quita los puntos que se desvían menos de `eps` px de la recta entre sus vecinos (lados rectos)
function simplify(P, eps) {
  const out = []
  for (let i = 0; i < P.length; i++) {
    const a = out[out.length - 1] || P[P.length - 1], b = P[i], c = P[(i + 1) % P.length]
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1
    if (Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / L > eps) out.push(b)
  }
  return out.length > 2 ? out : P
}

const px = (v, L) => { v = String(v || '0').split(' ')[0]; return v.endsWith('%') ? parseFloat(v) * L / 100 : parseFloat(v) || 0 }

/**
 * Convierte `el` en un grupo líquido. Opciones: blobs (selector o función → elementos; por defecto
 * [data-ns-blob] o los hijos), k y step (si no, --ns-liquid y 2). Devuelve { update(), destroy() }.
 */
export function liquid(el, o = {}) {
  if (!styled) { styled = 1; styles(CSS) }
  el.classList.add('ns-liquid')
  const svg = document.createElementNS(SVG, 'svg'), path = document.createElementNS(SVG, 'path')
  svg.setAttribute('class', 'ns-liquid-fx'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false')
  svg.append(path)
  el.prepend(svg)
  const list = () => typeof o.blobs == 'function' ? o.blobs(el) : [...el.querySelectorAll(o.blobs || (el.querySelector(':scope > [data-ns-blob]') ? ':scope > [data-ns-blob]' : ':scope > :not(.ns-liquid-fx)'))]
  let raf = 0, idle = 0, last = ''
  const draw = () => {
    const E = el.getBoundingClientRect(), cs = getComputedStyle(el)
    const k = o.k ?? (parseFloat(cs.getPropertyValue('--ns-liquid')) >= 0 ? parseFloat(cs.getPropertyValue('--ns-liquid')) : 14)
    const ox = E.left + el.clientLeft, oy = E.top + el.clientTop
    const boxes = list().filter(b => b.getClientRects().length).map(b => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b)
      if (s.visibility == 'hidden' || +s.opacity == 0) return { w: 0, h: 0 }
      return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, r: px(s.borderTopLeftRadius, Math.min(r.width, r.height)) }
    })
    // --ns-liquid es el hueco máximo que se funde; el mínimo suave acerca como mucho k/4 por lado,
    // así que k = 2,4 × hueco deja un cuello visible justo en el límite
    const d = blend(boxes, k * 2.4, o.step || 2)
    if (d != last) { last = d; path.setAttribute('d', d) }
    return d
  }
  // bucle sólo mientras algo se mueve: dos frames sin cambios y sin animaciones → se detiene
  const tick = () => {
    raf = 0
    const before = last
    draw()
    const moving = el.getAnimations?.({ subtree: true }).some(a => a.playState == 'running')
    idle = last == before && !moving ? idle + 1 : 0
    if (idle < 2) raf = requestAnimationFrame(tick)
  }
  const wake = () => { idle = 0; raf ||= requestAnimationFrame(tick) }
  const ro = new ResizeObserver(wake)
  ro.observe(el)
  const EV = ['pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'focusin', 'focusout', 'transitionrun', 'animationstart']
  EV.forEach(e => el.addEventListener(e, wake, true))
  const mo = new MutationObserver(wake)
  mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
  wake()
  return {
    update: wake,
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); EV.forEach(e => el.removeEventListener(e, wake, true)); svg.remove(); el.classList.remove('ns-liquid') },
  }
}

if (typeof document != 'undefined') {
  const done = new WeakSet()
  const add = el => { if (!done.has(el)) { done.add(el); liquid(el) } }
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-liquid]') && add(n); n.querySelectorAll('[data-ns-liquid]').forEach(add) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(scan) }).observe(document.body, { childList: true, subtree: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
