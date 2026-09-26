/*! ns-frame/isle · isla de navegación: cápsula flotante que sigue la sección actual y abre una hoja */
// import { isle } from 'ns-frame/isle'
// const nav = isle(document.querySelector('[data-ns-isle]'), { panel: document.getElementById('menu') })
//
// Marcado (tuyo, con tus formas data-ns):
//   <nav data-ns-isle aria-label="Secciones">
//     <button data-ns-isle-toggle aria-controls="menu">
//       <span data-ns-isle-icon></span> <b data-ns-isle-label></b> <small data-ns-isle-pos></small>
//     </button>
//   </nav>
//   <div id="menu" data-ns-isle-panel role="dialog" aria-label="Secciones">
//     … <a href="#inicio">…</a> <a href="#precios">…</a> … <button data-ns-isle-close>×</button>
//   </div>
//
// · La cápsula muestra la sección en pantalla (icono, nombre y posición): completa mientras se baja
//   leyendo, plegada a un icono al subir.
// · Al tocarla, la cápsula se convierte en la hoja, como la Dynamic Island: una silueta crece de una
//   a otra con un muelle y, al llegar, la hoja ya está ahí y su contenido entra escalonado. Al
//   cerrarse, el camino inverso. La silueta es una sola capa con desenfoque nativo (GPU) que sólo
//   cambia su recorte: durante la animación no se recalcula ninguna forma ni ningún vidrio.
// · La hoja se prepara al apoyar el dedo (antes del clic), oculta en su sitio: su vidrio ya está
//   pintado cuando aparece. (morph: false: la hoja entra desde abajo, moviendo sólo `translate`.)
// · Se arrastra como una hoja nativa (ns-frame/sheet) y se cierra al soltarla, con Escape o el fondo.
// · Deslizar la cápsula a los lados va a la sección anterior o siguiente.
// · La sección actual se sigue con IntersectionObserver (sin medir en cada scroll).
// · Accesible: aria-expanded, aria-current, inert fuera de la vista, el foco entra y vuelve.
// Sin dependencias (salvo ns-frame/sheet) y CSP-safe: estilos adoptados en @layer ns.

import { styles } from './ns-frame.js'
import { sheet } from './ns-sheet.js'

