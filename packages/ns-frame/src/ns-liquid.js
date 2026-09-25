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
//      una copia alineada del fondo: la imagen, el vídeo o el fondo que haya detrás, lo que diga
//      data-ns-liquid-src="selector", o si no hay nada limpio, la página entera (un clon sólo de
//      la zona bajo el grupo);
//   3. canto: un anillo junto al borde con más brillo, saturación y contraste (en todos los
//      navegadores: es lo que da el grosor al vidrio donde no hay lente);
//   4. luz: un reflejo especular fino arriba, uno tenue abajo y un brillo interior.
//   Variables: --ns-glass-tint, --ns-glass-blur (4px), --ns-glass-sat (1.3), --ns-glass-lens
//   (fuerza de la lente en px, 34; 0 = sin lente), --ns-glass-depth (hasta dónde llega la lente
//   desde el borde, 24px), --ns-glass-edge (ancho del canto, 8px),
//   --ns-glass-shine (0–1). Con prefers-reduced-transparency se vuelve opaco (--ns-glass-solid).
//   Sobre un fondo claro liso, el vidrio se aclara solo (clase ns-glass-light, tinte
//   --ns-glass-tint-light) y --ns-glass-ink da el color de texto que contrasta (#111 o #fff).
//   La lente necesita img-src data: en la CSP (el mapa es una imagen generada en local).
// · Los hijos no llevan fondo: el conjunto lo pinta. data-ns-blob marca cuáles cuentan (si no, todos).
// · Mientras algún hijo se anima (transiciones, Web Animations, hover), se redibuja cada frame; en
//   reposo no hace nada.
// Sin dependencias (salvo el núcleo). Sólo CSSOM y atributos SVG (sin HTML en texto).

import { styles } from './ns-frame.js'
import { material } from './ns-light.js'

const CSS = `@layer ns{
.ns-liquid{position:relative}
:where(.ns-liquid>:not(.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src)){position:relative}
.ns-liquid-fx,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{position:absolute;pointer-events:none;margin:0}
.ns-liquid-src{overflow:hidden}.ns-liquid-gl{position:absolute;left:0;top:0;display:block}.ns-liquid-src>div{position:absolute;inset:0}.ns-liquid-src>div>div{position:absolute}
.ns-liquid-fx{overflow:visible}
.ns-liquid-fx .ns-lf{fill:var(--ns-liquid-fill,currentColor);stroke:var(--ns-liquid-border,none);stroke-width:var(--ns-liquid-width,1.5px)}
.ns-liquid-fx .ns-lr,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{display:none}
.ns-glass>.ns-liquid-src:not([hidden]){display:block}
.ns-glass>.ns-liquid-glass{display:block;transition:background-color .35s;background:var(--ns-glass-tint,rgba(22,22,26,.22));-webkit-backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3));backdrop-filter:blur(var(--ns-glass-blur,4px)) saturate(var(--ns-glass-sat,1.3))}
.ns-glass{--ns-glass-ink:#fff}.ns-glass.ns-glass-light{--ns-glass-ink:#111}
.ns-glass.ns-glass-deep>.ns-liquid-glass{background:linear-gradient(var(--ns-glass-deep,rgba(8,8,12,.34)) 0 0),var(--ns-glass-tint)}
.ns-glass.ns-glass-light>.ns-liquid-glass{background:var(--ns-glass-tint,var(--ns-glass-tint-light,rgba(255,255,255,.16)));-webkit-backdrop-filter:blur(var(--ns-glass-blur,7px)) saturate(var(--ns-glass-sat,1.2)) brightness(1.03);backdrop-filter:blur(var(--ns-glass-blur,7px)) saturate(var(--ns-glass-sat,1.2)) brightness(1.03)}
.ns-glass.ns-glass-light>.ns-liquid-fx .ns-lf{stroke:rgba(0,0,0,.09);stroke-width:1px}
.ns-glass.ns-glass-light>.ns-liquid-rim{-webkit-backdrop-filter:blur(1.5px) brightness(1.04) saturate(1.3) contrast(1.05);backdrop-filter:blur(1.5px) brightness(1.04) saturate(1.3) contrast(1.05)}
.ns-glass>.ns-liquid-rim{display:block;-webkit-backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06);backdrop-filter:blur(1.5px) brightness(1.22) saturate(1.15) contrast(1.06)}
.ns-glass>.ns-liquid-fx .ns-lf{stroke:none;opacity:var(--ns-glass-shine,1)}
.ns-liquid-fx .ns-lg{fill:none}
.ns-glass>.ns-liquid-fx .ns-lr{display:inline;fill:#fff;stroke:none;opacity:var(--ns-glass-shine,1)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.ns-glass>.ns-liquid-glass{background:var(--ns-glass-solid,rgba(30,30,34,.92))}}
@media (prefers-reduced-transparency:reduce){.ns-glass>.ns-liquid-glass{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:var(--ns-glass-solid,#232327)}.ns-glass>.ns-liquid-rim,.ns-glass>.ns-liquid-src{display:none!important}}
@media (forced-colors:active){.ns-liquid-fx .ns-lf{fill:Canvas;stroke:CanvasText}.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-src{display:none!important}}
}`
const SVG = 'http://www.w3.org/2000/svg', HTML = 'http://www.w3.org/1999/xhtml'
const r2 = n => Math.round(n * 100) / 100 || 0
let styled = 0
// lente en backdrop-filter sólo donde admite filtros SVG (Chromium); en los demás, sobre la copia
const LENS = typeof navigator != 'undefined' && !!navigator.userAgentData?.brands?.some(b => b.brand == 'Chromium')
// WebKit (Safari y todos los navegadores de iPhone)
const WK = !LENS && typeof navigator != 'undefined' && /AppleWebKit/.test(navigator.userAgent)
// -moz-element(): Firefox pinta cualquier elemento, en vivo, como imagen de fondo
const MOZ = !!globalThis.CSS?.supports?.('background-image', '-moz-element(#a)')
const FIT = { cover: 'cover', contain: 'contain', fill: '100% 100%', none: 'auto', 'scale-down': 'contain' }
// propiedades que copia el clon del DOM (las que cambian el aspecto; el resto no se ve en una copia)
const LOOK = ('display position top right bottom left width height min-width min-height max-width max-height box-sizing ' +
  'margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left ' +
  'border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style ' +
  'border-top-color border-right-color border-bottom-color border-left-color border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius ' +
  'background-color background-image background-size background-position background-repeat background-clip color ' +
  'font-family font-size font-weight font-style font-stretch line-height letter-spacing word-spacing text-align text-transform text-decoration-line text-shadow text-overflow white-space ' +
  'overflow-x overflow-y opacity visibility transform transform-origin translate rotate scale ' +
  'flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-content align-self justify-content justify-items justify-self row-gap column-gap ' +
  'grid-template-columns grid-template-rows grid-column-start grid-column-end grid-row-start grid-row-end grid-auto-flow grid-auto-rows grid-auto-columns order ' +
  'object-fit object-position aspect-ratio box-shadow filter z-index vertical-align list-style-type clip-path mask-image fill stroke stroke-width').split(' ')
