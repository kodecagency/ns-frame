/*! ns-frame/sheet · hoja que se arrastra como en una app nativa: sigue al dedo y se cierra al soltarla */
// import { sheet } from 'ns-frame/sheet'
// const s = sheet(panel, { onClose: () => dialog.close(), onProgress: p => … })
//
// · El panel sigue al dedo (o al ratón) hacia abajo, y hacia arriba con resistencia elástica.
// · Al soltar decide por distancia y velocidad: vuelve a su sitio o sale y llama a onClose().
// · Sólo mueve `translate` (compositor): no toca `transform`, así se combina con el que ya tenga.
// · --ns-sheet-p (1 = en su sitio, 0 = fuera) queda en el elemento para atenuar el fondo con CSS.
// · Un arrastre no dispara el clic de lo que había debajo; un toque sigue siendo un clic.
// · Con prefers-reduced-motion el cierre y el regreso son inmediatos.
// · Dentro de un <dialog> (o con la opción dialog), se encarga de él: open() lo abre (showModal) y la
//   hoja entra desde abajo; Escape y el clic en el fondo la cierran deslizándola; al salir, el diálogo
//   se cierra; y el fondo (::backdrop) se aclara a la vez que la hoja baja (--ns-sheet-p en el diálogo).
// CSP-safe (sólo CSSOM y Web Animations).

import { styles } from './ns-frame.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
let styled = 0

/** Resistencia elástica al pasar del tope: crece cada vez menos y nunca supera `h / 4`. */
export const rubber = (x, h) => (1 - 1 / (x / h * 2.2 + 1)) * h / 4

/**
 * Decisión al soltar: `y` desplazamiento hacia abajo (px), `v` velocidad (px/ms, + hacia abajo),
 * `h` altura del panel. Se cierra si bajó más del 35 % o si se lanzó hacia abajo con fuerza.
 */
export const release = (y, v, h) => y > h * .35 || (v > .5 && y > 8)

const reduced = () => typeof matchMedia == 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const EASE = 'cubic-bezier(.2,.8,.2,1)'

/**
 * Convierte `el` en una hoja arrastrable.
 * Opciones: handle (dónde empieza el arrastre; por defecto todo el panel), onClose, onProgress(p),
 * threshold (px antes de considerar que es un arrastre y no un toque; 6 por defecto).
 * Con track(y, h) la hoja no se mueve: el gesto sólo informa (y px hacia abajo, h su altura) y al
 * soltar llama a settle(cerrar, velocidad); quien la usa anima lo que quiera con el dedo (la isla
 * recoge la hoja hacia la cápsula).
 * dialog: el <dialog> que la contiene (por defecto, el más cercano; null = ninguno).
 * Devuelve { open(), close(), reset(), destroy() }.
 */
