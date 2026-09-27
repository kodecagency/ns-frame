/*! ns-frame/controls · controles de serie: segmentos, fichas, campos, deslizadores y muestras de color */
// <div role="group" aria-label="Plantilla" data-ns-segment data-ns-choice> <button aria-pressed="true">A</button> … </div>
// <div role="group" aria-label="Efecto" data-ns-chips data-ns-choice> <button>…</button> … </div>
// <label data-ns-field><span>Plantilla</span><select>…</select></label>
// <label data-ns-field><span>Velocidad <output for="v"></output></span><input id="v" type="range" data-ns-range data-ns-unit="×"></label>
// <div role="group" aria-label="Color" data-ns-swatches data-ns-choice> <button data-color="#00e676" aria-label="Verde"></button> … </div>
//
// El aspecto; la selección (aria-pressed, flechas, evento change) la pone data-ns-choice del núcleo.
// Todo en @layer ns y con :where(): cualquier regla tuya gana. Salvo el color del texto, fuera de la
// capa y con poca especificidad: un reset como button { color: inherit } lo anulaba (el elegido
// quedaba blanco sobre blanco); cámbialo con las variables. Variables (en el control o en un
// antepasado): --ns-ui-surface (fondo), --ns-ui-line (borde), --ns-ui-ink (texto), --ns-ui-muted
// (texto secundario), --ns-ui-accent (acento), --ns-ui-on / --ns-ui-on-ink (el elegido), --ns-ui-radius,
// --ns-ui-h (alto de un control), --ns-ui-font.
// · data-ns-segment: carril con el elegido relleno; "sm" más bajo. Un botón sólo con un icono es cuadrado.
// · data-ns-chips: fichas con borde; la elegida, con el acento.
// · data-ns-field: etiqueta (el primer span, en mono y pequeña) con un select o un input; el select
//   con su flecha. En el teléfono el select abre la lista del sistema: nativo y accesible.
// · data-ns-range: pista fina, lo recorrido con el acento, mando claro. Actualiza el output[for] de
//   su id con el valor (data-ns-unit se añade detrás; data-ns-scale lo multiplica: 100 → porcentaje).
// · data-ns-swatches: muestras redondas; el color sale de data-color (por CSSOM: CSP estricta).
// · data-ns-level: nivel vertical (brillo, volumen): una píldora alta que se llena desde abajo, con
//   un icono abajo. <label data-ns-level><input type="range" aria-label="Brillo"><svg …/></label>.
//   Es un input range de verdad (teclado, lector de pantalla), vertical con writing-mode (sin girar:
//   su caja es la del nivel). Con data-ns-glass, de vidrio.
//   Variables: --ns-level-w, -h, -radius, -fill, -track, -ink (el icono), -icon (tamaño), -icon-y.
// Sin dependencias (usa el núcleo) y CSP-safe.
import { styles, watch } from './ns-frame.js'

