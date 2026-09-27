/*! ns-frame/carousel · carrusel con scroll-snap nativo, flechas e indicadores con forma */
// <div data-ns-carousel aria-label="Proyectos" style="--ns-slide: 80%"> <article>…</article> … </div>
// El desplazamiento, el snap y el gesto táctil son del navegador; esto sólo añade los controles.
// (los puntos, a 24 px entre centros: el tamaño mínimo de objetivo de WCAG 2.2 por separación)
// · Flechas e indicadores con forma (data-ns); el indicador activo se alarga con morph.
// · Teclado: ← → (invertidas en RTL), Inicio y Fin con el foco en el carrusel.
// · Accesible (patrón carrusel de WAI-ARIA): región con aria-roledescription, diapositivas
//   "n de N", flechas que se desactivan en los extremos y aria-current en el indicador.
// · Evento change en el carrusel al cambiar de posición (detail { index, slide }); desde JS,
//   carousel(el) → { go(i), get index(), destroy() }. Se desmonta solo al quitar el atributo o el
//   elemento.
// · La diapositiva actual lleva la clase ns-car-on; con data-ns-carousel-current="forma" cambia de
//   silueta al llegar (morph) y las demás toman data-ns-carousel-shape (o la suya). --ns-snap alinea
//   las diapositivas (start por defecto; center para verlas centradas con las vecinas asomando).
import { styles, watch } from './ns-frame.js'

const CSS_ = `@layer ns{
[data-ns-carousel]{display:flex;gap:var(--ns-gap,16px);overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;scrollbar-width:none}
[data-ns-carousel]::-webkit-scrollbar{display:none}
[data-ns-carousel]>*{flex:0 0 var(--ns-slide,100%);scroll-snap-align:var(--ns-snap,start);min-width:0}
.ns-car{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px}
.ns-car>button{font:inherit;font-size:18px;line-height:1;width:40px;height:34px;border:0;cursor:pointer;color:inherit;background:var(--ns-car-bg,rgba(61,224,255,.1));--ns-border:var(--ns-car,#3de0ff)}
.ns-car>button[aria-disabled=true]{opacity:.35;cursor:default}
.ns-car>span{display:flex;gap:14px;align-items:center}
.ns-car>span>button{width:10px;height:10px;padding:0;border:0;cursor:pointer;background:var(--ns-car-dot,rgba(255,255,255,.25));transition:width .35s cubic-bezier(.3,.7,.3,1)}.ns-car>span>button[aria-current=true]{width:28px;background:var(--ns-car,#3de0ff)}
@media (prefers-reduced-motion:reduce){[data-ns-carousel]{scroll-behavior:auto}.ns-car>span>button{transition:none}}}`

let styled
const make = (tag, a = {}) => { const e = document.createElement(tag); for (const k in a) e.setAttribute(k, a[k]); return e }

