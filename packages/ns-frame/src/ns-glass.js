/*! ns-frame/glass · vidrio líquido en cualquier elemento y con cualquier forma */
// <aside data-ns-glass>…</aside>                          ← con su border-radius (cada esquina)
// <article data-ns="tl+br bevel 24; notch top 30% 12" data-ns-glass>…</article>   ← con su forma
//
// El material de ns-frame/liquid (cuerpo desenfocado, lente que curva el fondo en el borde, canto,
// reflejos) sobre un elemento cualquiera y con su forma exacta: chaflanes, muescas, cortes, curvas y
// squircles de ns-frame, o su border-radius. La lente sale del campo de distancias del propio path
// (rasterizado y con transformada de distancia exacta), así que se curva igual en un chaflán que en
// una esquina redonda. Lente en todos los motores (en Safari y Firefox, sobre una copia del fondo:
// ver ns-frame/liquid, data-ns-liquid-src).
// · data-ns-glass="clear": casi sin tinte (una lente); "tint": más cuerpo y más legibilidad.
// · Variables: las de ns-frame/liquid (--ns-glass-tint, -blur, -sat, -lens, -depth, -edge, -shine).
// · Un marco con vidrio no se recorta con clip-path (haría de raíz del fondo y el vidrio no vería la
//   página): el vidrio hace de silueta y el borde del marco se sigue dibujando. Lo que haya dentro
//   no se recorta: las imágenes que lleguen a los cortes, recórtalas con su propio data-ns.
// · Como cualquier vidrio: sin filter, opacity < 1, mask ni backdrop-filter en sus antepasados.

import { styles, path, shapeOf, update } from './ns-frame.js'
import { liquid } from './ns-liquid.js'

const CSS = `@layer ns{
[data-ns-glass]{background:none}
[data-ns-glass~=clear]{--ns-glass-tint:rgba(255,255,255,.02);--ns-glass-blur:1.5px}
[data-ns-glass~=tint]{--ns-glass-tint:rgba(18,18,22,.46);--ns-glass-blur:10px}
.ns-glass-facets g:first-child path{fill:var(--ns-facet-color,#fff)}
.ns-glass-facets g:last-child path{fill:none;stroke:var(--ns-facet-color,#fff);stroke-width:var(--ns-facet-line,1px);stroke-linecap:round}
@media (prefers-reduced-transparency:reduce),(forced-colors:active){.ns-glass-facets{display:none}}
}`
let styled = 0
const G = new WeakMap()
const px = v => parseFloat(v) || 0
// rectángulo con el border-radius real, esquina por esquina (elíptico si hace falta, con el mismo
// reparto que el navegador cuando los radios no caben)
function rounded(el, w, h) {
  const s = getComputedStyle(el), R = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(c => {
    const [a, b = a] = s['border' + c + 'Radius'].split(' ')
    return [a.endsWith('%') ? px(a) * w / 100 : px(a), b.endsWith('%') ? px(b) * h / 100 : px(b)]
  })
  const f = Math.min(1, w / (R[0][0] + R[1][0] || 1), w / (R[3][0] + R[2][0] || 1), h / (R[0][1] + R[3][1] || 1), h / (R[1][1] + R[2][1] || 1))
  const [tl, tr, br, bl] = R.map(([x, y]) => [x * f, y * f])
  const A = ([x, y], X, Y) => x && y ? `A${x} ${y} 0 0 1 ${X} ${Y}` : `L${X} ${Y}`
  return `M${tl[0]} 0L${w - tr[0]} 0${A(tr, w, tr[1])}L${w} ${h - br[1]}${A(br, w - br[0], h)}L${bl[0]} ${h}${A(bl, 0, h - bl[1])}L0 ${tl[1]}${A(tl, tl[0], 0)}Z`
}

// ── Cristal tallado (data-ns-glass="facet") ──
// Cada tramo del contorno es una faceta con su normal: un chaflán es una cara plana que se enciende
// entera; una curva, muchas caras pequeñas que dan un degradado. Cada faceta tiene una banda
// hacia dentro (la cara tallada) y una arista; las dos se iluminan según el ángulo entre su normal y
// la luz. La luz sigue al puntero; sin puntero fino (móvil), barre las facetas al desplazar la
// página, sin pedir permisos de giroscopio. Sólo cambia la opacidad de cada faceta: barato.

