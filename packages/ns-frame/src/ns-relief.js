/*! ns-frame/relief · superficies con volumen sutil: la luz y la sombra salen de la propia forma */
// <article data-ns="card" data-ns-relief>…</article>
// <button data-ns-relief aria-pressed="false">Auto</button>
// <button role="switch" aria-checked="true" data-ns-relief="inset"><i data-ns-relief></i></button>
//
// Volumen como el del hardware bien hecho, no como el plástico del esqueuomorfismo: casi nada, pero
// exacto y con cualquier forma (chaflanes, muescas, cortes, curvas de ns-frame, o su border-radius).
// · La cara: un degradado mínimo en la dirección de la luz (convexa: más clara hacia ella).
// · El canto: una línea de luz de 1 px donde el borde mira a la luz y una sombra finísima enfrente,
//   calculadas tramo a tramo con la normal real del contorno (un chaflán es una cara con su luz).
// · Dos sombras: una de contacto, pequeña y nítida, y otra ambiental, amplia y muy suave.
// · La luz viene de arriba; el puntero sólo la inclina un poco (en el móvil, el desplazamiento).
// · El estado se ve en el volumen: al pulsar (puntero, Espacio, Enter) se hunde en ~120 ms; con
//   aria-pressed / aria-checked="true" queda abajo; "inset" la deja siempre hundida (un carril, un
//   campo); "ghost" no dibuja nada hasta que se pulsa (segmentos no elegidos); "select" sube al estar
//   elegido en vez de hundirse (el segmento activo dentro de un carril hundido). Hundida, el degradado
//   se invierte, las sombras exteriores se apagan y aparece una interior suave.
// · Materiales: data-ns-relief="ceramic" (satinado, por defecto), "metal" (vetas finas), "paper"
//   (grano). --ns-relief (color de la cara: por defecto, el del fondo del padre), --ns-relief-shadow
//   ("none" para quitarlas).
// · La capa va detrás del contenido; un marco de ns-frame con relieve no se recorta con clip-path.

import { styles, path, shapeOf, update } from './ns-frame.js'
import { polyline } from './ns-liquid.js'

const CSS = `@layer ns{
[data-ns-relief]{position:relative;isolation:isolate;background:none;--ns-border:transparent}
.ns-relief{position:absolute;z-index:-1;pointer-events:none;margin:0}
@media (forced-colors:active){.ns-relief{display:none}}
}`
// grano (papel) y vetas (metal); intensidad del degradado de la cara y del canto
const MAT = {
  ceramic: { grain: 0, brush: 0, face: .055, rim: .75, dark: .09 },
  metal: { grain: 0, brush: .05, face: .08, rim: .9, dark: .14 },
  paper: { grain: .035, brush: 0, face: .03, rim: .55, dark: .07 },
}
let styled = 0
const R = new WeakMap(), ALL = new Set()
let lx = -1, ly = -1, lraf = 0, MQ = null
const fine = () => (MQ ||= [matchMedia('(hover: hover) and (pointer: fine)'), matchMedia('(prefers-reduced-motion: reduce)')])[0].matches
const calm = () => (fine(), MQ[1].matches)
const relight = () => { lraf ||= requestAnimationFrame(() => { lraf = 0; const on = [...ALL].filter(r => r.on()); const B = on.map(r => r.el.getBoundingClientRect()); on.forEach((r, i) => r.lit(B[i])) }) }
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
// rectángulo con el border-radius real, esquina por esquina
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
function faceColor(el, probe) {
  const v = getComputedStyle(el).getPropertyValue('--ns-relief').trim()
  if (v) { probe.style.color = v; return getComputedStyle(probe).color }
  for (let a = el.parentElement; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (!/^(transparent|rgba\(.*,\s*0\))$/.test(c)) return c }
  return 'rgb(236,234,230)'
}
const rgb = c => (c.match(/[\d.]+/g) || [236, 234, 230]).slice(0, 3).map(Number)
const mix = (c, t, k) => c.map((v, i) => Math.round(v + (t[i] - v) * k))

