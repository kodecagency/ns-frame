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
//   2. lente: el fondo se curva en el borde como a través de un cristal grueso. El mapa de
//      desplazamiento sale del mismo campo de distancias: cada punto cerca del borde toma el
//      fondo un poco más allá, en la dirección de la normal. En Chromium, feDisplacementMap en
//      backdrop-filter; en Safari y Firefox (que no admiten filtros SVG en backdrop-filter), sobre
//      una copia alineada del fondo si se indica cuál es: data-ns-liquid-src="selector" (una
//      imagen o un elemento con background-image; el más cercano subiendo por los antepasados);
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
:where(.ns-liquid>:not(.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src)){position:relative}
.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{position:absolute;pointer-events:none;margin:0}
.ns-liquid-src{overflow:hidden}.ns-liquid-src>div{position:absolute}
.ns-liquid-fx{overflow:visible}
.ns-liquid-fx .ns-lf{fill:var(--ns-liquid-fill,currentColor);stroke:var(--ns-liquid-border,none);stroke-width:var(--ns-liquid-width,1.5px)}
.ns-liquid-fx .ns-lr,.ns-liquid-fx .ns-lr2,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{display:none}
.ns-glass>.ns-liquid-src:not([hidden]){display:block}
.ns-glass>.ns-liquid-glass{display:block;background:var(--ns-glass-tint,rgba(22,22,26,.22));-webkit-backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3));backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3))}
.ns-glass>.ns-liquid-rim{display:block;-webkit-backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06);backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06)}
.ns-glass>.ns-liquid-fx .ns-lf{stroke:none;opacity:var(--ns-glass-shine,1)}
.ns-liquid-fx .ns-lg{fill:none}
.ns-glass>.ns-liquid-fx .ns-lr{display:inline;fill:none;stroke-width:1.2px;opacity:var(--ns-glass-shine,1)}
.ns-glass>.ns-liquid-fx .ns-lr2{display:inline;fill:none;stroke-width:.8px;opacity:calc(var(--ns-glass-shine,1)*.5)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.ns-glass>.ns-liquid-glass{background:var(--ns-glass-solid,rgba(30,30,34,.92))}}
@media (prefers-reduced-transparency:reduce){.ns-glass>.ns-liquid-glass{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:var(--ns-glass-solid,#232327)}.ns-glass>.ns-liquid-rim,.ns-glass>.ns-liquid-src{display:none!important}}
@media (forced-colors:active){.ns-liquid-fx .ns-lf{fill:Canvas;stroke:CanvasText}.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{display:none!important}}
}`
const SVG = 'http://www.w3.org/2000/svg'
const r2 = n => Math.round(n * 100) / 100 || 0
let styled = 0
// lente en backdrop-filter sólo donde admite filtros SVG (Chromium); en los demás, sobre la copia
const LENS = typeof navigator != 'undefined' && !!navigator.userAgentData?.brands?.some(b => b.brand == 'Chromium')
// WebKit (Safari y todos los navegadores de iPhone)
const WK = !LENS && typeof navigator != 'undefined' && /AppleWebKit/.test(navigator.userAgent)
// -moz-element(): Firefox pinta cualquier elemento, en vivo, como imagen de fondo
const MOZ = !!globalThis.CSS?.supports?.('background-image', '-moz-element(#a)')
const FIT = { cover: 'cover', contain: 'contain', fill: '100% 100%', none: 'auto', 'scale-down': 'contain' }
const CAP = 1500, SKIP = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|EMBED|DIALOG)$/
// lo que hay detrás del centro de `el` sin indicarlo: subiendo por los antepasados, un hermano
// anterior (pinta debajo) que sea o contenga una imagen, un vídeo o un canvas que cubra ese punto,
// o el primer antepasado con background-image
// Sólo si es de verdad lo que se ve en ese punto (lo primero bajo el grupo): si hay algo en medio
// (un texto sobre la foto), la copia lo taparía, y es mejor quedarse sin lente. Si el grupo no está
// a la vista todavía, se vuelve a mirar cuando entre.
// ¿pinta algo? (un contenedor transparente, como el hueco de otro grupo líquido, no tapa nada)
const paints = n => {
  if (/^(IMG|VIDEO|CANVAS|svg|INPUT|TEXTAREA|SELECT|IFRAME)$/.test(n.tagName)) return true
  const s = getComputedStyle(n)
  if (s.visibility == 'hidden' || +s.opacity == 0) return false
  return s.backgroundImage != 'none' || !/^(transparent|rgba\(.*,\s*0\))$/.test(s.backgroundColor) || parseFloat(s.borderTopWidth) > 0 || s.boxShadow != 'none' ||
    [...n.childNodes].some(t => t.nodeType == 3 && t.data.trim())
}
function behind(el) {
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
  if (!r.width || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null
  // debajo del grupo (lo que va antes en la lista está encima) y sin contar sus antepasados: su
  // fondo pinta por debajo de todos sus hijos, así que nunca queda en medio
  const L = document.elementsFromPoint(x, y), i = Math.max(0, L.findIndex(n => el.contains(n)))
  // (si el grupo no recibe el puntero no sale en la lista: lo que va después en el DOM y no es su
  // antepasado se pinta encima, así que tampoco cuenta)
  const first = L.slice(i).find(n => !el.contains(n) && !n.contains(el) && !(el.compareDocumentPosition(n) & 4) && !n.closest('.ns-liquid-src') && paints(n))
  const covers = n => { const b = n.getBoundingClientRect(); return b.width > 0 && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom }
  for (let c = el, a = el.parentElement; a && a != document.documentElement; c = a, a = a.parentElement) {
    for (let s = c.previousElementSibling; s; s = s.previousElementSibling) {
      const m = [s, ...s.querySelectorAll('img,video,canvas')].reverse().find(n => /^(IMG|VIDEO|CANVAS)$/.test(n.tagName) && covers(n))
      if (m) return m == first ? m : null
      // un fondo pintado (un degradado, una capa decorativa con texto): lo que se ve es él o algo suyo
      if (covers(s) && getComputedStyle(s).backgroundImage != 'none') return first && (first == s || s.contains(first)) ? s : null
    }
    if (getComputedStyle(a).backgroundImage != 'none') return first && a.contains(first) ? null : a
  }
  return null
}
// máscara del canto como imagen: el trazo del contorno, desenfocado y recortado a la forma
const rimImage = (d, w, h, e) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${SVG}" width="${r2(w)}" height="${r2(h)}"><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${r2(e / 2.2)}"/></filter><clipPath id="c"><path d="${d}"/></clipPath><g clip-path="url(#c)"><path d="${d}" fill="none" stroke="#fff" stroke-width="${r2(e * 1.6)}" filter="url(#b)"/></g></svg>`)}")`

