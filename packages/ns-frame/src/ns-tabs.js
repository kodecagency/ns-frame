/*! ns-frame/tabs · pestañas de vidrio líquido: el indicador se arrastra, se estira y encaja con un muelle */
// <nav data-ns-tabs aria-label="Secciones">
//   <button aria-pressed="true">Inicio</button> <button>Buscar</button> <button>Perfil</button>
// </nav>
// (o role="tablist" con role="tab": entonces usa aria-selected y el foco itinerante)
//
// Como la barra de pestañas de iOS 26:
// · pulsa una pestaña y el indicador viaja hasta ella: llega con un muelle (un rebote corto), se
//   estira en la dirección del movimiento según la velocidad y deja una gota detrás que se funde;
// · mantén pulsada la pestaña activa, o arrastra desde cualquiera, y el indicador se levanta: crece,
//   se vuelve una lente clara que aumenta lo que hay debajo y sigue al dedo; al soltar encaja en la
//   pestaña más cercana, y más allá de los extremos se resiste como una goma;
// · teclado: flechas, Inicio y Fin (con role="tab", foco itinerante y activación automática).
// La barra y el indicador son grupos de ns-frame/liquid: vidrio real (o sólido con
// data-ns-liquid=""), con la forma exacta mientras se estira y se funde.
// Evento: "change" (burbujea) con detail { index, tab }.
// Variables: --ns-tabs-radius (999px), --ns-tabs-ind-radius, --ns-tabs-fuse (16px, fusión de la gota),
// --ns-tabs-fill (indicador sólido), --ns-tabs-tint / -blur / -lens / -depth / -edge (vidrio del
// indicador) y sus versiones -lift (levantado).
// Con prefers-reduced-motion: sin muelle, sin estiramiento y sin levantar.

import { styles } from './ns-frame.js'
import { liquid } from './ns-liquid.js'

const CSS = `@layer ns{
.ns-tabs{position:relative;display:inline-flex;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.ns-tabs>.ns-tabs-track.ns-tabs-track{position:absolute;inset:0;border-radius:var(--ns-tabs-radius,999px);pointer-events:none}
.ns-tabs>.ns-tabs-lens.ns-tabs-lens{position:absolute;inset:0;pointer-events:none;--ns-liquid:var(--ns-tabs-fuse,16px);--ns-liquid-fill:var(--ns-tabs-fill,currentColor);--ns-glass-tint:var(--ns-tabs-tint,rgba(255,255,255,.16));--ns-glass-blur:var(--ns-tabs-blur,2px);--ns-glass-lens:var(--ns-tabs-lens,26px);--ns-glass-depth:var(--ns-tabs-depth,16px);--ns-glass-edge:var(--ns-tabs-edge,6px);--ns-glass-sat:1.1}
.ns-tabs.ns-tabs-lift>.ns-tabs-lens.ns-tabs-lens{--ns-glass-tint:var(--ns-tabs-tint-lift,rgba(255,255,255,.05));--ns-glass-blur:var(--ns-tabs-blur-lift,.4px);--ns-glass-lens:var(--ns-tabs-lens-lift,42px);--ns-glass-depth:var(--ns-tabs-depth-lift,22px)}
.ns-tabs .ns-tabs-lens>.ns-tabs-ind.ns-tabs-ind,.ns-tabs .ns-tabs-lens>.ns-tabs-drop.ns-tabs-drop{position:absolute;left:0;top:0;border-radius:var(--ns-tabs-ind-radius,var(--ns-tabs-radius,999px));transform-origin:50% 50%}
}`
let styled = 0
const T = new WeakMap()
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const blob = cls => { const e = document.createElement('i'); e.className = cls; e.setAttribute('data-ns-blob', ''); return e }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
// muelles (rigidez, amortiguación): el indicador, un poco sub-amortiguado (llega con un rebote
// corto); siguiendo al dedo, mucho más rígido; la gota, blanda (se queda atrás y se funde después)
const GO = [520, 34], HOLD = [1600, 80], DROP = [170, 22], LIFT = [620, 38]
// (en subpasos de 1/240 s: estable con muelles rígidos aunque el navegador dé pocos frames)
const spring = (s, target, [k, c], dt) => { for (let n = Math.ceil(dt * 240), h = dt / n; n--;) { s.v += (k * (target - s.x) - c * s.v) * h; s.x += s.v * h } }
const still = (s, t) => Math.abs(t - s.x) < .05 && Math.abs(s.v) < .05

