/*! ns-frame/isle · isla de navegación: cápsula flotante que sigue la sección actual y abre una hoja */
// import { isle } from 'ns-frame/isle'
// const nav = isle(document.querySelector('[data-ns-isle]'), { panel: document.getElementById('menu') })
//
// Marcado (el aspecto viene de serie: cápsula fija abajo, hoja gris-negro, rejilla de secciones;
// todo con :where(), así cualquier estilo tuyo gana):
//   <nav data-ns-isle aria-label="Secciones">
//     <button data-ns-isle-toggle aria-controls="menu">
//       <span data-ns-isle-icon></span>
//       <span data-ns-isle-text><b data-ns-isle-label></b><small data-ns-isle-pos></small></span>
//       <span data-ns-isle-more></span>                      ← flecha (se pone sola si está vacío)
//     </button>
//   </nav>
//   <div id="menu" data-ns-isle-panel role="dialog" aria-modal="true" aria-label="Secciones">
//     <header data-ns-isle-handle><b>Título</b><button data-ns-isle-close aria-label="Cerrar"></button></header>
//     <ul data-ns-isle-links><li><a href="#inicio"><svg…/><span>Inicio</span></a></li> …</ul>
//     <div data-ns-isle-actions><a href="…">Principal</a><a href="…">Otra</a></div>
//   </div>
//
// · La cápsula muestra la sección en pantalla (icono, nombre y posición): completa mientras se baja
//   leyendo, plegada a un icono al subir. La página reserva su hueco abajo.
// · Al tocarla, la cápsula se convierte en la hoja, como la Dynamic Island: se ensancha, crece hacia
//   arriba y el contenido aparece a su paso (sólo transform y opacity: el compositor la mueve).
//   Al cerrarse, el camino inverso; arrastrando la hoja hacia abajo, el mismo camino con el dedo.
// · Se cierra al soltarla lejos o lanzarla, con Escape, con el fondo o con [data-ns-isle-close].
// · Deslizar la cápsula a los lados va a la sección anterior o siguiente.
// · La sección actual se sigue con IntersectionObserver (sin medir en cada scroll).
// · Accesible: aria-expanded, aria-current, inert fuera de la vista, el foco entra y vuelve.
// · Con ns-frame/glass: data-ns-glass en la cápsula la hace de vidrio (fijo: desenfoque nativo
//   fuera de Chromium). La luz del contorno durante la transformación: --ns-isle-glow, --ns-isle-rim.
// · Se inicia con isle(el); el atributo solo no la arranca (necesita saber qué hacer con la página).
// Sin dependencias externas (usa el núcleo y ns-frame/sheet) y CSP-safe: estilos adoptados en @layer ns.

import { styles, jump } from './ns-frame.js'
import { sheet } from './ns-sheet.js'