export function sheet(el, { handle = el, onClose, onProgress, track, settle, threshold = 6, dialog = el.closest('dialog') } = {}) {
  let id = null, y0 = 0, y = 0, h = 1, drag = false, raf = 0, anim = null
  const samples = []
  if (dialog) {
    if (!styled) { styled = 1; styles('@layer ns{.ns-sheet-dialog::backdrop{opacity:var(--ns-sheet-p,1)}:where(.ns-sheet-dialog){margin:auto auto 0;padding:0;border:0;background:none;max-width:100%;overflow:visible}}') }
    dialog.classList.add('ns-sheet-dialog')
  }
  const put = v => {
    y = v
    if (track) return track(v, h)
    el.style.translate = `0 ${v.toFixed(1)}px`
    const p = clamp(1 - v / h, 0, 1).toFixed(3)
    el.style.setProperty('--ns-sheet-p', p)
    dialog?.style.setProperty('--ns-sheet-p', p)
    onProgress?.(+p)
  }
  let pending = 0

  const down = e => {
    if (e.button > 0 || id != null) return
    // atrapar el panel a medio camino: se sigue desde donde está, sin saltos
    if (anim) { const v = anim.from + (anim.to - anim.from) * (anim.effect?.getComputedTiming().progress ?? 1); anim.cancel(); anim = null; el.classList.remove('ns-glass-hold'); put(v) }
    id = e.pointerId; y0 = e.clientY - y; drag = false; samples.length = 0
    h = el.getBoundingClientRect().height || 1
  }
  const move = e => {
    if (e.pointerId != id) return
    // los eventos agrupados dan el trazo completo del dedo (mejor velocidad en pantallas de 120 Hz)
    for (const ev of e.getCoalescedEvents?.() || [e]) samples.push([ev.timeStamp || performance.now(), ev.clientY])
    while (samples.length > 2 && samples[samples.length - 1][0] - samples[0][0] > 90) samples.shift()
    const dy = e.clientY - y0
    if (!drag) {
      if (Math.abs(dy) < threshold) return
      drag = true
      try { handle.setPointerCapture(id) } catch {}
      el.classList.add('ns-sheet-drag')
    }
    // (en el mismo evento, no en el siguiente fotograma: un fotograma menos de retraso bajo el dedo)
    pending = dy >= 0 ? dy : -rubber(-dy, h)
    put(pending)
  }
  const to = (target, done) => {
    cancelAnimationFrame(raf); raf = 0
    const from = y
    if (reduced() || Math.abs(target - from) < 1) { put(target); done?.(); return }
    const dur = clamp(Math.abs(target - from) * 1.1, 180, 420)
    const a = anim = el.animate([{ translate: `0 ${from}px` }, { translate: `0 ${target}px` }], { duration: dur, easing: EASE, fill: 'forwards' })
    a.from = from; a.to = target
    // (ns-glass-hold: un vidrio de ns-frame no se repinta mientras la hoja se desliza)
    el.classList.add('ns-glass-hold')
    a.onfinish = () => { if (anim != a) return; anim = null; put(target); a.cancel(); el.classList.remove('ns-glass-hold'); done?.() }
    // el progreso (para atenuar el fondo) sale de la temporización de la animación, ya con su curva:
    // leer getComputedStyle en cada frame forzaría un recálculo de estilos (micro-parones)
    const tick = () => {
      if (anim != a) return
      const v = from + (target - from) * (a.effect?.getComputedTiming().progress ?? 1), p = clamp(1 - v / h, 0, 1)
      el.style.setProperty('--ns-sheet-p', p.toFixed(3)); onProgress?.(p)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  const up = e => {
    if (e.pointerId != id) return
    id = null
    el.classList.remove('ns-sheet-drag')
    if (!drag) return
    // un arrastre no es un clic: se anula el clic que el navegador dispara justo después (y sólo ése)
    addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => removeEventListener('click', swallow, true), 0)
    const a = samples[0], b = samples[samples.length - 1]
    const v = a && b && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0
    if (track) { const c = release(y, v, h); y = 0; return settle?.(c, v) }
    release(y, v, h) ? close() : to(0)
  }
  // el navegador canceló el gesto (en iOS, al empezar un scroll): vuelve a su sitio, sin decidir
  const cancel = e => {
    if (e.pointerId != id) return
    id = null
    el.classList.remove('ns-sheet-drag')
    if (drag) track ? (y = 0, settle?.(false, 0)) : to(0)
  }
  const swallow = ev => { ev.stopPropagation(); ev.preventDefault() }
  // (la altura se mide aquí: cerrada con un botón, sin arrastre previo, antes salía 25 px y desaparecía)
  const measure = () => { h = el.getBoundingClientRect().height || h }
  const close = () => { measure(); to(h + 24, () => { onClose?.(); reset(); dialog?.open && dialog.close() }) }
  const reset = () => { anim?.cancel(); anim = null; y = 0; el.style.translate = ''; el.style.removeProperty('--ns-sheet-p'); dialog?.style.removeProperty('--ns-sheet-p'); el.classList.remove('ns-glass-hold') }
  // abre (con el diálogo, si lo hay) y la hoja entra desde abajo
  const open = () => {
    if (dialog && !dialog.open) dialog.showModal()
    measure()
    if (reduced()) return put(0)
    put(h + 24)
    to(0)
  }
  // con diálogo: Escape y el clic en el fondo la cierran deslizándola, no de golpe
  const esc = e => { e.preventDefault(); close() }
  const back = e => { if (e.target == dialog) close() }
  if (dialog) { dialog.addEventListener('cancel', esc); dialog.addEventListener('click', back) }

  handle.addEventListener('pointerdown', down)
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
  handle.addEventListener('pointercancel', cancel)
  handle.addEventListener('lostpointercapture', cancel)
  // sin scroll de página ni gestos del navegador mientras se arrastra el panel. Si el asa es el
  // panel entero y su contenido tiene scroll, se deja el scroll vertical al navegador (si no, en
  // táctil no se podría desplazar la lista)
  handle.style.touchAction = handle == el && el.scrollHeight > el.clientHeight + 1 ? 'pan-y' : 'none'
  el.style.overscrollBehavior = 'contain'

  return {
    open, close, reset,
    destroy() {
      reset()
      if (dialog) { dialog.removeEventListener('cancel', esc); dialog.removeEventListener('click', back); dialog.classList.remove('ns-sheet-dialog') }
      handle.removeEventListener('pointerdown', down)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', cancel)
      handle.removeEventListener('lostpointercapture', cancel)
      handle.style.touchAction = ''
    },
  }
}