const CSS = `@layer ns{
:where([data-ns-segment],[data-ns-chips],[data-ns-field],[data-ns-swatches],[data-ns-range],[data-ns-level]){--_s:var(--ns-ui-surface,#141416);--_l:var(--ns-ui-line,rgba(255,255,255,.09));--_i:var(--ns-ui-ink,#f4f4f5);--_m:var(--ns-ui-muted,rgba(244,244,245,.62));--_a:var(--ns-ui-accent,#00e676);--_r:var(--ns-ui-radius,14px);--_h:var(--ns-ui-h,40px)}
:where([data-ns-segment]){display:inline-flex;flex-wrap:wrap;gap:2px;padding:4px;border-radius:var(--_r);background:var(--_s);border:1px solid var(--_l)}
:where([data-ns-segment]) > :where(button){min-height:var(--_h);padding:0 14px;border:0;border-radius:calc(var(--_r) - 4px);background:transparent;color:var(--_m);font:inherit;font-family:var(--ns-ui-font,inherit);font-size:13.5px;cursor:pointer;transition:background-color .25s cubic-bezier(.2,.8,.2,1),color .2s}
:where([data-ns-segment~=sm]) > :where(button){min-height:calc(var(--_h) - 6px);padding:0 11px;font-size:12.5px}
:where([data-ns-segment]) > :where(button):hover{color:var(--_i)}
:where([data-ns-segment]) > :where(button):is([aria-pressed=true],[aria-checked=true],[aria-selected=true]){background:var(--ns-ui-on,var(--_i));color:var(--ns-ui-on-ink,#0a0a0a)}
:where([data-ns-segment]) > :where(button):has(> svg:only-child){width:var(--_h);padding:0;display:grid;place-items:center}
:where([data-ns-segment]) > :where(button) > svg{width:18px;height:18px}
:where([data-ns-chips]){display:flex;flex-wrap:wrap;gap:6px;align-items:center}
:where([data-ns-chips]) > :where(button){min-height:calc(var(--_h) - 4px);padding:0 13px;border-radius:980px;border:1px solid var(--_l);background:transparent;color:var(--_m);font:inherit;font-family:var(--ns-ui-font,inherit);font-size:13px;cursor:pointer;transition:color .2s,border-color .2s,background-color .2s}
:where([data-ns-chips]) > :where(button):hover{color:var(--_i);border-color:color-mix(in srgb,var(--_i) 22%,transparent)}
:where([data-ns-chips]) > :where(button):is([aria-pressed=true],[aria-checked=true]){color:var(--_i);border-color:color-mix(in srgb,var(--_a) 60%,transparent);background:color-mix(in srgb,var(--_a) 10%,transparent)}
:where([data-ns-field]){position:relative;display:grid;gap:6px;min-width:0;color:var(--_m)}
:where([data-ns-field]) > :where(span){display:flex;justify-content:space-between;gap:8px;font:500 10.5px/1.1 var(--ns-ui-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase}
:where([data-ns-field]) :where(output){color:var(--_i);letter-spacing:0;text-transform:none}
:where([data-ns-field]) > :where(select,input:not([type=range]),textarea){-webkit-appearance:none;appearance:none;width:100%;min-height:calc(var(--_h) + 8px);box-sizing:border-box;padding:0 14px;border-radius:var(--_r);border:1px solid var(--_l);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02)),var(--_s);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);color:var(--_i);font:600 13.5px/1 var(--ns-ui-font,inherit);letter-spacing:0;text-transform:none;transition:border-color .2s}
:where([data-ns-field]) > :where(select){padding-right:38px;cursor:pointer}
:where([data-ns-field]):has(> select)::after{content:"";position:absolute;right:17px;bottom:calc((var(--_h) + 8px) / 2 - 1px);width:7px;height:7px;border:solid var(--_m);border-width:0 1.6px 1.6px 0;rotate:45deg;pointer-events:none}
:where([data-ns-field]) > :where(select,input,textarea):active{border-color:color-mix(in srgb,var(--_a) 55%,transparent)}
:where([data-ns-field]) :where(option){background:var(--_s);color:var(--_i)}
:where(input[type=range][data-ns-range]){-webkit-appearance:none;appearance:none;width:100%;height:24px;margin:0;background:transparent;cursor:pointer;--p:50%}
:where(input[type=range][data-ns-range])::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--_a) var(--p),rgba(255,255,255,.14) var(--p))}
:where(input[type=range][data-ns-range])::-moz-range-track{height:4px;border-radius:4px;background:rgba(255,255,255,.14)}
:where(input[type=range][data-ns-range])::-moz-range-progress{height:4px;border-radius:4px;background:var(--_a)}
:where(input[type=range][data-ns-range])::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-7px;border-radius:50%;background:var(--_i);box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px color-mix(in srgb,var(--_a) 14%,transparent)}
:where(input[type=range][data-ns-range])::-moz-range-thumb{width:18px;height:18px;border:0;border-radius:50%;background:var(--_i);box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 4px color-mix(in srgb,var(--_a) 14%,transparent)}
:where([data-ns-swatches]){display:flex;flex-wrap:wrap;gap:8px}
:where([data-ns-swatches]) > :where(button){width:28px;height:28px;padding:0;border-radius:50%;border:2px solid transparent;background:var(--c,#888) padding-box;box-shadow:0 0 0 1px var(--_l);cursor:pointer}
:where([data-ns-swatches]) > :where(button):is([aria-pressed=true],[aria-checked=true]){border-color:var(--ns-ui-gap,#0e0e10);box-shadow:0 0 0 2px var(--_i)}
:root:not([data-ns-input=pointer]) :where([data-ns-segment],[data-ns-chips],[data-ns-swatches]) > :where(button):focus-visible,:root:not([data-ns-input=pointer]) :where([data-ns-field]) > :where(select,input,textarea):focus-visible{outline:2px solid var(--_a);outline-offset:2px}
:where(input[type=range][data-ns-range]):focus-visible{outline:none}
:root:not([data-ns-input=pointer]) :where(input[type=range][data-ns-range]):focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px var(--ns-ui-gap,#0e0e10),0 0 0 5px var(--_a)}
:root:not([data-ns-input=pointer]) :where(input[type=range][data-ns-range]):focus-visible::-moz-range-thumb{box-shadow:0 0 0 3px var(--ns-ui-gap,#0e0e10),0 0 0 5px var(--_a)}
:where([data-ns-level]){position:relative;display:inline-block;touch-action:none;-webkit-user-select:none;user-select:none;cursor:ns-resize;width:var(--ns-level-w,72px);height:var(--ns-level-h,168px);border-radius:var(--ns-level-radius,calc(var(--ns-level-w,72px) / 2.4));color:var(--ns-level-ink,#1d1d1f);vertical-align:top}
:where([data-ns-level]:not([data-ns-glass])){background:var(--ns-level-track,rgba(255,255,255,.12))}
:where([data-ns-level]) > :where(input[type=range]){-webkit-appearance:none;appearance:none;position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;box-sizing:border-box;writing-mode:vertical-lr;direction:rtl;border-radius:inherit;background:linear-gradient(0deg,var(--ns-level-fill,#fff) var(--p,50%),transparent var(--p,50%));pointer-events:none;--p:50%}
:where([data-ns-level]) > :where(input[type=range])::-webkit-slider-runnable-track{width:100%;height:100%;background:transparent}
:where([data-ns-level]) > :where(input[type=range])::-moz-range-track{width:100%;height:100%;background:transparent}
:where([data-ns-level]) > :where(input[type=range])::-webkit-slider-thumb{-webkit-appearance:none;width:100%;height:1px;background:transparent}
:where([data-ns-level]) > :where(input[type=range])::-moz-range-thumb{width:100%;height:1px;border:0;background:transparent}
:where([data-ns-level]) > :where(svg:not(.ns-liquid-fx),img,[data-ns-level-icon]){position:absolute;left:50%;bottom:var(--ns-level-icon-y,18px);width:var(--ns-level-icon,28px);height:var(--ns-level-icon,28px);translate:-50% 0;pointer-events:none}
:root:not([data-ns-input=pointer]) :where([data-ns-level]):has(> input:focus-visible){outline:2px solid var(--ns-ui-accent,#00e676);outline-offset:3px}
:where([data-ns-level]) > :where(input[type=range]):focus-visible{outline:none}
@media (forced-colors:active){:where([data-ns-level]){border:1px solid CanvasText}:where([data-ns-level]) > :where(input[type=range]){background:linear-gradient(0deg,Highlight var(--p,50%),transparent var(--p,50%));forced-color-adjust:none}}
@media (prefers-reduced-motion:reduce){:where([data-ns-segment],[data-ns-chips]) > :where(button){transition:none}}
@media (forced-colors:active){:where([data-ns-segment],[data-ns-chips]) > :where(button):is([aria-pressed=true],[aria-checked=true]){outline:2px solid Highlight}}
}
[data-ns-segment]>button,[data-ns-chips]>button{color:var(--ns-ui-muted,rgba(244,244,245,.62))}
[data-ns-segment]>button:hover,[data-ns-chips]>button:hover,[data-ns-chips]>button:is([aria-pressed=true],[aria-checked=true]){color:var(--ns-ui-ink,#f4f4f5)}
[data-ns-segment]>button:is([aria-pressed=true],[aria-checked=true],[aria-selected=true]){color:var(--ns-ui-on-ink,#0a0a0a)}
[data-ns-field]>:is(select,input,textarea){color:var(--ns-ui-ink,#f4f4f5)}`
let styled = 0
const css = () => { if (!styled) { styled = 1; styles(CSS) } }