const CSS = `@layer ns{
.ns-isle-scrim{position:fixed;inset:0;z-index:var(--ns-isle-z,40);background:var(--ns-isle-scrim,rgba(0,0,0,.55));opacity:0;pointer-events:none;transition:opacity var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1))}
.ns-isle-scrim.ns-open{opacity:1;pointer-events:auto}
[data-ns-isle]{transition:opacity .2s,scale .25s var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),width .45s var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1))}
[data-ns-isle][data-ns-hidden]{pointer-events:none}
[data-ns-isle]:not(.ns-isle-m)[data-ns-hidden]{opacity:0;scale:.92}
.ns-isle-morph{position:fixed;left:0;top:0;width:0;height:0;display:none;pointer-events:none;contain:layout style}
.ns-isle-morph>i{position:absolute;left:0;top:0;transform-origin:0 0;background:var(--ns-isle-morph,#1f1f23);will-change:transform}
.ns-isle-morph>i:nth-of-type(-n+4){width:32px;height:32px}
.ns-isle-morph>i:nth-of-type(5),.ns-isle-morph>i:nth-of-type(7){width:100px;height:32px}
.ns-isle-morph>i:nth-of-type(6){width:100px;height:100px}
.ns-isle-soft>i{position:absolute;left:0;top:0;transform-origin:0 0;background:var(--ns-isle-morph,#1f1f23);will-change:transform;filter:blur(5px);opacity:.9}
.ns-isle-soft>i:nth-child(-n+2){width:32px;height:32px}.ns-isle-soft>i:nth-child(3){width:100px;height:32px}
.ns-isle-soft>i:nth-child(1){border-top-left-radius:100%}.ns-isle-soft>i:nth-child(2){border-top-right-radius:100%}
.ns-isle-light{position:absolute;left:0;top:0;overflow:visible;opacity:0;--g:var(--ns-isle-glow,rgba(255,255,255,.62));--w:var(--ns-isle-rim,rgba(255,255,255,.08))}
.ns-isle-light rect{fill:none;vector-effect:non-scaling-stroke}
.ns-isle-light .b{stroke:var(--w);stroke-width:1}
.ns-isle-light :is(.r,.h1,.h2){stroke:var(--g);stroke-dasharray:14 36;stroke-linecap:round;animation:ns-isle-run 2.6s linear infinite}
.ns-isle-light .r{stroke-width:1.1;opacity:.75}
.ns-isle-light .h1{stroke-width:7;opacity:.1}.ns-isle-light .h2{stroke-width:16;opacity:.05}
@keyframes ns-isle-run{to{stroke-dashoffset:-100}}
.ns-isle-morph:not([style*=block]) .ns-isle-light :is(.r,.h1,.h2){animation-play-state:paused}
.ns-isle-morph>i:nth-of-type(1){border-top-left-radius:100%}.ns-isle-morph>i:nth-of-type(2){border-top-right-radius:100%}
.ns-isle-morph>i:nth-of-type(3){border-bottom-right-radius:100%}.ns-isle-morph>i:nth-of-type(4){border-bottom-left-radius:100%}
.ns-isle-m [data-ns-isle-toggle]{transition:opacity .16s}
.ns-isle-m[data-ns-hidden] [data-ns-isle-toggle]{opacity:0}
.ns-isle-m[data-ns-hidden]{background:none!important}
.ns-isle-m[data-ns-hidden]>:is(.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx,.ns-svg){visibility:hidden}
[data-ns-isle-panel]{position:fixed;z-index:calc(var(--ns-isle-z,40) + 1);inset:auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;max-width:var(--ns-isle-sheet-width,430px);margin-inline:auto;translate:0 calc(100% + 40px);visibility:hidden;overscroll-behavior:contain;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s var(--ns-isle-time,.4s)}
[data-ns-isle-panel=top]{inset:calc(12px + env(safe-area-inset-top)) 12px auto 12px;translate:0 calc(-100% - 40px)}
[data-ns-isle-panel].ns-warm{visibility:visible;will-change:translate;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s}
[data-ns-isle-panel].ns-open{translate:0 0;visibility:visible;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s}
[data-ns-isle-panel].ns-now,[data-ns-isle-panel].ns-sheet-drag{transition:none}
[data-ns-isle-panel].ns-stage{translate:0 0;visibility:hidden;transition:none}
[data-ns-isle-panel].ns-morphing{translate:0 0;visibility:visible;transition:none;background:none!important;box-shadow:none!important;border-color:transparent!important}
[data-ns-isle-panel].ns-morphing>:is(.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx,.ns-svg){visibility:hidden}
@media (prefers-reduced-motion:reduce){.ns-isle-scrim,[data-ns-isle],[data-ns-isle-panel]{transition:none!important}}
html.ns-has-isle body{padding-bottom:calc(84px + env(safe-area-inset-bottom))}
[data-ns-isle][data-ns-isle]{--ns-glass-tint:rgba(16,16,20,.42);position:fixed;z-index:var(--ns-isle-z,40);left:50%;bottom:calc(14px + env(safe-area-inset-bottom));width:var(--ns-isle-width,212px);height:54px;translate:-50% 0;border-radius:27px;color:var(--ns-isle-ink,var(--ns-glass-ink,#f4f4f5));contain:layout style}
[data-ns-isle]:not(.ns-glass){background:rgba(18,18,20,.97);--ns-border:rgba(255,255,255,.14)}
[data-ns-isle][data-ns-isle].ns-mini{width:54px}
:root:not([data-ns-input=pointer]) [data-ns-isle-toggle]:focus-visible{outline:2px solid var(--ns-isle-ring,rgba(255,255,255,.72))!important;outline-offset:3px}
:where([data-ns-isle-toggle]){border-radius:inherit;position:absolute;inset:0;display:flex;align-items:center;gap:11px;padding:0 8px 0 9px;border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-align:left}
:where([data-ns-isle-icon]){width:36px;height:36px;border-radius:50%;display:grid;place-items:center;flex:none;background:var(--ns-isle-ink,#f4f4f5);color:var(--ns-isle-action-ink,#0a0a0a)}
:where([data-ns-isle-icon]) svg{width:17px;height:17px}
:where([data-ns-isle-text]){flex:1;min-width:0;overflow:hidden;display:grid;transition:opacity .2s,visibility .2s}
:where([data-ns-isle-label]){font-weight:700;font-size:15px;line-height:1.15;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:where([data-ns-isle-pos]){font-size:11px;line-height:1.3;color:var(--ns-isle-ink-muted,rgba(244,244,245,.6));white-space:nowrap}
:where([data-ns-isle-more]){width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.1);transition:opacity .2s,visibility .2s}
:where([data-ns-isle-more],[data-ns-isle-close]) svg{width:14px;height:14px}
:where([data-ns-isle].ns-mini) :is([data-ns-isle-text],[data-ns-isle-more]){opacity:0;visibility:hidden}
:where([data-ns-isle-panel]){display:flex;flex-direction:column;gap:14px;padding:18px 16px 16px;border-radius:32px;background:var(--ns-isle-bg,#161618);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07),inset 0 1px 0 rgba(255,255,255,.1);color:var(--ns-isle-ink,#f4f4f5);contain:layout style}
:where([data-ns-isle-handle]){position:relative;display:flex;align-items:center;justify-content:space-between;padding:14px 6px 0;cursor:grab}
:where([data-ns-isle-handle])::before{content:"";position:absolute;top:0;left:50%;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:rgba(255,255,255,.22)}
:where([data-ns-isle-handle]) :where(b,h2,h3){font-size:24px;font-weight:700;line-height:1;letter-spacing:-.02em;margin:0}
:where([data-ns-isle-close]){width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:inherit;display:grid;place-items:center;cursor:pointer}
:where([data-ns-isle-links]){display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none}
:where([data-ns-isle-links]) a:not([data-ns]){border-radius:16px}
:where([data-ns-isle-links]) a{--ns-border:rgba(255,255,255,.07);display:flex;flex-direction:column;justify-content:space-between;gap:10px;padding:12px;min-height:78px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-size:14px;font-weight:500;line-height:1.2;transition:background-color .2s}
:where([data-ns-isle-links]) a svg{width:22px;height:22px;color:var(--ns-isle-ink-muted,rgba(244,244,245,.6))}
:where([data-ns-isle-links]) a[aria-current]{background:rgba(255,255,255,.13)}
:where([data-ns-isle-links]) a[aria-current] svg{color:var(--ns-isle-ink,#f4f4f5)}
:where([data-ns-isle-actions]){display:flex;gap:8px}
:where([data-ns-isle-actions]) :is(a,button){flex:1;min-height:48px;border-radius:980px;display:grid;place-items:center;border:0;font:inherit;font-size:15px;font-weight:500;color:inherit;text-decoration:none;background:rgba(255,255,255,.1);cursor:pointer}
:where([data-ns-isle-actions]) :is(a,button):first-child{background:var(--ns-isle-ink,#f4f4f5);color:var(--ns-isle-action-ink,#0a0a0a)!important}
}`
const SVGNS = 'http://www.w3.org/2000/svg'
// un icono de trazo (la flecha de la cápsula y el × de la hoja), si su hueco está vacío
const glyph = (host, d) => {
  if (!host || host.firstElementChild) return
  const s = document.createElementNS(SVGNS, 'svg'), p = document.createElementNS(SVGNS, 'path')
  for (const [k, v] of Object.entries({ viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'aria-hidden': 'true' })) s.setAttribute(k, v)
  p.setAttribute('d', d); s.append(p); host.textContent = ''; host.append(s)
}
let styled = 0
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const q = (el, s) => el.querySelector(s)
const r2 = n => Math.round(n * 100) / 100
// muelle con un rebote leve (≈2,5 %), como las animaciones de sistema de Apple, para abrir
const spring = t => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const z = .76, w = 8.4, wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))
}
// y sin rebote (amortiguado crítico) para cerrar: la hoja se recoge suave, sin pasarse
const calm = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-7 * t) * (1 + 7 * t)
const lerp = (a, b, p) => a + (b - a) * p
const OPEN = 600, CLOSE = 480, N = 32
// formas de serie de las casillas de secciones: squircle, y la actual con chaflán y redondeo
const TILE = 'all squircle 16', CUR = 'tl+br bevel 14; tr+bl round 16; radius 2'
// El recorrido de la silueta, como la Dynamic Island: al abrir, primero se ensancha a los lados (y
// baja hasta el borde de la hoja) y después crece hacia arriba, cada eje con su muelle; al cerrar,
// al revés: baja hasta ser una barra y luego se estrecha hasta la cápsula. N+1 muestras del
// rectángulo y su radio
const route = (A, B, ra, rb, open) => Array.from({ length: N + 1 }, (_, i) => {
  // (al cerrar, la forma espera un instante a que el contenido se vaya: si no, lo de arriba quedaba
  // un momento fuera de ella)
  const t = i / N, x = open ? spring(t / .5) : calm((t - .3) / .7), y = open ? spring((t - .12) / .88) : calm((t - .06) / .64)
  const L = lerp(A.left, B.left, x), R = lerp(A.right, B.right, x), Bo = lerp(A.bottom, B.bottom, x), T = Math.min(lerp(A.top, B.top, y), Bo - 1)
  // (el radio sigue a la altura; en una barra baja lo limita su media altura)
  return { left: L, top: T, width: R - L, height: Bo - T, r: lerp(ra, rb, y) }
})
// La silueta, sólo con transform (el compositor la mueve en su propio hilo, a los fps de la
// pantalla, aunque el hilo principal esté ocupado; clip-path, width o border-radius no: en Safari se
// repintan en el hilo principal cada fotograma). Para que las esquinas no se deformen al escalar, va
// en siete piezas opacas, como un 9-slice: cuatro esquinas de 32px que sólo se desplazan (y escalan
// igual en los dos ejes con el radio) y tres bandas que se estiran: arriba, en medio y abajo. Cada
// pieza lleva las mismas muestras, así que encajan en cada fotograma (se solapan medio píxel)
const pieces = ({ left: x, top: y, width: w, height: h, r }) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  const k = r2(r / 32), iw = Math.max(0, w - 2 * r) + 1, ih = Math.max(0, h - 2 * r) + 1, T = (a, b, s) => `translate(${r2(a)}px,${r2(b)}px) scale(${s})`
  return [T(x, y, k), T(x + w - r, y, k), T(x + w - r, y + h - r, k), T(x, y + h - r, k),
    T(x + r - .5, y, `${r2(iw / 100)},${k}`), T(x, y + r - .5, `${r2(w / 100)},${r2(ih / 100)}`), T(x + r - .5, y + h - r, `${r2(iw / 100)},${k}`)]
}
// la muestra del recorrido en el instante ms (interpolada entre las dos más cercanas)
const sample = (R, ms, dur) => {
  const f = Math.max(0, Math.min(N, ms / dur * N)), i = Math.min(N - 1, Math.floor(f)), k = f - i, a = R[i], b = R[i + 1]
  return { left: lerp(a.left, b.left, k), top: lerp(a.top, b.top, k), width: lerp(a.width, b.width, k), height: lerp(a.height, b.height, k), r: lerp(a.r, b.r, k) }
}

