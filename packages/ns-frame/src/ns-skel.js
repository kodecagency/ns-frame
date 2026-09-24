/*! ns-frame/skel · skeletons de carga que heredan la forma del componente real */
// <article data-ns="card" data-ns-skeleton>…contenido real o de relleno…</article>
// Quita el atributo cuando lleguen los datos: los huesos se desvanecen y el contenido aparece
// en su sitio.
//
// · Sin saltos de layout (CLS 0): los huesos se miden sobre el layout real del componente
//   (cada línea de texto, imagen, botón o hijo con forma), así que ocupan exactamente lo mismo.
// · Heredan la forma: el contorno es el del componente, los hijos con data-ns conservan su
//   forma exacta y las barras de texto llevan las esquinas del padre en miniatura.
// · Un solo barrido de luz para toda la página: los brillos van sincronizados y en
//   coordenadas de la ventana, así la luz cruza de un skeleton al siguiente.
// · aria-busy mientras carga; el contenido oculto no se lee ni recibe foco.
// · Variables: --ns-sk (color de los huesos), --ns-sk-glint (brillo), --ns-sk-time, --ns-sk-band.
import { geometry, commands, shapeOf, styles } from './ns-frame.js'

const CSS_ = `@layer ns{
:where([data-ns-skeleton]){position:relative}
[data-ns-skeleton]{-webkit-text-fill-color:transparent!important;text-shadow:none!important}
[data-ns-skeleton] *{visibility:hidden!important}
[data-ns-skeleton]>.ns-svg,[data-ns-skeleton]>.ns-svg *,[data-ns-skeleton]>.ns-sk,[data-ns-skeleton]>.ns-sk>i{visibility:visible!important}
.ns-sk{position:absolute;z-index:2;pointer-events:none;overflow:hidden;background:var(--ns-sk,rgba(150,185,215,.13));transition:opacity .4s}
.ns-sk>i{position:absolute;top:0;bottom:0;left:0;width:var(--ns-sk-band,280px);background:linear-gradient(100deg,transparent 15%,var(--ns-sk-glint,rgba(255,255,255,.13)),transparent 85%);animation:ns-sk var(--ns-sk-time,1.8s) linear var(--ns-sk-d,0s) infinite;will-change:transform}
.ns-sk-off>i{animation-play-state:paused}
@keyframes ns-sk{from{transform:translateX(var(--ns-sk-a,-100%))}to{transform:translateX(var(--ns-sk-b,100vw))}}
@media (prefers-reduced-motion:reduce){.ns-sk>i{display:none}}}`

const CORNERS = ['tl', 'tr', 'br', 'bl']
// elementos que se dibujan como un bloque (no se entra en ellos)
const SOLID = /^(img|video|canvas|svg|picture|iframe|input|select|textarea|progress|meter|object|embed|button|hr)$/i
const ON = new Map(), Q = new Set()
let ro, io, raf, styled

const f = n => Math.round(n * 10) / 10
const clear = c => /^transparent$|rgba\(.*,\s*0\)$/.test(c)
// botones y chips hechos con <a>/<span>: inline-block con fondo propio
const painted = cs => /inline-/.test(cs.display) && (cs.backgroundImage != 'none' || !clear(cs.backgroundColor))

// path de una forma desplazado a (x, y): varios huesos se unen en un solo clip-path
function d(shape, x, y, w, h) {
  const { C } = commands(geometry(shape, w, h))
  return C.map(([c, p, rx, ry, sw]) => (c == 'A' ? `A${f(rx)} ${f(ry)} 0 0 ${sw} ` : c == 'C' ? 'C' + rx.map((z, i) => f(z + (i % 2 ? y : x))).join(' ') + ' ' : c) + f(p[0] + x) + ' ' + f(p[1] + y)).join('') + (C.length ? 'Z' : '')
}

// las esquinas del componente, en miniatura (tamaño máximo `cap`)
function bone(cn, h, cap) {
  const s = Math.min(h * .45, cap)
  const out = cn?.map(([t, sh], i) => t && t != 'square' && sh ? `${CORNERS[i]} ${t} ${f(Math.min(s, sh))}` : '').filter(Boolean)
  return out?.length ? out.join(';') : 'all round ' + f(Math.min(h / 2, 4))
}