// distancia con signo a un rectángulo redondeado (centro cx, cy; semiejes hx, hy; radio r), con su
// gradiente (hacia fuera): G = [d, gx, gy]
const G = [0, 0, 0]
function sdBox(x, y, b) {
  const dx = x - b.cx, dy = y - b.cy, sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1
  const qx = Math.abs(dx) - b.hx + b.r, qy = Math.abs(dy) - b.hy + b.r
  if (qx > 0 || qy > 0) {
    const ux = Math.max(qx, 0), uy = Math.max(qy, 0), L = Math.sqrt(ux * ux + uy * uy)
    G[0] = L - b.r; G[1] = ux / L * sx; G[2] = uy / L * sy
  } else if (qx > qy) { G[0] = qx - b.r; G[1] = sx; G[2] = 0 } else { G[0] = qy - b.r; G[1] = 0; G[2] = sy }
  return G
}
// unión suave que mira el ángulo: el mínimo suave de siempre (a menos de k, las distancias se
// mezclan y nace el puente) pero escalado por lo opuestos que son los dos gradientes. Entre dos
// formas separadas se miran de frente (puente completo); en un borde que comparten apuntan igual
// (nada que mezclar: no se "infla" donde dos formas se solapan alineadas).
// (sin desestructurar el resultado de sdBox: en el bucle más caliente, crear un iterador por
// llamada costaba más que el propio cálculo)
function blendAt(x, y, B, k) {
  sdBox(x, y, B[0])
  let d = G[0], gx = G[1], gy = G[2]
  for (let n = 1; n < B.length; n++) {
    sdBox(x, y, B[n])
    const e = G[0], hx = G[1], hy = G[2]
    // (la raíz ensancha el peso: el puente sale redondo, no en punta hacia la gota vecina; con
    // gradientes paralelos sigue siendo 0)
    const w = Math.sqrt(Math.max(0, (1 - (gx * hx + gy * hy)) / 2)), kk = k * w
    const h = kk > 0 ? Math.max(kk - Math.abs(d - e), 0) / kk : 0
    const t = e < d ? 1 : 0
    d = Math.min(d, e) - h * h * kk / 4
    // gradiente de la mezcla: el de la más cercana, promediado dentro del puente
    const mx = t ? hx : gx, my = t ? hy : gy, ox = t ? gx : hx, oy = t ? gy : hy, s = h / 2
    gx = mx * (1 - s) + ox * s; gy = my * (1 - s) + oy * s
    const L = Math.sqrt(gx * gx + gy * gy) || 1; gx /= L; gy /= L
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
  const m = k + step * 2, n = B.length
  const X0 = Math.min(...B.map(b => b.cx - b.hx)) - m, Y0 = Math.min(...B.map(b => b.cy - b.hy)) - m
  const nx = Math.ceil((Math.max(...B.map(b => b.cx + b.hx)) + m - X0) / step) + 1
  const ny = Math.ceil((Math.max(...B.map(b => b.cy + b.hy)) + m - Y0) / step) + 1
  const F = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    const y = Y0 + j * step
    for (let i = 0; i < nx; i++) {
      const x = X0 + i * step
      // vía rápida: si la forma más cercana gana por más del alcance del puente, no hay nada que
      // mezclar y basta el mínimo (sin gradientes ni raíces extra). Sólo cerca de un puente se
      // hace la unión suave completa
      let d1 = 1e9, d2 = 1e9
      for (let q = 0; q < n; q++) {
        const b = B[q], qx = Math.abs(x - b.cx) - b.hx + b.r, qy = Math.abs(y - b.cy) - b.hy + b.r
        const v = qx > 0 || qy > 0 ? Math.sqrt((qx > 0 ? qx * qx : 0) + (qy > 0 ? qy * qy : 0)) - b.r : Math.max(qx, qy) - b.r
        if (v < d1) { d2 = d1; d1 = v } else if (v < d2) d2 = v
      }
      F[j * nx + i] = d2 - d1 >= k ? d1 : blendAt(x, y, B, k)
    }
  }
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
  // encadenar en lazos cerrados; cada lazo, en curvas que PASAN por los puntos del contorno
  // (Catmull-Rom convertida a Bézier cúbicas): un círculo sale redondo de verdad, sin el achatado de
  // las curvas por puntos medios. Los lados rectos largos van en línea, y las curvas que llegan a
  // ellos salen tangentes a la recta (sin codos ni barrigas junto a un lado recto)
  let d = ''
  const seen = new Set(), far = step * 2.5
  for (const start of next.keys()) {
    if (seen.has(start)) continue
    const P = []
    for (let e = start; e != null && !seen.has(e); e = next.get(e)) { seen.add(e); P.push(pt.get(e)) }
    if (P.length < 3) continue
    const Q = simplify(P, .05, step * .3), n = Q.length
    if (n < 3) continue
    const at = i => Q[(i + n) % n]
    const len = i => { const a = at(i), b = at(i + 1); return Math.hypot(b[0] - a[0], b[1] - a[1]) }
    const long = i => len(i) > far
    // tangente en el punto i (por tramo): junto a un lado recto, la de la recta
    const tan = i => {
      const a = at(i - 1), b = at(i), c = at(i + 1)
      if (long(i - 1) || long(i)) {
        const [p, q] = long(i - 1) ? [a, b] : [b, c], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, s = long(i - 1) ? len(i) : len(i - 1)
        return [(q[0] - p[0]) / L * s, (q[1] - p[1]) / L * s]
      }
      return [(c[0] - a[0]) / 2, (c[1] - a[1]) / 2]
    }
    const T = Q.map((_, i) => tan(i))
    d += `M${r2(Q[0][0])} ${r2(Q[0][1])}`
    for (let i = 0; i < n; i++) {
      const a = Q[i], b = at(i + 1), ta = T[i], tb = T[(i + 1) % n]
      d += long(i) ? `L${r2(b[0])} ${r2(b[1])}` : `C${r2(a[0] + ta[0] / 3)} ${r2(a[1] + ta[1] / 3)} ${r2(b[0] - tb[0] / 3)} ${r2(b[1] - tb[1] / 3)} ${r2(b[0])} ${r2(b[1])}`
    }
    d += 'Z'
  }
  return d
}

/** Contorno fundido (path `d`) de rectángulos redondeados; `k` es el alcance interno del mínimo suave. */
export const blend = (boxes, k = 14, step = 2) => contour(field(boxes, k, step))