/**
 * Convierte `el` en una isla de navegación.
 * Opciones:
 *   panel      la hoja (por defecto, el elemento de aria-controls del botón o [data-ns-isle-panel])
 *   links      enlaces a secciones (por defecto, los a[href^="#"] de la hoja)
 *   collapse   px de scroll a partir de los que la cápsula puede plegarse (200; false = nunca)
 *   collapseOn 'up' (por defecto): se pliega al subir y se despliega al bajar; 'down': al revés
 *   swipe      deslizar la cápsula cambia de sección (true)
 *   tile, current  formas de ns-frame de las casillas de [data-ns-isle-links] y de la actual
 *              ('all squircle 16' y 'tl+br bevel 14; tr+bl round 16; radius 2'; tile: false = ninguna)
 *   morph      la cápsula se convierte en la hoja (true); false: la hoja entra desde abajo.
 *              Radio final de la silueta: --ns-isle-radius en la hoja (32px)
 *   line       altura de la línea de lectura, en fracción de la ventana (.45): la sección que la
 *              cruza es la actual
 *   go(target, link)  cómo ir a una sección (por defecto jump() del núcleo: suave, fiable con
 *              content-visibility, respeta scroll-padding, y enfoca la sección al llegar)
 *   media      media query en la que la isla existe ('(max-width: 900px)'): se monta y se desmonta
 *              sola al cambiar la pantalla (su marcado lo ocultas tú con la misma media query)
 *   pos(i, n)  texto de posición ("2 / 7")
 *   onChange(i, link) · onOpen() · onClose()
 * Devuelve { open(), close(), toggle(), go(i), get index(), destroy() }.
 */