function measure(el) {
  const st = ON.get(el), W = el.offsetWidth, H = el.offsetHeight
  if (!st || !W || !H) return
  const R = el.getBoundingClientRect(), cn = geometry(shapeOf(el) || '', W, H).cn, own = el.getAttribute('data-ns-skeleton').trim()
  const lines = [], parts = [], rg = document.createRange()
  const box = (e, src) => {
    const r = e.getBoundingClientRect()
    if (r.width >= 1 && r.height >= 1) parts.push(d(src || bone(cn, r.height, 10), r.left - R.left, r.top - R.top, r.width, r.height))
  }
  const walk = n => {
    for (const c of n.childNodes) {
      if (c.nodeType == 3) {
        if (!c.data.trim()) continue
        rg.selectNodeContents(c)
        for (const q of rg.getClientRects()) q.width > 1 && lines.push([q.left, q.right, q.top, q.bottom])
        continue
      }
      if (c.nodeType != 1 || c == st.sk || c.classList.contains('ns-svg')) continue
      const cs = getComputedStyle(c)
      if (cs.display == 'none') continue
      const src = shapeOf(c) || c.getAttribute('data-ns-bone')
      src != null || SOLID.test(c.localName) || painted(cs) ? box(c, src) : walk(c)
    }
  }
  walk(el)
  // fragmentos de la misma línea (negritas, enlaces…) se unen en una sola barra
  lines.sort((a, b) => a[2] - b[2] || a[0] - b[0])
  let p
  for (const q of lines) {
    if (p && Math.abs(q[2] - p[2]) < 3 && q[0] - p[1] < 16) { p[1] = Math.max(p[1], q[1]); p[3] = Math.max(p[3], q[3]); continue }
    parts.push(p = q)
  }
  const D = parts.map(q => {
    if (typeof q == 'string') return q
    const h = q[3] - q[2], bh = Math.max(4, Math.round(h * .56))
    return d(own || bone(cn, bh, 5), q[0] - R.left, q[2] + (h - bh) / 2 - R.top, q[1] - q[0], bh)
  }).join('')
  const s = st.sk.style, band = parseFloat(getComputedStyle(st.sk).getPropertyValue('--ns-sk-band')) || 280
  s.left = -el.clientLeft + 'px'
  s.top = -el.clientTop + 'px'
  s.width = W + 'px'
  s.height = H + 'px'
  s.clipPath = D ? `path('${D}')` : ''
  // el brillo viaja en coordenadas de la ventana: cruza todos los skeletons como una sola luz
  s.setProperty('--ns-sk-a', f(-R.left - band) + 'px')
  s.setProperty('--ns-sk-b', f(innerWidth - R.left + 80) + 'px')
}

const later = el => { Q.add(el); raf ||= requestAnimationFrame(flush) }
function flush() { raf = 0; const q = [...Q]; Q.clear(); q.forEach(measure) }

function on(el) {
  if (ON.has(el)) return later(el)
  if (!styled) {
    styled = 1
    styles(CSS_)
    ro = new ResizeObserver(es => es.forEach(e => later(e.target)))
    io = new IntersectionObserver(es => es.forEach(e => ON.get(e.target)?.sk.classList.toggle('ns-sk-off', !e.isIntersecting)))
    addEventListener('resize', () => ON.forEach((_, e) => later(e)))
    document.fonts?.ready.then(() => ON.forEach((_, e) => later(e)))
  }
  const sk = document.createElement('div'), T = getComputedStyle(el).getPropertyValue('--ns-sk-time').trim()
  sk.className = 'ns-sk'
  sk.setAttribute('aria-hidden', 'true')
  sk.append(document.createElement('i'))
  // mismo punto del ciclo en todos: los brillos van sincronizados aunque empiecen en otro momento
  sk.style.setProperty('--ns-sk-d', -f(performance.now() % ((parseFloat(T) || 1.8) * (/ms$/.test(T) ? 1 : 1e3))) + 'ms')
  ON.set(el, { sk, busy: el.getAttribute('aria-busy') })
  el.setAttribute('aria-busy', 'true')
  el.append(sk)
  ro.observe(el)
  io.observe(el)
  measure(el)
}

function off(el) {
  const st = ON.get(el)
  if (!st) return
  ON.delete(el)
  ro.unobserve(el)
  io.unobserve(el)
  st.busy == null ? el.removeAttribute('aria-busy') : el.setAttribute('aria-busy', st.busy)
  // los huesos se desvanecen sobre el contenido, que ya está en su sitio
  st.sk.style.opacity = '0'
  setTimeout(() => st.sk.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400)
}

/** Vuelve a medir (tras cambiar el contenido de relleno por JS sin cambiar el tamaño). */
export const refresh = el => el ? later(el) : ON.forEach((_, e) => later(e))

if (typeof document != 'undefined') {
  const sel = '[data-ns-skeleton]'
  const scan = n => { if (n.nodeType == 1) { n.matches(sel) && on(n); n.querySelectorAll(sel).forEach(on) } }
  const boot = () => {
    scan(document.body)
    new MutationObserver(ms => {
      for (const m of ms) {
        const t = m.target
        if (m.type == 'attributes') t.hasAttribute('data-ns-skeleton') ? on(t) : off(t)
        else {
          m.addedNodes.forEach(scan)
          m.removedNodes.forEach(n => n.nodeType == 1 && !n.isConnected && [n, ...n.querySelectorAll(sel)].forEach(off))
          // el contenido de un skeleton cambió: se vuelve a medir
          const host = (t.nodeType == 1 ? t : t.parentElement)?.closest(sel)
          host && ![...m.addedNodes].every(n => n.classList?.contains('ns-sk')) && later(host)
        }
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-ns-skeleton'] })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