// contorno de un path (M, L, A, C, Z absolutos) como polígono: rectas tal cual, curvas en tramos de ~5 px
function flatten(d) {
  const t = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], P = []
  let i = 0, c = '', x = 0, y = 0
  const n = () => +t[i++]
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) { c = t[i++]; if (c == 'Z') continue }
    if (c == 'M' || c == 'L') { x = n(); y = n(); P.push([x, y, 1]) }
    else if (c == 'C') {
      const a = [n(), n()], b = [n(), n()], e = [n(), n()], L = Math.hypot(e[0] - x, e[1] - y), k = Math.max(2, Math.ceil(L / 5))
      for (let s = 1; s <= k; s++) { const u = s / k, v = 1 - u; P.push([v * v * v * x + 3 * v * v * u * a[0] + 3 * v * u * u * b[0] + u * u * u * e[0], v * v * v * y + 3 * v * v * u * a[1] + 3 * v * u * u * b[1] + u * u * u * e[1], s == k]) }
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
      const k = Math.max(2, Math.ceil(Math.abs(da) * Math.max(rx, ry) / 5))
      for (let s = 1; s <= k; s++) { const a = a0 + da * s / k; P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), s == k]) }
      x = X; y = Y
    }
  }
  // sin puntos repetidos (el cierre vuelve al inicio)
  return P.filter((p, j) => { const q = P[(j + P.length - 1) % P.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > .05 })
}
const SVGNS = 'http://www.w3.org/2000/svg'
const FAC = new Set()
let lx = -1, ly = -1, lraf = 0, MQ = null
const fine = () => (MQ ||= [matchMedia('(hover: hover) and (pointer: fine)'), matchMedia('(prefers-reduced-motion: reduce)')])[0].matches
const calm = () => (fine(), MQ[1].matches)
// todas las facetas en un frame: primero se leen todas las posiciones y luego se escribe (leer
// después de escribir obligaría a recalcular el layout una vez por elemento)
function light() {
  lraf = 0
  const all = [...FAC].filter(F => F.on())
  const R = all.map(F => F.el.getBoundingClientRect())
  all.forEach((F, i) => F.lit(R[i]))
}
const relight = () => { lraf ||= requestAnimationFrame(light) }
function facets(el) {
  const svg = document.createElementNS(SVGNS, 'svg')
  svg.setAttribute('class', 'ns-liquid-fx ns-glass-facets'); svg.setAttribute('aria-hidden', 'true')
  const gB = document.createElementNS(SVGNS, 'g'), gE = document.createElementNS(SVGNS, 'g')
  svg.append(gB, gE)
  let F = [], key = '', vis = false
  const build = (d, w, h) => {
    const k = d + w + h
    if (k == key) return
    key = k
    Object.assign(svg.style, { left: -el.clientLeft + 'px', top: -el.clientTop + 'px', width: w + 'px', height: h + 'px' })
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    const P = flatten(d), n = P.length
    if (n < 3) { gB.replaceChildren(); gE.replaceChildren(); F = []; return }
    // sentido del contorno: la normal hacia fuera depende de él
    let area = 0
    for (let j = 0; j < n; j++) { const a = P[j], b = P[(j + 1) % n]; area += a[0] * b[1] - b[0] * a[1] }
    const out = area > 0 ? 1 : -1, cs = getComputedStyle(el), W = parseFloat(cs.getPropertyValue('--ns-facet-width')) || 7
    const fb = [], fe = []
    F = []
    for (let j = 0; j < n; j++) {
      const a = P[j], b = P[(j + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (L < .5) continue
      const nx = (b[1] - a[1]) / L * out, ny = -(b[0] - a[0]) / L * out
      const band = document.createElementNS(SVGNS, 'path'), edge = document.createElementNS(SVGNS, 'path')
      band.setAttribute('d', `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${b[0] - nx * W} ${b[1] - ny * W}L${a[0] - nx * W} ${a[1] - ny * W}Z`)
      edge.setAttribute('d', `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`)
      band.setAttribute('opacity', 0); edge.setAttribute('opacity', 0)
      fb.push(band); fe.push(edge)
      F.push([nx, ny, band, edge, -1])
    }
    gB.replaceChildren(...fb); gE.replaceChildren(...fe)
    lit()
  }
  const lit = (r = el.getBoundingClientRect()) => {
    if (!vis || !F.length) return
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    let dx, dy
    if (calm()) { dx = -.6; dy = -.8 }
    else if (fine() && lx >= 0) { dx = lx - cx; dy = ly - cy }
    else {
      // sin puntero: la luz barre de izquierda a derecha según dónde esté el elemento en la pantalla
      const t = Math.max(-1, Math.min(1, (cy / innerHeight) * 2 - 1))
      dx = t * innerWidth * .6; dy = -innerHeight * .5
    }
    // la luz está por delante de la superficie: cuanto más lejos el puntero, más rasante
    const z = Math.max(r.width, r.height) * .6, l = Math.hypot(dx, dy, z)
    dx /= l; dy /= l
    for (const f of F) {
      // luz principal + un reflejo tenue por el lado contrario (la luz que atraviesa el cristal)
      const s = f[0] * dx + f[1] * dy, i = Math.max(0, s) ** 2 + Math.max(0, -s) ** 3 * .35, q = Math.round(i * 40) / 40
      if (q == f[4]) continue
      f[4] = q
      // (atributo, no style: los observadores del vidrio no escuchan este cambio, que es de cada frame)
      f[2].setAttribute('opacity', (.02 + q * .3).toFixed(3))
      f[3].setAttribute('opacity', (.12 + q * .88).toFixed(3))
    }
  }
  const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; vis && lit() })
  io.observe(el)
  const api = { build, lit, svg, el, on: () => vis && F.length > 0, destroy() { io.disconnect(); FAC.delete(api); svg.remove() } }
  FAC.add(api)
  if (FAC.size == 1) {
    addEventListener('pointermove', e => { if (e.pointerType == 'mouse' || e.pointerType == 'pen') { lx = e.clientX; ly = e.clientY; relight() } }, { passive: true })
    addEventListener('scroll', relight, { passive: true, capture: true })
    addEventListener('resize', relight)
  }
  return api
}

