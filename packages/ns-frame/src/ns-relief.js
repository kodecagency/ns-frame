/*! ns-frame/relief · motor de materiales: volumen y luz calculados de la silueta exacta */
// <article data-ns="card" data-ns-relief>…</article>
// <button data-ns-relief aria-pressed="false">Auto</button>
// <button role="switch" aria-checked="true" data-ns-relief="inset"><i data-ns-relief="knob"></i></button>
//
// Un motor de materiales sobre los filtros de iluminación de SVG (feDiffuseLighting y
// feSpecularLighting, con una luz direccional), que el navegador calcula a la resolución real de la
// pantalla: nítido a cualquier zoom y en todos los motores. La silueta es la forma exacta de la pieza
// (chaflanes, muescas, cortes, curvas de ns-frame, o su border-radius); desenfocada, es el mapa de
// alturas del bisel. De ahí salen, sin costuras:
// · la cara, exactamente de su color (la difusa sólo oscurece, con un mínimo, lo que no mira a la luz);
// · una línea de luz en el canto que mira a la luz (especular dura: no toca la cara plana);
// · dos sombras: de contacto, pequeña y nítida, y ambiental, amplia y suave;
// · hundido: la altura se invierte (el canto queda arriba) y aparece una sombra interior.
// Un material es un conjunto de parámetros; cada combinación se compila una vez en un <filter>
// compartido por todas las piezas que lo usan (cien botones, un filtro). La luz es una para toda la
// página: moverla es cambiar un atributo de cada filtro.
// · data-ns-relief: "surface" (paneles; por defecto si mide 60 px o más), "raised" (controles; por
//   defecto si es menor), "knob" (el mando de un interruptor: más redondo), "inset" (hundido: carriles
//   y campos), "select" (sube al estar elegido: el segmento activo en su carril), "ghost" (invisible
//   hasta que se elige o se pulsa). Tonos: "metal" (brillo más duro), "paper" (mate).
// · El estado se ve en el volumen: se hunde mientras se pulsa (puntero, Espacio, Enter); con
//   aria-pressed / aria-checked="true" queda hundido (salvo "select", que sube).
// · Color de la cara: --ns-relief, o el fondo del primer antepasado que lo tenga. Ajustes finos:
//   --ns-relief-bevel (px), --ns-relief-height, --ns-relief-gloss (0–1), --ns-relief-shadow (0–1, 0 = sin sombras).
// · La capa va detrás del contenido; un marco de ns-frame con relieve no se recorta con clip-path.

import { styles, path, shapeOf, update } from './ns-frame.js'
import { material, mk } from './ns-light.js'

const CSS = `@layer ns{
[data-ns-relief]{position:relative;isolation:isolate;background:none;--ns-border:transparent}
.ns-relief{position:absolute;z-index:-1;pointer-events:none;overflow:visible}
@media (forced-colors:active){.ns-relief{display:none}}
}`
// b: ancho del bisel (desenfoque de la silueta); s: altura; ks, n: brillo del canto y su dureza;
// amb: luz mínima de la cara en sombra; sh: sombras [dy, desenfoque, opacidad]; inset: sombra interior
const PRESET = {
  surface: { b: 1.6, s: 1.3, ks: .7, n: 90, amb: .72, sh: [[1, .7, .1], [10, 16, .08]] },
  raised: { b: 1.3, s: 1.2, ks: .65, n: 80, amb: .72, sh: [[.8, .5, .16], [3, 5, .07]] },
  knob: { b: 2.4, s: 1.4, ks: .6, n: 70, amb: .72, sh: [[1, .6, .18], [3, 5, .12]] },
  inset: { b: 1.4, s: 1.1, ks: .4, n: 60, amb: .72, inset: .14 },
  pressed: { b: 1.3, s: .9, ks: .3, n: 60, amb: .76, inset: .1 },
}
const TONE = { metal: { ks: 1.15, n: .6 }, paper: { ks: .35, n: 1 } }
const R = new WeakMap(), ALL = new Set()
let styled = 0

