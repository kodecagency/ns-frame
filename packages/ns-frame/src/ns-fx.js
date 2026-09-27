/*! ns-frame/fx · texto que se "descifra" al entrar en pantalla: data-ns-decode[="hover"] */
// Duración: data-ns-decode-time (ms) o --ns-decode-time (900 ms). También los elementos que se añaden
// después (con watch del núcleo), y se desmonta al quitar el atributo.
import { watch, reduced, cssTime } from './ns-frame.js'

const G = '▚▞▙▟▛▜░▒<>/\\#%&*+=01'
const scramble = t => t.replace(/\S/g, () => G[(Math.random() * G.length) | 0])

export function decode(el, dur = +el.dataset.nsDecodeTime || cssTime(el, '--ns-decode-time', 900)) {
  const txt = (el.dataset.nsText ??= el.textContent), t0 = performance.now()
  if (reduced()) return
  cancelAnimationFrame(el._nsd)
  // Mientras se descifra, los signos van en un span oculto a los lectores de pantalla y el texto
  // real en otro sólo para ellos (un aria-label en un <span> o un <h2> se ignora: leerían los
  // signos). Al terminar vuelve a ser el texto tal cual
  const shown = document.createElement('span'), real = document.createElement('span')
  shown.setAttribute('aria-hidden', 'true')
  Object.assign(real.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' })
  real.textContent = txt
  el.replaceChildren(shown, real)
  const tick = now => {
    const n = Math.floor(Math.min(1, (now - t0) / dur) * txt.length)
    shown.textContent = txt.slice(0, n) + scramble(txt.slice(n))
    if (n < txt.length) el._nsd = requestAnimationFrame(tick)
    else { el._nsd = 0; el.textContent = txt }
  }
  el._nsd = requestAnimationFrame(tick)
}

if (typeof document != 'undefined') {
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (decode(e.target), io.unobserve(e.target))), { threshold: .6 })
  watch('data-ns-decode', el => {
    const hover = el.dataset.nsDecode == 'hover', go = () => decode(el)
    hover ? el.addEventListener('pointerenter', go) : io.observe(el)
    return { destroy() { el.removeEventListener('pointerenter', go); io.unobserve(el); cancelAnimationFrame(el._nsd) } }
  })
  // las animaciones de conjunto de la luz en U repintan en cada frame: fuera de pantalla se pausan
  const idle = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('ns-idle', !e.isIntersecting)))
  const init = () => document.querySelectorAll('.ns-u-live,.ns-u-tide,.ns-u-surge').forEach(el => { if (!el._nsi) { el._nsi = 1; idle.observe(el) } })
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', init) : init()
}
