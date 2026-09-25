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

const CSS = `@layer ns{
[data-ns-relief]{position:relative;isolation:isolate;background:none;--ns-border:transparent}
.ns-relief{position:absolute;z-index:-1;pointer-events:none;overflow:visible}
@media (forced-colors:active){.ns-relief{display:none}}
}`
const NS = 'http://www.w3.org/2000/svg'
const mk = (t, a = {}, ...k) => { const e = document.createElementNS(NS, t); for (const n in a) e.setAttribute(n, a[n]); e.append(...k); return e }
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
const EL = 52
let styled = 0, defs = null, uid = 0, AZ = 258
const FILTERS = new Map(), LIGHTS = [], R = new WeakMap(), ALL = new Set()

// compila un material en un <filter> (una vez por combinación de parámetros)
function filter(M) {
  const key = JSON.stringify(M)
  if (FILTERS.has(key)) return FILTERS.get(key)
  if (!defs) { defs = mk('svg', { 'aria-hidden': 'true', focusable: 'false' }); defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.append(defs) }
  const id = 'nsr' + ++uid, k = 1 / Math.sin(EL * Math.PI / 180)
  const light = () => { const l = mk('feDistantLight', { azimuth: AZ, elevation: EL }); LIGHTS.push(l); return l }
  const f = mk('filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%', 'color-interpolation-filters': 'sRGB' })
  f.append(mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: M.b, result: 'h0' }))
  // alturas (hundido: invertidas, el canto arriba y el centro abajo)
  f.append(mk('feComponentTransfer', { in: 'h0', result: 'h' }, mk('feFuncA', M.inset ? { type: 'linear', slope: -1, intercept: 1 } : { type: 'identity' })))
  // difusa, llevada a [amb, 1]: la cara plana queda exactamente de su color; lo que no mira a la luz
  // se oscurece con un mínimo. Un desenfoque mínimo quita el grano de cuantizar las alturas a 8 bits
  f.append(mk('feDiffuseLighting', { in: 'h', surfaceScale: M.s, diffuseConstant: 1, 'lighting-color': '#fff', result: 'd0' }, light()))
  f.append(mk('feComponentTransfer', { in: 'd0', result: 'd1' }, ...['R', 'G', 'B'].map(c => mk('feFunc' + c, { type: 'linear', slope: k * (1 - M.amb), intercept: M.amb }))))
  f.append(mk('feGaussianBlur', { in: 'd1', stdDeviation: .35, result: 'd' }))
  f.append(mk('feBlend', { in: 'SourceGraphic', in2: 'd', mode: 'multiply', result: 'lit' }))
  // especular dura: sólo el canto que mira a la luz
  f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks, specularExponent: M.n, 'lighting-color': '#fff', result: 'sp' }, light()))
  f.append(mk('feComposite', { in: 'sp', in2: 'lit', operator: 'arithmetic', k2: 1, k3: 1, result: 'sum' }))
  f.append(mk('feComposite', { in: 'sum', in2: 'SourceAlpha', operator: 'in', result: 'face' }))
  const merge = []
  ;(M.sh || []).forEach(([dy, b, o], i) => {
    f.append(mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: b, result: 'sb' + i }))
    f.append(mk('feOffset', { in: 'sb' + i, dx: 0, dy, result: 'so' + i }))
    f.append(mk('feFlood', { 'flood-color': '#000', 'flood-opacity': o, result: 'sf' + i }))
    f.append(mk('feComposite', { in: 'sf' + i, in2: 'so' + i, operator: 'in', result: 'sh' + i }))
    merge.push('sh' + i)
  })
  merge.push('face')
  if (M.inset) {
    f.append(mk('feComponentTransfer', { in: 'SourceAlpha', result: 'iv' }, mk('feFuncA', { type: 'linear', slope: -1, intercept: 1 })))
    f.append(mk('feGaussianBlur', { in: 'iv', stdDeviation: 2, result: 'ib' }))
    f.append(mk('feOffset', { in: 'ib', dx: 0, dy: 1.5, result: 'io' }))
    f.append(mk('feFlood', { 'flood-color': '#000', 'flood-opacity': M.inset, result: 'if' }))
    f.append(mk('feComposite', { in: 'if', in2: 'io', operator: 'in', result: 'i0' }))
    f.append(mk('feComposite', { in: 'i0', in2: 'SourceAlpha', operator: 'in', result: 'is' }))
    merge.push('is')
  }
  f.append(mk('feMerge', {}, ...merge.map(n => mk('feMergeNode', { in: n }))))
  defs.append(f)
  FILTERS.set(key, id)
  return id
}

// la luz, una para toda la página: arriba, algo a la izquierda; el puntero la gira un poco (en el
// móvil, el desplazamiento); con movimiento reducido, fija
let MQ = null, lraf = 0, px = .5
const calm = () => (MQ ||= [matchMedia('(prefers-reduced-motion: reduce)'), matchMedia('(hover: hover) and (pointer: fine)')])[0].matches
const aimLight = () => {
  lraf = 0
  const az = (258 + (calm() ? 0 : (px - .5) * 36)).toFixed(1)
  if (az == AZ) return
  AZ = az
  for (const l of LIGHTS) l.setAttribute('azimuth', az)
}
const moveLight = v => { px = v; lraf ||= requestAnimationFrame(aimLight) }

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
    p.setAttribute('filter', `url(#${filter(M)})`)
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
  if (ALL.size == 1) {
    addEventListener('pointermove', e => { if (e.pointerType == 'mouse' || e.pointerType == 'pen') moveLight(e.clientX / innerWidth) }, { passive: true })
    addEventListener('scroll', () => { if (!MQ?.[1].matches) moveLight(Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))) }, { passive: true })
  }
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
