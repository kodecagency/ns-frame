// Saltos a secciones con content-visibility: auto. Las secciones que aún no se han pintado tienen
// un tamaño estimado; al acercarse se maquetan y cambian de alto, y un salto normal cae desplazado.
// La primera vez se maquetan un instante todas (el navegador recuerda su alto real gracias a
// contain-intrinsic-size: auto); después el destino se calcula bien y el desplazamiento puede ser
// suave. Al terminar se corrige lo que falte (algún píxel si algo cambió de tamaño por el camino).
const pad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let measured = false

export function jump(el: HTMLElement, { focus = false, smooth = false } = {}) {
  if (!measured) {
    const root = document.documentElement
    root.classList.add('ns-cv-off')
    void root.offsetHeight
    requestAnimationFrame(() => root.classList.remove('ns-cv-off'))
    measured = true
  }
  const off = () => el.getBoundingClientRect().top - pad()
  // corrección final: hasta que dos frames seguidos dejan el destino en su sitio (máx. 12)
  const settle = () => {
    let n = 0, last = NaN
    const go = () => {
      const top = off()
      if (Math.abs(top) > 1) scrollBy({ top, behavior: 'instant' as ScrollBehavior })
      if ((Math.abs(top) > 1 || top != last) && ++n < 12) { last = top; requestAnimationFrame(go) }
      else if (focus) el.focus({ preventScroll: true })
    }
    go()
  }
  if (!smooth || reduced()) return settle()
  scrollBy({ top: off(), behavior: 'smooth' })
  // fin del desplazamiento suave: la posición deja de cambiar durante 4 frames (scrollend aún
  // no está en todos los navegadores). Máximo ~3 s por si el usuario interrumpe con el dedo.
  let y = NaN, still = 0, n = 0
  const wait = () => {
    still = scrollY == y ? still + 1 : 0
    y = scrollY
    still < 4 && ++n < 180 ? requestAnimationFrame(wait) : settle()
  }
  requestAnimationFrame(wait)
}

// todos los enlaces internos de la página (barra superior, pies de sección)
export function wire() {
  document.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)))
    if (!el) return
    e.preventDefault()
    history.pushState(null, '', a.hash)
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1')
    jump(el, { focus: true, smooth: true })
  })
  // al abrir la página con #sección
  if (location.hash) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) addEventListener('load', () => jump(el), { once: true }) }
}
