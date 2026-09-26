// Saltos a secciones: jump() es el de la librería (fiable con content-visibility: auto, suave,
// corrige al llegar y enfoca el destino). Aquí sólo se conectan los enlaces internos de la página.
import { jump } from 'ns-frame'
export { jump }

// todos los enlaces internos de la página (barra superior, pies de sección)
export function wire() {
  document.addEventListener('click', e => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)))
    if (!el) return
    e.preventDefault()
    history.pushState(null, '', a.hash)
    jump(el, { focus: true, smooth: true })
  })
  // al abrir la página con #sección
  if (location.hash) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) addEventListener('load', () => jump(el), { once: true }) }
}