// Campo de distancias de CUALQUIER forma (un path: chaflanes, muescas, curvas, cortes): se rellena el
// path en un canvas a la resolución de la rejilla y se calcula la distancia euclídea exacta a lo de
// fuera (para los puntos de dentro) y a lo de dentro (para los de fuera), con la transformada de
// Felzenszwalb (lineal: dos pasadas 1D). En el borde, la cobertura del antialiasing afina a
// fracciones de píxel. Mismo formato que field(): lo usan la lente, el canto y los reflejos.
const BIG = 1e20
// (envolvente inferior de parábolas: v = vértices, z = fronteras entre ellas)
function edt1(f, n, o, v, z) {
  let k = 0
  const cut = (q, p) => (f[q] + q * q - f[p] - p * p) / (2 * (q - p))
  v[0] = 0; z[0] = -BIG; z[1] = BIG
  for (let q = 1; q < n; q++) {
    let s = cut(q, v[k])
    while (s <= z[k]) s = cut(q, v[--k])
    v[++k] = q; z[k] = s; z[k + 1] = BIG
  }
  for (let q = 0, j = 0; q < n; q++) { while (z[j + 1] < q) j++; const p = v[j]; o[q] = (q - p) * (q - p) + f[p] }
}
function edt(g, nx, ny) {
  const m = Math.max(nx, ny), f = new Float64Array(m), o = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1)
  for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) f[j] = g[j * nx + i]; edt1(f, ny, o, v, z); for (let j = 0; j < ny; j++) g[j * nx + i] = o[j] }
  for (let j = 0; j < ny; j++) { for (let i = 0; i < nx; i++) f[i] = g[j * nx + i]; edt1(f, nx, o, v, z); for (let i = 0; i < nx; i++) g[j * nx + i] = Math.sqrt(o[i]) }
}
let pcv = null
/** Campo de distancias (negativo = dentro) de un path `d` en una caja w×h, rejilla de `step` px. */
export function pathField(d, w, h, step = 1) {
  if (!d || typeof Path2D == 'undefined') return null
  const nx = Math.ceil(w / step) + 1, ny = Math.ceil(h / step) + 1
  pcv ||= document.createElement('canvas')
  pcv.width = nx; pcv.height = ny
  const x = pcv.getContext('2d', { willReadFrequently: true })
  // cada píxel del canvas es un nodo de la rejilla: su centro cae en (i·step, j·step)
  x.setTransform(1 / step, 0, 0, 1 / step, .5, .5)
  x.fill(new Path2D(d))
  const A = x.getImageData(0, 0, nx, ny).data, n = nx * ny, In = new Float64Array(n), Out = new Float64Array(n), F = new Float32Array(n)
  for (let k = 0; k < n; k++) { const a = A[k * 4 + 3]; In[k] = a >= 128 ? 0 : BIG; Out[k] = a >= 128 ? BIG : 0 }
  edt(In, nx, ny); edt(Out, nx, ny)
  for (let k = 0; k < n; k++) {
    const a = A[k * 4 + 3] / 255
    // en el borde (cobertura parcial), la fracción cubierta da la distancia con precisión subpíxel
    F[k] = (a > 0 && a < 1 ? .5 - a : a >= .5 ? .5 - Out[k] : In[k] - .5) * step
  }
  return { F, nx, ny, X0: 0, Y0: 0, step }
}
/** Desplaza un path `d` absoluto (M, L, C, A, Q, Z, como los de ns-frame) en (dx, dy). */
export function shift(d, dx, dy) {
  const t = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || []
  let out = '', c = '', i = 0
  const n = () => +t[i++]
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) { c = t[i++]; out += c; if (c == 'Z' || c == 'z') continue }
    if (c == 'A') { const a = [n(), n(), n(), n(), n()], x = n() + dx, y = n() + dy; out += `${a.join(' ')} ${r2(x)} ${r2(y)} ` }
    else { const k = c == 'C' ? 3 : c == 'Q' ? 2 : 1; for (let j = 0; j < k; j++) out += `${r2(n() + dx)} ${r2(n() + dy)} ` }
  }
  return out.trim()
}

