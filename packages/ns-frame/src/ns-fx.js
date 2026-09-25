/*! ns-frame/fx · texto que se "descifra" al entrar en pantalla: data-ns-decode[="hover"] */
const G = '▚▞▙▟▛▜░▒<>/\\#%&*+=01'
const scramble = t => t.replace(/\S/g, () => G[(Math.random() * G.length) | 0])

export function decode(el, dur = +el.dataset.nsDecodeTime || 900) {
  const txt = (el.dataset.nsText ??= el.textContent), t0 = performance.now()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
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
  // las animaciones de conjunto de la luz en U repintan en cada frame: fuera de pantalla se pausan
  const idle = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('ns-idle', !e.isIntersecting)))
  const init = () => {
    document.querySelectorAll('[data-ns-decode],.ns-u-live,.ns-u-tide,.ns-u-surge').forEach(el => {
      if (el._nsi) return
      el._nsi = 1
      if (!el.hasAttribute('data-ns-decode')) idle.observe(el)
      else el.dataset.nsDecode == 'hover' ? el.addEventListener('pointerenter', () => decode(el)) : io.observe(el)
    })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', init) : init()
}