/** Relieve en `el` con su forma de ns-frame o su border-radius. */
export function relief(el) {
  if (R.has(el)) return R.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  const cv = document.createElement('canvas'), x = cv.getContext('2d')
  cv.className = 'ns-relief'; cv.setAttribute('aria-hidden', 'true')
  el.prepend(cv)
  const PAD = 30
  let G = null, key = '', vis = false, last = ''
  // geometría (una vez por forma y tamaño): el path, sus tramos con su normal y el color
  const build = () => {
    const w = el.offsetWidth, h = el.offsetHeight
    if (!w || !h) return
    const s = shapeOf(el), d = s ? path(s, w, h) : rounded(el, w, h), cs = getComputedStyle(el)
    const tok = (el.getAttribute('data-ns-relief') || '').split(/\s+/), M = MAT[tok.find(t => MAT[t])] || MAT.ceramic
    const base = rgb(faceColor(el, cv)), shadow = cs.getPropertyValue('--ns-relief-shadow').trim()
    const k = [d, w, h, base, shadow, tok.join()].join('|')
    if (k == key) return
    key = k; last = ''
    const q = Math.min(2, devicePixelRatio || 1), W = w + PAD * 2, H = h + PAD * 2
    cv.width = Math.round(W * q); cv.height = Math.round(H * q)
    Object.assign(cv.style, { left: -el.clientLeft - PAD + 'px', top: -el.clientTop - PAD + 'px', width: W + 'px', height: H + 'px' })
    const P = polyline(d, 4), n = P.length
    let area = 0
    for (let j = 0; j < n; j++) { const a = P[j], b = P[(j + 1) % n]; area += a[0] * b[1] - b[0] * a[1] }
    const out = area > 0 ? 1 : -1, segs = []
    for (let j = 0; j < n; j++) {
      const a = P[j], b = P[(j + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (L > .3) segs.push([a, b, (b[1] - a[1]) / L * out, -(b[0] - a[0]) / L * out])
    }
    G = { d: new Path2D(d), w, h, q, segs, base, M, shadow: shadow != 'none', ghost: tok.includes('ghost'), tex: null }
    lit()
  }
  // textura fija (grano o vetas), muy tenue
  const texture = () => {
    if (G.tex || !(G.M.grain || G.M.brush)) return G.tex
    const T = document.createElement('canvas'); T.width = Math.round(G.w * G.q); T.height = Math.round(G.h * G.q)
    const t = T.getContext('2d'), I = t.createImageData(T.width, T.height), D = I.data
    let r = 0
    for (let j = 0; j < T.height; j++) {
      r = r * .8 + (Math.random() - .5) * .6
      for (let i = 0; i < T.width; i++) {
        const o = (j * T.width + i) * 4, v = G.M.brush ? r * G.M.brush * 255 : (Math.random() - .5) * G.M.grain * 510
        D[o] = D[o + 1] = D[o + 2] = v > 0 ? 255 : 0; D[o + 3] = Math.abs(v)
      }
    }
    t.putImageData(I, 0, 0)
    return G.tex = T
  }
  const lit = (r = el.getBoundingClientRect()) => {
    if (!G || !vis) return
    // luz desde arriba; el puntero (o el desplazamiento) sólo la inclina un poco
    let tx = 0, ty = 0
    if (!calm()) {
      if (fine() && lx >= 0) { tx = Math.max(-1, Math.min(1, (lx - (r.left + r.width / 2)) / (innerWidth * .5))); ty = Math.max(-1, Math.min(1, (ly - (r.top + r.height / 2)) / (innerHeight * .5))) }
      else tx = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / innerHeight) * 2 - 1)) * .6
    }
    let Lx = -.18 + tx * .35, Ly = -1 + Math.max(0, ty) * .25
    const Ll = Math.hypot(Lx, Ly); Lx /= Ll; Ly /= Ll
    const k = Math.round(Lx * 60) + ',' + Math.round(Ly * 60) + ',' + Math.round(Pd * 40)
    if (k == last) return
    last = k
    const { q, w, h, base, M, d, segs } = G, up = Math.max(0, Pd), dn = Math.max(0, -Pd)
    x.setTransform(1, 0, 0, 1, 0, 0)
    x.clearRect(0, 0, cv.width, cv.height)
    if (G.ghost && Pd > .95) return
    x.setTransform(q, 0, 0, q, PAD * q, PAD * q)
    // sombras exteriores (sólo en relieve): contacto, pequeña y nítida; ambiente, amplia y suave
    if (G.shadow && up > .02) {
      x.save()
      x.fillStyle = `rgb(${base})`
      x.shadowColor = `rgba(0,0,0,${(.14 * up).toFixed(3)})`; x.shadowBlur = 2 * q; x.shadowOffsetY = 1 * q
      x.fill(d)
      x.shadowColor = `rgba(0,0,0,${(.09 * up).toFixed(3)})`; x.shadowBlur = 22 * q; x.shadowOffsetX = -Lx * 4 * q; x.shadowOffsetY = 10 * q
      x.fill(d)
      x.restore()
    }
    // cara: degradado mínimo en la dirección de la luz (hundida, al revés)
    const R2 = Math.hypot(w, h) / 2, cx = w / 2, cy = h / 2, f = M.face * Pd
    const g = x.createLinearGradient(cx + Lx * R2, cy + Ly * R2, cx - Lx * R2, cy - Ly * R2)
    const lit0 = f > 0 ? mix(base, [255, 255, 255], f) : mix(base, [0, 0, 0], -f), dark0 = f > 0 ? mix(base, [0, 0, 0], f * .9) : mix(base, [255, 255, 255], -f * .6)
    g.addColorStop(0, `rgb(${lit0})`); g.addColorStop(1, `rgb(${dark0})`)
    x.fillStyle = g; x.fill(d)
    x.save(); x.clip(d)
    const T = texture()
    if (T) { x.globalAlpha = .6; x.drawImage(T, 0, 0, w, h); x.globalAlpha = 1 }
    // hundida: sombra interior suave, del lado de la luz (el borde la tapa)
    if (dn > .02) {
      const ring = new Path2D(); ring.rect(-PAD, -PAD, w + PAD * 2, h + PAD * 2); ring.addPath(d)
      x.shadowColor = `rgba(0,0,0,${(.2 * dn).toFixed(3)})`; x.shadowBlur = 7 * q; x.shadowOffsetX = Lx * -2.5 * dn * q; x.shadowOffsetY = -Ly * 2.5 * dn * q
      x.fillStyle = '#000'; x.fill(ring, 'evenodd')
      x.shadowColor = 'transparent'
    }
    // canto: 1 px de luz donde el borde mira a la luz y una sombra finísima enfrente (por tramos,
    // con mezcla lighten/darken: sin costuras entre tramos)
    x.lineCap = 'round'; x.lineWidth = 2
    x.globalCompositeOperation = 'lighten'
    for (const [a, b, nx, ny] of segs) {
      const s = nx * Lx + ny * Ly, i = up > 0 ? smooth(-.1, 1, s) * M.rim * up : smooth(.2, 1, -s) * M.rim * .45 * dn
      if (i < .01) continue
      x.strokeStyle = `rgba(255,255,255,${i.toFixed(3)})`
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke()
    }
    x.globalCompositeOperation = 'darken'
    for (const [a, b, nx, ny] of segs) {
      const s = nx * Lx + ny * Ly, i = up > 0 ? smooth(.1, 1, -s) * M.dark * up * 2.2 : smooth(-.1, 1, s) * M.dark * 2.5 * dn
      if (i < .01) continue
      x.strokeStyle = `rgba(0,0,0,${i.toFixed(3)})`
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke()
    }
    x.restore()
  }
  // Profundidad Pd: 1 en relieve, −1 hundido. Va de un estado a otro en ~120 ms
  let Pd = 1, PT = 1, down = false, praf = 0
  const aim = () => {
    const tok = (el.getAttribute('data-ns-relief') || '').split(/\s+/)
    const on = el.getAttribute('aria-pressed') == 'true' || el.getAttribute('aria-checked') == 'true'
    // (con "select", lo elegido sube en vez de hundirse: el segmento activo de un carril, como en iOS)
    PT = tok.includes('inset') ? -1 : down ? -.7 : on && !tok.includes('ghost') && !tok.includes('select') ? -.55 : 1
    if (calm()) { Pd = PT; last = ''; lit(); return }
    const step = () => { praf = 0; Pd += (PT - Pd) * .38; if (Math.abs(PT - Pd) < .02) Pd = PT; last = ''; lit(); if (Pd != PT) praf = requestAnimationFrame(step) }
    praf ||= requestAnimationFrame(step)
  }
  const press = v => () => { if (down != v) { down = v; aim() } }
  const EV = [['pointerdown', press(true)], ['pointerup', press(false)], ['pointerleave', press(false)], ['pointercancel', press(false)],
    ['keydown', e => (e.key == ' ' || e.key == 'Enter') && press(true)()], ['keyup', press(false)], ['blur', press(false)]]
  EV.forEach(([t, f]) => el.addEventListener(t, f))
  // (la geometría sólo se calcula a la vista: fuera de pantalla, al entrar)
  const ro = new ResizeObserver(() => { key = ''; vis && build() })
  ro.observe(el)
  const mo = new MutationObserver(ms => {
    if (ms.some(m => m.attributeName.startsWith('aria') || m.attributeName == 'data-ns-relief')) aim()
    // (un estado puede cambiar el color de la cara: un interruptor encendido)
    vis && build()
  })
  mo.observe(el, { attributes: true, attributeFilter: ['data-ns', 'data-ns-relief', 'class', 'style', 'aria-pressed', 'aria-checked'] })
  const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) { build(); last = ''; lit() } })
  io.observe(el)
  aim()
  // un marco de ns-frame deja de recortarse (el recorte cortaría la sombra)
  if (el.hasAttribute('data-ns') || el.localName == 'ns-frame') update(el)
  const api = {
    el, lit, on: () => vis && !!G, update: () => { key = ''; build() },
    destroy() { cancelAnimationFrame(praf); EV.forEach(([t, f]) => el.removeEventListener(t, f)); ro.disconnect(); mo.disconnect(); io.disconnect(); ALL.delete(api); R.delete(el); cv.remove() },
  }
  ALL.add(api)
  if (ALL.size == 1) {
    addEventListener('pointermove', e => { if (e.pointerType == 'mouse' || e.pointerType == 'pen') { lx = e.clientX; ly = e.clientY; relight() } }, { passive: true })
    addEventListener('scroll', relight, { passive: true, capture: true })
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
