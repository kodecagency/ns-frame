/*! ns-frame/pop · popovers y tooltips con la flecha integrada en la forma */
// <button popovertarget="info">Info</button>
// <div popover id="info" data-ns-arrow="all round 8">…</div>          ← click (Popover API)
// <button data-ns-tip="ayuda">?</button> <div popover="manual" id="ayuda" data-ns-arrow>…</div>  ← hover/foco
//
// · La flecha es parte del contorno: el borde, el recorte y los efectos la rodean sin costuras.
// · Siempre apunta al centro del disparador, incluso cuando el navegador voltea el popover
//   (position-try) o lo desplaza para que quepa: se mide dónde quedó realmente.
// · Posicionado con Anchor Positioning (CSS nativo); respaldo en JS si el navegador no lo soporta.
// · Variables: --ns-arrow (tamaño de la flecha, 9px), --ns-pop-gap (separación, 6px), --ns-pop-bg.

import { styles } from './ns-frame.js'

const ANCHOR = typeof CSS != 'undefined' && CSS.supports('position-area: top')
// sin Popover API (Safari < 17, Firefox < 125) el popover se oculta y se abre con una clase; el
// click en su disparador, el click fuera y Escape se atienden aquí
const POP = typeof HTMLElement != 'undefined' && 'showPopover' in HTMLElement.prototype
const CSS_ = `@layer ns{[popover][data-ns-arrow]{position:fixed;border:0;margin:var(--ns-pop-gap,6px);inset:auto;overflow:visible;color:inherit;background:var(--ns-pop-bg,#0b1520);max-width:min(340px,calc(100vw - 24px));position-area:top;position-try-fallbacks:flip-block,flip-inline,flip-block flip-inline}
@supports not selector(:popover-open){[popover]:not(.ns-pop-on){display:none}[popover].ns-pop-on{z-index:2147483646}}}`
const OPEN = new Set()
let raf, styled

const isOpen = p => POP ? p.matches(':popover-open') : p.classList.contains('ns-pop-on')
const base = p => p.getAttribute('data-ns-arrow') || 'all round 8'
function showP(p) {
  if (POP) return p.showPopover()
  p.classList.add('ns-pop-on'); OPEN.add(p)
  p.setAttribute('data-ns', base(p) + '; bottom tab center 18 9 9')
  place(p); schedule()
}
const hideP = p => { if (POP) p.hidePopover(); else { p.classList.remove('ns-pop-on'); OPEN.delete(p) } }

const trig = p => p._nsT || document.querySelector(`[popovertarget="${CSS.escape(p.id)}"],[data-ns-tip="${CSS.escape(p.id)}"]`)

function place(p) {
  const t = trig(p)
  if (!t) return
  const a = t.getBoundingClientRect(), gap = parseFloat(getComputedStyle(p).getPropertyValue('--ns-pop-gap')) || 6
  if (!ANCHOR) {
    // respaldo: arriba centrado; abajo si no cabe; siempre dentro de la ventana
    const w = p.offsetWidth, h = p.offsetHeight
    const top = a.top - h - gap >= 0 ? a.top - h - gap : a.bottom + gap
    p.style.position = 'fixed'
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, a.left + a.width / 2 - w / 2)) + 'px'
    p.style.top = top + 'px'
  }
  const b = p.getBoundingClientRect(), D = parseFloat(getComputedStyle(p).getPropertyValue('--ns-arrow')) || 9
  // ¿de qué lado quedó el popover respecto al disparador?
  const side = b.bottom <= a.top + 1 ? 'bottom' : b.top >= a.bottom - 1 ? 'top' : b.right <= a.left + 1 ? 'right' : 'left'
  const horiz = side == 'top' || side == 'bottom', L = horiz ? b.width : b.height
  const c = horiz ? a.left + a.width / 2 - b.left : a.top + a.height / 2 - b.top
  const x = Math.max(D + 12, Math.min(L - D - 12, c)) // la flecha no invade las esquinas
  const shape = `${base(p)}; ${side} tab ${(x - D).toFixed(1)} ${(x + D).toFixed(1)} ${D} ${D}`
  if (p.getAttribute('data-ns') != shape) p.setAttribute('data-ns', shape)
}

