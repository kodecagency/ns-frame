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
// · La cápsula muestra la sección en pantalla (icono, nombre y posición) y se pliega al bajar.
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
.ns-isle-morph{position:fixed;display:none;pointer-events:none;will-change:clip-path}
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
@media (prefers-reduced-motion:reduce){.ns-isle-scrim,[data-ns-isle],[data-ns-isle-panel]{transition:none!important}}
}`
let styled = 0
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const q = (el, s) => el.querySelector(s)
const r2 = n => Math.round(n * 100) / 100
// muelle con un rebote leve (≈2,5 %), como las animaciones de sistema de Apple; donde no hay
// linear(), una curva con el mismo exceso
const SPRING = (() => {
  const z = .76, w = 8.4, wd = w * Math.sqrt(1 - z * z)
  const f = t => 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))
  const v = Array.from({ length: 41 }, (_, i) => i == 40 ? 1 : +f(i / 40).toFixed(4))
  // (globalThis: en este módulo, CSS es la hoja de estilos)
  return globalThis.CSS?.supports?.('transition-timing-function', 'linear(0, 1)') ? `linear(${v.join(',')})` : 'cubic-bezier(.3,1.14,.42,1)'
})()
const OPEN = 520, CLOSE = 440
// recorte de la silueta: el rectángulo r dentro de su capa u
const inset = (r, u, rad) => `inset(${r2(r.top - u.top)}px ${r2(u.right - r.right)}px ${r2(u.bottom - r.bottom)}px ${r2(r.left - u.left)}px round ${r2(rad)}px)`
// (el desenfoque de fondo sin prefijo en Safari llega en la 18)
const BF = globalThis.CSS?.supports?.('backdrop-filter', 'blur(1px)') ? 'backdropFilter' : 'webkitBackdropFilter'
// el aspecto de la cápsula o de la hoja: su tinte y su desenfoque (o su fondo, si no es de vidrio)
const look = (n, blur) => {
  const s = getComputedStyle(n), g = n.hasAttribute('data-ns-glass')
  const bg = g ? s.getPropertyValue('--ns-glass-tint').trim() || 'rgba(22,22,26,.45)' : s.backgroundColor
  return { bg, f: `blur(${parseFloat(s.getPropertyValue('--ns-glass-blur')) || blur}px) saturate(${g ? 1.4 : 1})` }
}

/**
 * Convierte `el` en una isla de navegación.
 * Opciones:
 *   panel      la hoja (por defecto, el elemento de aria-controls del botón o [data-ns-isle-panel])
 *   links      enlaces a secciones (por defecto, los a[href^="#"] de la hoja)
 *   collapse   px de scroll a partir de los que la cápsula se pliega al bajar (200; false = nunca)
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
  // lo que se ve de la hoja (sin las capas del vidrio ni del borde): entra escalonado
  const kids = () => [...panel.children].filter(k => !k.matches('.ns-liquid-src,.ns-liquid-glass,.ns-liquid-rim,.ns-liquid-fx,.ns-svg'))
  const unfade = () => { fx.forEach(a => a.cancel()); fx = [] }
  const morph = (A, B, ra, rb, la, lb, dur) => {
    if (!mo) {
      mo = document.createElement('div')
      mo.className = 'ns-isle-morph'
      mo.setAttribute('aria-hidden', 'true')
      // (su animación no cambia la página que hay debajo: los vidrios no la rasterizan otra vez)
      mo.setAttribute('data-ns-quiet', '')
      scrim.setAttribute('data-ns-quiet', '')
      panel.before(mo)
    }
    // la capa cubre las dos formas con margen para el rebote; sólo cambia su recorte
    const u = { left: Math.min(A.left, B.left) - 24, top: Math.min(A.top, B.top) - 24, right: Math.max(A.right, B.right) + 24, bottom: Math.max(A.bottom, B.bottom) + 24 }
    Object.assign(mo.style, { display: 'block', zIndex: Z() + 1, left: r2(u.left) + 'px', top: r2(u.top) + 'px', width: r2(u.right - u.left) + 'px', height: r2(u.bottom - u.top) + 'px', background: lb.bg, [BF]: lb.f })
    mo.getAnimations().forEach(a => a.cancel())
    return mo.animate([{ clipPath: inset(A, u, ra), background: la.bg, [BF]: la.f }, { clipPath: inset(B, u, rb), background: lb.bg, [BF]: lb.f }], { duration: dur, easing: SPRING, fill: 'forwards' })
  }
  // fn cuando la animación a llega a la fracción k de su duración (con su propio reloj: si el
  // navegador la frena o la acelera, el relevo sigue en su sitio); nada si se cancela antes
  const at = (a, k, fn) => {
    const d = a.effect.getTiming().duration * k
    const f = () => a.playState == 'idle' ? 0 : a.playState == 'finished' || a.currentTime >= d ? fn() : requestAnimationFrame(f)
    f()
  }
  const unmorph = () => { if (mo) { mo.getAnimations().forEach(a => a.cancel()); mo.style.display = 'none' } }

  // prepara la hoja antes del clic: al apoyar el dedo o pasar el ratón ya se pinta (sin parón al
  // abrir). Con morph, oculta en su sitio final (su vidrio se rasteriza allí); si no, fuera de pantalla
  const warm = () => { if (!isOpen) { panel.classList.add(MORPH ? 'ns-stage' : 'ns-warm'); clearTimeout(timer); timer = setTimeout(cool, 1500) } }
  const cool = () => isOpen || panel.classList.remove('ns-warm', 'ns-stage')

  // la hoja, visible y con el foco dentro
  const reveal = () => {
    unmorph(); unfade()
    panel.classList.remove('ns-stage', 'ns-now')
    panel.classList.add('ns-warm', 'ns-open')
    if (MORPH && !reduced()) fx = kids().map((k, i) => k.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 300, delay: i * 35, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }))
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

  const show = (on, now = false) => {
    if (on == isOpen) return
    isOpen = on
    const t = ++run, anim = MORPH && !now && !reduced()
    btn.setAttribute('aria-expanded', String(on))
    panel.inert = !on
    // (con la hoja abierta, la cápsula está oculta: fuera del orden del foco y del lector de pantalla)
    el.inert = on
    scrim.classList.toggle('ns-open', on)
    scrim.style.opacity = ''
    if (on) {
      o.onOpen?.()
      el.classList.add('ns-hide')
      if (anim) {
        // la silueta nace con la forma y el aspecto de la cápsula y crece hasta los de la hoja, que
        // espera oculta en su sitio; aparece cuando la silueta ya casi se ha asentado
        const A = el.getBoundingClientRect(), la = look(el, 4)
        panel.classList.remove('ns-warm'); panel.classList.add('ns-stage')
        const B = panel.getBoundingClientRect()
        // (la cápsula, encima de la silueta: su contenido se desvanece sobre ella)
        el.style.zIndex = Z() + 2
        at(morph(A, B, cap(A), rad(), la, look(panel, 16), OPEN), .86, () => t == run && reveal())
        return
      }
      panel.classList.toggle('ns-now', now)
      panel.classList.add('ns-warm')
      // un frame con la hoja ya visible fuera de pantalla y luego la transición: nunca arranca en frío
      requestAnimationFrame(() => requestAnimationFrame(() => t == run && reveal()))
      return
    }
    o.onClose?.()
    btn.focus({ preventScroll: true })
    // (tras un arrastre que volvió a su sitio queda un translate en línea que taparía el de la clase)
    if (!now) sh.reset()
    if (anim) {
      // el contenido se desvanece, la hoja pasa a ser la silueta y ésta vuelve a la cápsula
      const B = panel.getBoundingClientRect(), A = el.getBoundingClientRect()
      unfade()
      fx = kids().map(k => k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: 'ease-in', fill: 'forwards' }))
      const go = () => {
        if (t != run) return
        const lb = look(panel, 16)
        panel.classList.add('ns-now'); panel.classList.remove('ns-open', 'ns-warm', 'ns-stage')
        unfade()
        el.style.zIndex = Z() + 2
        // al llegar, la cápsula ocupa su sitio en el mismo fotograma en que se va la silueta
        at(morph(B, A, rad(), cap(A), lb, look(el, 4), CLOSE), .9, () => { if (t == run) { unmorph(); el.classList.remove('ns-hide'); el.style.zIndex = '' } })
      }
      fx.length ? at(fx[0], 1, go) : go()
      return
    }
    unmorph(); unfade()
    panel.classList.toggle('ns-now', now)
    panel.classList.remove('ns-open', 'ns-stage'); cool()
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
    if (o.collapse !== false && !isOpen && Math.abs(y - y0) > 6) { el.classList.toggle('ns-mini', y > y0 && y > (o.collapse ?? 200)); y0 = y }
  }
  const scroll = () => { raf ||= requestAnimationFrame(frame) }
  addEventListener('scroll', scroll, { passive: true })

  return {
    open: () => show(true), close, toggle: () => isOpen ? close() : show(true),
    go: i => targets[i] && go(targets[i], links[i]),
    get index() { return cur },
    destroy() {
      run++; unfade(); mo?.remove(); el.style.zIndex = ''; el.classList.remove('ns-isle-m')
      io.disconnect(); sh.destroy(); scrim.remove(); clearTimeout(timer)
      removeEventListener('scroll', scroll); removeEventListener('keydown', key); document.removeEventListener('focusin', trap)
      btn.removeEventListener('pointerdown', down); btn.removeEventListener('pointerup', up)
      btn.removeEventListener('pointerenter', warm); btn.removeEventListener('focus', warm); btn.removeEventListener('click', click)
      panel.removeEventListener('click', pick); panel.removeEventListener('click', onClose)
      panel.classList.remove('ns-open', 'ns-warm', 'ns-now', 'ns-stage'); el.classList.remove('ns-hide', 'ns-mini')
      panel.inert = false; el.inert = false; btn.style.touchAction = ''
    },
  }
}