/** Deslizador: lo recorrido (--p) y el output[for] de su id. Devuelve { update(), destroy() }. */
export function range(el) {
  css()
  const out = () => el.id ? document.querySelector(`output[for~="${CSS_ESC(el.id)}"]`) : null
  const update = () => {
    const min = +el.min || 0, max = el.max === '' ? 100 : +el.max, v = +el.value
    el.style.setProperty('--p', ((v - min) / ((max - min) || 1) * 100).toFixed(1) + '%')
    const o = out()
    if (o) { const k = +(el.getAttribute('data-ns-scale') || 1), n = v * k, d = (el.step.split('.')[1] || '').length; o.textContent = String(k == 1 ? n.toFixed(d) : Math.round(n)).replace('.', ',') + (el.getAttribute('data-ns-unit') || '') }
  }
  el.addEventListener('input', update)
  update()
  return { update, destroy() { el.removeEventListener('input', update); el.style.removeProperty('--p') } }
}
const CSS_ESC = s => globalThis.CSS?.escape ? globalThis.CSS.escape(s) : s

/**
 * Nivel vertical: el gesto lo lleva la librería. Se arrastra arriba y abajo desde cualquier punto y el
 * valor se mueve lo que se mueve el dedo (relativo, sin saltar a donde se toca), como el nivel de un
 * panel de ajustes. En iOS un input range sólo se mueve arrastrando su mando, que aquí es invisible;
 * por eso el input no recibe el puntero: queda para el teclado y el lector de pantalla, y cada gesto
 * cambia su value y lanza input y change como si fuera él. Devuelve { update(), destroy() } o null.
 */