/** Convierte `el` en pestañas de vidrio líquido. Opciones: items (selector de las pestañas). */
export function tabs(el, o = {}) {
  if (T.has(el)) return T.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  el.classList.add('ns-tabs')
  if (!el.hasAttribute('data-ns-liquid')) el.setAttribute('data-ns-liquid', 'glass')
  const track = blob('ns-tabs-track'), lens = document.createElement('div'), ind = blob('ns-tabs-ind'), drop = blob('ns-tabs-drop')
  lens.className = 'ns-tabs-lens'; lens.setAttribute('aria-hidden', 'true')
  lens.setAttribute('data-ns-liquid', el.getAttribute('data-ns-liquid'))
  lens.append(drop, ind)
  // orden de pintado: las capas de vidrio de la barra, el indicador y encima las pestañas
  liquid(el)
  const fx = el.querySelector(':scope > .ns-liquid-fx')
  fx ? fx.after(track, lens) : el.prepend(track, lens)
  const glass = liquid(lens)
  const items = () => [...el.querySelectorAll(o.items || ':scope > button, :scope > [role=tab], :scope > a')]
  const tablist = () => el.getAttribute('role') == 'tablist'
  const isOn = b => b.getAttribute(tablist() ? 'aria-selected' : 'aria-pressed') == 'true'
  let cur = Math.max(0, items().findIndex(isOn))

  // estado físico: posición (x, y), tamaño (w, h), la gota (dx) y cuánto está levantado (up)
  const X = { x: 0, v: 0 }, W = { x: 0, v: 0 }, D = { x: 0, v: 0 }, U = { x: 0, v: 0 }
  let Y = 0, H = 0, tx = 0, tw = 0, up = 0, drag = null, skip = false, raf = 0, last = 0, hot = -1, ready = false
  const box = b => ({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight })
  const aim = i => { const b = items()[i]; if (!b) return; const r = box(b); tx = r.x; tw = r.w; Y = r.y; H = r.h }
  const paint = () => {
    const v = X.v, s = 1 + .14 * U.x, calm = reduced()
    // se estira en la dirección del movimiento y se aplana un poco: conserva el volumen a ojo
    const sx = calm ? 1 : 1 + clamp(Math.abs(v) / 2400, 0, .28), sy = calm ? 1 : 1 - clamp(Math.abs(v) / 5200, 0, .12)
    Object.assign(ind.style, { width: W.x + 'px', height: H + 'px', transform: `translate(${X.x}px,${Y}px) scale(${sx * s},${sy * s})` })
    // la gota: más estrecha, sigue al centro con un muelle blando
    const dw = Math.max(H, W.x * .62)
    Object.assign(drop.style, { width: dw + 'px', height: H * .86 + 'px', transform: `translate(${D.x - dw / 2}px,${Y + H * .07}px)` })
    // la pestaña bajo el indicador (para que su texto cambie mientras la lente pasa)
    const c = X.x + W.x / 2, i = items().findIndex(b => c >= b.offsetLeft && c < b.offsetLeft + b.offsetWidth)
    if (i != hot) { items().forEach((b, k) => b.classList.toggle('ns-tabs-hot', k == i)); hot = i }
  }
  const loop = t => {
    raf = 0
    const dt = Math.min(1 / 12, last ? (t - last) / 1000 : 1 / 60); last = t
    const dragging = drag?.on
    spring(X, tx, dragging ? HOLD : GO, dt); spring(W, tw, GO, dt); spring(D, X.x + W.x / 2, DROP, dt); spring(U, up, LIFT, dt)
    paint()
    glass.frame()
    if (dragging || !(still(X, tx) && still(W, tw) && still(D, tx + tw / 2) && still(U, up))) raf = requestAnimationFrame(loop)
    else { X.x = tx; W.x = tw; D.x = tx + tw / 2; U.x = up; X.v = W.v = D.v = U.v = 0; paint(); last = 0 }
  }
  const run = () => { if (reduced()) { X.x = tx; W.x = tw; D.x = tx + tw / 2; U.x = 0; X.v = 0; paint(); glass.frame(); return } raf ||= requestAnimationFrame(loop) }
  const lift = v => {
    if (reduced()) v = 0
    if (up == v) return
    up = v
    el.classList.toggle('ns-tabs-lift', !!v)
    glass.update()
    run()
  }

  /** Selecciona la pestaña `i` (con animación). */
  const select = (i, { emit = true, focus = false } = {}) => {
    const all = items()
    i = clamp(i, 0, all.length - 1)
    const changed = i != cur
    cur = i
    all.forEach((b, k) => {
      if (tablist()) { b.setAttribute('aria-selected', String(k == i)); b.tabIndex = k == i ? 0 : -1 }
      else b.setAttribute('aria-pressed', String(k == i))
    })
    if (focus) all[i]?.focus()
    aim(i); run()
    if (emit && changed) el.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { index: i, tab: all[i] } }))
  }

  // arrastre: sigue al dedo (centrado), con resistencia de goma más allá de los extremos
  const follow = e => {
    const r = el.getBoundingClientRect(), all = items(), first = box(all[0]), end = box(all[all.length - 1])
    const w = tw, min = first.x, max = end.x + end.w - w
    let x = e.clientX - r.left - el.clientLeft - w / 2
    const rub = d => d * .4 / (1 + d / 80)
    x = x < min ? min - rub(min - x) : x > max ? max + rub(x - max) : x
    tx = x
    // el ancho se acerca al de la pestaña que queda debajo
    const c = x + w / 2, near = all.map(box).reduce((a, b) => Math.abs(b.x + b.w / 2 - c) < Math.abs(a.x + a.w / 2 - c) ? b : a)
    tw = near.w; Y = near.y; H = near.h
    run()
  }
  const nearest = () => {
    const c = X.x + W.x / 2, all = items().map(box)
    return all.reduce((a, b, k) => Math.abs(b.x + b.w / 2 - c) < Math.abs(all[a].x + all[a].w / 2 - c) ? k : a, 0)
  }
  const down = e => {
    if (e.button || !items().length) return
    const b = e.target.closest?.('button,[role=tab],a'), i = items().indexOf(b)
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false }
    // la pestaña activa se levanta en cuanto se toca (como iOS); las demás, al empezar a arrastrar
    if (i == cur) lift(1)
  }
  const move = e => {
    if (!drag || e.pointerId != drag.id) return
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y
    if (!drag.on) {
      if (Math.abs(dx) < 6) return
      // más vertical que horizontal: es un desplazamiento de la página, no un arrastre
      if (Math.abs(dy) > Math.abs(dx)) { cancel(); return }
      drag.on = true
      el.setPointerCapture?.(e.pointerId)
      lift(1)
    }
    follow(e)
  }
  const upE = e => {
    if (!drag || e.pointerId != drag.id) return
    const was = drag.on
    drag = null
    lift(0)
    if (was) { skip = true; select(nearest()) } else { aim(cur); run() }
  }
  const cancel = () => { drag = null; lift(0); aim(cur); run() }
  const click = e => {
    if (skip) { skip = false; e.preventDefault(); e.stopPropagation(); return }
    const b = e.target.closest?.('button,[role=tab],a'), i = items().indexOf(b)
    if (i >= 0) select(i)
  }
  const key = e => {
    const all = items(), i = all.indexOf(document.activeElement)
    if (i < 0) return
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key]
    if (n == null) return
    e.preventDefault()
    // (en RTL las flechas van al revés; en los extremos, dan la vuelta)
    const rtl = getComputedStyle(el).direction == 'rtl' && e.key.startsWith('Arrow')
    select(((rtl ? 2 * i - n : n) + all.length) % all.length, { focus: true })
  }
  const EV = [['pointerdown', down], ['pointermove', move], ['pointerup', upE], ['pointercancel', cancel], ['lostpointercapture', e => drag?.on && upE(e)], ['click', click, true], ['keydown', key]]
  EV.forEach(([t, f, c]) => el.addEventListener(t, f, c))
  // el material del indicador sigue al de la barra (vidrio o sólido)
  const mo = new MutationObserver(() => { lens.setAttribute('data-ns-liquid', el.getAttribute('data-ns-liquid') || '') })
  mo.observe(el, { attributes: true, attributeFilter: ['data-ns-liquid'] })
  // al cambiar de tamaño, el indicador se recoloca sin animación
  const ro = new ResizeObserver(() => { if (drag?.on) return; aim(cur); if (!ready || !raf) { X.x = tx; W.x = tw; D.x = tx + tw / 2; paint(); glass.frame(); ready = true } })
  ro.observe(el)
  select(cur, { emit: false })

  const api = {
    select: i => select(i),
    get index() { return cur },
    destroy() { T.delete(el); cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); EV.forEach(([t, f, c]) => el.removeEventListener(t, f, c)); glass.destroy(); lens.remove(); track.remove(); el.classList.remove('ns-tabs', 'ns-tabs-lift') },
  }
  T.set(el, api)
  return api
}

if (typeof document != 'undefined') {
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-tabs]') && tabs(n); n.querySelectorAll('[data-ns-tabs]').forEach(tabs) }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(scan) }).observe(document.body, { childList: true, subtree: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