// rectángulo con el border-radius real, esquina por esquina (elíptico si hace falta)
function rounded(el, w, h) {
  const s = getComputedStyle(el), r = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(c => {
    const [a, b = a] = s['border' + c + 'Radius'].split(' '), v = (x, L) => x.endsWith('%') ? parseFloat(x) * L / 100 : parseFloat(x) || 0
    return [v(a, w), v(b, h)]
  })
  const f = Math.min(1, w / (r[0][0] + r[1][0] || 1), w / (r[3][0] + r[2][0] || 1), h / (r[0][1] + r[3][1] || 1), h / (r[1][1] + r[2][1] || 1))
  const [tl, tr, br, bl] = r.map(([x, y]) => [x * f, y * f])
  const A = ([x, y], X, Y) => x && y ? `A${x} ${y} 0 0 1 ${X} ${Y}` : `L${X} ${Y}`
  return `M${tl[0]} 0L${w - tr[0]} 0${A(tr, w, tr[1])}L${w} ${h - br[1]}${A(br, w - br[0], h)}L${bl[0]} ${h}${A(bl, 0, h - bl[1])}L0 ${tl[1]}${A(tl, tl[0], 0)}Z`
}
// color de la cara: --ns-relief, o el fondo del primer antepasado que lo tenga
function face(el) {
  const v = getComputedStyle(el).getPropertyValue('--ns-relief').trim()
  if (v) return v
  for (let a = el.parentElement; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (!/^(transparent|rgba\(.*,\s*0\))$/.test(c)) return c }
  return '#ecebe8'
}

/** Relieve en `el` con su forma de ns-frame o su border-radius. */
export function relief(el) {
  if (R.has(el)) return R.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  const PAD = 32
  const svg = mk('svg', { class: 'ns-relief', 'aria-hidden': 'true', focusable: 'false' }), p = mk('path')
  svg.append(p)
  el.prepend(svg)
  let down = false, key = ''
  const draw = () => {
    const w = el.offsetWidth, h = el.offsetHeight
    if (!w || !h) return
    const tok = (el.getAttribute('data-ns-relief') || '').split(/\s+/), cs = getComputedStyle(el)
    const on = el.getAttribute('aria-pressed') == 'true' || el.getAttribute('aria-checked') == 'true', select = tok.includes('select')
    // qué material toca según el estado
    const kind = down ? 'pressed' : tok.includes('inset') || (on && !select && !tok.includes('ghost')) ? 'inset'
      : tok.includes('knob') ? 'knob' : tok.includes('surface') ? 'surface' : tok.includes('raised') || select || h < 60 ? 'raised' : 'surface'
    const hide = tok.includes('ghost') && !down && !(select && on)
    const M = { ...PRESET[kind] }, T = TONE[tok.find(t => TONE[t])]
    if (T) { M.ks *= T.ks; M.n = Math.round(M.n * T.n) }
    const num = (k, d) => { const v = parseFloat(cs.getPropertyValue(k)); return v >= 0 ? v : d }
    M.b = num('--ns-relief-bevel', M.b); M.s = num('--ns-relief-height', M.s); M.ks *= num('--ns-relief-gloss', 1)
    const shK = num('--ns-relief-shadow', 1)
    if (M.sh) M.sh = shK ? M.sh.map(([a, b, o]) => [a, b, +(o * shK).toFixed(3)]) : null
    const s = shapeOf(el), d = s ? path(s, w, h) : rounded(el, w, h), fill = face(el)
    const k = [d, w, h, fill, hide, JSON.stringify(M)].join('|')
    if (k == key) return
    key = k
    Object.assign(svg.style, { left: -PAD - el.clientLeft + 'px', top: -PAD - el.clientTop + 'px', width: w + PAD * 2 + 'px', height: h + PAD * 2 + 'px' })
    svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`)
    p.setAttribute('d', d)
    p.style.fill = fill
    p.style.display = hide ? 'none' : ''
    p.setAttribute('filter', `url(#${material(M)})`)
  }
  const press = v => () => { if (down != v) { down = v; draw() } }
  const EV = [['pointerdown', press(true)], ['pointerup', press(false)], ['pointerleave', press(false)], ['pointercancel', press(false)],
    ['keydown', e => (e.key == ' ' || e.key == 'Enter') && press(true)()], ['keyup', press(false)], ['blur', press(false)]]
  EV.forEach(([t, f]) => el.addEventListener(t, f))
  const ro = new ResizeObserver(draw)
  ro.observe(el)
  const mo = new MutationObserver(draw)
  mo.observe(el, { attributes: true, attributeFilter: ['data-ns', 'data-ns-relief', 'class', 'style', 'aria-pressed', 'aria-checked'] })
  draw()
  // un marco de ns-frame deja de recortarse (el recorte cortaría la sombra)
  if (el.hasAttribute('data-ns') || el.localName == 'ns-frame') update(el)
  const api = { update: () => { key = ''; draw() }, destroy() { EV.forEach(([t, f]) => el.removeEventListener(t, f)); ro.disconnect(); mo.disconnect(); ALL.delete(api); R.delete(el); svg.remove() } }
  ALL.add(api)
  R.set(el, api)
  return api
}

if (typeof document != 'undefined') {
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-relief]') && relief(n); n.querySelectorAll('[data-ns-relief]').forEach(relief) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(scan) }).observe(document.body, { childList: true, subtree: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
