/*! ns-frame/liquid · formas líquidas y vidrio líquido: elementos cercanos se funden, con borde vectorial nítido */
// <nav data-ns-liquid style="--ns-liquid: 14px; --ns-liquid-fill: #1c1c1f">
//   <button>…</button> <button>…</button> <button>…</button>     ← se ven como una sola gota
// </nav>
// <nav data-ns-liquid="glass">…</nav>                              ← y como vidrio líquido
//
// El efecto "gooey" de la web es un filtro: desenfoque + contraste sobre píxeles. Borde borroso,
// caro de repintar, sin trazo y con problemas en Safari. Aquí es geometría: cada hijo es un
// rectángulo redondeado (con su border-radius real y su posición real, transformaciones incluidas),
// se calcula el campo de distancias de todos, se unen con un mínimo suave que mira el ángulo (las
// formas cercanas se funden con un puente cóncavo; las que se solapan alineadas no se inflan) y el
// contorno se traza con marching squares y se suaviza en curvas.
// · --ns-liquid: hueco máximo (px) que se funde (14): más cerca, puente más grueso; más lejos, gotas
//   separadas. 0 = unión sin fundido.
// · --ns-liquid-fill / --ns-liquid-border / --ns-liquid-width: relleno y trazo del conjunto.
// · data-ns-liquid="glass": vidrio líquido, con las capas del material de Apple:
//   1. cuerpo: el fondo desenfocado, saturado y tintado dentro de la forma exacta;
//   2. lente (Chromium): el fondo se curva en el borde como a través de un cristal grueso. El mapa
//      de desplazamiento sale del mismo campo de distancias: cada punto cerca del borde toma el
//      fondo un poco más allá, en la dirección de la normal (feDisplacementMap en backdrop-filter);
//   3. canto: un anillo junto al borde con más brillo, saturación y contraste (en todos los
//      navegadores: es lo que da el grosor al vidrio donde no hay lente);
//   4. luz: un reflejo especular fino arriba, uno tenue abajo y un brillo interior.
//   Variables: --ns-glass-tint, --ns-glass-blur (4px), --ns-glass-sat (1.3), --ns-glass-lens
//   (fuerza de la lente en px, 34; 0 = sin lente), --ns-glass-depth (hasta dónde llega la lente
//   desde el borde, 24px), --ns-glass-edge (ancho del canto, 8px),
//   --ns-glass-shine (0–1). Con prefers-reduced-transparency se vuelve opaco (--ns-glass-solid).
//   La lente necesita img-src data: en la CSP (el mapa es una imagen generada en local).
// · Los hijos no llevan fondo: el conjunto lo pinta. data-ns-blob marca cuáles cuentan (si no, todos).
// · Mientras algún hijo se anima (transiciones, Web Animations, hover), se redibuja cada frame; en
//   reposo no hace nada.
// Sin dependencias (salvo el núcleo). Sólo CSSOM y atributos SVG (sin HTML en texto).

import { styles } from './ns-frame.js'

const CSS = `@layer ns{
.ns-liquid{position:relative}
.ns-liquid>:not(.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim){position:relative}
.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim{position:absolute;pointer-events:none;margin:0}
.ns-liquid-fx{overflow:visible}
.ns-liquid-fx .ns-lf{fill:var(--ns-liquid-fill,currentColor);stroke:var(--ns-liquid-border,none);stroke-width:var(--ns-liquid-width,1.5px)}
.ns-liquid-fx .ns-lr,.ns-liquid-glass,.ns-liquid-rim{display:none}
.ns-glass>.ns-liquid-glass{display:block;background:var(--ns-glass-tint,rgba(22,22,26,.22));-webkit-backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3));backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3))}
.ns-glass>.ns-liquid-rim{display:block;-webkit-backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06);backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06)}
.ns-glass>.ns-liquid-fx .ns-lf{stroke:none;opacity:var(--ns-glass-shine,1)}
.ns-glass>.ns-liquid-fx .ns-lr{display:inline;fill:none;stroke-width:1.2px;opacity:var(--ns-glass-shine,1)}
@media (prefers-reduced-transparency:reduce){.ns-glass>.ns-liquid-glass{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:var(--ns-glass-solid,#232327)}.ns-glass>.ns-liquid-rim{display:none}}
@media (forced-colors:active){.ns-liquid-fx .ns-lf{fill:Canvas;stroke:CanvasText}.ns-liquid-glass,.ns-liquid-rim{display:none!important}}
}`
const SVG = 'http://www.w3.org/2000/svg'
const r2 = n => Math.round(n * 100) / 100 || 0
let styled = 0
// la lente sólo donde backdrop-filter admite filtros SVG (Chromium); en WebKit y Gecko, el canto
const LENS = typeof navigator != 'undefined' && !!navigator.userAgentData?.brands?.some(b => b.brand == 'Chromium')

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
    // (la raíz ensancha el peso: el puente sale redondo, no en punta hacia la gota vecina; con
    // gradientes paralelos sigue siendo 0)
    const w = Math.sqrt(Math.max(0, (1 - (gx * hx + gy * hy)) / 2)), kk = k * w
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
 * Campo de distancias fundido de un grupo de rectángulos redondeados ({ x, y, w, h, r }), con
 * alcance `k`, en una rejilla de `step` px. { F, nx, ny, X0, Y0, step } (negativo = dentro).
 */