// (sin data-ns*: el clon ya lleva la forma pintada; con ellos, la biblioteca lo activaría otra vez)
const NOATTR = /^(id|style|on.*|autofocus|tabindex|contenteditable|loading|data-ns.*)$/i
const CAP = 1500, SKIP =/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|EMBED|DIALOG)$/
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
  // (fuera de la vista: todavía no se sabe; null, en cambio, es «no hay una fuente limpia»)
  if (!r.width || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return undefined
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
// ¿Lo de detrás es claro? El primer color de fondo casi opaco bajo el centro del grupo (lo que
// está encima de él no cuenta). Una imagen, un vídeo o un degradado: no se sabe (undefined), y el
// vidrio se queda como estaba
function bright(el, again) {
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
  if (!r.width || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return undefined
  const L = document.elementsFromPoint(x, y), i = Math.max(0, L.findIndex(n => el.contains(n)))
  const lum = c => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255 > .6
  for (const n of L.slice(i)) {
    if (el.contains(n) || n.closest('.ns-liquid-src')) continue
    // (una foto: se mide la zona que queda debajo, si la imagen se puede leer)
    if (n.tagName == 'IMG') return imgLum(n, r, again)
    if (/^(VIDEO|CANVAS|svg)$/.test(n.tagName)) return undefined
    const s = getComputedStyle(n), c = s.backgroundColor.match(/[\d.]+/g)
    if (s.backgroundImage != 'none') return undefined
    if (c && +(c[3] ?? 1) >= .5) return lum(c)
  }
  // (el lienzo: el fondo de <html>, o el del esquema de color)
  const c = getComputedStyle(document.documentElement).backgroundColor.match(/[\d.]+/g)
  return c && +(c[3] ?? 1) > 0 ? lum(c) : !matchMedia('(prefers-color-scheme: dark)').matches
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
/**
 * Contorno de un path (M, L, A, C, Z absolutos, como los de ns-frame) como polígono cerrado [[x, y]]:
 * rectas tal cual, curvas y arcos en tramos de ~`seg` px. Lo usan la luz del vidrio y el relieve.
 */
export function polyline(d, seg = 5) {
  const t = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], P = []
  let i = 0, c = '', x = 0, y = 0
  const n = () => +t[i++]
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) { c = t[i++]; if (c == 'Z') continue }
    if (c == 'M' || c == 'L') { x = n(); y = n(); P.push([x, y]) }
    else if (c == 'C') {
      const a = [n(), n()], b = [n(), n()], e = [n(), n()], k = Math.max(2, Math.ceil(Math.hypot(e[0] - x, e[1] - y) / seg))
      for (let s = 1; s <= k; s++) { const u = s / k, v = 1 - u; P.push([v * v * v * x + 3 * v * v * u * a[0] + 3 * v * u * u * b[0] + u * u * u * e[0], v * v * v * y + 3 * v * v * u * a[1] + 3 * v * u * u * b[1] + u * u * u * e[1]]) }
      x = e[0]; y = e[1]
    } else if (c == 'A') {
      // arco elíptico (SVG, parametrización por el centro)
      let rx = n(), ry = n(); n(); const la = n(), sw = n(), X = n(), Y = n()
      const dx = (x - X) / 2, dy = (y - Y) / 2, l = dx * dx / (rx * rx) + dy * dy / (ry * ry)
      if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l) }
      const q = Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx) / (rx * rx * dy * dy + ry * ry * dx * dx))) * (la == sw ? -1 : 1)
      const cx = q * rx * dy / ry + (x + X) / 2, cy = -q * ry * dx / rx + (y + Y) / 2
      const a0 = Math.atan2((y - cy) / ry, (x - cx) / rx)
      let da = Math.atan2((Y - cy) / ry, (X - cx) / rx) - a0
      if (sw && da < 0) da += 2 * Math.PI; if (!sw && da > 0) da -= 2 * Math.PI
      const k = Math.max(2, Math.ceil(Math.abs(da) * Math.max(rx, ry) / seg))
      for (let s = 1; s <= k; s++) { const a = a0 + da * s / k; P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]) }
      x = X; y = Y
    }
  }
  // sin puntos repetidos (el cierre vuelve al inicio)
  return P.filter((p, j) => { const q = P[(j + P.length - 1) % P.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > .05 })
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
// `hard` (cristal tallado): dentro de la banda, el desvío es constante en cada cara (sin caída),
// así que el fondo se ve partido en cada corte, como a través de una gema; el borde de la banda se
// suaviza 1,5 px para que el corte sea limpio y no un escalón pixelado
// `zoom` (0–1): además, todo el interior aumenta lo que hay debajo, como una lupa (el indicador de
// unas pestañas al levantarse): cada punto toma el fondo un poco más cerca del centro de la forma,
// en proporción a su distancia al centro (aumento uniforme)
function lensMap(f, rim, cv, full, hard, zoom = 0) {
  paintMap(f, rim, cv, hard, zoom)
  // `full` ({ cv, w, h }): el mapa a tamaño de la capa, neutro fuera de la rejilla y estirado con
  // suavizado. Es el que usa filter: url() fuera de Chromium: WebKit sólo coloca bien un feImage
  // sin posición ni tamaño (a su tamaño propio, en el origen de la región del objeto)
  let out = cv
  if (full) {
    out = full.cv
    out.width = Math.max(1, Math.round(full.w)); out.height = Math.max(1, Math.round(full.h))
    const y = out.getContext('2d')
    y.fillStyle = 'rgb(128,128,128)'; y.fillRect(0, 0, out.width, out.height)
    y.drawImage(cv, f.X0, f.Y0, f.nx * f.step, f.ny * f.step)
  }
  // toBlob codifica el PNG fuera del hilo principal (toDataURL lo bloqueaba al detenerse la forma)
  return new Promise(res => out.toBlob(b => {
    if (!b) return res(out.toDataURL())
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.readAsDataURL(b)
  }))
}
// el mapa en el canvas de la rejilla, sin codificar (la lente en WebGL lo sube tal cual). En azul,
// la franja del canto: 1 en el borde y 0 a `edge` px hacia dentro
function paintMap(f, rim, cv, hard, zoom = 0, edge = 0) {
  const { F, nx, ny, step } = f
  cv.width = nx; cv.height = ny
  // willReadFrequently: canvas en CPU. Uno acelerado por GPU obliga a leerlo de vuelta para
  // codificar el PNG, y eso era lo más caro al detenerse la forma
  const x = cv.getContext('2d', { willReadFrequently: true }), img = x.createImageData(nx, ny), D = img.data
  // centro y semieje mayor de la forma (para el aumento)
  let x0 = nx, x1 = 0, y0 = ny, y1 = 0
  if (zoom) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (F[j * nx + i] < 0) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(1, (x1 - x0) / 2, (y1 - y0) / 2)
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 4, v = F[j * nx + i]
    let gx = 0, gy = 0
    if (v < 0 && -v < rim) {
      gx = (F[j * nx + Math.min(nx - 1, i + 1)] - F[j * nx + Math.max(0, i - 1)]) / (2 * step)
      gy = (F[Math.min(ny - 1, j + 1) * nx + i] - F[Math.max(0, j - 1) * nx + i]) / (2 * step)
      const L = Math.hypot(gx, gy) || 1, t = hard ? Math.min(1, (v + rim) / 1.5) * .7 : (1 + v / rim) ** 2
      gx = gx / L * t; gy = gy / L * t
    }
    if (zoom && v < 0) {
      // (se atenúa en el último píxel del borde: el aumento no rompe el canto)
      const e = Math.min(1, -v / 2)
      gx -= (i - cx) / R * zoom * e; gy -= (j - cy) / R * zoom * e
      gx = Math.max(-1, Math.min(1, gx)); gy = Math.max(-1, Math.min(1, gy))
    }
    D[k] = 128 + gx * 127; D[k + 1] = 128 + gy * 127; D[k + 3] = 255
    D[k + 2] = edge && v < 0 ? 255 * Math.max(0, 1 + v / edge) ** 1.6 : edge ? 0 : 128
  }
  x.putImageData(img, 0, 0)
}

// Dónde se pinta de verdad la imagen de un <img>, <video> o <canvas> dentro de su caja S (con su
// object-fit y object-position): [x, y, ancho, alto], en las mismas unidades que S
function fitRect(n, S, iw, ih) {
  const s = getComputedStyle(n), fit = s.objectFit
  let w = S.width, h = S.height
  if (iw && ih && fit != 'fill') {
    const k = fit == 'cover' ? Math.max(w / iw, h / ih) : fit == 'none' ? 1 : fit == 'scale-down' ? Math.min(1, w / iw, h / ih) : Math.min(w / iw, h / ih)
    w = iw * k; h = ih * k
  }
  const [ox, oy] = (s.objectPosition || '50% 50%').split(' '), at = (v, free) => v?.endsWith('%') ? parseFloat(v) / 100 * free : parseFloat(v) || 0
  return [S.left + at(ox, S.width - w), S.top + at(oy ?? ox, S.height - h), w, h]
}

