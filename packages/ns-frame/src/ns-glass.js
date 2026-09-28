// SPDX-License-Identifier: Apache-2.0
/*! ns-frame/glass · vidrio líquido en cualquier elemento y con cualquier forma */
// <aside data-ns-glass>…</aside>                          ← con su border-radius (cada esquina)
// <article data-ns="tl+br bevel 24; notch top 30% 12" data-ns-glass>…</article>   ← con su forma
//
// El material de ns-frame/liquid (cuerpo desenfocado, lente que curva el fondo en el borde, canto,
// reflejos) sobre un elemento cualquiera y con su forma exacta: chaflanes, muescas, cortes, curvas y
// squircles de ns-frame, o su border-radius. La lente sale del campo de distancias del propio path
// (rasterizado y con transformada de distancia exacta), así que se curva igual en un chaflán que en
// una esquina redonda. Lente en todos los motores (en Safari y Firefox, en WebGL sobre una copia del
// fondo; material grueso y vidrio fijo, con el desenfoque nativo: ver ns-frame/liquid).
// · Palabras de data-ns-glass (se combinan): "clear" casi sin tinte (una lente); "tint" más cuerpo;
//   "u" la luz en U dentro del cristal; "facet" canto tallado y lente plana por caras; "prism"
//   dispersión cromática; "border" dibuja también el borde de ns-frame; "lens" fuerza la lente donde
//   se usaría el desenfoque nativo; "frost" vidrio esmerilado: desenfoque nativo, tinte y un canto
//   fino, sin lente, sin WebGL ni filtros de luz (ligero e igual en todos los motores: para muchas
//   piezas a la vez, o en el móvil). Es lo que usa todo vidrio con calidad baja (quality()).
// · Variables: las de ns-frame/liquid (--ns-glass-*), todas opcionales.
// · Sigue a la forma también a mitad de un morph (data-ns-hover, data-ns-press): el núcleo avisa con
//   el evento ns-shape y el vidrio lee la forma intermedia (pathOf).
// · Un marco con vidrio no se recorta con clip-path (haría de raíz del fondo y el vidrio no vería la
//   página): el vidrio hace de silueta y el borde del marco se sigue dibujando. Lo que haya dentro
//   no se recorta: las imágenes que lleguen a los cortes, recórtalas con su propio data-ns. Por lo
//   mismo, las aperturas (open, data-ns-open) no lo recortan.
// · Como cualquier vidrio: sin filter, opacity < 1, mask ni backdrop-filter en sus antepasados.

import { styles, path, shapeOf, pathOf, update, watch, quality, cssNum, mk } from './ns-frame.js'
import { liquid, shift, pathField, lensURL, LENS } from './ns-liquid.js'
import { rounded, corners } from './ns-light.js'

const CSS = `@layer ns{
[data-ns-glass]{background:none;--ns-glass-shadow:rgba(0,0,0,.28)}
[data-ns-glass]:not([data-ns-glass~=border]){--ns-border:transparent!important}
[data-ns-glass~=clear]{--ns-glass-tint:rgba(255,255,255,.02);--ns-glass-blur:1.5px}
[data-ns-glass~=tint]{--ns-glass-tint:rgba(18,18,22,.46);--ns-glass-blur:10px}
[data-ns-glass~=u]{--ns-glass-tint:radial-gradient(55% 45% at 6% 100%,color-mix(in srgb,var(--ns-u,#3de0ff) 42%,transparent),transparent),radial-gradient(55% 45% at 94% 100%,color-mix(in srgb,var(--ns-u,#3de0ff) 42%,transparent),transparent),linear-gradient(to top,color-mix(in srgb,var(--ns-u,#3de0ff) 26%,transparent),transparent 58%),rgba(12,14,18,.26);--ns-glass-rim-color:var(--ns-u,#3de0ff);--ns-glass-rim-back:.9}
.ns-glass-group{position:relative}
[data-ns-glass-group~=pane]{--ns-glass-group-blur:26px;--ns-glass-sat:1.45;--ns-glass-lens:8;--ns-glass-depth:14;--ns-glass-rim:1.3;--ns-glass-lift:.13}
[data-ns-glass-group~=pane] [data-ns-glass]{--ns-glass-tint:var(--ns-pane-tint,rgba(255,255,255,.09));--ns-glass-frost-edge:var(--ns-pane-edge,rgba(255,255,255,.12));--ns-glass-edge-hi:var(--ns-pane-edge-hi,rgba(255,255,255,.5));--ns-glass-edge-width:var(--ns-pane-edge-width,1.3px);--ns-glass-shadow:none;transition:background-color var(--ns-pane-time,.25s)}
[data-ns-glass-group~=pane] [data-ns-glass]:is([aria-pressed=true],[aria-checked=true]){background:var(--ns-pane-on,rgba(255,255,255,.94));color:var(--ns-pane-on-ink,#0a0a0a)}
.ns-glass-gl{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
.ns-glass-shared[hidden]{display:none}
.ns-glass-shared{position:absolute;left:0;top:0;z-index:0;pointer-events:none;-webkit-backdrop-filter:blur(var(--ns-glass-group-blur,10px)) saturate(var(--ns-glass-sat,1.3));backdrop-filter:blur(var(--ns-glass-group-blur,10px)) saturate(var(--ns-glass-sat,1.3))}
.ns-glass-grouped>.ns-liquid-glass,.ns-glass-grouped>.ns-liquid-rim{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
@media (prefers-reduced-transparency:reduce){.ns-glass-shared{display:none}}
@media (forced-colors:active){.ns-glass-shared{display:none}}
}`
let styled = 0
const G = new WeakMap(), SH = new WeakMap()

