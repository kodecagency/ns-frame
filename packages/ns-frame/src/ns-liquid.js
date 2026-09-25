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
.ns-liquid>:not(.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src){position:relative}
.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{position:absolute;pointer-events:none;margin:0}
.ns-liquid-src{overflow:hidden}.ns-liquid-src>div{position:absolute}
.ns-liquid-fx{overflow:visible}
.ns-liquid-fx .ns-lf{fill:var(--ns-liquid-fill,currentColor);stroke:var(--ns-liquid-border,none);stroke-width:var(--ns-liquid-width,1.5px)}
.ns-liquid-fx .ns-lr,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{display:none}
.ns-glass>.ns-liquid-src:not([hidden]){display:block}
.ns-glass>.ns-liquid-glass{display:block;background:var(--ns-glass-tint,rgba(22,22,26,.22));-webkit-backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3));backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3))}
.ns-glass>.ns-liquid-rim{display:block;-webkit-backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06);backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06)}
.ns-glass>.ns-liquid-fx .ns-lf{stroke:none;opacity:var(--ns-glass-shine,1)}
.ns-glass>.ns-liquid-fx .ns-lr{display:inline;fill:none;stroke-width:1.2px;opacity:var(--ns-glass-shine,1)}
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
  const first = L.slice(i).find(n => !el.contains(n) && !n.contains(el) && !n.closest('.ns-liquid-src') && paints(n))
  const covers = n => { const b = n.getBoundingClientRect(); return b.width > 0 && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom }
  for (let c = el, a = el.parentElement; a && a != document.documentElement; c = a, a = a.parentElement) {
    for (let s = c.previousElementSibling; s; s = s.previousElementSibling) {
      const m = [s, ...s.querySelectorAll('img,video,canvas')].reverse().find(n => /^(IMG|VIDEO|CANVAS)$/.test(n.tagName) && covers(n))
      if (m) return m == first ? m : null
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
  const lenses = [0, 1].map(n => {
    // (fuera de Chromium, región del objeto: WebKit pierde el elemento entero con userSpaceOnUse)
    const f = mk('filter', LENS ? { id: id + 'l' + n, x: 0, y: 0, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' } : { id: id + 'l' + n, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' })
    const map = mk('feImage', { result: 'm', preserveAspectRatio: 'none' })
    const disp = mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' })
    const blur = mk('feGaussianBlur', { in: 'd', result: 'b' }), sat = mk('feColorMatrix', { in: 'b', type: 'saturate' })
    f.append(map, disp, blur, sat)
    return { f, map, disp, blur, sat }
  })
  const defs = mk('defs')
  defs.append(
    // luz del vidrio: reflejo especular (fuerte arriba, tenue abajo) y un brillo interior arriba
    stops(mk('linearGradient', { id: id + 'r', x1: 0, y1: 0, x2: .3, y2: 1 }), [[0, .85], [.2, .35], [.5, .06], [.8, .1], [1, .4]]),
    stops(mk('radialGradient', { id: id + 's', cx: .5, cy: -.15, r: .95 }), [[0, .22], [.55, .05], [1, 0]]),
    maskB, maskE, clipE, fEdge, ...lenses.map(l => l.f))
  const path = mk('path', { class: 'ns-lf' }), rim = mk('path', { class: 'ns-lr', stroke: `url(#${id}r)` })
  svg.append(defs, path, rim)
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
      for (const a of m.attributes) if (!/^(id|style|on.*|autofocus|tabindex|contenteditable)$/i.test(a.name)) c.setAttribute(a.name, a.value)
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
  let raf = 0, idle = 0, last = '', now = null, cur = -1, lensKey = '', token = 0, frame = 0, dirty = true, V = null
  // estilos leídos en caché: las variables del grupo y el radio/visibilidad de cada hijo se leen al
  // despertar por un cambio (clase, estilo, tamaño) y cada pocos frames en marcha, no en cada frame
  const look = new WeakMap()
  const draw = () => {
    const E = el.getBoundingClientRect(), fresh = dirty || frame % 6 == 0
    if (dirty || !V) {
      const cs = getComputedStyle(el), num = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return v >= 0 ? v : d }
      V = { k: num('--ns-liquid', 14), lens: num('--ns-glass-lens', 34), edge: num('--ns-glass-edge', 8), depth: num('--ns-glass-depth', 24), blur: num('--ns-glass-blur', 4), sat: num('--ns-glass-sat', 1.3), src: LENS || !glassy() ? null : source() }
      // (el clon del DOM y el de fotogramas se rehacen sólo si cambia el original; la imagen y el
      // fondo, que no cuestan nada, siempre: pueden haber cambiado de src o de estilo)
      if (V.src != mirrored || kind == 'img' || kind == 'bg') { mirrored = V.src; V.src ? mirror(V.src) : unmirror() }
    }
    dirty = false; frame++
    const k = o.k ?? V.k
    const ox = E.left + el.clientLeft, oy = E.top + el.clientTop
    const boxes = list().filter(b => b.getClientRects().length).map(b => {
      const r = b.getBoundingClientRect()
      let L = look.get(b)
      if (!L || fresh) { const s = getComputedStyle(b); look.set(b, L = { off: s.visibility == 'hidden' || +s.opacity == 0, rad: s.borderTopLeftRadius }) }
      if (L.off) return { x: 0, y: 0, w: 0, h: 0 }
      return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, r: px(L.rad, Math.min(r.width, r.height)) }
    }).filter(b => b.w > 0 && b.h > 0)
    const g = glassy(), src = g ? V.src : null, lensPx = g && (LENS || src) ? V.lens : 0, edgePx = V.edge, depth = V.depth
    const S = src?.getBoundingClientRect()
    // las capas cubren el contorno real y un margen (los hijos pueden salir del contenedor, y la
    // lente toma fondo un poco más allá del borde)
    const K = k * 2.4, m = K + 6 + lensPx / 2
    const bx = boxes.length ? Math.min(...boxes.map(b => b.x)) - m : 0, by = boxes.length ? Math.min(...boxes.map(b => b.y)) - m : 0
    const bw = boxes.length ? Math.max(...boxes.map(b => b.x + b.w)) + m - bx : 0, bh = boxes.length ? Math.max(...boxes.map(b => b.y + b.h)) + m - by : 0
    // --ns-liquid es el hueco máximo que se funde; el mínimo suave acerca como mucho k/4 por lado,
    // así que k = 2,4 × hueco deja un cuello visible justo en el límite
    // rejilla de 2 px; en grupos grandes, 3 px (el contorno sigue suave: se traza con curvas)
    const f = field(boxes.map(b => ({ ...b, x: b.x - bx, y: b.y - by })), K, o.step || (bw * bh > 60000 ? 3 : 2)), d = contour(f)
    const key = d + '|' + bx + '|' + by + '|' + g + '|' + lensPx + '|' + edgePx + '|' + !!src
    // la copia sigue al original (al desplazarse la página, por ejemplo) sin rehacer la forma
    BX = bx + ox; BY = by + oy; ox0 = ox; oy0 = oy
    if (S) put(S)
    if (key == last) return
    last = key
    for (const e of [svg, glass, edge, back]) Object.assign(e.style, { left: r2(bx) + 'px', top: r2(by) + 'px', width: r2(bw) + 'px', height: r2(bh) + 'px' })
    svg.setAttribute('viewBox', `0 0 ${r2(bw)} ${r2(bh)}`)
    path.setAttribute('d', d); rim.setAttribute('d', d)
    el.classList.toggle('ns-glass', g)
    // (estilo en línea: el relleno de la capa en CSS ganaría a un atributo fill)
    path.style.fill = g ? `url(#${id}s)` : ''
    // (WebKit no aplica a HTML una máscara que apunta a un <mask> del documento: la capa entera
    // desaparece. Allí el cuerpo se recorta sólo con clip-path, y el canto usa la misma máscara
    // como imagen SVG en línea)
    const mb = g && d && !WK ? `url(#${id}m)` : '', me = g && d ? (WK ? rimImage(d, bw, bh, edgePx) : `url(#${id}e)`) : ''
    glass.style.mask = glass.style.webkitMask = mb
    edge.style.mask = edge.style.webkitMask = me
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
    // en marcha: el mapa vigente sigue a la forma (se estira); el nuevo llega al detenerse
    if (cur >= 0) place(lenses[cur], now)
  }
  const place = (L, s) => {
    if (!s.src) {
      setA(L.map, { x: r2(s.f.X0), y: r2(s.f.Y0), width: r2(s.f.nx * s.f.step), height: r2(s.f.ny * s.f.step) })
      setA(L.f, { width: r2(s.bw), height: r2(s.bh) })
    }
    L.disp.setAttribute('scale', s.lensPx)
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
      const swap = () => requestAnimationFrame(() => requestAnimationFrame(() => {
        if (t != token || !now) return
        cur = n
        place(L, now)
        const u = `url(#${id}l${n})`
        if (now.src) { back.style.filter = u; glass.style.backdropFilter = '' } else { glass.style.backdropFilter = u; back.style.filter = '' }
      }))
      img.decode ? img.decode().then(swap, swap) : swap()
    })
  }
  // bucle sólo mientras algo se mueve: dos frames sin cambios y sin animaciones → se detiene
  const tick = () => {
    raf = 0
    const before = last
    draw()
    // en marcha mientras haya transiciones o animaciones CSS activas (por eventos); antes de parar,
    // una comprobación con getAnimations por si hay Web Animations
    let moving = active.size > 0
    if (!moving && last == before && idle == 1) moving = !!el.getAnimations?.({ subtree: true }).some(a => a.playState == 'running')
    idle = last == before && !moving ? idle + 1 : 0
    if (idle >= 1 || cur < 0) refreshLens()
    if (idle < 2) raf = requestAnimationFrame(tick)
  }
  const wake = () => { idle = 0; raf ||= requestAnimationFrame(tick) }
  const stale = () => { dirty = true; wake() }
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
  const mo = new MutationObserver(ms => { if (ms.some(m => !own(m.target))) stale() })
  mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-ns-liquid', 'data-ns-liquid-src'] })
  // fuera de Chromium: la copia sigue al desplazamiento, y el fondo se busca al entrar a la vista
  let io = null
  if (!LENS) {
    addEventListener('scroll', onScroll, { capture: true, passive: true })
    io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) { if (kind == 'frames' && !live) frames(mirrored); if (!V?.src) stale() } })
    io.observe(el)
  }
  wake()
  return {
    update: stale,
    destroy() { cancelAnimationFrame(raf); cancelAnimationFrame(fr); token++; unmirror(); ro.disconnect(); mo.disconnect(); io?.disconnect(); removeEventListener('scroll', onScroll, { capture: true }); EV.forEach(([e, f]) => el.removeEventListener(e, f, true)); svg.remove(); glass.remove(); edge.remove(); back.remove(); el.classList.remove('ns-liquid', 'ns-glass') },
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