// ¿Es clara la zona de una imagen que queda bajo el grupo (su rectángulo r en pantalla)? Se lee una
// copia de la imagen pedida con CORS, reducida a 6×6: si el servidor no lo permite, no se sabe
// (undefined) y el vidrio se queda como está. `again` se llama cuando la copia llega
// copias de imágenes pedidas con CORS (legibles: no manchan un canvas), una por url. `again` se
// llama cuando llega. Devuelve la entrada ({ im } si ya está, { bad } si el servidor no lo permite)
const LUMS = new Map()
function corsImg(u, again) {
  let e = LUMS.get(u)
  if (!e) {
    LUMS.set(u, e = { cb: new Set() })
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => { e.im = im; e.cb.forEach(f => f()); e.cb.clear() }
    im.onerror = () => { e.bad = 1; e.cb.clear() }
    im.src = u
  }
  if (!e.im && !e.bad && again) e.cb.add(again)
  return e
}
function imgLum(n, r, again) {
  const u = n.currentSrc || n.src
  if (!u) return
  const e = corsImg(u, again)
  if (e.bad || !e.im) return
  const S = n.getBoundingClientRect(), [x, y, w, h] = fitRect(n, S, e.im.naturalWidth, e.im.naturalHeight)
  const k = e.im.naturalWidth / w, sx = (r.left - x) * k, sy = (r.top - y) * k, sw = r.width * k, sh = r.height * k
  if (sw <= 0 || sh <= 0) return
  const c = e.cv ||= Object.assign(document.createElement('canvas'), { width: 6, height: 6 }), g = c.getContext('2d', { willReadFrequently: true })
  try {
    g.clearRect(0, 0, 6, 6); g.drawImage(e.im, sx, sy, sw, sh, 0, 0, 6, 6)
    const D = g.getImageData(0, 0, 6, 6).data
    let L = 0
    for (let i = 0; i < D.length; i += 4) L += (.2126 * D[i] + .7152 * D[i + 1] + .0722 * D[i + 2]) / 255
    return L / 36 > .6
  } catch { e.bad = 1 }
}

// ── La página en un canvas, sólo la zona R (en px de pantalla) ──
// Para la lente en WebGL sobre contenido HTML. Un SVG con foreignObject dejaría el canvas ilegible
// (WebKit lo marca), así que se pinta a mano lo que se ve de verdad bajo un vidrio: fondos de color
// con sus esquinas y bordes, imágenes (las copias con CORS, con su object-fit), texto palabra a
// palabra con su fuente y su color, y los recortes de los contenedores con overflow. Lo demás
// (degradados, sombras, formas recortadas) queda fuera: bajo el desenfoque apenas se nota.
// Se salta `skip` (el propio grupo), lo fijo y las capas de otros vidrios
const TRANSP = /^(transparent|rgba\(.*,\s*0\))$/
function raster(root, skip, R, cv, q, again) {
  const W = Math.max(1, Math.round(R.width * q)), H = Math.max(1, Math.round(R.height * q))
  if (cv.width != W || cv.height != H) { cv.width = W; cv.height = H }
  const x = cv.getContext('2d')
  x.setTransform(q, 0, 0, q, -R.left * q, -R.top * q)
  // el lienzo: el primer color de fondo subiendo desde la raíz (o el de la página)
  let base = ''
  for (let a = root; a && !base; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (!TRANSP.test(c)) base = c }
  x.fillStyle = base || getComputedStyle(document.documentElement).backgroundColor.replace(/^rgba\(.*,\s*0\)$/, '#fff') || '#fff'
  x.fillRect(R.left, R.top, R.width, R.height)
  const RR = R.left + R.width, RB = R.top + R.height
  const hit = b => b.right > R.left && b.left < RR && b.bottom > R.top && b.top < RB
  // degradado lineal (el primero del fondo): ángulo o dirección y sus colores, repartidos por igual
  // (las paradas exactas apenas cambian algo bajo el desenfoque)
  const grad = (b, s) => {
    const g = s.match(/linear-gradient\((.*)\)/)?.[1]
    if (!g) return
    const C = g.match(/rgba?\([^)]+\)/g)
    if (!C || C.length < 2) return
    const to = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }, d = g.match(/^\s*(-?[\d.]+)deg/)
    const a = (d ? +d[1] : to[g.match(/^\s*(to \w+)/)?.[1]] ?? 180) * Math.PI / 180, sx = Math.sin(a), sy = -Math.cos(a)
    // longitud de la línea del degradado (la de CSS: cubre las esquinas)
    const L = Math.abs(b.width * sx) + Math.abs(b.height * sy), cx = b.left + b.width / 2, cy = b.top + b.height / 2
    const lg = x.createLinearGradient(cx - sx * L / 2, cy - sy * L / 2, cx + sx * L / 2, cy + sy * L / 2)
    C.forEach((c, i) => lg.addColorStop(i / (C.length - 1), c))
    return lg
  }
  const rr = (b, s) => { x.beginPath(); x.roundRect ? x.roundRect(b.left, b.top, b.width, b.height, ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(k => Math.min(parseFloat(s[`border${k}Radius`]) || 0, b.width / 2, b.height / 2))) : x.rect(b.left, b.top, b.width, b.height) }
  const rg = document.createRange()
  const text = (t, s) => {
    x.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
    x.fillStyle = s.color; x.textBaseline = 'alphabetic'
    for (const m of t.data.matchAll(/\S+/g)) {
      rg.setStart(t, m.index); rg.setEnd(t, m.index + m[0].length)
      const r = rg.getBoundingClientRect()
      if (!hit(r)) continue
      const k = x.measureText(m[0])
      x.fillText(m[0], r.left, r.top + (k.fontBoundingBoxAscent ?? r.height * .8), r.width + 1)
    }
  }
  const walk = (m, s) => {
    for (const c of m.childNodes) {
      if (c.nodeType == 3) { if (c.data.trim()) text(c, s); continue }
      if (c.nodeType != 1 || c == skip || SKIP.test(c.tagName) || c.matches('.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx')) continue
      const cs = getComputedStyle(c)
      if (cs.display == 'none' || cs.visibility == 'hidden' || cs.position == 'fixed' || +cs.opacity == 0) continue
      const b = c.getBoundingClientRect(), clip = cs.overflowX != 'visible' || cs.overflowY != 'visible'
      if (clip && !hit(b)) continue
      x.save()
      x.globalAlpha *= +cs.opacity
      if (hit(b)) {
        if (!TRANSP.test(cs.backgroundColor)) { rr(b, cs); x.fillStyle = cs.backgroundColor; x.fill() }
        const lg = cs.backgroundImage != 'none' && grad(b, cs.backgroundImage)
        if (lg) { rr(b, cs); x.fillStyle = lg; x.fill() }
        if (c.tagName == 'IMG' && (c.currentSrc || c.src)) {
          const e = corsImg(c.currentSrc || c.src, again)
          if (e.im) { const [ix, iy, iw, ih] = fitRect(c, b, e.im.naturalWidth, e.im.naturalHeight); x.save(); rr(b, cs); x.clip(); x.drawImage(e.im, ix, iy, iw, ih); x.restore() }
        }
        const bw = parseFloat(cs.borderTopWidth)
        if (bw > 0 && cs.borderTopStyle != 'none' && !TRANSP.test(cs.borderTopColor)) { rr({ left: b.left + bw / 2, top: b.top + bw / 2, width: b.width - bw, height: b.height - bw }, cs); x.lineWidth = bw; x.strokeStyle = cs.borderTopColor; x.stroke() }
      }
      if (clip) { rr(b, cs); x.clip() }
      walk(c, cs)
      x.restore()
    }
  }
  walk(root, getComputedStyle(root))
}