const tick = () => { raf = 0; OPEN.forEach(place) }
const schedule = () => { raf ||= requestAnimationFrame(tick) }

function init(p) {
  if (p._nsP) return
  p._nsP = 1
  if (!styled) {
    styled = 1
    styles(CSS_)
    addEventListener('scroll', schedule, { passive: true, capture: true })
    addEventListener('resize', schedule)
  }
  if (!p.hasAttribute('data-ns-pad')) p.setAttribute('data-ns-pad', '')
  p.addEventListener('beforetoggle', e => {
    if (e.newState == 'open') { OPEN.add(p); p.setAttribute('data-ns', base(p) + '; bottom tab center 18 9 9') }
    else OPEN.delete(p)
  })
  p.addEventListener('toggle', e => e.newState == 'open' && (place(p), schedule()))
}

// Tooltips por hover/foco: data-ns-tip="id" en el disparador, popover="manual" en el tooltip
function tip(t) {
  if (t._nsTip) return
  t._nsTip = 1
  const p = document.getElementById(t.getAttribute('data-ns-tip'))
  if (!p) return
  init(p)
  t.setAttribute('aria-describedby', p.id)
  // showPopover() sin invocador no crea ancla implícita: se declara con anchor-name / position-anchor
  const name = '--ns-tip-' + p.id.replace(/[^\w-]/g, '')
  t.style.setProperty('anchor-name', name)
  p.style.setProperty('position-anchor', name)
  let timer, touch = false
  const show = () => { clearTimeout(timer); timer = setTimeout(() => { p._nsT = t; isOpen(p) || showP(p) }, 120) }
  const hide = () => { clearTimeout(timer); timer = setTimeout(() => isOpen(p) && hideP(p), 80) }
  // con el dedo no hay hover (y Safari no enfoca un botón al tocarlo): un toque lo abre o lo cierra,
  // y tocar fuera lo cierra
  t.addEventListener('pointerdown', e => { touch = e.pointerType == 'touch' })
  t.addEventListener('pointerenter', e => e.pointerType != 'touch' && show()); t.addEventListener('focus', () => touch || show())
  t.addEventListener('pointerleave', e => e.pointerType != 'touch' && hide()); t.addEventListener('blur', () => touch || hide())
  t.addEventListener('click', () => { if (!touch) return; clearTimeout(timer); p._nsT = t; isOpen(p) ? hideP(p) : showP(p) })
  document.addEventListener('pointerdown', e => { if (touch && isOpen(p) && !t.contains(e.target) && !p.contains(e.target)) hideP(p) }, true)
  t.addEventListener('keydown', e => e.key == 'Escape' && hide())
}

if (typeof document != 'undefined') {
  const scan = n => {
    if (n.nodeType != 1) return
    n.matches('[popover][data-ns-arrow]') && init(n); n.querySelectorAll('[popover][data-ns-arrow]').forEach(init)
    n.matches('[data-ns-tip]') && tip(n); n.querySelectorAll('[data-ns-tip]').forEach(tip)
  }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true })
    if (POP) return
    // respaldo de popovertarget: abrir/cerrar con su botón, cerrar con click fuera o Escape
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[popovertarget]'), p = b && document.getElementById(b.getAttribute('popovertarget'))
      if (p?.matches('[data-ns-arrow]')) { p._nsT = b; isOpen(p) ? hideP(p) : showP(p); return }
      for (const q of [...OPEN]) if (q.getAttribute('popover') != 'manual' && !q.contains(e.target)) hideP(q)
    })
    document.addEventListener('keydown', e => { if (e.key == 'Escape') for (const q of [...OPEN]) hideP(q) })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
