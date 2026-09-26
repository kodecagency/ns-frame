/*! ns-frame/toast · notificaciones con forma: capa superior nativa, apertura y tiempo en el borde */
// import { toast } from './ns-toast.js'
// toast('Cambios guardados')
// toast('Sin conexión', { type: 'error', title: 'Red', time: 0, action: { label: 'Reintentar', onClick } })
//
// · Popover API (popover="manual"): la pila vive en la capa superior del navegador, por encima de
//   todo (también de <dialog> abiertos antes), sin z-index.
// · Entrada con apertura (la forma se despliega con sus cortes) y salida inversa.
// · La cuenta atrás se dibuja en el propio borde (motion "progress") y se pausa con el puntero,
//   el foco o la pestaña oculta. La pila se reacomoda con animación (FLIP).
// · Accesible: región con aria-live; los errores usan role="alert"; Esc cierra el toast enfocado.
import { open, close, styles } from './ns-frame.js'

const CSS_ = `@layer ns{
.ns-toasts{position:fixed;inset:auto;margin:0;padding:16px;border:0;background:none;color:inherit;overflow:visible;display:none;flex-direction:column;gap:10px;width:min(400px,100%);max-height:100%;pointer-events:none}
.ns-toasts:popover-open{display:flex}
.ns-toasts.ns-on{display:flex;z-index:2147483647}
.ns-toasts[data-y=bottom]{bottom:0;justify-content:flex-end}.ns-toasts[data-y=top]{top:0}
.ns-toasts[data-x=end]{right:0}.ns-toasts[data-x=start]{left:0}.ns-toasts[data-x=center]{left:calc(50% - min(200px,50%))}
.ns-toast{--c:var(--ns-toast-c,#3de0ff);pointer-events:auto;display:flex;gap:12px;align-items:flex-start;--ns-pad:14px;background:var(--ns-toast-bg,#0b1520);--ns-border:color-mix(in srgb,var(--c) 45%,transparent);--ns-motion:var(--c);--ns-accent-width:1.5px;font-size:14px;line-height:1.45}
.ns-toast[data-type=ok]{--c:var(--ns-toast-ok,#3dffa8)}.ns-toast[data-type=warn]{--c:var(--ns-toast-warn,#ffb547)}.ns-toast[data-type=error]{--c:var(--ns-toast-error,#ff4d6d)}
.ns-toast>i{flex:none;width:9px;height:9px;margin-top:6px;background:var(--c)}
.ns-toast>div{flex:1;min-width:0}
.ns-toast b{display:block;font-weight:600}
.ns-toast button{font:inherit;font-size:13px;color:var(--c);background:none;border:0;padding:2px 4px;cursor:pointer}
.ns-toast [data-close]{color:inherit;opacity:.6;font-size:16px;line-height:1}
.ns-toast button:hover,.ns-toast button:focus-visible{opacity:1;text-decoration:underline}}`

const C = { x: 'end', y: 'bottom', max: 4, time: 5000, shape: 'tl+br bevel 12; radius 2', enter: 'open' }
let box, seq = 0
// sin Popover API (Safari < 17, Firefox < 125): la pila es un div fijo con un z-index máximo
const POP = typeof HTMLElement != 'undefined' && 'showPopover' in HTMLElement.prototype
const shown = b => POP ? b.matches(':popover-open') : b.classList.contains('ns-on')
const show = b => POP ? b.showPopover() : b.classList.add('ns-on')
const hide = b => POP ? b.hidePopover() : b.classList.remove('ns-on')
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const make = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e }

/** Posición y valores por defecto: { x: 'start'|'center'|'end', y: 'top'|'bottom', max, time, shape, enter }. */
export const config = o => { Object.assign(C, o); box && place() }
const place = () => { box.dataset.x = C.x; box.dataset.y = C.y }

function stack() {
  if (box) return box
  styles(CSS_)
  // <div> y no <section>: el CSS del sitio suele estilizar section y ganaría a @layer ns
  box = make('div', { className: 'ns-toasts' })
  if (POP) box.popover = 'manual'
  box.setAttribute('role', 'region')
  box.setAttribute('aria-label', 'Notificaciones')
  box.setAttribute('aria-live', 'polite')
  box.addEventListener('keydown', e => e.key == 'Escape' && e.target.closest('.ns-toast')?._x())
  document.addEventListener('visibilitychange', () => box.querySelectorAll('.ns-toast').forEach(t => document.hidden ? t._p() : t._r()))
  place()
  document.body.append(box)
  return box
}