// ── Canto ──
// El vidrio no lleva un contorno plano: el canto lo dibuja la luz de la página (ns-frame/light), con la
// silueta exacta de la forma: una línea especular donde el borde mira a la luz y un reflejo tenue
// enfrente, nítidos a cualquier zoom. "facet" lo hace más duro (bisel estrecho) y la lente, plana por
// caras (el fondo se parte en cada corte, como en una gema).

/** Vidrio líquido en `el`, con su forma de ns-frame o su border-radius. Opciones: las de liquid(). */
export function glass(el, o = {}) {
  if (G.has(el)) return G.get(el)
  if (!styled) { styled = 1; styles(CSS) }
  const tok = () => (el.getAttribute('data-ns-glass') || '').split(/\s+/)
  el.classList.add('ns-glass-shape')
  const shape = () => {
    const w = el.offsetWidth, hh = el.offsetHeight, s = shapeOf(el)
    if (!w || !hh) return null
    // (la forma que el núcleo está pintando: a mitad de un morph, la intermedia)
    if (s) return { d: pathOf(el) || path(s, w, hh), w, h: hh }
    // (un rectángulo redondeado lleva también sus radios: el motor WebGL calcula su distancia exacta,
    // sin rasterizar; sólo si las esquinas son circulares)
    const C = corners(el, w, hh)
    return { d: rounded(el, w, hh, C), w, h: hh, r: C.every(([x, y]) => Math.abs(x - y) < .5) ? C.map(c => c[0]) : null }
  }
  SH.set(el, shape)
  // (dentro de un grupo, data-ns-glass-group, el desenfoque lo pone la capa compartida del grupo: la
  // pieza sólo pinta su tinte, su canto y su contenido)
  const grouped = () => !!el.parentElement?.closest('[data-ns-glass-group]')
  const h = liquid(el, { glass: true, prism: () => tok().includes('prism'), hard: () => tok().includes('facet'), frost: () => tok().includes('frost'), grouped, path: shape, ...o })
  el.addEventListener('ns-shape', h.frame)
  // un marco de ns-frame deja de recortarse (lo lee el núcleo al pintar)
  if (el.hasAttribute('data-ns') || el.localName == 'ns-frame') update(el)
  const api = {
    ...h,
    destroy() {
      h.destroy(); el.removeEventListener('ns-shape', h.frame); el.classList.remove('ns-glass-shape'); G.delete(el); SH.delete(el)
      // (sin vidrio, el marco vuelve a recortarse con su forma)
      if (el.isConnected && (el.hasAttribute('data-ns') || el.localName == 'ns-frame')) update(el)
    },
  }
  G.set(el, api)
  return api
}


