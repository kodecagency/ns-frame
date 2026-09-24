/*! ns-frame/vt · transiciones entre vistas (View Transitions) que conservan los cortes */
// import { morph } from './ns-vt.js'
// morph(card, () => { grid.hidden = true; detail.hidden = false }, detail)
//
// · La tarjeta se transforma en la vista de detalle con la View Transitions API del navegador.
// · Los cortes no se deforman: el grupo de la transición se recorta con shape() en calc(% + px)
//   (el compilador de ns-css), así un chaflán de 18 px mide 18 px durante todo el recorrido.
//   Si origen y destino tienen la misma estructura de forma, el navegador interpola una en otra.
// · Sin soporte (o con prefers-reduced-motion), el cambio ocurre al instante: nada se rompe.
import { shapeOf, styles } from './ns-frame.js'
import { css } from './ns-css.js'

// durante el morph, el resto de la página cambia sin fundido: un fundido entre dos layouts de
// distinta altura deja el contenido "fantasma" duplicado
// y las dos capturas cubren el grupo (origen y destino suelen tener proporciones distintas)
const CSS_ = '@layer ns{html.ns-vt-run::view-transition-old(*),html.ns-vt-run::view-transition-new(*){height:100%;object-fit:cover;object-position:top}html.ns-vt-run::view-transition-old(root){animation:none;opacity:0}html.ns-vt-run::view-transition-new(root){animation:none}}'
let n = 0, styled
const shapeCss = el => el && css(shapeOf(el) || el.getAttribute('data-ns') || el.getAttribute('shape') || '')

/**
 * El elemento `from` se convierte en `to` mientras `update()` cambia la vista.
 * `to` puede ser un elemento o una función que lo devuelve después de `update()`.
 * Opciones: { duration: 480, easing }. Devuelve una promesa que se resuelve al terminar.
 */
export async function morph(from, update, to, { duration = 480, easing = 'cubic-bezier(.3,.7,.2,1)' } = {}) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return update()
  if (!styled) { styled = 1; styles(CSS_) }
  const name = 'ns-vt-' + ++n, a = shapeCss(from), root = document.documentElement.classList
  let dest
  root.add('ns-vt-run')
  from.style.viewTransitionName = name
  const vt = document.startViewTransition(async () => {
    from.style.viewTransitionName = ''
    await update()
    dest = typeof to == 'function' ? to() : to
    if (dest) dest.style.viewTransitionName = name
  })
  try {
    await vt.ready
    // mismo ritmo para el grupo, las dos capturas y el recorte
    for (const an of document.getAnimations()) if (an.effect?.pseudoElement?.includes(name)) an.effect.updateTiming({ duration, easing })
    const clip = [a, shapeCss(dest)].filter(Boolean)
    if (clip.length) document.documentElement.animate({ clipPath: clip.length > 1 ? clip : [clip[0], clip[0]] }, { duration, easing, pseudoElement: `::view-transition-group(${name})` })
  } catch {}
  await vt.finished.catch(() => {})
  root.remove('ns-vt-run')
  if (dest) dest.style.viewTransitionName = ''
}
