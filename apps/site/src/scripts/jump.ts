// Saltos a secciones con content-visibility: auto. Las secciones que aún no se han pintado tienen
// un tamaño estimado; al acercarse se maquetan y cambian de alto, y un salto normal cae desplazado.
// jump() va al destino y corrige en los frames siguientes hasta que la posición es estable.
const pad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0

export function jump(el: HTMLElement, { focus = false } = {}) {
  // se maquetan un instante todas las secciones: el navegador conoce (y recuerda, gracias a
  // contain-intrinsic-size: auto) su alto real, así este salto y los siguientes son exactos
  const root = document.documentElement
  root.classList.add('ns-cv-off')
  void root.offsetHeight
  el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
  requestAnimationFrame(() => root.classList.remove('ns-cv-off'))
  let n = 0, last = NaN
  const go = () => {
    const top = el.getBoundingClientRect().top - pad()
    if (Math.abs(top) > 1) scrollBy({ top, behavior: 'instant' as ScrollBehavior })
    // estable cuando dos frames seguidos dejan el destino en su sitio (máx. 12 frames)
    if ((Math.abs(top) > 1 || top != last) && ++n < 12) { last = top; requestAnimationFrame(go) }
    else if (focus) el.focus({ preventScroll: true })
  }
  go()
}

// todos los enlaces internos de la página (barra superior, isla, pies de sección)
export function wire() {
  document.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)))
    if (!el) return
    e.preventDefault()
    history.pushState(null, '', a.hash)
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1')
    jump(el, { focus: true })
  })
  // al abrir la página con #sección
  if (location.hash) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) addEventListener('load', () => jump(el), { once: true }) }
}