// la pila se reacomoda con animación: se mide antes y después del cambio y se interpola la diferencia
function flip(fn) {
  const ts = [...box.children], y0 = new Map(ts.map(t => [t, t.getBoundingClientRect().top]))
  fn()
  if (reduced()) return
  for (const t of box.children) {
    const d = y0.has(t) && y0.get(t) - t.getBoundingClientRect().top
    d && t.animate([{ translate: `0 ${d}px` }, { translate: '0 0' }], { duration: 240, easing: 'cubic-bezier(.3,.7,.3,1)' })
  }
}

/** Muestra un toast. Devuelve { el, close }. time: 0 = no se cierra solo. */
export function toast(msg, o = {}) {
  const b = stack(), time = o.time ?? C.time
  const t = make('div', { className: 'ns-toast' }, make('i'))
  t.dataset.type = o.type || 'info'
  t.setAttribute('data-ns', o.shape || C.shape)
  t.setAttribute('data-ns-pad', '')
  t.firstChild.setAttribute('data-ns', 'all bevel 2.5')
  t.firstChild.setAttribute('aria-hidden', 'true')
  if (o.type == 'error') t.setAttribute('role', 'alert')
  const body = make('div', {}, ...(o.title ? [make('b', { textContent: o.title })] : []), make('span', { textContent: msg }))
  if (o.action) body.append(make('div', {}, make('button', { type: 'button', textContent: o.action.label, onclick: () => { o.action.onClick?.(); t._x() } })))
  const x = make('button', { type: 'button', textContent: '×', onclick: () => t._x() })
  x.dataset.close = ''
  x.setAttribute('aria-label', 'Cerrar notificación')
  t.append(body, x)

  // cuenta atrás en el borde: se pausa y se reanuda sin perder el tiempo restante
  let left = time, t0 = 0, id, anim, held = 0
  const bar = () => {
    const p = t.querySelector('.ns-mr')
    if (!p) return requestAnimationFrame(bar)
    anim ||= p.animate([{ strokeDasharray: '100 100' }, { strokeDasharray: '0 100' }], { duration: time, fill: 'forwards' })
    anim.currentTime = time - left
    t0 ? anim.play() : anim.pause()
  }
  t._r = () => { if (!time || held || t0 || t._gone) return; t0 = performance.now(); id = setTimeout(t._x, left); bar() }
  t._p = () => { if (!t0) return; clearTimeout(id); left = Math.max(0, left - (performance.now() - t0)); t0 = 0; anim?.pause() }
  const hold = v => () => { held = v; v ? t._p() : t._r() }
  t.addEventListener('pointerenter', hold(1)); t.addEventListener('pointerleave', hold(0))
  t.addEventListener('focusin', hold(1)); t.addEventListener('focusout', hold(0))
  // de dónde venía el foco al entrar en el aviso: al cerrarse con el foco dentro, vuelve allí (si
  // no, caería al principio de la página)
  t.addEventListener('focusin', e => { if (e.relatedTarget && !t.contains(e.relatedTarget)) t._back = e.relatedTarget })
  t._x = () => {
    if (t._gone) return
    t._gone = 1
    t._p()
    if (t.contains(document.activeElement)) (t._back?.isConnected ? t._back : o.back)?.focus?.({ preventScroll: true })
    close(t, C.enter, 260).then(() => flip(() => t.remove())).then(() => b.children.length || hide(b))
  }
  if (time) { t.setAttribute('data-ns-motion', 'progress'); t.style.setProperty('--ns-progress', '100') }

  // la región viva debe estar visible antes de recibir el contenido para que se anuncie
  if (!shown(b)) show(b)
  t._n = ++seq
  t._t = time ? 0 : 1
  // el más nuevo, siempre junto al borde de la pantalla
  flip(() => C.y == 'top' ? b.prepend(t) : b.append(t))
  open(t, o.enter || C.enter, 420)
  t._r()
  // sobre el máximo se van los más antiguos; los persistentes (esperan una acción) se quedan
  const live = [...b.children].filter(k => !k._gone).sort((p, q) => p._t - q._t || p._n - q._n)
  live.slice(0, Math.max(0, live.length - C.max)).forEach(k => k._x())
  return { el: t, close: t._x }
}
