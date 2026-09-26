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
// Sin dependencias y CSP-safe (sólo CSSOM y Web Animations).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

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
 * Devuelve { close(), reset(), destroy() }.
 */
export function sheet(el, { handle = el, onClose, onProgress, threshold = 6 } = {}) {
  let id = null, y0 = 0, y = 0, h = 1, drag = false, raf = 0, anim = null
  const samples = []
  const put = v => {
    y = v
    el.style.translate = `0 ${v.toFixed(1)}px`
    const p = clamp(1 - v / h, 0, 1)
    el.style.setProperty('--ns-sheet-p', p.toFixed(3))
    onProgress?.(p)
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
    release(y, v, h) ? close() : to(0)
  }
  // el navegador canceló el gesto (en iOS, al empezar un scroll): vuelve a su sitio, sin decidir
  const cancel = e => {
    if (e.pointerId != id) return
    id = null
    el.classList.remove('ns-sheet-drag')
    if (drag) to(0)
  }
  const swallow = ev => { ev.stopPropagation(); ev.preventDefault() }
  const close = () => to(h + 24, () => { onClose?.(); reset() })
  const reset = () => { anim?.cancel(); anim = null; y = 0; el.style.translate = ''; el.style.removeProperty('--ns-sheet-p'); el.classList.remove('ns-glass-hold') }

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
    close, reset,
    destroy() {
      reset()
      handle.removeEventListener('pointerdown', down)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', cancel)
      handle.removeEventListener('lostpointercapture', cancel)
      handle.style.touchAction = ''
    },
  }
}