export function isle(el, o = {}) {
  if (!o.media) return mount(el, o)
  // sólo mientras se cumple la media query: fuera de ella, nada montado (ni escuchas ni velo)
  const mq = matchMedia(o.media)
  let h = null
  const sync = () => { if (mq.matches) h ||= mount(el, o); else { h?.destroy(); h = null } }
  mq.addEventListener('change', sync)
  sync()
  return {
    open: () => h?.open(), close: () => h?.close(), toggle: () => h?.toggle(), go: i => h?.go(i),
    get index() { return h ? h.index : -1 },
    destroy() { mq.removeEventListener('change', sync); h?.destroy(); h = null },
  }
}

function mount(el, o) {
  if (!styled) { styled = 1; styles(CSS) }
  const btn = q(el, '[data-ns-isle-toggle]') || q(el, 'button')
  const panel = o.panel || document.getElementById(btn?.getAttribute('aria-controls')) || q(document, '[data-ns-isle-panel]')
  if (!btn || !panel) throw new Error('ns-isle: falta el botón o la hoja')
  panel.hasAttribute('data-ns-isle-panel') || panel.setAttribute('data-ns-isle-panel', '')
  const links = [...(o.links || panel.querySelectorAll('a[href^="#"]'))]
  // (formas de serie sólo en la rejilla de la librería, [data-ns-isle-links], y si no se desactivan)
  const tiles = o.tile !== false && !!q(panel, '[data-ns-isle-links]')
  const targets = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))))
  const icon = q(el, '[data-ns-isle-icon]'), label = q(el, '[data-ns-isle-label]'), posEl = q(el, '[data-ns-isle-pos]')
  const pos = o.pos || ((i, n) => `${i + 1} / ${n}`)
  const go = o.go || (t => jump(t, { smooth: true, focus: true }))
  const scrim = document.createElement('div')
  scrim.className = 'ns-isle-scrim'
  panel.before(scrim)
  // de serie: la flecha de la cápsula, el × de la hoja y el hueco de la cápsula al pie de la página
  glyph(q(el, '[data-ns-isle-more]'), 'M3 9l4-4 4 4')
  panel.querySelectorAll('[data-ns-isle-close]').forEach(b => { glyph(b, 'M3 3l8 8M11 3l-8 8'); b.hasAttribute('aria-label') || b.setAttribute('aria-label', 'Cerrar') })
  document.documentElement.classList.add('ns-has-isle')
  btn.setAttribute('aria-expanded', 'false')
  panel.inert = true

  let cur = -1, isOpen = false, timer = 0
  const set = i => {
    if (i == cur || !links[i]) return
    cur = i
    links.forEach((a, j) => j == i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'))
    // las casillas de la hoja, con formas de ns-frame: la actual, otra forma (con morph entre ambas)
    if (tiles) links.forEach((a, j) => a.setAttribute('data-ns', j == i ? o.current || CUR : o.tile || TILE))
    const a = links[i]
    if (label) label.textContent = a.dataset.nsIsleName || a.textContent.trim()
    if (posEl) posEl.textContent = pos(i, links.length)
    // el icono de la cápsula es el mismo del enlace (se clona: nada de HTML en texto)
    const ic = a.querySelector('svg,img')
    if (icon && ic) icon.replaceChildren(ic.cloneNode(true))
    o.onChange?.(i, a)
  }

  // la cápsula se convierte en la hoja (salvo morph: false)
  const MORPH = o.morph !== false
  el.classList.toggle('ns-isle-m', MORPH)
  // la silueta (una capa fija, entre el velo y la hoja) y el turno: una apertura que interrumpe un
  // cierre (o al revés) anula lo que quedara pendiente del anterior
  let mo = null, run = 0, fx = []
  const Z = () => parseInt(getComputedStyle(scrim).zIndex) || 40
  // radio y color de la silueta: los de la hoja (su border-radius y su fondo), para que al crecer sea
  // la propia hoja; --ns-isle-radius y --ns-isle-morph los fijan si la hoja no los tiene (un vidrio)
  const rad = () => { const s = getComputedStyle(panel); return parseFloat(s.getPropertyValue('--ns-isle-radius')) || parseFloat(s.borderTopLeftRadius) || 32 }
  const paint = () => { const s = getComputedStyle(panel), c = s.backgroundColor; return s.getPropertyValue('--ns-isle-morph').trim() || (/^(transparent|rgba\(.*,\s*0\))$/.test(c) ? '' : c) }
  const cap = r => Math.min(r.width, r.height) / 2
  // las capas del material de la hoja (vidrio, canto, borde) y lo que se ve de ella: lo que entra
  // mientras la silueta crece. Un bloque alto (la rejilla de secciones) entra pieza a pieza
  const LAYERS = '.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx,.ns-svg'
  const layers = () => panel.querySelectorAll(`:scope > :is(${LAYERS})`)
  const leaves = () => {
    const out = [], H = panel.offsetHeight
    const walk = n => { for (const k of n.children) if (!k.matches(LAYERS)) k.offsetHeight > H * .3 && k.children.length ? walk(k) : out.push(k) }
    walk(panel)
    return out
  }
  const unfade = () => { fx.forEach(a => a.cancel()); fx = [] }
  // la silueta recorre las muestras R en dur ms (cada pieza con las mismas: encajan siempre)
  const morph = (R, dur, open, col) => {
    build()
    // (su color, el de la hoja; su luz y su canto: --ns-isle-glow y --ns-isle-rim de la hoja)
    const s = getComputedStyle(panel)
    col ? mo.style.setProperty('--ns-isle-morph', col) : mo.style.removeProperty('--ns-isle-morph')
    for (const k of ['--ns-isle-glow', '--ns-isle-rim']) { const v = s.getPropertyValue(k).trim(); v ? mo.style.setProperty(k, v) : mo.style.removeProperty(k) }
    Object.assign(mo.style, { display: 'block', zIndex: Z() + 1 })
    mine().forEach(a => a.cancel())
    const K = R.map(pieces), P = [...mo.querySelectorAll(':scope > i')], S = [...mo.firstChild.children]
    // la luz se enciende al arrancar, acompaña el recorrido y se apaga al llegar
    mo.lastChild.animate([{ opacity: 0 }, { opacity: 1, offset: open ? .22 : .12 }, { opacity: 1, offset: open ? .72 : .6 }, { opacity: 0 }], { duration: dur, fill: 'both' })
    const g = P.map((p, i) => p.animate(K.map(k => ({ transform: k[i] })), { duration: dur, fill: 'both' }))[0]
    // el borde difuminado: sigue a las esquinas y a la banda de arriba (piezas 1, 2 y 5), y se apaga
    // al llegar (en reposo la hoja es nítida)
    S.forEach((p, i) => p.animate(K.map((k, j) => ({ transform: k[[0, 1, 4][i]], opacity: j == N ? 0 : .9 })), { duration: dur, fill: 'both' }))
    lit(g, R, dur)
    return g
  }
  // la silueta (sus piezas y su luz), una vez
  const build = () => {
    if (!mo) {
      mo = document.createElement('div')
      mo.className = 'ns-isle-morph'
      mo.setAttribute('aria-hidden', 'true')
      // (su animación no cambia la página que hay debajo: los vidrios no la rasterizan otra vez)
      mo.setAttribute('data-ns-quiet', '')
      scrim.setAttribute('data-ns-quiet', '')
      // (el borde de arriba, difuminado: copias desenfocadas de las esquinas y la banda de arriba,
      // detrás de las nítidas; también sólo con transform, cada una en su capa)
      const soft = document.createElement('div')
      soft.className = 'ns-isle-soft'
      for (let i = 0; i < 3; i++) soft.append(document.createElement('i'))
      mo.append(soft)
      for (let i = 0; i < 7; i++) mo.append(document.createElement('i'))
      // La luz del borde: un destello que da la vuelta al contorno (con un halo, recortado a la forma,
      // que ilumina hacia dentro) sobre un canto tenue. Es un SVG de rectángulos que siguen a la
      // silueta en cada fotograma (sólo cambian cinco atributos); el destello corre con una animación
      // CSS del trazo. Sin filtros de desenfoque: redibujados en cada fotograma frenaban la apertura
      // en el iPhone; el halo son dos trazos anchos y tenues
      const id = 'nsil' + Math.random().toString(36).slice(2, 7), NS = SVGNS, mk = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e }
      const svg = mk('svg', { class: 'ns-isle-light', width: 1, height: 1 }), defs = mk('defs'), cp = mk('clipPath', { id: id + 'c' })
      lr = [mk('rect'), mk('rect', { class: 'b' }), mk('rect', { class: 'h2', pathLength: 100 }), mk('rect', { class: 'h1', pathLength: 100 }), mk('rect', { class: 'r', pathLength: 100 })]
      cp.append(lr[0]); defs.append(cp)
      const g = mk('g', { 'clip-path': `url(#${id}c)` }); g.append(lr[2], lr[3])
      svg.append(defs, lr[1], g, lr[4])
      mo.append(svg)
      // (entre el velo y la hoja: el contenido de la hoja va encima de la silueta)
      panel.before(mo)
    }
  }
  // los rectángulos de la luz, donde está la silueta en cada fotograma (también mientras el dedo la
  // lleva: se lee el instante de la animación, pausada o no)
  let lr = null, lf = 0
  const lit = (g, R, dur) => {
    cancelAnimationFrame(lf)
    let last = -1
    const f = () => {
      if (!mo || mo.style.display != 'block' || g.playState == 'idle') return
      lf = requestAnimationFrame(f)
      // (sólo si la silueta se movió: parada, o con el dedo quieto, no se toca el SVG)
      const t = g.currentTime || 0
      if (t == last) return
      last = t
      const s = sample(R, t, dur), r = Math.max(0, Math.min(s.r, s.width / 2, s.height / 2))
      lr.forEach((e, i) => { const d = i == 0 ? 0 : .75; e.setAttribute('x', r2(s.left + d)); e.setAttribute('y', r2(s.top + d)); e.setAttribute('width', r2(Math.max(0, s.width - 2 * d))); e.setAttribute('height', r2(Math.max(0, s.height - 2 * d))); e.setAttribute('rx', r2(Math.max(0, r - d))) })
    }
    f()
  }
  // la silueta se va (opacidad del grupo, también en el compositor)
  const fade = d => mo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: 'ease-out', fill: 'forwards' })
  // fn cuando la animación a llega a la fracción k de su duración (con su propio reloj: si el
  // navegador la frena o la acelera, el relevo sigue en su sitio); nada si se cancela antes
  const at = (a, k, fn) => {
    const T = a.effect.getTiming(), d = (T.delay || 0) + T.duration * k
    const f = () => a.playState == 'idle' ? 0 : a.playState == 'finished' || a.currentTime >= d ? fn() : requestAnimationFrame(f)
    f()
  }
  const unmorph = () => { if (mo) { mine().forEach(a => a.cancel()); mo.style.display = 'none' } }
  // las animaciones de la silueta que son nuestras (Web Animations): no la del destello de la luz, que
  // es CSS y corre sola; cancelada, no volvería a arrancar, y pausada con el resto, no se movería al arrastrar
  const mine = () => mo.getAnimations({ subtree: true }).filter(a => !('animationName' in a))
  // la muestra en la que la silueta cubre (open) o deja de cubrir el rectángulo e
  const when = (R, e, open) => {
    const i = R.findIndex(s => open
      ? s.top <= e.top + e.height * .35 && s.left <= e.left + 6 && s.left + s.width >= e.right - 6
      : s.top > e.top + e.height * .45 || s.left > e.left + 6 || s.left + s.width < e.right - 6)
    return i < 0 ? N : i
  }

  // prepara la hoja antes del clic: al apoyar el dedo o pasar el ratón ya se pinta (sin parón al
  // abrir). Con morph, oculta en su sitio final; si no, fuera de pantalla
  const warm = () => { if (!isOpen) { panel.classList.add(MORPH ? 'ns-stage' : 'ns-warm'); clearTimeout(timer); timer = setTimeout(cool, 1500) } }
  const cool = () => isOpen || panel.classList.remove('ns-warm', 'ns-stage')

  // la hoja, entera y con el foco dentro
  const reveal = t => {
    const m = panel.classList.contains('ns-morphing')
    panel.classList.remove('ns-stage', 'ns-now', 'ns-morphing')
    panel.classList.add('ns-warm', 'ns-open')
    // (al final de la silueta, el material de la hoja aparece sobre ella y la silueta se va debajo)
    if (m) {
      const f = [...layers()].map(l => l.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' }))
      f[0] ? at(f[0], 1, () => t == run && at(fade(180), 1, () => t == run && unmorph())) : unmorph()
    }
    // el foco entra en la hoja (se reintenta unos fotogramas: si aún no cuenta como visible, el
    // navegador ignora focus() sin avisar y el foco se quedaría fuera)
    let n = 0
    const enter = () => {
      if (!isOpen || panel.contains(document.activeElement)) return
      ;(links[cur] || focusables()[0] || panel).focus?.({ preventScroll: true })
      if (++n < 8) requestAnimationFrame(enter)
    }
    enter()
  }

  // con la hoja abierta, la página de detrás no se desplaza: overflow en <html> (rueda, teclado y
  // la mayoría de navegadores) y, para el táctil de iOS, que lo ignora, el gesto se anula salvo
  // dentro de algo de la hoja que tenga su propio scroll
  const scrolls = n => { for (; n && n != panel.parentNode; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return true; return false }
  const block = e => { if (e.cancelable && !(panel.contains(e.target) && scrolls(e.target))) e.preventDefault() }
  const lock = on => {
    const h = document.documentElement.style
    if (on) { h.setProperty('overflow', 'hidden'); h.setProperty('scrollbar-gutter', 'stable'); addEventListener('touchmove', block, { passive: false }) }
    else { h.removeProperty('overflow'); h.removeProperty('scrollbar-gutter'); removeEventListener('touchmove', block) }
  }

  // El cierre como línea de tiempo: todo son animaciones con su retardo (nada de relevos por el
  // camino), así se puede reproducir sola o llevarla con el dedo. La hoja pasa a ser la silueta (mismo
  // color y forma), que baja hasta ser una barra y se estrecha hasta la cápsula; el contenido se va
  // justo antes de que deje de cubrirlo; al llegar, la cápsula aparece encima y la silueta se va
  const HOME = CLOSE * .84
  const closer = () => {
    const B = panel.getBoundingClientRect(), A = el.getBoundingClientRect(), R = route(B, A, rad(), cap(A), false), col = paint()
    el.style.zIndex = Z() + 2
    morph(R, CLOSE, false, col)
    const L = leaves().map(k => [k, k.getBoundingClientRect()])
    panel.classList.add('ns-morphing'); panel.classList.remove('ns-open', 'ns-warm', 'ns-stage')
    // (la cápsula vuelve a estar, pero transparente hasta su fundido: sin saltos al llegar)
    el.removeAttribute('data-ns-hidden')
    const all = [...mine(),
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: HOME, easing: 'ease-out', fill: 'both' }),
      mo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: HOME + 150, fill: 'both' }),
      // (cada pieza se va entre que el borde está 30 px por encima y pasa su mitad: en espacio, no en
      // tiempo, porque a mitad de camino la forma recorre mucho en pocos milisegundos)
      // (o cuando los lados, al estrecharse, llegan a ella: los botones de abajo)
      ...L.map(([k, r]) => {
        const si = R.findIndex(s => s.left > r.left + 4 || s.left + s.width < r.right - 4), side = si < 0 ? Infinity : si / N * CLOSE
        const a = Math.min(timeFor(R, r.top - 30 - R[0].top), Math.max(0, side - 60)), b = Math.max(a + 16, Math.min(timeFor(R, r.top + r.height * .5 - R[0].top), side))
        return k.animate([{ opacity: 1 }, { opacity: 0, scale: '.97' }], { duration: b - a, delay: a, easing: 'ease-in', fill: 'both' }) })]
    return { R, all }
  }
  // cerrada del todo / abierta otra vez (el dedo la devolvió a su sitio)
  const shut = () => {
    unfade(); unmorph()
    panel.classList.add('ns-now'); panel.classList.remove('ns-morphing', 'ns-open', 'ns-warm', 'ns-stage')
    el.style.zIndex = ''; scrim.style.transition = ''
  }
  const unshut = () => {
    unfade(); unmorph()
    panel.classList.remove('ns-morphing'); panel.classList.add('ns-warm', 'ns-open')
    el.setAttribute('data-ns-hidden', '')
    scrim.style.transition = scrim.style.opacity = ''
  }
  // Arrastrar la hoja hacia abajo lleva el cierre con el dedo: el borde de arriba de la forma sigue
  // al dedo (1:1) y todo lo demás —contenido, luz, velo— va con él. Al soltar, termina de cerrarse o
  // vuelve, según la distancia y la velocidad (lo decide ns-frame/sheet)
  let sc = null
  const timeFor = (R, dy) => {
    // (en su sitio, el instante 0: todo el contenido a la vista, aunque el dedo siga apoyado)
    if (dy <= .5) return 0
    const top = R[0].top
    for (let i = 1; i <= N; i++) if (R[i].top - top >= dy) { const a = R[i - 1].top - top, b = R[i].top - top; return Math.min(HOME, (i - 1 + (b > a ? (dy - a) / (b - a) : 1)) / N * CLOSE) }
    return HOME
  }
  const track = y => {
    if (!isOpen) return
    if (!sc) {
      run++
      sc = closer()
      fx = sc.all
      sc.all.forEach(a => a.pause())
      scrim.style.transition = 'none'
    }
    const ms = sc.ms = timeFor(sc.R, Math.max(0, y))
    sc.all.forEach(a => { a.currentTime = ms })
    scrim.style.opacity = String(Math.max(0, 1 - ms / HOME))
  }
  // al soltar, lo que falta hasta cerrarse (to = HOME) o hasta volver (to = 0), con una curva suave
  // que arranca a la velocidad del dedo y frena al llegar: ni el muelle ni la línea de tiempo al revés
  // (que se veían bruscos a mitad de camino)
  const glide = (s, to, done) => {
    const from = s.ms || 0, d = Math.max(170, Math.abs(to - from) * .95), t0 = performance.now()
    const f = now => {
      const k = Math.min(1, (now - t0) / d), ms = from + (to - from) * (1 - (1 - k) ** 3)
      s.all.forEach(a => { a.currentTime = ms })
      scrim.style.opacity = String(Math.max(0, 1 - ms / HOME))
      k < 1 ? requestAnimationFrame(f) : done()
    }
    requestAnimationFrame(f)
  }
  const settle = c => {
    const s = sc
    sc = null
    if (!s) return
    if (c) return show(false, false, s)
    const t = run
    glide(s, 0, () => t == run && unshut())
  }

  const show = (on, now = false, given = null) => {
    if (on == isOpen) return
    isOpen = on
    lock(on)
    const t = ++run, anim = MORPH && !now && !reduced()
    btn.setAttribute('aria-expanded', String(on))
    panel.inert = !on
    // (con la hoja abierta, la cápsula está oculta: fuera del orden del foco y del lector de pantalla)
    el.inert = on
    scrim.classList.toggle('ns-open', on)
    // (la línea de tiempo que llevaba el dedo sigue, con su velo: no se cancela)
    if (!given) { unfade(); scrim.style.opacity = '' }
    if (on) {
      o.onOpen?.()
      if (anim) {
        // La silueta nace bajo la cápsula (que se desvanece encima) y recorre el camino hasta la
        // hoja: primero a los lados, luego hacia arriba. La hoja ya está en su sitio, sin su
        // material: su contenido entra pieza a pieza justo cuando la silueta lo alcanza. Al llegar,
        // el material aparece encima y la silueta se va debajo
        const A = el.getBoundingClientRect(), col = paint(), r = rad()
        panel.classList.remove('ns-warm', 'ns-stage'); panel.classList.add('ns-morphing')
        const B = panel.getBoundingClientRect(), R = route(A, B, cap(A), r, true)
        el.style.zIndex = Z() + 2
        const g = morph(R, OPEN, true, col), p = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-out', fill: 'forwards' })
        fx = [p, ...leaves().map(k => k.animate([{ opacity: 0, translate: '0 10px', scale: '.97' }, { opacity: 1, translate: '0 0', scale: '1' }],
          { duration: 320, delay: Math.max(90, when(R, k.getBoundingClientRect(), true) / N * OPEN), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }))]
        // (el desvanecido de la cápsula se queda puesto: si se cancelara, su texto volvería un
        // instante antes de ocultarse, un parpadeo)
        at(p, 1, () => t == run && el.setAttribute('data-ns-hidden', ''))
        at(g, 1, () => t == run && reveal(t))
        return
      }
      el.setAttribute('data-ns-hidden', '')
      panel.classList.toggle('ns-now', now)
      panel.classList.add('ns-warm')
      // un frame con la hoja ya visible fuera de pantalla y luego la transición: nunca arranca en frío
      requestAnimationFrame(() => requestAnimationFrame(() => t == run && reveal(t)))
      return
    }
    o.onClose?.()
    btn.focus({ preventScroll: true })
    // (tras un arrastre que volvió a su sitio queda un translate en línea que taparía el de la clase)
    if (!now) sh.reset()
    if (anim) {
      // la línea de tiempo del cierre (la que ya llevaba el dedo, o una nueva), hasta el final
      const tl = given || closer()
      fx = tl.all
      const end = () => {
        if (t != run) return
        scrim.style.transition = ''; scrim.style.opacity = ''
        // (las que ya llegaron a su final se dan por terminadas: play() las rebobinaría al principio
        // y el contenido reaparecía un instante al cerrarse)
        tl.all.forEach(a => { a.playbackRate = 1; a.currentTime >= a.effect.getComputedTiming().endTime ? a.finish() : a.play() })
        Promise.all(tl.all.map(a => a.finished)).then(() => t == run && shut(), () => {})
      }
      // (soltada a medio camino: lo que falta hasta la cápsula, suave; luego la cápsula aparece)
      given ? glide(given, HOME, end) : end()
      return
    }
    unmorph()
    panel.classList.toggle('ns-now', now)
    panel.classList.remove('ns-open', 'ns-stage', 'ns-morphing'); cool()
    el.removeAttribute('data-ns-hidden'); el.style.zIndex = ''
  }
  const sh = sheet(panel, {
    handle: q(panel, '[data-ns-isle-handle]') || panel,
    onProgress: p => { scrim.style.opacity = String(p) },
    onClose: () => show(false, true),
    // (con morph, el dedo lleva la transformación en vez de bajar la hoja entera)
    ...(MORPH && !reduced() ? { track, settle } : {}),
  })
  // (con morph, la hoja vuelve a la cápsula; si no, baja como al soltarla)
  const close = () => isOpen && (reduced() || MORPH ? show(false) : sh.close())

  // tocar abre; deslizar a los lados cambia de sección
  let x0 = null, swiped = false
  const down = e => { x0 = e.clientX; swiped = false; warm() }
  const up = e => {
    if (x0 == null) return
    const dx = e.clientX - x0
    x0 = null
    if (o.swipe === false || Math.abs(dx) < 40) return
    swiped = true
    const i = Math.max(0, Math.min(links.length - 1, cur + (dx < 0 ? 1 : -1)))
    targets[i] && go(targets[i], links[i])
  }
  const click = () => { if (!swiped) show(!isOpen); swiped = false }
  btn.addEventListener('pointerdown', down)
  btn.addEventListener('pointerup', up)
  btn.addEventListener('pointerenter', warm)
  btn.addEventListener('focus', warm)
  btn.addEventListener('click', click)
  btn.style.touchAction = 'pan-y'

  // elegir una sección: la hoja baja y la página va hasta ella
  const pick = e => {
    const a = e.target.closest?.('a[href^="#"]'), i = links.indexOf(a)
    if (i < 0 || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    history.pushState(null, '', a.hash)
    set(i)
    show(false)
    targets[i] && go(targets[i], a)
  }
  panel.addEventListener('click', pick)
  const onClose = e => { if (e.target.closest?.('[data-ns-isle-close]')) close() }
  panel.addEventListener('click', onClose)
  scrim.addEventListener('click', close)
  // la hoja es modal: con Tab el foco da la vuelta dentro de ella y nunca sale a la página de detrás
  const focusables = () => [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(n => n.getClientRects().length)
  const key = e => {
    if (!isOpen) return
    if (e.key == 'Escape') return close()
    if (e.key != 'Tab') return
    const F = focusables()
    if (!F.length) return
    const i = F.indexOf(document.activeElement)
    if (i < 0 || (e.shiftKey && i == 0) || (!e.shiftKey && i == F.length - 1)) { e.preventDefault(); F[e.shiftKey ? F.length - 1 : 0].focus({ preventScroll: true }) }
    back = e.shiftKey
  }
  // (y si aun así el foco llega fuera, como en Safari, que con Tab se salta los enlaces: vuelve dentro)
  let back = false
  const trap = e => {
    if (!isOpen || panel.contains(e.target)) return
    const F = focusables()
    ;(F[back ? F.length - 1 : 0] || panel).focus?.({ preventScroll: true })
  }
  document.addEventListener('focusin', trap)
  addEventListener('keydown', key)

  // sección actual: la que cruza la línea de lectura
  const line = o.line ?? .45, seen = new Set()
  const io = new IntersectionObserver(es => {
    for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)
    let k = -1
    targets.forEach((t, j) => { if (seen.has(t)) k = j })
    if (k >= 0) set(k)
  }, { rootMargin: `-${line * 100}% 0px -${100 - line * 100 - .1}% 0px` })
  targets.forEach(t => t && io.observe(t))
  set(0)


  // pliegue al bajar y última sección al llegar al final (no siempre alcanza la línea)
  let y0 = scrollY, raf = 0
  const frame = () => {
    raf = 0
    const y = scrollY
    if (y + innerHeight >= document.documentElement.scrollHeight - 2) set(links.length - 1)
    // (al bajar leyendo, completa: dice en qué sección estás; al subir, un icono. collapseOn: 'down',
    // al revés, como la barra de Safari en iPhone)
    if (o.collapse !== false && !isOpen && Math.abs(y - y0) > 6) { el.classList.toggle('ns-mini', (o.collapseOn == 'down' ? y > y0 : y < y0) && y > (o.collapse ?? 200)); y0 = y }
  }
  const scroll = () => { raf ||= requestAnimationFrame(frame) }
  addEventListener('scroll', scroll, { passive: true })

  return {
    open: () => show(true), close, toggle: () => isOpen ? close() : show(true),
    go: i => targets[i] && go(targets[i], links[i]),
    get index() { return cur },
    destroy() {
      run++; unfade(); mo?.remove(); mo = null; isOpen && lock(false); document.documentElement.classList.remove('ns-has-isle'); el.style.zIndex = ''; el.classList.remove('ns-isle-m')
      io.disconnect(); sh.destroy(); scrim.remove(); clearTimeout(timer)
      removeEventListener('scroll', scroll); removeEventListener('keydown', key); document.removeEventListener('focusin', trap)
      btn.removeEventListener('pointerdown', down); btn.removeEventListener('pointerup', up)
      btn.removeEventListener('pointerenter', warm); btn.removeEventListener('focus', warm); btn.removeEventListener('click', click)
      panel.removeEventListener('click', pick); panel.removeEventListener('click', onClose)
      panel.classList.remove('ns-open', 'ns-warm', 'ns-now', 'ns-stage', 'ns-morphing'); el.removeAttribute('data-ns-hidden'); el.classList.remove('ns-mini')
      panel.inert = false; el.inert = false; btn.style.touchAction = ''
    },
  }
}