const CSS = `@layer ns{
.ns-isle-scrim{position:fixed;inset:0;z-index:var(--ns-isle-z,40);background:var(--ns-isle-scrim,rgba(0,0,0,.55));opacity:0;pointer-events:none;transition:opacity var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1))}
.ns-isle-scrim.ns-open{opacity:1;pointer-events:auto}
[data-ns-isle]{transition:opacity .2s,scale .25s var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),width .45s var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1))}
[data-ns-isle].ns-hide{pointer-events:none}
[data-ns-isle]:not(.ns-isle-m).ns-hide{opacity:0;scale:.92}
.ns-isle-morph{position:fixed;left:0;top:0;width:0;height:0;display:none;pointer-events:none;contain:layout style}
.ns-isle-morph>i{position:absolute;left:0;top:0;transform-origin:0 0;background:var(--ns-isle-morph,#1f1f23);will-change:transform}
.ns-isle-morph>i:nth-child(-n+4){width:32px;height:32px}
.ns-isle-morph>i:nth-child(5),.ns-isle-morph>i:nth-child(7){width:100px;height:32px}
.ns-isle-morph>i:nth-child(6){width:100px;height:100px}
.ns-isle-morph>i:is(:nth-child(1),:nth-child(2),:nth-child(5)){box-shadow:inset 0 1px 0 var(--ns-isle-rim,rgba(255,255,255,.16))}
.ns-isle-morph>i:nth-child(1){border-top-left-radius:100%}.ns-isle-morph>i:nth-child(2){border-top-right-radius:100%}
.ns-isle-morph>i:nth-child(3){border-bottom-right-radius:100%}.ns-isle-morph>i:nth-child(4){border-bottom-left-radius:100%}
.ns-isle-m [data-ns-isle-toggle]{transition:opacity .16s}
.ns-isle-m.ns-hide [data-ns-isle-toggle]{opacity:0}
.ns-isle-m.ns-hide{background:none!important}
.ns-isle-m.ns-hide>:is(.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx,.ns-svg){visibility:hidden}
[data-ns-isle-panel]{position:fixed;z-index:calc(var(--ns-isle-z,40) + 1);inset:auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;max-width:var(--ns-isle-w,430px);margin-inline:auto;translate:0 calc(100% + 40px);visibility:hidden;overscroll-behavior:contain;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s var(--ns-isle-time,.4s)}
[data-ns-isle-panel=top]{inset:calc(12px + env(safe-area-inset-top)) 12px auto 12px;translate:0 calc(-100% - 40px)}
[data-ns-isle-panel].ns-warm{visibility:visible;will-change:translate;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s}
[data-ns-isle-panel].ns-open{translate:0 0;visibility:visible;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s}
[data-ns-isle-panel].ns-now,[data-ns-isle-panel].ns-sheet-drag{transition:none}
[data-ns-isle-panel].ns-stage{translate:0 0;visibility:hidden;transition:none}
[data-ns-isle-panel].ns-morphing{translate:0 0;visibility:visible;transition:none;background:none!important}
[data-ns-isle-panel].ns-morphing>:is(.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx,.ns-svg){visibility:hidden}
@media (prefers-reduced-motion:reduce){.ns-isle-scrim,[data-ns-isle],[data-ns-isle-panel]{transition:none!important}}
}`
let styled = 0
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const q = (el, s) => el.querySelector(s)
const r2 = n => Math.round(n * 100) / 100
// muelle con un rebote leve (≈2,5 %), como las animaciones de sistema de Apple; donde no hay
// linear(), una curva con el mismo exceso
// muelle con un rebote leve (≈2,5 %), como las animaciones de sistema de Apple
const spring = t => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const z = .76, w = 8.4, wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))
}
const lerp = (a, b, p) => a + (b - a) * p
const OPEN = 600, CLOSE = 480, N = 40
// El recorrido de la silueta, como la Dynamic Island: al abrir, primero se ensancha a los lados (y
// baja hasta el borde de la hoja) y después crece hacia arriba, cada eje con su muelle; al cerrar,
// al revés: baja hasta ser una barra y luego se estrecha hasta la cápsula. N+1 muestras del
// rectángulo y su radio
const route = (A, B, ra, rb, open) => Array.from({ length: N + 1 }, (_, i) => {
  const t = i / N, x = open ? spring(t / .5) : spring((t - .22) / .78), y = open ? spring((t - .12) / .88) : spring(t / .62)
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

/**
 * Convierte `el` en una isla de navegación.
 * Opciones:
 *   panel      la hoja (por defecto, el elemento de aria-controls del botón o [data-ns-isle-panel])
 *   links      enlaces a secciones (por defecto, los a[href^="#"] de la hoja)
 *   collapse   px de scroll a partir de los que la cápsula puede plegarse (200; false = nunca)
 *   collapseOn 'up' (por defecto): se pliega al subir y se despliega al bajar; 'down': al revés
 *   swipe      deslizar la cápsula cambia de sección (true)
 *   morph      la cápsula se convierte en la hoja (true); false: la hoja entra desde abajo.
 *              Radio final de la silueta: --ns-isle-radius en la hoja (32px)
 *   line       altura de la línea de lectura, en fracción de la ventana (.45): la sección que la
 *              cruza es la actual
 *   go(target, link)  cómo ir a una sección (por defecto scrollIntoView suave; respeta
 *              scroll-padding / scroll-margin)
 *   pos(i, n)  texto de posición ("2 / 7")
 *   onChange(i, link) · onOpen() · onClose()
 * Devuelve { open(), close(), toggle(), go(i), get index(), destroy() }.
 */
export function isle(el, o = {}) {
  if (!styled) { styled = 1; styles(CSS) }
  const btn = q(el, '[data-ns-isle-toggle]') || q(el, 'button')
  const panel = o.panel || document.getElementById(btn?.getAttribute('aria-controls')) || q(document, '[data-ns-isle-panel]')
  if (!btn || !panel) throw new Error('ns-isle: falta el botón o la hoja')
  panel.hasAttribute('data-ns-isle-panel') || panel.setAttribute('data-ns-isle-panel', '')
  const links = [...(o.links || panel.querySelectorAll('a[href^="#"]'))]
  const targets = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))))
  const icon = q(el, '[data-ns-isle-icon]'), label = q(el, '[data-ns-isle-label]'), posEl = q(el, '[data-ns-isle-pos]')
  const pos = o.pos || ((i, n) => `${i + 1} / ${n}`)
  const go = o.go || (t => t.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }))
  const scrim = document.createElement('div')
  scrim.className = 'ns-isle-scrim'
  panel.before(scrim)
  btn.setAttribute('aria-expanded', 'false')
  panel.inert = true

  let cur = -1, isOpen = false, timer = 0
  const set = i => {
    if (i == cur || !links[i]) return
    cur = i
    links.forEach((a, j) => j == i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'))
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
  const rad = () => parseFloat(getComputedStyle(panel).getPropertyValue('--ns-isle-radius')) || 32
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
  const morph = (R, dur) => {
    if (!mo) {
      mo = document.createElement('div')
      mo.className = 'ns-isle-morph'
      mo.setAttribute('aria-hidden', 'true')
      // (su animación no cambia la página que hay debajo: los vidrios no la rasterizan otra vez)
      mo.setAttribute('data-ns-quiet', '')
      scrim.setAttribute('data-ns-quiet', '')
      for (let i = 0; i < 7; i++) mo.append(document.createElement('i'))
      // (entre el velo y la hoja: el contenido de la hoja va encima de la silueta)
      panel.before(mo)
    }
    // (su color, el de la hoja: --ns-isle-morph)
    const c = getComputedStyle(panel).getPropertyValue('--ns-isle-morph').trim()
    c ? mo.style.setProperty('--ns-isle-morph', c) : mo.style.removeProperty('--ns-isle-morph')
    Object.assign(mo.style, { display: 'block', zIndex: Z() + 1 })
    mo.getAnimations({ subtree: true }).forEach(a => a.cancel())
    const K = R.map(pieces)
    return [...mo.children].map((p, i) => p.animate(K.map(k => ({ transform: k[i] })), { duration: dur, fill: 'both' }))[0]
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
  const unmorph = () => { if (mo) { mo.getAnimations({ subtree: true }).forEach(a => a.cancel()); mo.style.display = 'none' } }
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

  const show = (on, now = false) => {
    if (on == isOpen) return
    isOpen = on
    lock(on)
    const t = ++run, anim = MORPH && !now && !reduced()
    btn.setAttribute('aria-expanded', String(on))
    panel.inert = !on
    // (con la hoja abierta, la cápsula está oculta: fuera del orden del foco y del lector de pantalla)
    el.inert = on
    scrim.classList.toggle('ns-open', on)
    scrim.style.opacity = ''
    unfade()
    if (on) {
      o.onOpen?.()
      if (anim) {
        // La silueta nace bajo la cápsula (que se desvanece encima) y recorre el camino hasta la
        // hoja: primero a los lados, luego hacia arriba. La hoja ya está en su sitio, sin su
        // material: su contenido entra pieza a pieza justo cuando la silueta lo alcanza. Al llegar,
        // el material aparece encima y la silueta se va debajo
        const A = el.getBoundingClientRect()
        panel.classList.remove('ns-warm', 'ns-stage'); panel.classList.add('ns-morphing')
        const B = panel.getBoundingClientRect(), R = route(A, B, cap(A), rad(), true)
        el.style.zIndex = Z() + 2
        const g = morph(R, OPEN), p = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-out', fill: 'forwards' })
        fx = [p, ...leaves().map(k => k.animate([{ opacity: 0, translate: '0 10px', scale: '.97' }, { opacity: 1, translate: '0 0', scale: '1' }],
          { duration: 320, delay: Math.max(90, when(R, k.getBoundingClientRect(), true) / N * OPEN), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }))]
        at(p, 1, () => { if (t == run) { el.classList.add('ns-hide'); p.cancel() } })
        at(g, 1, () => t == run && reveal(t))
        return
      }
      el.classList.add('ns-hide')
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
      // El camino inverso: el material de la hoja se desvanece sobre la silueta, que baja hasta ser
      // una barra y se estrecha hasta la cápsula; el contenido se va justo antes de que la silueta
      // deje de cubrirlo. Al llegar, la cápsula aparece encima y la silueta se va debajo
      const B = panel.getBoundingClientRect(), A = el.getBoundingClientRect(), R = route(B, A, rad(), cap(A), false)
      el.style.zIndex = Z() + 2
      const g = morph(R, CLOSE)
      const L = [...layers()].map(l => l.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' }))
      fx = [...L, ...leaves().map(k => k.animate([{ opacity: 1 }, { opacity: 0, scale: '.97' }],
        { duration: 110, delay: Math.max(0, when(R, k.getBoundingClientRect(), false) / N * CLOSE - 110), easing: 'ease-in', fill: 'both' }))]
      L[0] && at(L[0], 1, () => { if (t == run) { panel.classList.add('ns-morphing'); panel.classList.remove('ns-open', 'ns-warm', 'ns-stage'); L.forEach(a => a.cancel()) } })
      at(g, .84, () => {
        if (t != run) return
        el.classList.remove('ns-hide')
        at(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }), 1, () => {
          if (t != run) return
          unfade()
          panel.classList.add('ns-now'); panel.classList.remove('ns-morphing', 'ns-open', 'ns-warm', 'ns-stage')
          at(fade(160), 1, () => { if (t == run) { unmorph(); el.style.zIndex = '' } })
        })
      })
      return
    }
    unmorph()
    panel.classList.toggle('ns-now', now)
    panel.classList.remove('ns-open', 'ns-stage', 'ns-morphing'); cool()
    el.classList.remove('ns-hide'); el.style.zIndex = ''
  }
  const sh = sheet(panel, {
    handle: q(panel, '[data-ns-isle-handle]') || panel,
    onProgress: p => { scrim.style.opacity = String(p) },
    onClose: () => show(false, true),
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
      run++; unfade(); mo?.remove(); isOpen && lock(false); el.style.zIndex = ''; el.classList.remove('ns-isle-m')
      io.disconnect(); sh.destroy(); scrim.remove(); clearTimeout(timer)
      removeEventListener('scroll', scroll); removeEventListener('keydown', key); document.removeEventListener('focusin', trap)
      btn.removeEventListener('pointerdown', down); btn.removeEventListener('pointerup', up)
      btn.removeEventListener('pointerenter', warm); btn.removeEventListener('focus', warm); btn.removeEventListener('click', click)
      panel.removeEventListener('click', pick); panel.removeEventListener('click', onClose)
      panel.classList.remove('ns-open', 'ns-warm', 'ns-now', 'ns-stage', 'ns-morphing'); el.classList.remove('ns-hide', 'ns-mini')
      panel.inert = false; el.inert = false; btn.style.touchAction = ''
    },
  }
}