export function field(boxes, k = 14, step = 2) {
  const B = boxes.filter(b => b.w > 0 && b.h > 0).map(b => { const r = Math.min(b.r || 0, b.w / 2, b.h / 2); return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, hx: b.w / 2, hy: b.h / 2, r } })
  if (!B.length) return null
  const m = k + step * 2
  const X0 = Math.min(...B.map(b => b.cx - b.hx)) - m, Y0 = Math.min(...B.map(b => b.cy - b.hy)) - m
  const nx = Math.ceil((Math.max(...B.map(b => b.cx + b.hx)) + m - X0) / step) + 1
  const ny = Math.ceil((Math.max(...B.map(b => b.cy + b.hy)) + m - Y0) / step) + 1
  const F = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[j * nx + i] = blendAt(X0 + i * step, Y0 + j * step, B, k)
  return { F, nx, ny, X0, Y0, step }
}

/** Contorno (path `d`) del campo al nivel `level` (0 = el borde; −8 = 8 px hacia dentro). */
export function contour(f, level = 0) {
  if (!f) return ''
  const { F, nx, ny, X0, Y0, step } = f
  // marching squares: cada arista cortada es un punto; cada celda une 1 o 2 pares de aristas
  const at = (i, j) => F[j * nx + i] - level
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

/** Contorno fundido (path `d`) de rectángulos redondeados; `k` es el alcance interno del mínimo suave. */
export const blend = (boxes, k = 14, step = 2) => contour(field(boxes, k, step))

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

/**
 * Mapa de la lente: por cada nodo de la rejilla, hacia dónde y cuánto se desvía el fondo. Dentro
 * y a menos de `rim` px del borde, en la dirección de la normal (hacia fuera: el canto recoge lo que
 * hay más allá, como un cristal grueso), con una caída suave; en el centro y fuera, nada. Rojo = x,
 * verde = y, 128 = 0. Se pinta en un canvas del tamaño de la rejilla (el filtro lo estira).
 */
function lensMap(f, rim, cv) {
  const { F, nx, ny, step } = f
  cv.width = nx; cv.height = ny
  const x = cv.getContext('2d'), img = x.createImageData(nx, ny), D = img.data
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 4, v = F[j * nx + i]
    let gx = 0, gy = 0
    if (v < 0 && -v < rim) {
      gx = (F[j * nx + Math.min(nx - 1, i + 1)] - F[j * nx + Math.max(0, i - 1)]) / (2 * step)
      gy = (F[Math.min(ny - 1, j + 1) * nx + i] - F[Math.max(0, j - 1) * nx + i]) / (2 * step)
      const L = Math.hypot(gx, gy) || 1, t = (1 + v / rim) ** 2
      gx = gx / L * t; gy = gy / L * t
    }
    D[k] = 128 + gx * 127; D[k + 1] = 128 + gy * 127; D[k + 2] = 128; D[k + 3] = 255
  }
  x.putImageData(img, 0, 0)
  return cv.toDataURL()
}

