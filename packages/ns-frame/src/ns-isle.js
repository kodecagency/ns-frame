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
// · Al tocarla, la hoja entra desde abajo (o desde arriba) moviendo sólo `translate`: ni tamaño ni
//   forma cambian durante la animación, así va en el compositor a los fps de la pantalla.
// · La hoja se prepara al apoyar el dedo (antes del clic): cuando se abre ya está pintada.
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
[data-ns-isle].ns-hide{opacity:0;scale:.92;pointer-events:none}
[data-ns-isle-panel]{position:fixed;z-index:calc(var(--ns-isle-z,40) + 1);inset:auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;max-width:var(--ns-isle-w,430px);margin-inline:auto;translate:0 calc(100% + 40px);visibility:hidden;overscroll-behavior:contain;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s var(--ns-isle-time,.4s)}
[data-ns-isle-panel=top]{inset:calc(12px + env(safe-area-inset-top)) 12px auto 12px;translate:0 calc(-100% - 40px)}
[data-ns-isle-panel].ns-warm{visibility:visible;will-change:translate;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s}
[data-ns-isle-panel].ns-open{translate:0 0;visibility:visible;transition:translate var(--ns-isle-time,.4s) var(--ns-isle-ease,cubic-bezier(.2,.8,.2,1)),visibility 0s}
[data-ns-isle-panel].ns-now,[data-ns-isle-panel].ns-sheet-drag{transition:none}
@media (prefers-reduced-motion:reduce){.ns-isle-scrim,[data-ns-isle],[data-ns-isle-panel]{transition:none!important}}
}`
let styled = 0
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const q = (el, s) => el.querySelector(s)

/**
 * Convierte `el` en una isla de navegación.
 * Opciones:
 *   panel      la hoja (por defecto, el elemento de aria-controls del botón o [data-ns-isle-panel])
 *   links      enlaces a secciones (por defecto, los a[href^="#"] de la hoja)
 *   collapse   px de scroll a partir de los que la cápsula se pliega al bajar (200; false = nunca)
 *   swipe      deslizar la cápsula cambia de sección (true)
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

  // prepara la hoja antes del clic: al apoyar el dedo o pasar el ratón ya se pinta (sin parón al abrir)
  const warm = () => { if (!isOpen) { panel.classList.add('ns-warm'); clearTimeout(timer); timer = setTimeout(cool, 1500) } }
  const cool = () => isOpen || panel.classList.remove('ns-warm')

  const show = (on, now = false) => {
    if (on == isOpen) return
    isOpen = on
    btn.setAttribute('aria-expanded', String(on))
    panel.inert = !on
    // (con la hoja abierta, la cápsula está oculta: fuera del orden del foco y del lector de pantalla)
    el.inert = on
    panel.classList.toggle('ns-now', now)
    el.classList.toggle('ns-hide', on)
    scrim.classList.toggle('ns-open', on)
    scrim.style.opacity = ''
    if (on) {
      panel.classList.add('ns-warm')
      // un frame con la hoja ya visible fuera de pantalla y luego la transición: nunca arranca en frío
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!isOpen) return
        panel.classList.add('ns-open')
        // el foco entra en la hoja (se reintenta unos fotogramas: si aún no cuenta como visible, el
        // navegador ignora focus() sin avisar y el foco se quedaría fuera)
        let n = 0
        const enter = () => {
          if (!isOpen || panel.contains(document.activeElement)) return
          ;(links[cur] || focusables()[0] || panel).focus?.({ preventScroll: true })
          if (++n < 8) requestAnimationFrame(enter)
        }
        enter()
      }))
      o.onOpen?.()
    } else {
      panel.classList.remove('ns-open'); cool()
      btn.focus({ preventScroll: true })
      o.onClose?.()
    }
  }
  const sh = sheet(panel, {
    handle: q(panel, '[data-ns-isle-handle]') || panel,
    onProgress: p => { scrim.style.opacity = String(p) },
    onClose: () => show(false, true),
  })
  const close = () => isOpen && (reduced() ? show(false) : sh.close())

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
      io.disconnect(); sh.destroy(); scrim.remove(); clearTimeout(timer)
      removeEventListener('scroll', scroll); removeEventListener('keydown', key); document.removeEventListener('focusin', trap)
      btn.removeEventListener('pointerdown', down); btn.removeEventListener('pointerup', up)
      btn.removeEventListener('pointerenter', warm); btn.removeEventListener('focus', warm); btn.removeEventListener('click', click)
      panel.removeEventListener('click', pick); panel.removeEventListener('click', onClose)
      panel.classList.remove('ns-open', 'ns-warm', 'ns-now'); el.classList.remove('ns-hide', 'ns-mini')
      panel.inert = false; el.inert = false; btn.style.touchAction = ''
    },
  }
}