export function level(el) {
  css()
  const i = el.querySelector(':scope > input[type=range]')
  if (!i) return null
  // (se lee y se mueve en vertical: arriba es más)
  i.hasAttribute('aria-orientation') || i.setAttribute('aria-orientation', 'vertical')
  // (lo recorrido, --p, es el del deslizador de dentro)
  const r = i.hasAttribute('data-ns-range') ? null : range(i)
  let drag = null
  const down = e => {
    if (e.button > 0 || i.disabled) return
    drag = { id: e.pointerId, y: e.clientY, v: +i.value, h: el.getBoundingClientRect().height || 1, moved: false }
    el.setPointerCapture?.(e.pointerId)
    i.focus({ preventScroll: true })
  }
  const move = e => {
    if (!drag || e.pointerId != drag.id) return
    const min = +i.min || 0, max = i.max === '' ? 100 : +i.max, dy = drag.y - e.clientY
    if (!drag.moved && Math.abs(dy) < 2) return
    drag.moved = true
    const before = i.value
    // (el navegador ajusta el valor a min, max y step)
    i.value = String(drag.v + dy / drag.h * (max - min))
    if (i.value != before) i.dispatchEvent(new Event('input', { bubbles: true }))
    e.preventDefault()
  }
  const up = e => {
    if (!drag || e.pointerId != drag.id) return
    if (drag.moved) i.dispatchEvent(new Event('change', { bubbles: true }))
    drag = null
  }
  // (el clic de la etiqueta no hace nada más: el foco ya lo pone pointerdown)
  const click = e => e.preventDefault()
  const EV = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['click', click]]
  EV.forEach(([t, f]) => el.addEventListener(t, f))
  return { update: () => r?.update(), destroy() { r?.destroy(); EV.forEach(([t, f]) => el.removeEventListener(t, f)) } }
}

/** Muestras de color: cada botón toma el color de su data-color. */
export function swatches(el) {
  css()
  const paint = () => el.querySelectorAll(':scope > [data-color]').forEach(b => b.style.setProperty('--c', b.getAttribute('data-color')))
  paint()
  const mo = new MutationObserver(paint)
  mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-color'] })
  return { update: paint, destroy() { mo.disconnect() } }
}

// automático: el CSS con cualquiera de los atributos; los que necesitan JS, con el suyo
watch('data-ns-range', el => el.matches('input[type=range]') ? range(el) : null)
watch('data-ns-level', el => level(el))
watch('data-ns-swatches', el => swatches(el))
for (const a of ['data-ns-segment', 'data-ns-chips', 'data-ns-field']) watch(a, () => { css(); return null })