// ── Lente en WebGL (Safari y Firefox con una imagen, un vídeo o un canvas detrás) ──
// Los filtros SVG sobre HTML son frágiles en WebKit (en iPhone el desplazamiento puede no aplicarse
// y queda un desenfoque plano) y el mapa, codificado como imagen, llega tarde mientras la forma se
// mueve. Aquí, un solo paso en la GPU por fotograma: refracción con el mapa de la forma actual,
// desenfoque (leyendo de un nivel más pequeño de la imagen), saturación y el canto
const GLVS = 'attribute vec2 a;varying vec2 p;uniform vec2 S;void main(){p=a*S;gl_Position=vec4(a.x*2.-1.,1.-a.y*2.,0.,1.);}'
const GLFS = `precision mediump float;varying vec2 p;uniform sampler2D B,M;uniform vec4 T,U;uniform float K,Z,L,A,E,C,Q;
vec3 bg(vec2 q){return texture2D(B,q*T.xy+T.zw,L).rgb;}
float lu(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){vec2 u=(p-U.xy)/U.zw;vec3 m=(u.x<0.||u.y<0.||u.x>1.||u.y>1.)?vec3(.5,.5,0.):texture2D(M,u).rgb;
vec2 q=p+K*(m.rg-.5);vec3 c=vec3(0.);float w=0.;
for(int i=0;i<16;i++){float f=float(i),r=sqrt((f+.5)/16.)*Z,a=f*2.39996,g=exp(-2.*r*r/max(Z*Z,.01));c+=bg(q+vec2(cos(a),sin(a))*r)*g;w+=g;}
c/=w;c=mix(vec3(lu(c)),c,A);vec3 e=mix(vec3(lu(c)),c,Q);e=(e*C+(.5-.5*C))*E;c=mix(c,clamp(e,0.,1.),m.b);
gl_FragColor=vec4(c,1.);}`
const GLOK = !LENS && typeof document != 'undefined' && (() => { try { return !!document.createElement('canvas').getContext('webgl') } catch { return false } })()
// Un solo contexto WebGL para todos los vidrios de la página (Safari en iPhone admite unos pocos
// activos y pierde los más viejos). Cada vidrio tiene sus texturas y su canvas 2D: el motor pinta
// en su lienzo compartido, abajo a la izquierda, y el vidrio copia ese trozo a su canvas
let GLS = null
function glShared() {
  if (GLS !== null) return GLS
  GLS = false
  const cv = document.createElement('canvas'), gl = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false })
  if (!gl) return GLS
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o }
  const pr = gl.createProgram()
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, GLVS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GLFS)); gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return GLS
  gl.useProgram(pr)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
  const a = gl.getAttribLocation(pr, 'a')
  gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
  const U = {}
  for (const k of 'S B M T U K Z L A E C Q'.split(' ')) U[k] = gl.getUniformLocation(pr, k)
  gl.uniform1i(U.B, 0); gl.uniform1i(U.M, 1)
  // (si el sistema reclama el contexto, se rehace en el siguiente uso)
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); GLS = null })
  return GLS = { cv, gl, U }
}
function glLens(out) {
  const S = glShared()
  if (!S) return null
  const { gl, U } = S, o2 = out.getContext('2d')
  const tex = () => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return t
  }
  gl.activeTexture(gl.TEXTURE0)
  const tB = tex(), tM = tex()
  const pot = document.createElement('canvas')
  return {
    // el fondo, copiado a un lienzo de lado potencia de dos con mipmaps: el desenfoque lee de un
    // nivel más pequeño y sólo afina con 16 muestras. Lanza SecurityError si la imagen no es legible
    bg(src, w, h) {
      const P = n => 2 ** Math.max(1, Math.min(11, Math.ceil(Math.log2(Math.max(2, n)))))
      const W = P(w), H = P(h)
      if (pot.width != W || pot.height != H) { pot.width = W; pot.height = H }
      pot.getContext('2d').drawImage(src, 0, 0, W, H)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tB)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pot)
      gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      return W
    },
    map(c) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tM); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c) },
    // o: { w, h (capa, px), q (densidad), T: [sx, sy, ox, oy] de px de la capa a uv de la imagen,
    // M: [x, y, w, h] del mapa en la capa, k (lente px), z (desenfoque px), l (nivel), sat, rim }
    draw(o) {
      if (GLS != S || gl.isContextLost()) return false
      // el lienzo compartido crece hasta el mayor vidrio; éste se pinta en su esquina inferior izquierda
      const w = out.width, h = out.height, cv = S.cv
      if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h) }
      gl.viewport(0, 0, w, h)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tB)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tM)
      gl.uniform2f(U.S, o.w, o.h); gl.uniform4f(U.T, ...o.T); gl.uniform4f(U.U, ...o.M)
      gl.uniform1f(U.K, o.k); gl.uniform1f(U.Z, o.z); gl.uniform1f(U.L, o.l); gl.uniform1f(U.A, o.sat)
      gl.uniform1f(U.E, o.rim[0]); gl.uniform1f(U.C, o.rim[1]); gl.uniform1f(U.Q, o.rim[2])
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      o2.clearRect(0, 0, w, h)
      o2.drawImage(cv, 0, cv.height - h, w, h, 0, 0, w, h)
    },
    free() { gl.deleteTexture(tB); gl.deleteTexture(tM) },
  }
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
    if (!prism) { L.disp = [D('d', 1)]; L.f.replaceChildren(L.map, ...L.disp, L.blur, L.sat, ...L.rim); return }
    // (cada uno conserva su canal con alfa 1; la suma aritmética recorta el alfa a 1 y el color queda entero)
    const keep = (i, s) => mk('feColorMatrix', { in: s, result: s + 'c', type: 'matrix', values: [0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => +(r == i && c == i)).join(' ')).join(' ') + ' 0 0 0 1 0' })
    L.disp = [D('r', 1.12), D('g', 1), D('b', .88)]
    const add = (a, b, s) => mk('feComposite', { in: a, in2: b, operator: 'arithmetic', k2: 1, k3: 1, result: s })
    L.f.replaceChildren(L.map, ...L.disp, keep(0, 'r'), keep(1, 'g'), keep(2, 'b'), add('rc', 'gc', 'rg'), add('rg', 'bc', 'd'), L.blur, L.sat, ...L.rim)
  }
  // El canto va dentro del mismo filtro: lo de detrás, más luminoso y saturado, sólo en una franja
  // junto al borde (una imagen: el trazo del contorno desenfocado y recortado a la forma). Una capa
  // aparte con backdrop-filter y máscara no sirve: Chromium no recorta el desenfoque de fondo con la
  // máscara del propio elemento y aclaraba el vidrio entero
  const rimChain = () => {
    const img = mk('feImage', { result: 'e', preserveAspectRatio: 'none' })
    const sat = mk('feColorMatrix', { in: 'o', type: 'saturate', result: 'es' })
    const tone = mk('feComponentTransfer', { in: 'es', result: 'et' }), fn = ['R', 'G', 'B'].map(c => mk('feFunc' + c, { type: 'linear' }))
    tone.append(...fn)
    const cut = mk('feComposite', { in: 'et', in2: 'e', operator: 'in', result: 'ei' }), merge = mk('feMerge')
    merge.append(mk('feMergeNode', { in: 'o' }), mk('feMergeNode', { in: 'ei' }))
    return { img, sat, fn, nodes: [img, sat, tone, cut, merge] }
  }
  const lenses = [0, 1].map(n => {
    // (fuera de Chromium, región del objeto: WebKit pierde el elemento entero con userSpaceOnUse)
    const f = mk('filter', LENS ? { id: id + 'l' + n, x: 0, y: 0, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' } : { id: id + 'l' + n, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' })
    const map = mk('feImage', { result: 'm', preserveAspectRatio: 'none' })
    const blur = mk('feGaussianBlur', { in: 'd', result: 'b' }), sat = mk('feColorMatrix', { in: 'b', type: 'saturate', result: 'o' })
    const edge = rimChain()
    const L = { f, map, blur, sat, edge, rim: edge.nodes, disp: [], prism: null }
    chain(L, false)
    return L
  })
  const defs = mk('defs')
  defs.append(
    // brillo interior del vidrio, arriba (el canto lo pone ns-light)
    stops(mk('radialGradient', { id: id + 's', cx: .5, cy: -.15, r: .95 }), [[0, .22], [.55, .05], [1, 0]]),
    maskB, maskE, clipE, fEdge, ...lenses.map(l => l.f))
  // el canto: la silueta con el filtro de luz de ns-light (una línea especular donde el borde mira a
  // la luz de la página y un reflejo tenue enfrente), nítido a cualquier zoom
  const path = mk('path', { class: 'ns-lf' }), rim = mk('path', { class: 'ns-lr' })
  // Halo (--ns-glass-glow): un trazo desenfocado del contorno que sólo se ve por fuera (una máscara
  // quita el interior). Sin filter en el elemento, que haría de raíz del fondo y apagaría el vidrio
  const gBlur = mk('feGaussianBlur'), fGlow = mk('filter', { id: id + 'g', x: '-50%', y: '-50%', width: '200%', height: '200%' }); fGlow.append(gBlur)
  const oRect = mk('rect', { fill: '#fff' }), oCut = mk('path', { fill: '#000' }), mGlow = mk('mask', { id: id + 'o', maskUnits: 'userSpaceOnUse' }); mGlow.append(oRect, oCut)
  defs.append(fGlow, mGlow)
  const glow = mk('path', { class: 'ns-lg', filter: `url(#${id}g)`, mask: `url(#${id}o)` })
  // Sombra (--ns-glass-shadow): la forma desenfocada y algo más abajo, también sólo por fuera. Separa
  // el cristal del fondo sin un contorno
  const sB = mk('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 9, result: 'b' }), sO = mk('feOffset', { in: 'b', dx: 0, dy: 7 })
  const fShadow = mk('filter', { id: id + 'h', x: '-50%', y: '-50%', width: '200%', height: '200%' }); fShadow.append(sB, sO); defs.append(fShadow)
  const shadow = mk('path', { class: 'ns-lsh', filter: `url(#${id}h)`, mask: `url(#${id}o)` })
  svg.append(defs, shadow, glow, path, rim)
  const glass = div('ns-liquid-glass'), edge = div('ns-liquid-rim')
  // Lente donde backdrop-filter no admite filtros SVG (Safari, Firefox): si se indica qué hay
  // detrás (data-ns-liquid-src="selector" u o.source: una imagen o un elemento con background-image),
  // se pinta una copia alineada debajo del vidrio y la lente se le aplica con filter: url(), que sí
  // funciona en todos. El cuerpo del vidrio la desenfoca y la tiñe encima, como al fondo real.
  const back = div('ns-liquid-src'), copy = document.createElement('div')
  // (hold recorta la copia a la forma antes de la lente, como hace Chromium con el fondo: lo de fuera
  // no entra doblado por el canto)
  const hold = document.createElement('div')
  hold.append(copy); back.append(hold); back.hidden = true
  // orden de pintado: copia del fondo, cuerpo, canto, luz y encima los hijos
  el.prepend(back, glass, edge, svg)
  const cv = document.createElement('canvas')
  let cv2 = null
  const list = () => typeof o.blobs == 'function' ? o.blobs(el) : [...el.querySelectorAll(o.blobs || (el.querySelector(':scope > [data-ns-blob]') ? ':scope > [data-ns-blob]' : ':scope > :not(.ns-liquid-fx, .ns-liquid-glass, .ns-liquid-rim, .ns-liquid-src)'))]
  // el fondo que se copia: el selector de data-ns-liquid-src (el más cercano subiendo por los
  // antepasados), o.source, o si no se indica nada, lo que haya detrás (behind)
  const source = () => {
    // (un grupo dentro de otro, como el indicador de unas pestañas, hereda el fondo del de fuera)
    const s = o.source ?? el.closest('[data-ns-liquid-src]')?.getAttribute('data-ns-liquid-src')
    if (s == 'none') return null
    if (s == 'page') return document.body
    // sin una imagen limpia detrás (texto, tarjetas, una foto con algo encima), la página entera:
    // un clon de lo que queda bajo el grupo (scene)
    if (!s || s == 'auto') {
      const b = behind(el)
      // (a media animación, como unas gotas que salen, behind puede no ver claro un fotograma: si la
      // foto que ya se copiaba sigue bajo el centro del grupo, se queda; si no, se pasaría a la
      // escena y luego no volvería)
      if (b === null && mirrored && !mirrored.contains(el)) {
        const r = el.getBoundingClientRect(), m = mirrored.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
        if (x >= m.left && x <= m.right && y >= m.top && y <= m.bottom) return mirrored
      }
      return b === null ? document.body : b ?? null
    }
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
  // lente en WebGL: G (el motor), glc (su canvas), gsrc (lo que se sube: la imagen pedida con CORS,
  // el vídeo o el canvas), gsz (su tamaño natural), gW (ancho de la textura), gU (la url de la imagen)
  let G = null, glc = null, gsrc = null, gsz = null, gW = 1, gU = '', shaped = '', gTok = 0
  // rasterizado de la página (glr): su canvas, la clave de lo último pintado y los contadores de
  // cambios (mutaciones y desplazamientos: una lista que se mueve por detrás de una barra fija)
  let rcv = null, rKey = '', mutT = 0, scrT = 0
  const glUp = () => { try { glc ||= Object.assign(document.createElement('canvas'), { className: 'ns-liquid-gl' }); G ||= glLens(glc) } catch { } return !!G }
  const unmirror = () => {
    cancelAnimationFrame(live); live = 0; smo?.disconnect(); smo = null; clearTimeout(redo); cancelAnimationFrame(redo); redo = 0; zone = null
    if (kind == 'gl' || kind == 'glr') { glc.remove(); glass.style.backdropFilter = ''; lensKey = '' }
    gTok++; gsrc = null; gU = ''
    copy.replaceChildren(); copy.removeAttribute('style'); cc = null; kind = ''; placed = ''
  }
  const mirror = n => {
    unmirror()
    const s = getComputedStyle(n), c = copy.style, t = n.tagName
    // contenido HTML o la página: con WebGL, la zona bajo el grupo se rasteriza en un canvas y la
    // lente es la de WebGL (se repinta al desplazarse o al cambiar la página)
    if (GLOK && !/^(IMG|VIDEO|CANVAS)$/.test(t) && (n.contains(el) || n.children.length || n.textContent.trim()) && glUp()) {
      kind = 'glr'; rKey = ''
      copy.style.display = 'none'; hold.append(glc)
      back.style.filter = glc.style.filter = ''; glass.style.backdropFilter = 'none'
      smo = new MutationObserver(R => { if (R.some(r => !quiet(r.target))) { mutT++; wake() } })
      smo.observe(n, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'src', 'hidden', 'open'] })
      return
    }
    if (n.contains(el)) {
      // la página (o un antepasado): clon de la zona bajo el grupo, que se rehace cuando la página
      // cambia o el grupo se aleja de la zona clonada (una barra fija al desplazarse)
      kind = 'scene'
      scene(n)
      smo = new MutationObserver(R => { if (R.some(r => !quiet(r.target))) later() })
      smo.observe(n, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'src', 'hidden', 'open'] })
    } else if (t == 'IMG') {
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
      // (en un momento libre del hilo si el navegador lo ofrece: no compite con una animación)
      const rebuild = () => { redo = 0; if (kind == 'dom') { copy.replaceChildren(); snap(n) } }
      smo = new MutationObserver(() => { redo ||= setTimeout(() => globalThis.requestIdleCallback ? requestIdleCallback(rebuild, { timeout: 500 }) : rebuild(), 250) })
      smo.observe(n, { subtree: true, childList: true, characterData: true, attributes: true })
    } else {
      kind = 'bg'
      Object.assign(c, { backgroundImage: s.backgroundImage, backgroundSize: s.backgroundSize, backgroundPosition: s.backgroundPosition, backgroundRepeat: s.backgroundRepeat, backgroundColor: s.backgroundColor })
    }
    if (kind != 'dom' && kind != 'scene') c.filter = s.filter == 'none' ? '' : s.filter
    glTry(n)
  }
  // La lente pasa a WebGL si se puede leer el fondo: una imagen (se pide otra vez con CORS; mientras
  // llega, sigue la copia con filtros), un vídeo o un canvas del mismo origen. Si no, se queda así
  const glTry = n => {
    const t = n.tagName
    if (!GLOK || !/^(IMG|VIDEO|CANVAS)$/.test(t)) return
    const tok = gTok
    const go = src => {
      if (tok != gTok || mirrored != n) return
      const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height
      if (!w || !h) return
      try {
        glc ||= Object.assign(document.createElement('canvas'), { className: 'ns-liquid-gl' })
        G ||= glLens(glc)
        if (!G) return
        gW = G.bg(src, w, h)
      } catch { return }
      cancelAnimationFrame(live); live = 0
      kind = 'gl'; gsrc = src; gsz = [w, h]; shaped = ''
      copy.replaceChildren(); copy.style.display = 'none'; hold.append(glc)
      back.style.filter = ''; glass.style.backdropFilter = 'none'
      glc.style.filter = getComputedStyle(n).filter.replace('none', '')
      glFrame()
      if (t != 'IMG') glLive()
    }
    if (t == 'IMG') {
      const u = gU = n.currentSrc || n.src
      if (!u) return
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => go(im)
      im.src = u
    } else go(n)
  }
  // vídeo o canvas: la textura se renueva cada fotograma mientras el grupo se ve
  const glLive = () => {
    live = requestAnimationFrame(() => {
      live = 0
      if (kind != 'gl' || !vis || back.hidden) return
      try { G.bg(gsrc, gsz[0], gsz[1]) } catch { }
      glFrame(); glLive()
    })
  }
  // un fotograma de la lente: el mapa de la forma actual (sólo si cambió) y la imagen colocada donde
  // está el original respecto a la capa (con su object-fit)
  const glFrame = () => {
    if ((kind != 'gl' && kind != 'glr') || !now || !G || !mirrored) return
    const q = Math.min(2, devicePixelRatio || 1), W = Math.max(1, Math.round(now.bw * q)), H = Math.max(1, Math.round(now.bh * q))
    if (glc.width != W || glc.height != H) { glc.width = W; glc.height = H; shaped = '' }
    Object.assign(glc.style, { width: r2(now.bw) + 'px', height: r2(now.bh) + 'px' })
    const f = now.f, sk = [now.d, now.bw, now.bh, now.depth, now.hard, now.zoom, now.edge].join('|')
    if (sk != shaped) { shaped = sk; paintMap(f, now.depth, cv, now.hard, now.zoom, now.edge); G.map(cv) }
    let ix, iy, iw, ih
    if (kind == 'glr') {
      // la zona de la capa en pantalla, rasterizada si algo cambió (posición, página o desplazamiento)
      const R = { left: OX + LX * SC, top: OY + LY * SC, width: now.bw * SC, height: now.bh * SC }, k = [R.left, R.top, R.width, R.height].map(r2).join() + '|' + mutT + '|' + scrT
      if (k != rKey) {
        rKey = k
        raster(mirrored, el, R, rcv ||= document.createElement('canvas'), q, () => { mutT++; wake() })
        try { gW = G.bg(rcv, rcv.width, rcv.height) } catch { return }
      }
      ix = R.left; iy = R.top; iw = R.width; ih = R.height
    } else [ix, iy, iw, ih] = fitRect(mirrored, mirrored.getBoundingClientRect(), gsz[0], gsz[1])
    const x0 = (ix - OX) / SC - LX, y0 = (iy - OY) / SC - LY, w = iw / SC, h = ih / SC, b = V.blur
    const ok = G.draw({ w: now.bw, h: now.bh, T: [1 / w, 1 / h, -x0 / w, -y0 / h], M: [f.X0, f.Y0, f.nx * f.step, f.ny * f.step],
      k: now.lensPx, z: b * 2, l: Math.max(0, Math.log2(Math.max(1, b * gW / w)) - 1), sat: V.sat,
      rim: now.light ? [1.04, 1.05, 1.1] : [1.22, 1.06, 1.15] })
    // (el sistema reclamó el contexto: la lente se monta de nuevo con uno nuevo)
    if (ok === false) { G = null; mirrored = null; stale() }
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
      for (const a of m.attributes) if (!NOATTR.test(a.name)) c.setAttribute(a.name, a.value)
      // sólo lo que cambia cómo se ve (unas 100 propiedades, no las ~370 del estilo calculado)
      const s = getComputedStyle(m)
      for (const p of LOOK) { const v = s.getPropertyValue(p); v && c.style.setProperty(p, v) }
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
  // La escena: la página clonada sólo donde hace falta. Se recorre desde la raíz y
  // · lo que corta la zona bajo el grupo (con un margen para desplazarse sin rehacerla) se clona
  //   con su aspecto, como en snap;
  // · un bloque que no la toca se deja como una caja vacía e invisible del mismo tamaño, para que
  //   el resto quede donde está (lo que no ocupa sitio, fijo o absoluto, ni eso);
  // · el propio grupo y las capas de otros vidrios no se copian.
  // zone: la posición del grupo respecto a la raíz al clonar; si se aleja más de medio margen (una
  // barra fija al desplazar la página), se rehace
  let zone = null
  const BOX = ('display position top right bottom left float clear box-sizing width height margin-top margin-right margin-bottom margin-left ' +
    'padding-top padding-right padding-bottom padding-left border-top-width border-right-width border-bottom-width border-left-width ' +
    'border-top-style border-right-style border-bottom-style border-left-style flex-grow flex-shrink flex-basis align-self justify-self order ' +
    'grid-column-start grid-column-end grid-row-start grid-row-end vertical-align').split(' ')
  const scene = n => {
    const E = el.getBoundingClientRect(), N = n.getBoundingClientRect()
    const mx = 40 + (V?.lens || 34), my = Math.max(innerHeight * .75, 400)
    const R = { l: E.left - mx, r: E.right + mx, t: E.top - my, b: E.bottom + my }
    zone = { x: E.left - N.left, y: E.top - N.top, my }
    let budget = CAP * 2
    scrolls = []
    const walk = (m, top) => {
      if (m.nodeType == 3) return document.createTextNode(m.data)
      if (m.nodeType != 1 || SKIP.test(m.tagName) || m.matches('.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim')) return null
      const s = getComputedStyle(m), html = m.namespaceURI == HTML
      if (s.display == 'none' || (!top && s.position == 'fixed')) return null
      const b = m.getBoundingClientRect(), hit = b.right > R.l && b.left < R.r && b.bottom > R.t && b.top < R.b
      // (el grupo, o un bloque fuera de la zona: su hueco; un elemento en línea se copia entero,
      // porque sus líneas pueden cruzar la zona aunque su caja no)
      if (html && (m == el || (!hit && !/^(inline|contents)$/.test(s.display)))) {
        if (s.position == 'absolute' || s.position == 'fixed') return null
        const c = document.createElement('div')
        for (const p of BOX) c.style.setProperty(p, s.getPropertyValue(p))
        c.style.display = /inline/.test(s.display) ? 'inline-block' : /^(flex|grid|table|flow-root|list-item)$/.test(s.display) ? 'block' : s.display
        c.style.visibility = 'hidden'
        return c
      }
      if (budget-- <= 0) return null
      const c = document.createElementNS(m.namespaceURI, m.localName)
      for (const a of m.attributes) if (!NOATTR.test(a.name)) c.setAttribute(a.name, a.value)
      for (const p of LOOK) { const v = s.getPropertyValue(p); v && c.style.setProperty(p, v) }
      c.style.animation = c.style.transition = 'none'
      // (lo pegajoso, en su sitio de ahora; en la copia no hay desplazamiento que lo mueva)
      if (s.position == 'sticky') c.style.position = 'relative'
      if (html && (m.scrollHeight > m.clientHeight + 1 || m.scrollWidth > m.clientWidth + 1)) scrolls.push([c, m])
      for (const k of m.childNodes) { const x = walk(k); x && c.append(x) }
      return c
    }
    const root = walk(n, true)
    if (budget < 0 || !root) { copy.replaceChildren(); return }
    Object.assign(root.style, { position: 'absolute', left: 0, top: 0, margin: 0, transform: 'none', translate: 'none', rotate: 'none', scale: 'none' })
    // (el fondo del body puede estar en <html>: el lienzo de la página)
    if (/^(transparent|rgba\(.*,\s*0\))$/.test(root.style.backgroundColor)) {
      const h = getComputedStyle(document.documentElement)
      root.style.backgroundColor = h.backgroundColor; if (h.backgroundImage != 'none') root.style.backgroundImage = h.backgroundImage
    }
    root.setAttribute('inert', ''); root.setAttribute('aria-hidden', 'true')
    copy.replaceChildren(root)
    syncScroll()
  }
  // cambios que no se ven en la escena: los del propio grupo y los de otros grupos líquidos (sus
  // capas y sus piezas se mueven en cada fotograma)
  const quiet = t => { const e = t.nodeType == 1 ? t : t.parentElement; return !e || el.contains(e) || !!e.closest('.ns-liquid') }
  // rehacer la escena, como mucho cuatro veces por segundo y en un momento libre
  const later = () => { redo ||= setTimeout(() => { const f = () => { redo = 0; if (kind == 'scene' && mirrored) scene(mirrored) }; globalThis.requestIdleCallback ? requestIdleCallback(f, { timeout: 300 }) : f() }, 250) }
  // lo que el original tiene desplazado por dentro, también (y al desplazarse, sin rehacer el clon)
  let scrolls = []
  const syncScroll = () => { for (const [c, m] of scrolls) { c.scrollTop = m.scrollTop; c.scrollLeft = m.scrollLeft } }
  // al desplazarse la página o un contenedor, la copia se recoloca (y el clon copia el desplazamiento)
  const onScroll = () => {
    if (V?.src && vis) { scrT++; fr ||= requestAnimationFrame(follow) }
    // (lo de detrás cambia al desplazarse: una barra fija pasa de una zona clara a una oscura)
    if (vis && performance.now() - toned > 150) tone()
  }
  // vidrio claro sobre fondos claros (como el de Apple), salvo que se fije --ns-glass-tint
  let toned = 0
  // Con un tinte propio (un vidrio oscuro de diseño, como una barra de pestañas) no se invierte:
  // sobre lo claro se oscurece un poco más y el texto sigue blanco, como la barra de Instagram
  // (invertir sólo el texto dejaba un vidrio oscuro con letras oscuras: turbio)
  const tone = () => {
    toned = performance.now()
    const b = glassy() ? bright(el, stale) : undefined
    if (b === undefined) return
    const own = !!getComputedStyle(el).getPropertyValue('--ns-glass-tint').trim()
    el.classList.toggle('ns-glass-light', b && !own)
    el.classList.toggle('ns-glass-deep', b && own)
  }
  // La copia, donde está el original respecto a las capas. OX, OY: origen del grupo en pantalla;
  // SC: su escala (un grupo con scale o transform: la barra que se encoge al desplazar); LX, LY:
  // origen de las capas en coordenadas del grupo. La copia se desescala para verse a tamaño real
  let OX = 0, OY = 0, SC = 1, LX = 0, LY = 0, placed = '', fr = 0
  const origin = () => {
    const E = el.getBoundingClientRect()
    SC = el.offsetWidth ? E.width / el.offsetWidth || 1 : 1
    OX = E.left + el.clientLeft * SC; OY = E.top + el.clientTop * SC
    return E
  }
  const put = S => {
    const at = [r2((S.left - OX) / SC - LX), r2((S.top - OY) / SC - LY), r2(S.width), r2(S.height), r2(1 / SC)], k = at.join()
    if (k != placed) { placed = k; Object.assign(copy.style, { left: at[0] + 'px', top: at[1] + 'px', width: at[2] + 'px', height: at[3] + 'px', transform: SC != 1 ? `scale(${at[4]})` : '', transformOrigin: '0 0' }) }
  }
  const follow = () => {
    fr = 0
    const s = V?.src
    if (!s || back.hidden) return
    if (kind == 'dom' || kind == 'scene') syncScroll()
    // el grupo también puede haberse movido (si no es fijo): el origen se relee
    const E = origin()
    // la escena se rehace antes de que el grupo salga de la zona clonada
    if (kind == 'scene' && zone && !redo) {
      const N = s.getBoundingClientRect()
      if (Math.abs(E.top - N.top - zone.y) > zone.my / 2 || Math.abs(E.left - N.left - zone.x) > 40) { redo = requestAnimationFrame(() => { redo = 0; kind == 'scene' && scene(s) }) }
    }
    put(s.getBoundingClientRect())
    glFrame()
  }
  let raf = 0, idle = 0, cost = 3, last = '', lastPre = '', lastVk = '', remap = false, msig = '', now = null, cur = -1, lensKey = '', token = 0, frame = 0, dirty = true, V = null
  // estilos leídos en caché: las variables del grupo y el radio/visibilidad de cada hijo se leen al
  // despertar por un cambio (clase, estilo, tamaño) y cada pocos frames en marcha, no en cada frame
  const look = new WeakMap()
  const draw = () => {
    origin()
    const fresh = dirty || frame % 6 == 0
    if (dirty || !V) {
      // (el tono va antes: el vidrio claro desenfoca y satura más por defecto)
      tone()
      const cs = getComputedStyle(el), num = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return v >= 0 ? v : d }, lt = el.classList.contains('ns-glass-light')
      V = { k: num('--ns-liquid', 14), lens: num('--ns-glass-lens', 34), edge: num('--ns-glass-edge', 8), depth: num('--ns-glass-depth', 24), blur: num('--ns-glass-blur', lt ? 7 : 4), sat: num('--ns-glass-sat', lt ? 1.2 : 1.3), src: LENS || !glassy() ? null : source(), prism: !!o.prism?.(), hard: !!o.hard?.(), shadow: cs.getPropertyValue('--ns-glass-shadow').trim(), glow: cs.getPropertyValue('--ns-glass-glow').trim(), glowSize: num('--ns-glass-glow-size', 16), zoom: Math.min(1, num('--ns-glass-zoom', 0)),
        // canto: intensidad y reflejo opuesto (su fuerza y su color: la luz en U lo tiñe)
        light: lt, rim: num('--ns-glass-rim', 1), back: num('--ns-glass-rim-back', .5), backColor: cs.getPropertyValue('--ns-glass-rim-color').trim() || '#fff' }
      // si cambió algo del mapa de la lente (al levantarse un indicador, por ejemplo), se regenera ya,
      // aunque la forma siga en marcha; si no, sólo al detenerse
      const vk = [V.lens, V.depth, V.zoom, V.hard, V.prism].join()
      if (vk != lastVk) { lastVk = vk; remap = true }
      // prisma: se monta o se desmonta la cadena de los dos filtros (y se regenera la lente)
      if (lenses[0].prism !== V.prism) { lenses.forEach(L => chain(L, V.prism)); lensKey = ''; lastPre = '' }
      // (el clon del DOM y el de fotogramas se rehacen sólo si cambia el original; la imagen y el
      // fondo, que no cuestan nada, siempre: pueden haber cambiado de src o de estilo)
      // (en WebGL, un filtro nuevo en la imagen, como el del editor, sólo cambia el del canvas; otra
      // url sí rehace la copia)
      if (kind == 'gl' && V.src == mirrored) glc.style.filter = getComputedStyle(V.src).filter.replace('none', '')
      if (V.src != mirrored || ((kind == 'img' || kind == 'bg') && sig(V.src) != msig) || (kind == 'gl' && gU && gU != (V.src.currentSrc || V.src.src))) { mirrored = V.src; msig = V.src ? sig(V.src) : ''; V.src ? mirror(V.src) : unmirror() }
    }
    dirty = false; frame++
    const k = o.k ?? V.k
    const g = glassy(), src = g ? V.src : null, lensPx = g && (LENS || src) ? V.lens : 0, edgePx = V.edge, depth = V.depth
    const S = src?.getBoundingClientRect()
    const tail = `|${g}|${lensPx}|${edgePx}|${!!src}|${depth}|${V.blur}|${V.sat}|${V.light}|${V.hard}|${V.shadow}|${V.glow}`
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
        // (en coordenadas del grupo: si está escalado, las medidas en pantalla se dividen por su escala)
        const w = r.width / SC, h = r.height / SC
        return { x: (r.left - OX) / SC, y: (r.top - OY) / SC, w, h, r: px(L.rad, Math.min(w, h)) }
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
    LX = bx; LY = by
    if (S) put(S)
    // si las piezas y los parámetros no cambiaron, la forma tampoco: ni campo ni contorno (un grupo
    // se despierta a menudo por otro que se mueve dentro o cerca, y así no le cuesta nada)
    if (pre == lastPre) { glFrame(); return }
    lastPre = pre
    const [f, d] = make()
    const key = d + '|' + bx + '|' + by + '|' + g + '|' + lensPx + '|' + edgePx + '|' + !!src
    if (key == last) return
    last = key
    for (const e of [svg, glass, edge, back]) Object.assign(e.style, { left: r2(bx) + 'px', top: r2(by) + 'px', width: r2(bw) + 'px', height: r2(bh) + 'px' })
    svg.setAttribute('viewBox', `0 0 ${r2(bw)} ${r2(bh)}`)
    path.setAttribute('d', d); rim.setAttribute('d', d)
    // halo: sólo si hay color; el desenfoque crece con el tamaño pedido
    const gs = V.glowSize, gOn = g && d && V.glow, sOn = g && d && V.shadow
    glow.setAttribute('d', gOn ? d : ''); shadow.setAttribute('d', sOn ? d : '')
    if (gOn || sOn) {
      const p = Math.max(gs * 3, 40), R = { x: -p, y: -p, width: r2(bw + p * 2), height: r2(bh + p * 2) }
      setA(mGlow, R); setA(oRect, R); oCut.setAttribute('d', d)
    }
    if (gOn) { setA(glow, { stroke: V.glow, 'stroke-width': r2(gs) }); gBlur.setAttribute('stdDeviation', r2(gs / 2.4)) }
    if (sOn) shadow.setAttribute('fill', V.shadow)
    // segundo reflejo: un contorno 1,6 px hacia dentro (sólo en vidrio)
    if (g && d) rim.setAttribute('filter', `url(#${material({ rim: true, b: V.hard ? .8 : 1.3, s: 1.3, ks: +(.95 * V.rim).toFixed(2), n: 110, back: V.back, backColor: V.backColor })})`)
    el.classList.toggle('ns-glass', g)
    // (estilo en línea: el relleno de la capa en CSS ganaría a un atributo fill)
    path.style.fill = g ? `url(#${id}s)` : ''
    // (WebKit no aplica a HTML una máscara que apunta a un <mask> del documento: la capa entera
    // desaparece. Allí el cuerpo se recorta sólo con clip-path, y el canto usa la misma máscara
    // como imagen SVG en línea)
    const mb = g && d && !WK ? `url(#${id}m)` : '', me = g && d ? rimImage(d, bw, bh, edgePx) : ''
    glass.style.mask = glass.style.webkitMask = mb
    setRim(me)
    // y además clip-path: si un navegador no aplica una máscara SVG del documento a un elemento
    // HTML, el vidrio sigue teniendo la forma exacta (nunca un rectángulo)
    glass.style.clipPath = edge.style.clipPath = back.style.clipPath = hold.style.clipPath = g && d ? `path("${d}")` : ''
    back.style.mask = back.style.webkitMask = mb
    back.hidden = !(src && d)
    if (!g || !d) { glass.style.backdropFilter = back.style.filter = ''; now = null; return }
    for (const M of [maskB, maskE]) setA(M, { width: r2(bw), height: r2(bh) })
    mBody.setAttribute('d', d); mEdge.setAttribute('d', d); cEdge.setAttribute('d', d)
    mEdge.setAttribute('stroke-width', r2(edgePx * 1.6)); eBlur.setAttribute('stdDeviation', r2(edgePx / 2.2))
    // (con lente, el canto va dentro de su filtro; la capa aparte sólo queda de respaldo)
    edge.style.display = lensPx && (LENS || src) ? 'none' : ''
    if (!lensPx) { glass.style.backdropFilter = back.style.filter = ''; now = null; return }
    // sobre la copia, la lente sólo desplaza: el desenfoque y la saturación los pone el cuerpo encima
    now = { f, d, bw, bh, depth, lensPx, blur: src ? 0 : V.blur, sat: src ? 1 : V.sat, src: !!src, hard: V.hard, zoom: V.zoom, light: V.light, rim: me.slice(5, -2), edge: edgePx }
    // en marcha: el mapa vigente sigue a la forma (se estira); el nuevo llega al detenerse. Sobre la
    // copia (fuera de Chromium) el mapa va con la capa y se estira a su tamaño: vale mientras la
    // forma se desplaza o se estira un poco (un indicador que se levanta); si cambia mucho (unas
    // gotas que salen), la lente se desvanece y vuelve con el mapa nuevo al detenerse
    if (cur >= 0) {
      if (now.src) lkT = mapWH && Math.abs(bw / mapWH[0] - 1) < .35 && Math.abs(bh / mapWH[1] - 1) < .35 ? 1 : 0
      place(lenses[cur], now)
    }
    // (en WebGL no hay mapa que esperar: la lente sigue a la forma en el mismo fotograma)
    glFrame()
  }
  // fuerza de la lente sobre la copia (0–1), con transición
  let lk = 1, lkT = 1, mapWH = null, rimTok = 0
  // canto en WebKit (imagen SVG en línea): la nueva sólo entra ya decodificada; mientras, sigue la
  // anterior (antes, durante un frame no había máscara y el canto brillaba entero: parpadeo)
  const setRim = u => {
    if (!u) { rimTok++; edge.style.mask = edge.style.webkitMask = u; return }
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
    // canto: brillo b y contraste c (como brightness() y contrast() de CSS) y más saturación; en el
    // vidrio claro, apenas más brillo (sobre un fondo claro, el canto se iría a blanco)
    const E = L.edge, b = s.light ? 1.04 : 1.22, c = s.light ? 1.05 : 1.06
    if (E.img.getAttribute('href') != s.rim) E.img.setAttribute('href', s.rim)
    setA(E.img, { width: r2(s.bw), height: r2(s.bh) })
    E.sat.setAttribute('values', s.light ? 1.1 : 1.15)
    for (const f of E.fn) setA(f, { slope: +(b * c).toFixed(3), intercept: +(b * (.5 - .5 * c)).toFixed(3) })
  }
  // mapa nuevo en el filtro libre; se cambia de filtro cuando la imagen ya está decodificada
  const refreshLens = () => {
    const s = now
    if (!s || kind == 'gl' || kind == 'glr') return
    const k = [s.d, s.bw, s.bh, s.depth, s.lensPx, s.blur, s.sat, s.src, s.hard, s.zoom, s.light, s.rim.length].join('|')
    if (k == lensKey) return
    lensKey = k
    const n = cur < 0 ? 0 : 1 - cur, L = lenses[n], t = ++token
    lensMap(s.f, s.depth, cv, s.src ? { cv: cv2 ||= document.createElement('canvas'), w: s.bw, h: s.bh } : null, s.hard, s.zoom).then(url => {
      if (t != token) return
      place(L, s)
      L.map.setAttribute('href', url)
      const img = new Image()
      img.src = url
      // se espera a que el filtro libre tenga el mapa cargado: dos frames en Chromium; en WebKit,
      // que carga el feImage aparte, seis (si no, un frame con el mapa vacío desplazaba todo)
      const after = (k, fn) => requestAnimationFrame(() => k > 1 ? after(k - 1, fn) : fn())
      const swap = () => after(WK ? 6 : 2, () => {
        if (t != token || !now || kind == 'gl' || kind == 'glr') return
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
    if (idle >= 1 || cur < 0 || remap) { remap = false; refreshLens() }
    // la lente de la copia se desvanece o vuelve en unos 150 ms
    let fading = false
    if (now?.src && cur >= 0 && Math.abs(lk - lkT) > .01) { lk += (lkT - lk) * .25; place(lenses[cur], now); fading = true }
    else if (Math.abs(lk - lkT) <= .01 && lk != lkT) { lk = lkT; now?.src && cur >= 0 && place(lenses[cur], now) }
    if (idle < 2 || fading) raf = requestAnimationFrame(tick)
  }
  const wake = () => { idle = 0; raf ||= requestAnimationFrame(tick) }
  // (se releen los estilos; la forma sólo se rehace si cambió algo que la define: un grupo que se
  // arrastra cambia su estilo en cada frame y no debe recalcular el campo)
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
  addEventListener('scroll', onScroll, { capture: true, passive: true })
  if (!LENS) {
    io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) { if (kind == 'frames' && !live) frames(mirrored); if (kind == 'gl' && !live && gsrc?.tagName != 'IMG') glLive(); if (!V?.src) stale() } })
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