const C = new WeakMap()
/** Carrusel en `sc` (automático con data-ns-carousel). Devuelve { go(i), get index(), destroy() }. */
export function carousel(sc) {
  if (C.has(sc)) return C.get(sc)
  if (!styled) {
    styled = 1
    styles(CSS_)
  }
  const slides = [...sc.children], n = slides.length
  const shape = sc.getAttribute('data-ns-carousel') || 'tl+br bevel 8; radius 1.5'
  sc.setAttribute('role', 'region')
  sc.setAttribute('aria-roledescription', 'carrusel')
  sc.tabIndex = 0
  slides.forEach((s, i) => { s.setAttribute('role', 'group'); s.setAttribute('aria-roledescription', 'diapositiva'); s.setAttribute('aria-label', `${i + 1} de ${n}`) })

  const bar = make('div', { class: 'ns-car' }), dots = make('span')
  // (en los extremos, aria-disabled y no disabled: una flecha enfocada que se desactiva perdería el
  // foco, que saltaría al principio de la página)
  const arrow = (d, label, txt) => { const b = make('button', { type: 'button', 'aria-label': label, 'data-ns': shape }); b.textContent = txt; b.onclick = () => b.getAttribute('aria-disabled') != 'true' && go(cur + d); return b }
  const prev = arrow(-1, 'Anterior', '‹'), next = arrow(1, 'Siguiente', '›')
  const marks = slides.map((_, i) => { const b = make('button', { type: 'button', 'aria-label': `Ir a la diapositiva ${i + 1}`, 'data-ns': 'all bevel 3' }); b.onclick = () => go(i); return b })
  dots.append(...marks)
  bar.append(prev, dots, next)
  sc.after(bar)

  // distancia de cada diapositiva al inicio visible (en RTL el inicio está a la derecha)
  const rtl = () => getComputedStyle(sc).direction == 'rtl'
  const off = (s, r = rtl(), b = sc.getBoundingClientRect()) => { const a = s.getBoundingClientRect(); return r ? b.right - a.right : a.left - b.left }
  // formas: la de la diapositiva actual y la del resto (si no, la suya de siempre)
  const curShape = sc.getAttribute('data-ns-carousel-current'), restShape = sc.getAttribute('data-ns-carousel-shape'), own = slides.map(s => s.getAttribute('data-ns'))
  let cur = 0, on = -1, raf, P = null, SP = null, max = 0, seen = ''
  function go(i) {
    i = Math.max(0, Math.min(n - 1, i))
    if (!SP) measure()
    sc.scrollBy({ left: (SP[i] - Math.abs(sc.scrollLeft)) * (rtl() ? -1 : 1) })
  }
  // las posiciones de las diapositivas no dependen del desplazamiento: se miden al cambiar de tamaño,
  // no en cada fotograma (medir todas y reescribir todos los indicadores al desplazar pesaba en un
  // móvil modesto)
  function measure() {
    const x = Math.abs(sc.scrollLeft)
    max = sc.scrollWidth - sc.clientWidth
    // dónde se detiene cada diapositiva, según su alineación (--ns-snap: start, center o end)
    const r = rtl(), b = sc.getBoundingClientRect(), al = getComputedStyle(slides[0] || sc).scrollSnapAlign
    SP = slides.map(s => { const w = s.getBoundingClientRect().width, a = /center/.test(al) ? (b.width - w) / 2 : /end/.test(al) ? b.width - w : 0; return Math.max(0, Math.min(max, off(s, r, b) + x - a)) })
    // un indicador por posición alcanzable (con 3 visibles de 5, hay 3): sin repetidas
    P = SP.filter((p, k) => k == 0 || p - SP[k - 1] > 2)
    // (sin .at(): Safari anterior a 15.4) si sobra recorrido tras la última, el final cuenta como otra
    if (P[P.length - 1] < max - 2) P.push(max)
    marks.forEach((b, k) => { b.hidden = k >= P.length })
  }
  const nearest = (L, x) => { const d = L.map(p => Math.abs(p - x)); return d.indexOf(Math.min(...d)) }
  function sync() {
    raf = 0
    if (!P) measure()
    const x = Math.abs(sc.scrollLeft), i = nearest(P, x), s = nearest(SP, x)
    // (sólo se escribe lo que cambia)
    const k = `${x < 2}|${x > max - 2}|${i}|${s}`
    if (k == seen) return
    seen = k
    prev.setAttribute('aria-disabled', x < 2)
    next.setAttribute('aria-disabled', x > max - 2)
    marks.forEach((b, j) => b.setAttribute('aria-current', j == i))
    // la diapositiva actual: su clase y, si se pidió, su forma (el núcleo anima el cambio)
    if (s != on) {
      on = s
      slides.forEach((d, j) => {
        d.classList.toggle('ns-car-on', j == s)
        if (curShape) { const f = j == s ? curShape : restShape || own[j]; f ? d.getAttribute('data-ns') != f && d.setAttribute('data-ns', f) : d.removeAttribute('data-ns') }
      })
    }
    if (i != cur) { cur = i; sc.dispatchEvent(new CustomEvent('change', { detail: { index: i, slide: slides[s] } })) }
  }
  const onScroll = () => { raf ||= requestAnimationFrame(sync) }
  const onSize = () => { P = null; seen = ''; onScroll() }
  const key = e => {
    const k = { ArrowLeft: rtl() ? 1 : -1, ArrowRight: rtl() ? -1 : 1 }[e.key]
    if (k) go(cur + k)
    else if (e.key == 'Home') go(0)
    else if (e.key == 'End') go(n - 1)
    else return
    e.preventDefault()
  }
  sc.addEventListener('scroll', onScroll, { passive: true })
  const ro = new ResizeObserver(onSize)
  ro.observe(sc); slides.forEach(s => ro.observe(s))
  sc.addEventListener('keydown', key)
  // (la primera medida la pide el ResizeObserver, ya maquetado: medir aquí forzaba la maquetación)
  const api = {
    go, get index() { return cur },
    destroy() {
      C.delete(sc); cancelAnimationFrame(raf); ro.disconnect(); sc.removeEventListener('scroll', onScroll); sc.removeEventListener('keydown', key); bar.remove()
      slides.forEach((d, j) => { d.classList.remove('ns-car-on'); if (curShape) own[j] ? d.setAttribute('data-ns', own[j]) : d.removeAttribute('data-ns') })
    },
  }
  C.set(sc, api)
  return api
}

// automático con data-ns-carousel: se monta al aparecer y se desmonta (con sus controles) al quitarlo
watch('data-ns-carousel', sc => carousel(sc))
