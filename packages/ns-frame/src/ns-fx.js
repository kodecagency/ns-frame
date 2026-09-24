/*! ns-frame/fx · texto que se "descifra" al entrar en pantalla: data-ns-decode[="hover"] */
const G = '▚▞▙▟▛▜░▒<>/\\#%&*+=01'
const scramble = t => t.replace(/\S/g, () => G[(Math.random() * G.length) | 0])

export function decode(el, dur = +el.dataset.nsDecodeTime || 900) {
  const txt = (el.dataset.nsText ??= el.textContent), t0 = performance.now()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.setAttribute('aria-label', txt)
  cancelAnimationFrame(el._nsd)
  const tick = now => {
    const n = Math.floor(Math.min(1, (now - t0) / dur) * txt.length)
    el.textContent = txt.slice(0, n) + scramble(txt.slice(n))
    el._nsd = n < txt.length && requestAnimationFrame(tick)
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