// recorta una capa de vidrio a la forma: clip-path y, además, una máscara con la misma forma.
// Chromium no aplica un clip-path con forma libre al desenfoque de fondo si un antepasado recorta
// con esquinas redondeadas (overflow + border-radius, lo más común en tarjetas): pinta el
// rectángulo entero. La máscara sí se respeta. Es un SVG generado aquí (data:, img-src en la CSP).
// Con `soft` (px), la máscara es un canto que se desvanece hacia dentro: el trazo del contorno,
// desenfocado y recortado a la forma, sin línea interior.
function shape(e, d, w, h, soft) {
  e.style.clipPath = d ? `path("${d}")` : ''
  const body = soft
    ? `<defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${r2(soft / 2.2)}"/></filter><clipPath id="c"><path d="${d}"/></clipPath></defs><g clip-path="url(#c)"><path d="${d}" fill="none" stroke="#fff" stroke-width="${r2(soft * 1.6)}" filter="url(#b)"/></g>`
    : `<path d="${d}"/>`
  const m = d ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${r2(w)}" height="${r2(h)}">${body}</svg>`)}")` : ''
  e.style.maskImage = m; e.style.webkitMaskImage = m
  e.style.maskSize = e.style.webkitMaskSize = '100% 100%'
}

const px = (v, L) => { v = String(v || '0').split(' ')[0]; return v.endsWith('%') ? parseFloat(v) * L / 100 : parseFloat(v) || 0 }
let uid = 0
const mk = (tag, a = {}) => { const e = document.createElementNS(SVG, tag); for (const k in a) e.setAttribute(k, a[k]); return e }
const stops = (g, s) => { for (const [o, a] of s) g.append(mk('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': a })); return g }
const div = cls => { const e = document.createElement('div'); e.className = cls; e.setAttribute('aria-hidden', 'true'); return e }

/**
 * Convierte `el` en un grupo líquido. Opciones: blobs (selector o función → elementos; por defecto
 * [data-ns-blob] o los hijos), k y step (si no, --ns-liquid y 2), glass (si no, el atributo).
 * Devuelve { update(), destroy() }.
 */
export function liquid(el, o = {}) {
  if (!styled) { styled = 1; styles(CSS) }
  el.classList.add('ns-liquid')
  const glassy = () => o.glass ?? /(^|\s)glass(\s|$)/.test(el.getAttribute('data-ns-liquid') || '')
  const id = 'nslq' + ++uid
  const svg = mk('svg', { class: 'ns-liquid-fx', 'aria-hidden': 'true', focusable: 'false' })
  // luz del vidrio: reflejo especular (fuerte arriba, tenue abajo) y un brillo interior arriba
  const lens = mk('filter', { id: id + 'l', x: 0, y: 0, width: '100%', height: '100%', filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })
  const map = mk('feImage', { result: 'm', preserveAspectRatio: 'none' })
  const disp = mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' })
  const blur = mk('feGaussianBlur', { in: 'd', result: 'b' })
  const sat = mk('feColorMatrix', { in: 'b', type: 'saturate' })
  lens.append(map, disp, blur, sat)
  const defs = mk('defs')
  defs.append(
    stops(mk('linearGradient', { id: id + 'r', x1: 0, y1: 0, x2: .3, y2: 1 }), [[0, .85], [.2, .35], [.5, .06], [.8, .1], [1, .4]]),
    stops(mk('radialGradient', { id: id + 's', cx: .5, cy: -.15, r: .95 }), [[0, .22], [.55, .05], [1, 0]]),
    lens)
  const path = mk('path', { class: 'ns-lf' }), rim = mk('path', { class: 'ns-lr', stroke: `url(#${id}r)` })
  svg.append(defs, path, rim)
  const glass = div('ns-liquid-glass'), edge = div('ns-liquid-rim')
  // orden de pintado: cuerpo, canto, luz y encima los hijos (posicionados después en el DOM)
  el.prepend(glass, edge, svg)
  const cv = document.createElement('canvas')
  const list = () => typeof o.blobs == 'function' ? o.blobs(el) : [...el.querySelectorAll(o.blobs || (el.querySelector(':scope > [data-ns-blob]') ? ':scope > [data-ns-blob]' : ':scope > :not(.ns-liquid-fx, .ns-liquid-glass, .ns-liquid-rim)'))]
  let raf = 0, idle = 0, last = ''
  const draw = () => {
    const E = el.getBoundingClientRect(), cs = getComputedStyle(el)
    const num = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return v >= 0 ? v : d }
    const k = o.k ?? num('--ns-liquid', 14)
    const ox = E.left + el.clientLeft, oy = E.top + el.clientTop
    const boxes = list().filter(b => b.getClientRects().length).map(b => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b)
      if (s.visibility == 'hidden' || +s.opacity == 0) return { x: 0, y: 0, w: 0, h: 0 }
      return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, r: px(s.borderTopLeftRadius, Math.min(r.width, r.height)) }
    }).filter(b => b.w > 0 && b.h > 0)
    const g = glassy(), lensPx = g ? num('--ns-glass-lens', 34) : 0, edgePx = num('--ns-glass-edge', 8), depth = num('--ns-glass-depth', 24)
    // las capas cubren el contorno real y un margen (los hijos pueden salir del contenedor, y la
    // lente toma fondo un poco más allá del borde)
    const K = k * 2.4, m = K + 6 + lensPx / 2
    const bx = boxes.length ? Math.min(...boxes.map(b => b.x)) - m : 0, by = boxes.length ? Math.min(...boxes.map(b => b.y)) - m : 0
    const bw = boxes.length ? Math.max(...boxes.map(b => b.x + b.w)) + m - bx : 0, bh = boxes.length ? Math.max(...boxes.map(b => b.y + b.h)) + m - by : 0
    // --ns-liquid es el hueco máximo que se funde; el mínimo suave acerca como mucho k/4 por lado,
    // así que k = 2,4 × hueco deja un cuello visible justo en el límite
    const f = field(boxes.map(b => ({ ...b, x: b.x - bx, y: b.y - by })), K, o.step || 2), d = contour(f)
    const key = d + '|' + bx + '|' + by + '|' + g + '|' + lensPx + '|' + edgePx
    if (key == last) return
    last = key
    for (const e of [svg, glass, edge]) Object.assign(e.style, { left: r2(bx) + 'px', top: r2(by) + 'px', width: r2(bw) + 'px', height: r2(bh) + 'px' })
    svg.setAttribute('viewBox', `0 0 ${r2(bw)} ${r2(bh)}`)
    path.setAttribute('d', d); rim.setAttribute('d', d)
    el.classList.toggle('ns-glass', g)
    // (estilo en línea: el relleno de la capa en CSS ganaría a un atributo fill)
    path.style.fill = g ? `url(#${id}s)` : ''
    if (!g || !d) { for (const e of [glass, edge]) shape(e, ''); glass.style.backdropFilter = ''; return }
    shape(glass, d, bw, bh)
    // canto: más brillo junto al borde, que se desvanece hacia dentro (sin línea interior)
    shape(edge, d, bw, bh, edgePx)
    if (LENS && lensPx > 0) {
      map.setAttribute('href', lensMap(f, depth, cv))
      Object.entries({ x: f.X0, y: f.Y0, width: f.nx * f.step, height: f.ny * f.step }).forEach(([a, v]) => map.setAttribute(a, r2(v)))
      Object.entries({ width: r2(bw), height: r2(bh) }).forEach(([a, v]) => lens.setAttribute(a, v))
      disp.setAttribute('scale', lensPx)
      blur.setAttribute('stdDeviation', num('--ns-glass-blur', 4) / 2)
      sat.setAttribute('values', num('--ns-glass-sat', 1.3))
      glass.style.backdropFilter = `url(#${id}l)`
    } else glass.style.backdropFilter = ''
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
  // (sus propias capas no cuentan: cambiar su estilo no debe despertar otro frame)
  const own = n => n == svg || n == glass || n == edge || svg.contains(n)
  const mo = new MutationObserver(ms => { if (ms.some(m => !own(m.target))) wake() })
  mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-ns-liquid'] })
  wake()
  return {
    update: wake,
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); EV.forEach(e => el.removeEventListener(e, wake, true)); svg.remove(); glass.remove(); edge.remove(); el.classList.remove('ns-liquid', 'ns-glass') },
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
