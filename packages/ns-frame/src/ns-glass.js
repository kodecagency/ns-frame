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
[data-ns-glass]{background:none;--ns-glass-shadow:rgba(0,0,0,.28)}
[data-ns-glass]:not([data-ns-glass~=border]){--ns-border:transparent!important}
[data-ns-glass~=clear]{--ns-glass-tint:rgba(255,255,255,.02);--ns-glass-blur:1.5px}
[data-ns-glass~=tint]{--ns-glass-tint:rgba(18,18,22,.46);--ns-glass-blur:10px}
[data-ns-glass~=u]{--ns-glass-tint:radial-gradient(55% 45% at 6% 100%,color-mix(in srgb,var(--ns-u,#3de0ff) 42%,transparent),transparent),radial-gradient(55% 45% at 94% 100%,color-mix(in srgb,var(--ns-u,#3de0ff) 42%,transparent),transparent),linear-gradient(to top,color-mix(in srgb,var(--ns-u,#3de0ff) 26%,transparent),transparent 58%),rgba(12,14,18,.26);--ns-glass-rim-color:var(--ns-u,#3de0ff);--ns-glass-rim-back:.9}
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

// ── Canto ──
// El vidrio no lleva un contorno plano: el canto lo dibuja la luz de la página (ns-frame/light), con la
// silueta exacta de la forma: una línea especular donde el borde mira a la luz y un reflejo tenue
// enfrente, nítidos a cualquier zoom. "facet" lo hace más duro (bisel estrecho) y la lente, plana por
// caras (el fondo se parte en cada corte, como en una gema).

/** Vidrio líquido en `el`, con su forma de ns-frame o su border-radius. Opciones: las de liquid(). */
export function glass(el, o = {}) {
  if (G.has(el)) return G.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  const tok = () => (el.getAttribute('data-ns-glass') || '').split(/\s+/)
  el.classList.add('ns-glass-shape')
  const shape = () => {
    const w = el.offsetWidth, hh = el.offsetHeight, s = shapeOf(el)
    if (!w || !hh) return null
    const d = s ? path(s, w, hh) : rounded(el, w, hh)
    return { d, w, h: hh }
  }
  const h = liquid(el, { glass: true, prism: () => tok().includes('prism'), hard: () => tok().includes('facet'), path: shape, ...o })
  // un marco de ns-frame deja de recortarse (lo lee el núcleo al pintar)
  if (el.hasAttribute('data-ns') || el.localName == 'ns-frame') update(el)
  const api = { ...h, destroy() { h.destroy(); el.classList.remove('ns-glass-shape'); G.delete(el) } }
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