// quita los puntos que se desvían menos de `eps` px de la recta entre sus vecinos (lados rectos) y
// los que quedan a menos de `near` px del anterior (cuando el contorno roza un nodo de la rejilla
// salen dos puntos casi iguales, y una curva que pasa por los dos haría una ondulación)
function simplify(P, eps, near = 0) {
  const out = []
  for (let i = 0; i < P.length; i++) {
    const a = out[out.length - 1] || P[P.length - 1], b = P[i], c = P[(i + 1) % P.length]
    if (near && out.length && Math.hypot(b[0] - a[0], b[1] - a[1]) < near) continue
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
function lensMap(f, rim, cv, full) {
  const { F, nx, ny, step } = f
  cv.width = nx; cv.height = ny
  // willReadFrequently: canvas en CPU. Uno acelerado por GPU obliga a leerlo de vuelta para
  // codificar el PNG, y eso era lo más caro al detenerse la forma
  const x = cv.getContext('2d', { willReadFrequently: true }), img = x.createImageData(nx, ny), D = img.data
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
  // `full` ({ cv, w, h }): el mapa a tamaño de la capa, neutro fuera de la rejilla y estirado con
  // suavizado. Es el que usa filter: url() fuera de Chromium: WebKit sólo coloca bien un feImage
  // sin posición ni tamaño (a su tamaño propio, en el origen de la región del objeto)
  let out = cv
  if (full) {
    out = full.cv
    out.width = Math.max(1, Math.round(full.w)); out.height = Math.max(1, Math.round(full.h))
    const y = out.getContext('2d')
    y.fillStyle = 'rgb(128,128,128)'; y.fillRect(0, 0, out.width, out.height)
    y.drawImage(cv, f.X0, f.Y0, nx * step, ny * step)
  }
  // toBlob codifica el PNG fuera del hilo principal (toDataURL lo bloqueaba al detenerse la forma)
  return new Promise(res => out.toBlob(b => {
    if (!b) return res(out.toDataURL())
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.readAsDataURL(b)
  }))
}

const px = (v, L) => { v = String(v || '0').split(' ')[0]; return v.endsWith('%') ? parseFloat(v) * L / 100 : parseFloat(v) || 0 }
let uid = 0
const REG = new WeakMap(), BUDGET = { t: -1, used: 0 }
// firma de lo que pinta una imagen o un fondo: si no cambia, la copia no se rehace
const sig = n => { const s = getComputedStyle(n); return n.tagName == 'IMG' ? [n.currentSrc || n.src, s.objectFit, s.objectPosition, s.filter].join('|') : [s.backgroundImage, s.backgroundSize, s.backgroundPosition, s.backgroundColor, s.filter].join('|') }
const mk = (tag, a = {}) => { const e = document.createElementNS(SVG, tag); for (const k in a) e.setAttribute(k, a[k]); return e }
const stops = (g, s) => { for (const [o, a] of s) g.append(mk('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': a })); return g }
const div = cls => { const e = document.createElement('div'); e.className = cls; e.setAttribute('aria-hidden', 'true'); return e }
const setA = (e, a) => { for (const k in a) e.setAttribute(k, a[k]) }

/**
 * Convierte `el` en un grupo líquido. Opciones: blobs (selector o función → elementos; por defecto
 * [data-ns-blob] o los hijos), k y step (si no, --ns-liquid y 2), glass (si no, el atributo),
 * source (elemento o selector del fondo para la lente fuera de Chromium; si no, data-ns-liquid-src).
 * Devuelve { update(), destroy() }.
 */
export function liquid(el, o = {}) {
  // (una sola instancia por elemento: el arranque automático y quien la cree a mano la comparten)
  if (REG.has(el)) return REG.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  el.classList.add('ns-liquid')
  const glassy = () => o.glass ?? /(^|\s)glass(\s|$)/.test(el.getAttribute('data-ns-liquid') || '')
  const id = 'nslq' + ++uid
  const svg = mk('svg', { class: 'ns-liquid-fx', 'aria-hidden': 'true', focusable: 'false' })
  // Recorte del vidrio: una máscara SVG de este documento (mask: url(#…)). Se actualiza cambiando
  // un <path>, en el mismo frame, sin imágenes que decodificar. (Chromium no aplica un clip-path
  // libre al desenfoque de fondo si un antepasado recorta con esquinas redondeadas: pinta el
  // rectángulo entero. La máscara sí se respeta.) El canto es otra máscara: el trazo del contorno,
  // desenfocado y recortado a la forma, que se desvanece hacia dentro sin línea interior.
  const mBody = mk('path', { fill: '#fff' }), mEdge = mk('path', { fill: 'none', stroke: '#fff', filter: `url(#${id}eb)` }), cEdge = mk('path')
  const maskB = mk('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: 0, y: 0 }), maskE = mk('mask', { id: id + 'e', maskUnits: 'userSpaceOnUse', x: 0, y: 0 })
  maskB.append(mBody)
  const gE = mk('g', { 'clip-path': `url(#${id}c)` }); gE.append(mEdge); maskE.append(gE)
  const clipE = mk('clipPath', { id: id + 'c' }); clipE.append(cEdge)
  const eBlur = mk('feGaussianBlur'), fEdge = mk('filter', { id: id + 'eb', x: '-20%', y: '-20%', width: '140%', height: '140%' }); fEdge.append(eBlur)
  // Lente (Chromium): dos filtros que se turnan. El mapa nuevo se carga en el que no está en uso y
  // sólo se cambia de filtro cuando ya está decodificado: nunca hay un frame sin mapa (el filtro lo
  // leería transparente, rojo y verde a 0, y desplazaría todo el fondo en diagonal). Mientras la
  // forma se mueve, el mapa vigente se estira con ella; al detenerse se regenera.
  // Cadena del filtro: mapa → desplazamiento → desenfoque → saturación. Con prisma (dispersión
  // cromática, como un cristal real en el canto), tres desplazamientos: el rojo un poco más y el azul
  // un poco menos que el verde, cada uno se queda con su canal y se suman. Sólo se monta si se pide.
  const chain = (L, prism) => {
    if (L.prism === prism) return
    L.prism = prism
    const D = (s, k) => mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', xChannelSelector: 'R', yChannelSelector: 'G', result: s, 'data-k': k })
    if (!prism) { L.disp = [D('d', 1)]; L.f.replaceChildren(L.map, ...L.disp, L.blur, L.sat); return }
    // (cada uno conserva su canal con alfa 1; la suma aritmética recorta el alfa a 1 y el color queda entero)
    const keep = (i, s) => mk('feColorMatrix', { in: s, result: s + 'c', type: 'matrix', values: [0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => +(r == i && c == i)).join(' ')).join(' ') + ' 0 0 0 1 0' })
    L.disp = [D('r', 1.12), D('g', 1), D('b', .88)]
    const add = (a, b, s) => mk('feComposite', { in: a, in2: b, operator: 'arithmetic', k2: 1, k3: 1, result: s })
    L.f.replaceChildren(L.map, ...L.disp, keep(0, 'r'), keep(1, 'g'), keep(2, 'b'), add('rc', 'gc', 'rg'), add('rg', 'bc', 'd'), L.blur, L.sat)
  }
  const lenses = [0, 1].map(n => {
    // (fuera de Chromium, región del objeto: WebKit pierde el elemento entero con userSpaceOnUse)
    const f = mk('filter', LENS ? { id: id + 'l' + n, x: 0, y: 0, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' } : { id: id + 'l' + n, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' })
    const map = mk('feImage', { result: 'm', preserveAspectRatio: 'none' })
    const blur = mk('feGaussianBlur', { in: 'd', result: 'b' }), sat = mk('feColorMatrix', { in: 'b', type: 'saturate' })
    const L = { f, map, blur, sat, disp: [], prism: null }
    chain(L, false)
    return L
  })
  const defs = mk('defs')
  defs.append(
    // luz del vidrio: reflejo especular (fuerte arriba, tenue abajo) y un brillo interior arriba
    stops(mk('linearGradient', { id: id + 'r', x1: 0, y1: 0, x2: .3, y2: 1 }), [[0, .85], [.2, .35], [.5, .06], [.8, .1], [1, .4]]),
    stops(mk('radialGradient', { id: id + 's', cx: .5, cy: -.15, r: .95 }), [[0, .22], [.55, .05], [1, 0]]),
    // segundo reflejo, por dentro y al revés: la luz que vuelve por el otro lado del cristal
    stops(mk('linearGradient', { id: id + 'q', x1: 1, y1: 1, x2: .6, y2: 0 }), [[0, .7], [.3, .18], [.6, 0], [1, 0]]),
    maskB, maskE, clipE, fEdge, ...lenses.map(l => l.f))
  const path = mk('path', { class: 'ns-lf' }), rim = mk('path', { class: 'ns-lr', stroke: `url(#${id}r)` }), rim2 = mk('path', { class: 'ns-lr2', stroke: `url(#${id}q)` })
  // Halo (--ns-glass-glow): un trazo desenfocado del contorno que sólo se ve por fuera (una máscara
  // quita el interior). Sin filter en el elemento, que haría de raíz del fondo y apagaría el vidrio
  const gBlur = mk('feGaussianBlur'), fGlow = mk('filter', { id: id + 'g', x: '-50%', y: '-50%', width: '200%', height: '200%' }); fGlow.append(gBlur)
  const oRect = mk('rect', { fill: '#fff' }), oCut = mk('path', { fill: '#000' }), mGlow = mk('mask', { id: id + 'o', maskUnits: 'userSpaceOnUse' }); mGlow.append(oRect, oCut)
  defs.append(fGlow, mGlow)
  const glow = mk('path', { class: 'ns-lg', filter: `url(#${id}g)`, mask: `url(#${id}o)` })
  svg.append(defs, glow, path, rim, rim2)
  const glass = div('ns-liquid-glass'), edge = div('ns-liquid-rim')
  // Lente donde backdrop-filter no admite filtros SVG (Safari, Firefox): si se indica qué hay
  // detrás (data-ns-liquid-src="selector" u o.source: una imagen o un elemento con background-image),
  // se pinta una copia alineada debajo del vidrio y la lente se le aplica con filter: url(), que sí
  // funciona en todos. El cuerpo del vidrio la desenfoca y la tiñe encima, como al fondo real.
  const back = div('ns-liquid-src'), copy = document.createElement('div')
  back.append(copy); back.hidden = true
  // orden de pintado: copia del fondo, cuerpo, canto, luz y encima los hijos
  el.prepend(back, glass, edge, svg)
  const cv = document.createElement('canvas')
  let cv2 = null
  const list = () => typeof o.blobs == 'function' ? o.blobs(el) : [...el.querySelectorAll(o.blobs || (el.querySelector(':scope > [data-ns-blob]') ? ':scope > [data-ns-blob]' : ':scope > :not(.ns-liquid-fx, .ns-liquid-glass, .ns-liquid-rim, .ns-liquid-src)'))]
  // el fondo que se copia: el selector de data-ns-liquid-src (el más cercano subiendo por los
  // antepasados), o.source, o si no se indica nada, lo que haya detrás (behind)
  const source = () => {
    const s = o.source ?? el.getAttribute('data-ns-liquid-src')
    if (s == 'none') return null
    if (!s || s == 'auto') return behind(el)
    if (typeof s != 'string') return s
    for (let a = el.parentElement; a; a = a.parentElement) { const n = a.querySelector(s); if (n) return n }
    return null
  }
  // La copia pinta lo mismo que el original, con su filtro (brillo, etc.):
  // · imagen: como fondo, con su object-fit y object-position;
  // · vídeo o canvas: un canvas que se redibuja con cada fotograma mientras el grupo se ve;
  // · elemento sin hijos: sus propiedades de fondo;
  // · elemento con contenido (texto, tarjetas, una lista que se desplaza por detrás): en Firefox,
  //   -moz-element(), el elemento en vivo; en Safari, un clon del DOM con los estilos calculados en
  //   línea, que se rehace cuando el original cambia (hasta CAP nodos; más, sólo el desenfoque).
  let mirrored = null, kind = '', live = 0, vis = true, cc = null, smo = null, redo = 0
  const unmirror = () => { cancelAnimationFrame(live); live = 0; smo?.disconnect(); smo = null; clearTimeout(redo); copy.replaceChildren(); copy.removeAttribute('style'); cc = null; kind = ''; placed = '' }
  const mirror = n => {
    unmirror()
    const s = getComputedStyle(n), c = copy.style, t = n.tagName
    if (t == 'IMG') {
      const u = n.currentSrc || n.src
      // (con loading="lazy" o srcset, la fuente definitiva se conoce al cargar)
      if (!n.complete) n.addEventListener('load', stale, { once: true })
      kind = 'img'
      Object.assign(c, { backgroundImage: u ? `url(${JSON.stringify(u)})` : '', backgroundSize: FIT[s.objectFit] || '100% 100%', backgroundPosition: s.objectPosition, backgroundRepeat: 'no-repeat' })
    } else if (MOZ && (t == 'VIDEO' || t == 'CANVAS' || n.children.length || n.textContent.trim())) {
      if (!n.id) n.id = 'ns-src-' + ++uid
      kind = 'moz'
      Object.assign(c, { backgroundImage: `-moz-element(#${globalThis.CSS.escape(n.id)})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' })
    } else if (t == 'VIDEO' || t == 'CANVAS') {
      kind = 'frames'
      cc = document.createElement('canvas'); copy.append(cc)
      cc.style.cssText = 'width:100%;height:100%;display:block'
      frames(n)
    } else if (n.children.length || n.textContent.trim()) {
      kind = 'dom'
      snap(n)
      // el clon se rehace cuando el original cambia (como mucho cuatro veces por segundo)
      smo = new MutationObserver(() => { redo ||= setTimeout(() => { redo = 0; if (kind == 'dom') { copy.replaceChildren(); snap(n) } }, 250) })
      smo.observe(n, { subtree: true, childList: true, characterData: true, attributes: true })
    } else {
      kind = 'bg'
      Object.assign(c, { backgroundImage: s.backgroundImage, backgroundSize: s.backgroundSize, backgroundPosition: s.backgroundPosition, backgroundRepeat: s.backgroundRepeat, backgroundColor: s.backgroundColor })
    }
    if (kind != 'dom') c.filter = s.filter == 'none' ? '' : s.filter
  }
  // vídeo y canvas: cada fotograma, con su object-fit, sólo mientras el grupo está a la vista
  const frames = n => {
    const x = cc.getContext('2d'), vid = n.tagName == 'VIDEO'
    const paint = () => {
      live = 0
      if (kind != 'frames' || !vis || back.hidden) return
      const W = copy.offsetWidth, H = copy.offsetHeight, q = Math.min(2, devicePixelRatio || 1)
      if (W && H) {
        if (cc.width != Math.round(W * q) || cc.height != Math.round(H * q)) { cc.width = Math.round(W * q); cc.height = Math.round(H * q) }
        const sw = vid ? n.videoWidth : n.width, sh = vid ? n.videoHeight : n.height, fit = getComputedStyle(n).objectFit
        if (sw && sh) {
          let dw = W, dh = H
          if (fit == 'cover' || fit == 'contain') { const k = (fit == 'cover' ? Math.max : Math.min)(W / sw, H / sh); dw = sw * k; dh = sh * k }
          x.clearRect(0, 0, cc.width, cc.height)
          try { x.drawImage(n, (W - dw) / 2 * q, (H - dh) / 2 * q, dw * q, dh * q) } catch {}
        }
      }
      live = requestAnimationFrame(paint)
    }
    live = requestAnimationFrame(paint)
  }
  // clon del DOM: elementos nuevos con los mismos atributos (sin id, sin eventos, sin style en
  // texto: con una CSP estricta sólo vale el CSSOM) y el estilo calculado entero en línea
  const snap = n => {
    let budget = CAP
    scrolls = []
    const walk = m => {
      if (m.nodeType == 3) return document.createTextNode(m.data)
      if (m.nodeType != 1 || budget-- <= 0 || SKIP.test(m.tagName)) return null
      const c = document.createElementNS(m.namespaceURI, m.localName)
      for (const a of m.attributes) if (!/^(id|style|on.*|autofocus|tabindex|contenteditable|loading)$/i.test(a.name)) c.setAttribute(a.name, a.value)
      const s = getComputedStyle(m)
      for (let i = 0; i < s.length; i++) c.style.setProperty(s[i], s.getPropertyValue(s[i]))
      c.style.animation = c.style.transition = 'none'
      if (m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1) scrolls.push([c, m])
      for (const k of m.childNodes) { const x = walk(k); x && c.append(x) }
      return c
    }
    const root = walk(n)
    if (budget < 0 || !root) { copy.replaceChildren(); return }
    // la raíz, en el origen de la copia (la copia ya se coloca donde está el original)
    Object.assign(root.style, { position: 'absolute', left: 0, top: 0, margin: 0, transform: 'none', translate: 'none', rotate: 'none', scale: 'none' })
    root.setAttribute('inert', ''); root.setAttribute('aria-hidden', 'true')
    copy.append(root)
    syncScroll()
  }
  // lo que el original tiene desplazado por dentro, también (y al desplazarse, sin rehacer el clon)
  let scrolls = []
  const syncScroll = () => { for (const [c, m] of scrolls) { c.scrollTop = m.scrollTop; c.scrollLeft = m.scrollLeft } }
  // al desplazarse la página o un contenedor, la copia se recoloca (y el clon copia el desplazamiento)
  const onScroll = () => { if (V?.src && vis) fr ||= requestAnimationFrame(follow) }
  // la copia, donde está el original respecto a las capas (BX, BY: origen de las capas en pantalla)
  let BX = 0, BY = 0, placed = '', fr = 0
  const put = S => {
    const at = [r2(S.left - BX), r2(S.top - BY), r2(S.width), r2(S.height)], k = at.join()
    if (k != placed) { placed = k; Object.assign(copy.style, { left: at[0] + 'px', top: at[1] + 'px', width: at[2] + 'px', height: at[3] + 'px' }) }
  }
  const follow = () => {
    fr = 0
    const s = V?.src
    if (!s || back.hidden) return
    if (kind == 'dom') syncScroll()
    // el grupo también puede haberse movido (si no es fijo): el origen de las capas se relee
    const E = el.getBoundingClientRect(), dx = E.left + el.clientLeft - ox0, dy = E.top + el.clientTop - oy0
    ox0 += dx; oy0 += dy; BX += dx; BY += dy
    put(s.getBoundingClientRect())
  }
  let ox0 = 0, oy0 = 0
  let raf = 0, idle = 0, cost = 3, last = '', lastPre = '', msig = '', now = null, cur = -1, lensKey = '', token = 0, frame = 0, dirty = true, V = null
  // estilos leídos en caché: las variables del grupo y el radio/visibilidad de cada hijo se leen al
  // despertar por un cambio (clase, estilo, tamaño) y cada pocos frames en marcha, no en cada frame
  const look = new WeakMap()
  const draw = () => {
    const E = el.getBoundingClientRect(), fresh = dirty || frame % 6 == 0
    if (dirty || !V) {
      const cs = getComputedStyle(el), num = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return v >= 0 ? v : d }
      V = { k: num('--ns-liquid', 14), lens: num('--ns-glass-lens', 34), edge: num('--ns-glass-edge', 8), depth: num('--ns-glass-depth', 24), blur: num('--ns-glass-blur', 4), sat: num('--ns-glass-sat', 1.3), src: LENS || !glassy() ? null : source(), prism: !!o.prism?.(), glow: cs.getPropertyValue('--ns-glass-glow').trim(), glowSize: num('--ns-glass-glow-size', 16) }
      // prisma: se monta o se desmonta la cadena de los dos filtros (y se regenera la lente)
      if (lenses[0].prism !== V.prism) { lenses.forEach(L => chain(L, V.prism)); lensKey = ''; lastPre = '' }
      // (el clon del DOM y el de fotogramas se rehacen sólo si cambia el original; la imagen y el
      // fondo, que no cuestan nada, siempre: pueden haber cambiado de src o de estilo)
      if (V.src != mirrored || ((kind == 'img' || kind == 'bg') && sig(V.src) != msig)) { mirrored = V.src; msig = V.src ? sig(V.src) : ''; V.src ? mirror(V.src) : unmirror() }
    }
    dirty = false; frame++
    const k = o.k ?? V.k
    const ox = E.left + el.clientLeft, oy = E.top + el.clientTop
    const g = glassy(), src = g ? V.src : null, lensPx = g && (LENS || src) ? V.lens : 0, edgePx = V.edge, depth = V.depth
    const S = src?.getBoundingClientRect()
    const tail = `|${g}|${lensPx}|${edgePx}|${!!src}|${depth}|${V.blur}|${V.sat}`
    let bx, by, bw, bh, pre, make
    if (o.path) {
      // Una forma cualquiera (ns-frame/glass): el path del propio elemento, en su caja de borde. Las
      // capas lo rodean con un margen para la lente; el campo sale del path rasterizado
      const P = o.path(el), m = 6 + lensPx / 2
      bx = -el.clientLeft - m; by = -el.clientTop - m; bw = (P?.w || 0) + 2 * m; bh = (P?.h || 0) + 2 * m
      pre = (P?.d || '') + `|${bw}|${bh}|${bx}|${by}` + tail
      make = () => {
        if (!P?.d) return [null, '']
        const d = shift(P.d, m, m)
        // el recorte y los reflejos usan el path exacto; el campo sólo da la lente y el reflejo
        // interior: basta una rejilla de unos 12 000 nodos (entre 1 y 2,5 px)
        return [pathField(d, bw, bh, o.step || Math.min(2.5, Math.max(1, Math.sqrt(bw * bh / 12000)))), d]
      }
    } else {
      const boxes = list().filter(b => b.getClientRects().length).map(b => {
        const r = b.getBoundingClientRect()
        let L = look.get(b)
        if (!L || fresh) { const s = getComputedStyle(b); look.set(b, L = { off: s.visibility == 'hidden' || +s.opacity == 0, rad: s.borderTopLeftRadius }) }
        if (L.off) return { x: 0, y: 0, w: 0, h: 0 }
        return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, r: px(L.rad, Math.min(r.width, r.height)) }
      }).filter(b => b.w > 0 && b.h > 0)
      // las capas cubren el contorno real y un margen (los hijos pueden salir del contenedor, y la
      // lente toma fondo un poco más allá del borde)
      const K = k * 2.4, m = K + 6 + lensPx / 2
      bx = boxes.length ? Math.min(...boxes.map(b => b.x)) - m : 0; by = boxes.length ? Math.min(...boxes.map(b => b.y)) - m : 0
      bw = boxes.length ? Math.max(...boxes.map(b => b.x + b.w)) + m - bx : 0; bh = boxes.length ? Math.max(...boxes.map(b => b.y + b.h)) + m - by : 0
      pre = boxes.map(b => `${r2(b.x)},${r2(b.y)},${r2(b.w)},${r2(b.h)},${r2(b.r)}`).join(';') + `|${K}` + tail
      // --ns-liquid es el hueco máximo que se funde; el mínimo suave acerca como mucho k/4 por lado,
      // así que k = 2,4 × hueco deja un cuello visible justo en el límite
      // rejilla adaptativa: unos 9000 nodos, entre 1,25 y 3 px (el contorno pasa por puntos exactos
      // del campo y se traza con cúbicas: un círculo sale redondo al píxel a cualquier tamaño)
      make = () => { const f = field(boxes.map(b => ({ ...b, x: b.x - bx, y: b.y - by })), K, o.step || Math.min(3, Math.max(1.25, Math.sqrt(bw * bh / 9000)))); return [f, contour(f)] }
    }
    // la copia sigue al original (al desplazarse la página, por ejemplo) sin rehacer la forma
    BX = bx + ox; BY = by + oy; ox0 = ox; oy0 = oy
    if (S) put(S)
    // si las piezas y los parámetros no cambiaron, la forma tampoco: ni campo ni contorno (un grupo
    // se despierta a menudo por otro que se mueve dentro o cerca, y así no le cuesta nada)
    if (pre == lastPre) return
    lastPre = pre
    const [f, d] = make()
    const key = d + '|' + bx + '|' + by + '|' + g + '|' + lensPx + '|' + edgePx + '|' + !!src
    if (key == last) return
    last = key
    for (const e of [svg, glass, edge, back]) Object.assign(e.style, { left: r2(bx) + 'px', top: r2(by) + 'px', width: r2(bw) + 'px', height: r2(bh) + 'px' })
    svg.setAttribute('viewBox', `0 0 ${r2(bw)} ${r2(bh)}`)
    path.setAttribute('d', d); rim.setAttribute('d', d)
    // halo: sólo si hay color; el desenfoque crece con el tamaño pedido
    const gs = V.glowSize, gOn = g && d && V.glow
    glow.setAttribute('d', gOn ? d : '')
    if (gOn) {
      const R = { x: -gs * 3, y: -gs * 3, width: r2(bw + gs * 6), height: r2(bh + gs * 6) }
      setA(mGlow, R); setA(oRect, R); oCut.setAttribute('d', d)
      setA(glow, { stroke: V.glow, 'stroke-width': r2(gs) }); gBlur.setAttribute('stdDeviation', r2(gs / 2.4))
    }
    // segundo reflejo: un contorno 1,6 px hacia dentro (sólo en vidrio)
    rim2.setAttribute('d', g && d ? contour(f, -1.6) : '')
    el.classList.toggle('ns-glass', g)
    // (estilo en línea: el relleno de la capa en CSS ganaría a un atributo fill)
    path.style.fill = g ? `url(#${id}s)` : ''
    // (WebKit no aplica a HTML una máscara que apunta a un <mask> del documento: la capa entera
    // desaparece. Allí el cuerpo se recorta sólo con clip-path, y el canto usa la misma máscara
    // como imagen SVG en línea)
    const mb = g && d && !WK ? `url(#${id}m)` : '', me = g && d ? (WK ? rimImage(d, bw, bh, edgePx) : `url(#${id}e)`) : ''
    glass.style.mask = glass.style.webkitMask = mb
    setRim(me)
    // y además clip-path: si un navegador no aplica una máscara SVG del documento a un elemento
    // HTML, el vidrio sigue teniendo la forma exacta (nunca un rectángulo)
    glass.style.clipPath = edge.style.clipPath = back.style.clipPath = g && d ? `path("${d}")` : ''
    back.style.mask = back.style.webkitMask = mb
    back.hidden = !(src && d)
    if (!g || !d) { glass.style.backdropFilter = back.style.filter = ''; now = null; return }
    for (const M of [maskB, maskE]) setA(M, { width: r2(bw), height: r2(bh) })
    mBody.setAttribute('d', d); mEdge.setAttribute('d', d); cEdge.setAttribute('d', d)
    mEdge.setAttribute('stroke-width', r2(edgePx * 1.6)); eBlur.setAttribute('stdDeviation', r2(edgePx / 2.2))
    if (!lensPx) { glass.style.backdropFilter = back.style.filter = ''; now = null; return }
    // sobre la copia, la lente sólo desplaza: el desenfoque y la saturación los pone el cuerpo encima
    now = { f, d, bw, bh, depth, lensPx, blur: src ? 0 : V.blur, sat: src ? 1 : V.sat, src: !!src }
    // en marcha: el mapa vigente sigue a la forma (se estira); el nuevo llega al detenerse. Sobre la
    // copia (fuera de Chromium) el mapa va con la capa y se estira a su tamaño: vale mientras la
    // forma se desplaza o se estira un poco (un indicador que se levanta); si cambia mucho (unas
    // gotas que salen), la lente se desvanece y vuelve con el mapa nuevo al detenerse
    if (cur >= 0) {
      if (now.src) lkT = mapWH && Math.abs(bw / mapWH[0] - 1) < .35 && Math.abs(bh / mapWH[1] - 1) < .35 ? 1 : 0
      place(lenses[cur], now)
    }
  }
  // fuerza de la lente sobre la copia (0–1), con transición
  let lk = 1, lkT = 1, mapWH = null, rimTok = 0
  // canto en WebKit (imagen SVG en línea): la nueva sólo entra ya decodificada; mientras, sigue la
  // anterior (antes, durante un frame no había máscara y el canto brillaba entero: parpadeo)
  const setRim = u => {
    if (!WK || !u) { rimTok++; edge.style.mask = edge.style.webkitMask = u; return }
    const t = ++rimTok, im = new Image(), go = () => { if (t == rimTok) edge.style.mask = edge.style.webkitMask = u }
    im.src = u.slice(5, -2)
    im.decode ? im.decode().then(go, go) : go()
  }
  const place = (L, s) => {
    if (!s.src) {
      setA(L.map, { x: r2(s.f.X0), y: r2(s.f.Y0), width: r2(s.f.nx * s.f.step), height: r2(s.f.ny * s.f.step) })
      setA(L.f, { width: r2(s.bw), height: r2(s.bh) })
    } else setA(L.map, { width: r2(s.bw), height: r2(s.bh) })
    for (const n of L.disp) n.setAttribute('scale', r2(s.lensPx * (s.src ? lk : 1) * n.getAttribute('data-k')))
    L.blur.setAttribute('stdDeviation', s.blur / 2)
    L.sat.setAttribute('values', s.sat)
  }
  // mapa nuevo en el filtro libre; se cambia de filtro cuando la imagen ya está decodificada
  const refreshLens = () => {
    const s = now
    if (!s) return
    const k = [s.d, s.bw, s.bh, s.depth, s.lensPx, s.blur, s.sat, s.src].join('|')
    if (k == lensKey) return
    lensKey = k
    const n = cur < 0 ? 0 : 1 - cur, L = lenses[n], t = ++token
    lensMap(s.f, s.depth, cv, s.src ? { cv: cv2 ||= document.createElement('canvas'), w: s.bw, h: s.bh } : null).then(url => {
      if (t != token) return
      place(L, s)
      L.map.setAttribute('href', url)
      const img = new Image()
      img.src = url
      // se espera a que el filtro libre tenga el mapa cargado: dos frames en Chromium; en WebKit,
      // que carga el feImage aparte, seis (si no, un frame con el mapa vacío desplazaba todo)
      const after = (k, fn) => requestAnimationFrame(() => k > 1 ? after(k - 1, fn) : fn())
      const swap = () => after(WK ? 6 : 2, () => {
        if (t != token || !now) return
        cur = n
        if (now.src) { mapWH = [s.bw, s.bh]; lkT = 1; wake() }
        place(L, now)
        const u = `url(#${id}l${n})`
        if (now.src) { back.style.filter = u; glass.style.backdropFilter = '' } else { glass.style.backdropFilter = u; back.style.filter = '' }
      })
      img.decode ? img.decode().then(swap, swap) : swap()
    })
  }
  // bucle sólo mientras algo se mueve: dos frames sin cambios y sin animaciones → se detiene
  const tick = t => {
    raf = 0
    // lejos de la pantalla no se dibuja nada: se retoma al acercarse (near)
    if (!near) return
    // presupuesto por frame compartido por todos los grupos: si otros ya gastaron ~8 ms en este
    // frame y el último dibujo de éste fue caro (una forma nueva: campo y mapa), espera al siguiente.
    // Doce vidrios que aparecen a la vez se reparten en varios frames en vez de una tarea larga
    if (t != BUDGET.t) { BUDGET.t = t; BUDGET.used = 0 }
    if (BUDGET.used > 8 && cost > 2) { raf = requestAnimationFrame(tick); return }
    const before = last, t0 = performance.now()
    draw()
    cost = performance.now() - t0; BUDGET.used += cost
    // en marcha mientras haya transiciones o animaciones CSS activas (por eventos); antes de parar,
    // una comprobación con getAnimations por si hay Web Animations
    let moving = active.size > 0
    if (!moving && last == before && idle == 1) moving = !!el.getAnimations?.({ subtree: true }).some(a => a.playState == 'running')
    idle = last == before && !moving ? idle + 1 : 0
    if (idle >= 1 || cur < 0) refreshLens()
    // la lente de la copia se desvanece o vuelve en unos 150 ms
    let fading = false
    if (now?.src && cur >= 0 && Math.abs(lk - lkT) > .01) { lk += (lkT - lk) * .25; place(lenses[cur], now); fading = true }
    else if (Math.abs(lk - lkT) <= .01 && lk != lkT) { lk = lkT; now?.src && cur >= 0 && place(lenses[cur], now) }
    if (idle < 2 || fading) raf = requestAnimationFrame(tick)
  }
  const wake = () => { idle = 0; raf ||= requestAnimationFrame(tick) }
  const stale = () => { dirty = true; lastPre = ''; wake() }
  const ro = new ResizeObserver(stale)
  ro.observe(el)
  // elementos con transiciones o animaciones CSS en curso (si uno termina antes que otra de sus
  // propiedades, la comprobación final con getAnimations evita parar antes de tiempo)
  const active = new Set()
  const on = e => { if (!own(e.target)) { active.add(e.target); wake() } }
  const off = e => { if (!own(e.target)) { active.delete(e.target); wake() } }
  const EV = [['pointerenter', wake], ['pointerleave', wake], ['pointerdown', wake], ['pointerup', wake], ['focusin', wake], ['focusout', wake],
    ['transitionrun', on], ['animationstart', on], ['transitionend', off], ['transitioncancel', off], ['animationend', off], ['animationcancel', off]]
  EV.forEach(([e, f]) => el.addEventListener(e, f, true))
  // (sus propias capas no cuentan: cambiar su estilo no debe despertar otro frame)
  const own = n => n == svg || n == glass || n == edge || back.contains(n) || svg.contains(n)
  // Un estilo en línea que cambia en una pieza (una animación por JS que la mueve) sólo despierta el
  // bucle: la geometría se lee en cada frame. Clases, atributos o el estilo del propio grupo pueden
  // cambiar variables y radios: ésos obligan a releer. Las capas de otros grupos anidados no cuentan.
  const mo = new MutationObserver(ms => {
    let s = 0, w = 0
    for (const m of ms) {
      if (own(m.target) || m.target.closest?.('.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src')) continue
      if (m.attributeName == 'style' && m.target != el) w = 1; else s = 1
    }
    s ? stale() : w && wake()
  })
  mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-ns-liquid', 'data-ns-liquid-src'] })
  // fuera de Chromium: la copia sigue al desplazamiento, y el fondo se busca al entrar a la vista
  // sólo trabaja cerca de la pantalla (media pantalla de margen): un grupo al final de la página no
  // calcula formas ni mapas de lente durante la carga
  let near = false
  const nio = new IntersectionObserver(es => { const n = es[es.length - 1].isIntersecting; if (n != near) { near = n; n && stale() } }, { rootMargin: '50% 0px' })
  nio.observe(el)
  let io = null
  if (!LENS) {
    addEventListener('scroll', onScroll, { capture: true, passive: true })
    io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) { if (kind == 'frames' && !live) frames(mirrored); if (!V?.src) stale() } })
    io.observe(el)
  }
  wake()
  const handle = {
    // update: relee estilos y vuelve a dibujar; frame: sólo redibuja (para quien mueve las piezas
    // por JS en cada frame, sin cambiar variables ni radios)
    update: stale,
    frame: wake,
    destroy() { REG.delete(el); cancelAnimationFrame(raf); cancelAnimationFrame(fr); token++; unmirror(); ro.disconnect(); mo.disconnect(); nio.disconnect(); io?.disconnect(); removeEventListener('scroll', onScroll, { capture: true }); EV.forEach(([e, f]) => el.removeEventListener(e, f, true)); svg.remove(); glass.remove(); edge.remove(); back.remove(); el.classList.remove('ns-liquid', 'ns-glass') },
  }
  REG.set(el, handle)
  return handle
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