/** Vidrio líquido en `el`, con su forma de ns-frame o su border-radius. Opciones: las de liquid(). */
export function glass(el, o = {}) {
  if (G.has(el)) return G.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  const tok = () => (el.getAttribute('data-ns-glass') || '').split(/\s+/)
  let fc = null
  const shape = () => {
    const w = el.offsetWidth, hh = el.offsetHeight, s = shapeOf(el)
    if (!w || !hh) return null
    const d = s ? path(s, w, hh) : rounded(el, w, hh)
    // cristal tallado: las facetas, encima del vidrio y debajo del contenido
    if (tok().includes('facet')) {
      if (!fc) { fc = facets(el); (el.querySelector(':scope > .ns-liquid-fx') || el.firstChild)?.after(fc.svg) }
      fc.build(d, w, hh)
    } else if (fc) { fc.destroy(); fc = null }
    return { d, w, h: hh }
  }
  const h = liquid(el, { glass: true, prism: () => tok().includes('prism'), path: shape, ...o })
  // un marco de ns-frame deja de recortarse (lo lee el núcleo al pintar)
  if (el.hasAttribute('data-ns') || el.localName == 'ns-frame') update(el)
  const api = { ...h, destroy() { fc?.destroy(); h.destroy(); G.delete(el) } }
  G.set(el, api)
  return api
}

if (typeof document != 'undefined') {
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-glass]') && glass(n); n.querySelectorAll('[data-ns-glass]').forEach(glass) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => { for (const m of ms) m.type == 'childList' ? m.addedNodes.forEach(scan) : m.target.hasAttribute('data-ns-glass') && glass(m.target) })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ns-glass'] })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
