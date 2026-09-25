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
import { liquid, polyline } from './ns-liquid.js'

const CSS = `@layer ns{
[data-ns-glass]{background:none;--ns-glass-shadow:rgba(0,0,0,.28)}
[data-ns-glass]:not([data-ns-glass~=border]){--ns-border:transparent!important}
.ns-glass.ns-glass-shape>.ns-liquid-fx .ns-lr,.ns-glass.ns-glass-shape>.ns-liquid-fx .ns-lr2{display:none}
.ns-glass-light{position:absolute;pointer-events:none}
[data-ns-glass~=clear]{--ns-glass-tint:rgba(255,255,255,.02);--ns-glass-blur:1.5px}
[data-ns-glass~=tint]{--ns-glass-tint:rgba(18,18,22,.46);--ns-glass-blur:10px}
[data-ns-glass~=u]{--ns-glass-tint:radial-gradient(55% 45% at 6% 100%,color-mix(in srgb,var(--ns-u,#3de0ff) 42%,transparent),transparent),radial-gradient(55% 45% at 94% 100%,color-mix(in srgb,var(--ns-u,#3de0ff) 42%,transparent),transparent),linear-gradient(to top,color-mix(in srgb,var(--ns-u,#3de0ff) 26%,transparent),transparent 58%),rgba(12,14,18,.26)}
@media (forced-colors:active){.ns-glass-light{display:none}}
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

// ── Luz del canto ──
// El vidrio no lleva un contorno plano: el canto lo dibuja la luz. Cada tramo del contorno tiene su
// normal y brilla según el ángulo con la luz (fuerte donde mira a ella, un reflejo tenue enfrente y
// casi nada en los costados), como el especular del Liquid Glass. Un chaflán es una cara que se
// enciende entera; una curva, un degradado. Se pinta en un canvas recortado a la forma (el brillo
// queda por dentro del borde, nítido) y con mezcla "lighten": los tramos se solapan sin costuras.
// La luz sigue al puntero; sin puntero fino (móvil), barre las caras al desplazar la página.
// data-ns-glass="facet" (cristal tallado): además, cada cara tiene una banda hacia dentro que se
// ilumina con ella y una arista de corte, y la lente es plana por caras (el fondo se parte en cada
// corte, como en una gema).

const flatten = polyline
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
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
function lights(el) {
  const cv = document.createElement('canvas')
  cv.className = 'ns-liquid-fx ns-glass-light'; cv.setAttribute('aria-hidden', 'true')
  const x = cv.getContext('2d')
  let F = [], key = '', vis = false, clip = null, W = 0, H = 0, q = 1, last = '', cut = false, fw = 7, U = null
  const build = (d, w, h, facet, u) => {
    const k = d + w + h + facet + u
    if (k == key) return
    key = k; cut = facet; W = w; H = h; last = ''
    // luz en U: el canto de abajo brilla con el color de la U (se resuelve a rgb en la propia capa)
    if (u) { cv.style.color = getComputedStyle(el).getPropertyValue('--ns-u').trim() || '#3de0ff'; U = (getComputedStyle(cv).color.match(/[\d.]+/g) || [61, 224, 255]).slice(0, 3).map(Number) } else U = null
    q = Math.min(2, devicePixelRatio || 1)
    cv.width = Math.round(w * q); cv.height = Math.round(h * q)
    Object.assign(cv.style, { left: -el.clientLeft + 'px', top: -el.clientTop + 'px', width: w + 'px', height: h + 'px' })
    clip = new Path2D(d)
    const P = flatten(d), n = P.length
    F = []
    if (n < 3) return
    // sentido del contorno: la normal hacia fuera depende de él
    let area = 0
    for (let j = 0; j < n; j++) { const a = P[j], b = P[(j + 1) % n]; area += a[0] * b[1] - b[0] * a[1] }
    const out = area > 0 ? 1 : -1
    fw = parseFloat(getComputedStyle(el).getPropertyValue('--ns-facet-width')) || 8
    for (let j = 0; j < n; j++) {
      const a = P[j], b = P[(j + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (L < .3) continue
      F.push([a, b, (b[1] - a[1]) / L * out, -(b[0] - a[0]) / L * out])
    }
    lit()
  }
  const lit = (r = el.getBoundingClientRect()) => {
    if (!vis || !F.length) return
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    let dx, dy
    if (calm()) { dx = -.55; dy = -.85 }
    else if (fine() && lx >= 0) { dx = lx - cx; dy = ly - cy }
    else {
      // sin puntero: la luz barre de izquierda a derecha según dónde esté el elemento en la pantalla
      const t = Math.max(-1, Math.min(1, (cy / innerHeight) * 2 - 1))
      dx = t * innerWidth * .5; dy = -innerHeight * .6
    }
    // la luz está por delante de la superficie: cuanto más lejos el puntero, más rasante
    const z = Math.max(r.width, r.height) * .7, l = Math.hypot(dx, dy, z)
    dx /= l; dy /= l
    // (no se repinta si la luz apenas se movió)
    const k = Math.round(dx * 60) + ',' + Math.round(dy * 60)
    if (k == last) return
    last = k
    x.setTransform(q, 0, 0, q, 0, 0)
    x.clearRect(0, 0, W, H)
    x.save()
    x.clip(clip)
    x.globalCompositeOperation = 'lighten'
    x.lineCap = 'round'
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L
    for (const [a, b, nx, ny] of F) {
      const s = nx * ux + ny * uy
      // especular: fuerte y estrecho donde la cara mira a la luz; reflejo tenue enfrente
      const i = smooth(.25, 1, s) * .95 + smooth(.55, 1, -s) * .38, base = .07
      if (cut) {
        // cara tallada: una banda hacia dentro que se desvanece, y la arista del corte
        const g = x.createLinearGradient((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2 - nx * fw, (a[1] + b[1]) / 2 - ny * fw)
        g.addColorStop(0, `rgba(255,255,255,${(i * .3).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)')
        x.fillStyle = g
        x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(b[0] - nx * fw, b[1] - ny * fw); x.lineTo(a[0] - nx * fw, a[1] - ny * fw); x.closePath(); x.fill()
        x.strokeStyle = `rgba(255,255,255,${(i * .22).toFixed(3)})`; x.lineWidth = .8
        x.beginPath(); x.moveTo(a[0] - nx * fw, a[1] - ny * fw); x.lineTo(b[0] - nx * fw, b[1] - ny * fw); x.stroke()
      }
      // el canto: un trazo que el recorte deja en su mitad interior (fino y nítido). Con la luz en U,
      // los tramos que miran hacia abajo brillan con su color aunque la luz venga de otro lado
      const ub = U ? smooth(.15, .95, ny) : 0
      if (ub > .01) {
        x.strokeStyle = `rgba(${U},${(ub * .95).toFixed(3)})`; x.lineWidth = 2.4
        x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke()
      }
      x.strokeStyle = `rgba(255,255,255,${(base + i * .85).toFixed(3)})`
      x.lineWidth = 1.2 + i * 1.2
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke()
    }
    x.restore()
  }
  const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; vis && lit() })
  io.observe(el)
  const api = { build, lit, cv, el, on: () => vis && F.length > 0, destroy() { io.disconnect(); FAC.delete(api); cv.remove() } }
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
  el.classList.add('ns-glass-shape')
  const shape = () => {
    const w = el.offsetWidth, hh = el.offsetHeight, s = shapeOf(el)
    if (!w || !hh) return null
    const d = s ? path(s, w, hh) : rounded(el, w, hh)
    // la luz del canto: encima del vidrio y debajo del contenido
    if (!fc) { fc = lights(el); (el.querySelector(':scope > .ns-liquid-fx') || el.firstChild)?.after(fc.cv) }
    fc.build(d, w, hh, tok().includes('facet'), tok().includes('u'))
    return { d, w, h: hh }
  }
  const h = liquid(el, { glass: true, prism: () => tok().includes('prism'), hard: () => tok().includes('facet'), path: shape, ...o })
  // un marco de ns-frame deja de recortarse (lo lee el núcleo al pintar)
  if (el.hasAttribute('data-ns') || el.localName == 'ns-frame') update(el)
  const api = { ...h, destroy() { fc?.destroy(); h.destroy(); el.classList.remove('ns-glass-shape'); G.delete(el) } }
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