// ── Grupo de vidrio ──
// Cada vidrio suelto es una capa de backdrop-filter: el navegador copia y desenfoca el fondo para
// cada una. Con muchas piezas grandes (un bento, un mosaico) son muchas texturas, y en un móvil se
// agota la memoria gráfica (Safari deja zonas en negro). Con data-ns-glass-group en su contenedor hay
// UNA sola capa de desenfoque para todas: recortada con la unión de sus siluetas (un path con un
// subtrazado por pieza). Las piezas pintan sólo su tinte, su canto y su contenido. El coste ya no
// crece con el número de piezas.
const GR = new WeakMap(), NATIVE = 'native'
// palabras de data-ns-glass-group (el resto del valor, si lo hay, es el selector del fondo)
const WORDS = /(^|\s)(native|pane)(?=\s|$)/g
let gid = 0
const setA = (n, a) => { for (const k in a) n.setAttribute(k, a[k]) }
// Lo que hay detrás del grupo: el selector de data-ns-glass-group, un <img>, <video> o <canvas> hijo
// que lo cubre, o su fondo CSS con url(). null si es la página; NATIVE si se pide la capa nativa
function source(host) {
  const v = host.getAttribute('data-ns-glass-group') || ''
  if (/(^|\s)native(\s|$)/.test(v)) return NATIVE
  const sel = v.replace(WORDS, ' ').trim()
  if (sel) return host.querySelector(sel) || document.querySelector(sel)
  const H = host.getBoundingClientRect()
  for (const n of host.children) {
    if (!/^(IMG|VIDEO|CANVAS)$/.test(n.tagName) || n.classList.contains('ns-glass-gl')) continue
    const r = n.getBoundingClientRect()
    if (r.width >= H.width * .9 && r.height >= H.height * .9) return n
  }
  const m = /url\(["']?([^"')]+)/.exec(getComputedStyle(host).backgroundImage)
  return m ? { url: m[1] } : null
}

// Lente de la unión (Chromium, el único que admite filtros SVG en backdrop-filter). Un solo mapa de
// desplazamiento para todas las piezas, sacado del campo de distancias de la unión, en la capa
// compartida. Dos filtros que se turnan: el mapa nuevo entra en el que no está en uso y sólo se
// cambia cuando ya está cargado (nunca un fotograma sin mapa). Mientras las piezas se mueven sigue el
// mapa anterior; al detenerse se regenera. En Safari y Firefox la capa se queda con el desenfoque
// (WebKit no aplica feDisplacementMap al fondo: bug 245510)
function unionLens(host, layer) {
  const id = 'nsgg' + ++gid + '-'
  const svg = mk('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' })
  svg.style.position = 'absolute'
  const F = [0, 1].map(n => {
    const f = mk('filter', { id: id + n, x: 0, y: 0, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })
    const m = mk('feImage', { result: 'm', preserveAspectRatio: 'none' })
    const dm = mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', xChannelSelector: 'R', yChannelSelector: 'G' })
    f.append(m, dm)
    return { f, m, dm }
  })
  svg.append(...F.map(L => L.f))
  layer.append(svg)
  let timer = 0, cur = -1, tok = 0, key = ''
  const build = (d, W, H) => {
    const s = getComputedStyle(host)
    const lensPx = cssNum(s, '--ns-glass-lens', 22), depth = Math.max(1, cssNum(s, '--ns-glass-depth', 18))
    const k = [d, W, H, lensPx, depth].join('|')
    if (k == key) return
    key = k
    // (rejilla de 1 a 3 px según el tamaño: el mapa se estira con suavizado)
    const step = Math.min(3, Math.max(1, Math.sqrt(W * H / 120000))), f = pathField(d, W, H, step)
    if (!f) return
    const n = cur < 0 ? 0 : 1 - cur, L = F[n], t = ++tok
    lensURL(f, depth).then(url => {
      if (t != tok) return
      setA(L.f, { width: W, height: H })
      // (el nodo i de la rejilla está en x = i·step: centro del píxel i del mapa)
      setA(L.m, { x: -step / 2, y: -step / 2, width: f.nx * step, height: f.ny * step, href: url })
      // (feDisplacementMap desplaza scale·(c − ½): con el mapa en ±1, scale = 2 × el desvío en px)
      L.dm.setAttribute('scale', 2 * lensPx)
      const after = (k, fn) => requestAnimationFrame(() => k > 1 ? after(k - 1, fn) : fn())
      after(2, () => {
        if (t != tok) return
        cur = n
        layer.style.backdropFilter = `url(#${id + n}) blur(var(--ns-glass-group-blur,10px)) saturate(var(--ns-glass-sat,1.3))`
      })
    })
  }
  return {
    draw(d, W, H) { clearTimeout(timer); timer = setTimeout(() => build(d, W, H), cur < 0 ? 0 : 140) },
    destroy() { clearTimeout(timer); tok++; svg.remove(); layer.style.backdropFilter = '' },
  }
}
/** Grupo de vidrio en `host`: { update(), destroy() }. Automático con data-ns-glass-group. */
export function glassGroup(host) {
  if (GR.has(host)) return GR.get(host)
  if (!styled) { styled = 1; styles(CSS) }
  const layer = document.createElement('div')
  layer.className = 'ns-glass-shared'
  layer.setAttribute('aria-hidden', 'true')
  host.classList.add('ns-glass-group')
  host.prepend(layer)
  let raf = 0, last = '', engine = null, lens = null, srcKey, rough = false, lastOp = ''
  // El nivel se elige por lo que hay detrás, y se vuelve a elegir si cambia (otra clase, otro fondo,
  // otro hijo): (1) fondo conocido → motor WebGL; (2) fondo de la página en Chromium → lente de la
  // unión; (3) si no, la capa de desenfoque. "native" fuerza la (3)
  const retier = () => {
    const s = source(host), k = s === NATIVE ? s : s ? s.url || s : null
    if (k === srcKey) return
    srcKey = k
    engine?.destroy(); lens?.destroy(); engine = lens = null
    layer.hidden = false; last = ''
    const fallback = () => { if (LENS && k !== NATIVE && quality() != 'low') lens = unionLens(host, layer) }
    if (s && s !== NATIVE && globalThis.WebGL2RenderingContext) import('./ns-glass-gl.js').then(m => {
      if (GR.get(host) != api || srcKey !== k) return
      // (si el motor falla —sin CORS, contexto perdido—, el nivel siguiente)
      // (la capa nativa sigue hasta que el motor dibuja con el fondo cargado: nunca un vidrio vacío)
      // (let antes de crear: onFail puede llegar mientras glEngine aún no ha devuelto)
      let e = null
      e = m.glEngine(host, s,
        () => { if (e && engine != e) return; e = engine = null; layer.hidden = false; last = ''; fallback(); schedule() },
        () => { if (engine == e) layer.hidden = true })
      engine = e
      if (!engine && !lens) fallback()
      last = ''; schedule()
    }, () => { fallback(); schedule() })
    else fallback()
    schedule()
  }
  const draw = () => {
    raf = 0
    const H = host.getBoundingClientRect(), ox = H.left + host.clientLeft, oy = H.top + host.clientTop, parts = []
    // (las cajas redondeadas, para el motor: x, y, ancho, alto, los cuatro radios y la opacidad; null
    // si alguna pieza tiene otra forma, y entonces el motor usa el path)
    let boxes = []
    for (const e of host.querySelectorAll('[data-ns-glass]')) {
      // (sólo lo que se ve: una pieza con visibility:hidden —un panel que otra vista sustituye sin
      // perder su sitio— no deja su vidrio pintado en la unión)
      if (e.checkVisibility ? !e.checkVisibility({ visibilityProperty: true }) : getComputedStyle(e).visibility == 'hidden') continue
      const P = SH.get(e)?.()
      if (!P?.d) continue
      const r = e.getBoundingClientRect()
      // (el path va en la caja de borde de la pieza: se lleva a su sitio dentro del grupo, y a su
      // tamaño en pantalla si está escalada, como a mitad de una entrada animada)
      const sx = P.w ? r.width / P.w : 1, sy = P.h ? r.height / P.h : 1
      parts.push(shift(P.d, r.left - ox, r.top - oy, sx, sy))
      // (con su opacidad: una pieza que se desvanece —al salir de una vista— lleva su vidrio con ella)
      if (boxes && P.r) boxes.push(r.left - ox, r.top - oy, r.width, r.height, ...P.r.map(v => v * Math.min(sx, sy)), +getComputedStyle(e).opacity)
      else boxes = null
    }
    // (mientras una pieza —o lo que la contiene, dentro del grupo— se anima, se sigue cada fotograma;
    // las animaciones infinitas de adorno no cuentan: se redibujaría para siempre)
    const mv = moving()
    if (mv) schedule()
    const d = parts.join('')
    // (al pararse, el motor rehace en fino lo último que dibujó en basto durante el movimiento)
    // (y se redibuja también si sólo cambió la opacidad de alguna pieza)
    const settle = rough && !mv, ok = boxes ? boxes.filter((_, i) => i % 9 == 8).join() : ''
    if (d == last && ok == lastOp && !settle) return
    lastOp = ok
    rough = mv && !!engine
    if (d != last) {
      last = d
      // (la capa se recorta también con el motor: hasta que dibuja, y si falla, es la que se ve)
      const lw = host.scrollWidth, lh = host.scrollHeight
      Object.assign(layer.style, { width: lw + 'px', height: lh + 'px', clipPath: d ? `path("${d}")` : 'inset(50%)' })
      if (!engine && d) lens?.draw(d, lw, lh)
    }
    engine?.draw(d, mv, boxes)
  }
  const schedule = () => { raf ||= requestAnimationFrame(draw) }
  const moving = () => host.getAnimations?.({ subtree: true }).some(a => {
    const t = a.effect?.target
    return a.playState == 'running' && !a.effect?.pseudoElement && t && t != layer && a.effect.getTiming().iterations != Infinity &&
      (t.hasAttribute?.('data-ns-glass') || !!t.querySelector?.('[data-ns-glass]'))
  })
  // cambia la unión si cambia el tamaño de algo, una forma (también a mitad de un morph: ns-shape) o
  // entra o sale una pieza
  const ro = new ResizeObserver(schedule)
  ro.observe(host)
  const watchParts = () => host.querySelectorAll('[data-ns-glass]').forEach(e => ro.observe(e))
  // (un cambio en el propio grupo puede cambiar su fondo o sus variables: se relee todo)
  const mo = new MutationObserver(ms => {
    if (ms.some(m => m.target == host)) { retier(); last = '' }
    if (ms.some(m => m.target != layer && !layer.contains(m.target))) { watchParts(); schedule() }
  })
  mo.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ns', 'data-ns-glass', 'data-ns-glass-group', 'class', 'style'] })
  const EV = ['ns-shape', 'transitionend', 'animationend']
  EV.forEach(t => host.addEventListener(t, schedule, true))
  watchParts()
  const api = {
    update: schedule,
    destroy() {
      if (GR.get(host) != api) return
      GR.delete(host); cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); EV.forEach(t => host.removeEventListener(t, schedule, true))
      engine?.destroy(); engine = null; lens?.destroy()
      layer.remove(); host.classList.remove('ns-glass-group')
      // (las piezas vuelven a su desenfoque propio)
      host.querySelectorAll('[data-ns-glass]').forEach(e => G.get(e)?.update())
    },
  }
  GR.set(host, api)
  retier()
  host.querySelectorAll('[data-ns-glass]').forEach(e => G.get(e)?.update())
  return api
}
// automático con data-ns-glass y data-ns-glass-group: se monta al acercarse a la vista (a menos de
// una pantalla) y se desmonta al quitar el atributo o el elemento. Una página con mucho vidrio lejos
// —un panel más abajo, con su motor WebGL y su foto— no lo prepara todo al cargar: cada pieza, cuando
// va a verse. (Al final del módulo: todo lo de arriba tiene que estar inicializado)
const near = (el, make) => {
  let h = null
  NEAR.set(el, () => { h = make(el) })
  NIO ||= new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return
    NIO.unobserve(e.target)
    QUEUE.push(e.target); qraf ||= requestAnimationFrame(pump)
  }), { rootMargin: '100% 0px 100% 0px' })
  NIO.observe(el)
  return { destroy() { NIO.unobserve(el); NEAR.delete(el); h?.destroy() } }
}
const NEAR = new Map(), QUEUE = []
let NIO = null, qraf = 0
// (los que llegan a la vez —las quince piezas de un panel— se montan unos pocos por fotograma, con
// ~6 ms de presupuesto: todos en una tarea eran un tirón al desplazarse. Van una pantalla por
// delante, así que están listos antes de verse; uno quitado mientras esperaba ya no se monta)
const pump = () => {
  qraf = 0
  const t0 = performance.now()
  while (QUEUE.length && performance.now() - t0 < 6) { const el = QUEUE.shift(), f = NEAR.get(el); NEAR.delete(el); f?.() }
  if (QUEUE.length) qraf = requestAnimationFrame(pump)
}
watch('data-ns-glass', el => near(el, glass))
watch('data-ns-glass-group', el => near(el, glassGroup))
