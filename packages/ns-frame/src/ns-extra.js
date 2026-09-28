// SPDX-License-Identifier: Apache-2.0
/*! ns-frame/extra · se carga bajo demanda: degradados en bordes y animaciones de borde */
// El núcleo lo importa sólo cuando algún elemento lo necesita y le pasa sus helpers,
// así este módulo no importa nada y no crea dependencias circulares ni chunks compartidos.
let mk, f, num, geometry, paint, write, read, reduced, touch, lerp

// estilos de las animaciones de borde: sólo viajan (y se inyectan) si se usan
const CSS = `@layer ns{
.ns-m{transition:opacity .35s}
.ns-m path{stroke:var(--ns-motion,var(--ns-trace,var(--ns-accent,currentColor)));stroke-width:calc(2*var(--ns-accent-width,2px));stroke-linecap:round}
.ns-t{--T:var(--ns-motion-time,var(--ns-trace-time,5s))}
.ns-t path{animation:ns-t var(--T) linear infinite;animation-delay:calc(var(--T) * var(--d))}
.ns-mc{stroke-dasharray:1.5 8.5;animation:ns-t var(--ns-motion-time,4s) linear infinite}
.ns-mm{stroke-dasharray:6 6;stroke-linecap:butt!important;animation:ns-mm .7s linear infinite}
.ns-ml{stroke-dasharray:100 100;animation:ns-ml var(--ns-motion-time,3.2s) cubic-bezier(.65,0,.35,1) infinite}
.ns-mp{animation:ns-mp var(--ns-motion-time,2.4s) ease-in-out infinite}
.ns-mg{stroke:var(--ns-motion,#ff3df0)!important;opacity:0;animation:ns-mg var(--ns-motion-time,3s) steps(1) infinite}
.ns-mr{stroke-dasharray:var(--ns-progress,0) 100;transition:stroke-dasharray .6s cubic-bezier(.3,.7,.3,1)}
:is([data-ns-motion~=hover],ns-frame[motion~=hover]):not(:hover,:focus-within) .ns-m{opacity:0}
.ns-sc{animation:ns-sc var(--ns-motion-time,3.2s) linear infinite}
.ns-band{position:absolute;pointer-events:none;z-index:1;filter:var(--ns-glow,none)}
@media (hover:none) and (pointer:coarse){.ns-band{filter:var(--ns-glow-touch,none)}}
.ns-band i{position:absolute;left:0;top:0;display:block}
.ns-band>i{-webkit-mask:var(--m) 0 0/100% 100% no-repeat;mask:var(--m) 0 0/100% 100% no-repeat}
.ns-band>i>i{transform-origin:0 0}
.ns-band>i>i>i{animation:ns-bm var(--ns-motion-time,3.2s) linear infinite}
.ns-band>i>i>i>i{height:100%;background:linear-gradient(90deg,transparent,var(--ns-motion,var(--ns-accent,currentColor)),transparent)}
@keyframes ns-bm{from{transform:translateX(0)}to{transform:translateX(100%)}}
.ns-spin{position:absolute;pointer-events:none;z-index:1;filter:var(--ns-glow,none)}
@media (hover:none) and (pointer:coarse){.ns-spin{filter:var(--ns-glow-touch,none)}}
.ns-spin i{position:absolute;left:0;top:0;display:block}
.ns-spin>i{-webkit-mask:var(--m) 0 0/100% 100% no-repeat;mask:var(--m) 0 0/100% 100% no-repeat}
.ns-spin>i>i{animation:ns-spn 6s linear infinite}
@keyframes ns-spn{to{transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce){.ns-spin>i>i{animation:none}}
@media (forced-colors:active){.ns-spin{display:none}}
.ns-or{animation:ns-or 4s linear infinite}
@keyframes ns-sc{from{transform:translate(var(--a),0)}to{transform:translate(var(--b),0)}}
@keyframes ns-or{to{transform:rotate(1turn)}}
@keyframes ns-sp{from{transform:translate(var(--c)) rotate(0) translate(var(--nc)) var(--t0)}to{transform:translate(var(--c)) rotate(1turn) translate(var(--nc)) var(--t0)}}
@keyframes ns-t{to{stroke-dashoffset:-100}}
@keyframes ns-mm{to{stroke-dashoffset:-12}}
@keyframes ns-ml{from{stroke-dashoffset:100}to{stroke-dashoffset:-100}}
@keyframes ns-mp{0%,100%{opacity:0}50%{opacity:1}}
@keyframes ns-mg{0%,84%{opacity:0;transform:none}86%{opacity:1;transform:translate(3px,-1px)}89%{opacity:.7;transform:translate(-4px,1px)}92%{opacity:1;transform:translate(2px,2px)}95%{opacity:0}}
@media (prefers-reduced-motion:reduce){.ns-m{display:none}.ns-mr{display:inline}}
@media (forced-colors:active){.ns-m path{stroke:Highlight!important}.ns-m:not(:has(.ns-mr)){display:none}}
}`

export function init(h) {
  ({ mk, f, num, geometry, paint, write, read, reduced, touch, lerp } = h)
  h.styles(CSS)
  return { gradient, spin, motions: motions(), spot, aperture, play, scroll, accent }
}

// trocea por comas de nivel superior (respeta los paréntesis anidados, como los de rgba())
function split(s) {
  const out = []
  let d = 0, cur = ''
  for (const ch of s) {
    d += ch == '(' ? 1 : ch == ')' ? -1 : 0
    if (ch == ',' && !d) { out.push(cur.trim()); cur = '' } else cur += ch
  }
  return out.concat(cur.trim())
}
const KW = { left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' }

// linear-gradient()/radial-gradient() de CSS, analizado en coordenadas de una caja w×h: tipo, ángulo
// (a) y centro de un lineal con la longitud de su línea (len); centro y radios de un radial (círculo
// hasta la esquina más lejana, o la elipse rx×ry pedida); y las paradas como fracciones de len
function parse(str, w, h) {
  const m = /^(linear|radial)-gradient\((.*)\)$/s.exec(str)
  if (!m) return null
  const parts = split(m[2]), head = parts[0], G = { kind: m[1], cx: w / 2, cy: h / 2, a: Math.PI }
  if (G.kind == 'linear') {
    if (/^to\s/.test(head)) {
      const dx = /right/.test(head) - /left/.test(head), dy = /bottom/.test(head) - /top/.test(head)
      G.a = Math.atan2(dx * h, -dy * w); parts.shift()
    } else if (/^-?[\d.]+(deg|turn|rad)$/.test(head)) {
      G.a = parseFloat(head) * { deg: Math.PI / 180, turn: 2 * Math.PI, rad: 1 }[/[a-z]+$/.exec(head)[0]]; parts.shift()
    }
    G.len = Math.abs(w * Math.sin(G.a)) + Math.abs(h * Math.cos(G.a))
  } else {
    if (/\bat\b|circle|ellipse|closest|farthest|^[\d.]+(px|%)/.test(head)) {
      let [, X = 'center', Y] = /at\s+(\S+)(?:\s+(\S+))?/.exec(head) || []
      if (!Y) Y = /top|bottom/.test(X) ? ((Y = X), (X = 'center'), Y) : 'center'
      G.cx = num(KW[X] || X, w); G.cy = num(KW[Y] || Y, h); parts.shift()
      // tamaño explícito: "70% 90% at …" (elipse) o "120px at …" (círculo)
      const sz = /^(?:ellipse\s+|circle\s+)?([\d.]+(?:px|%))(?:\s+([\d.]+(?:px|%)))?\s/.exec(head + ' ')
      if (sz) { G.rx = num(sz[1], w); G.ry = sz[2] ? num(sz[2], h) : G.rx }
    }
    G.len = G.rx ? Math.max(G.rx, G.ry) : Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - G.cx, y - G.cy)))
  }
  const st = G.stops = parts.map(p => { const q = /\s(-?[\d.]+)(%|px)$/.exec(p); return q ? [p.slice(0, q.index), q[2] == 'px' ? q[1] / G.len : q[1] / 100] : [p, null] })
  st[0][1] ??= 0
  st[st.length - 1][1] ??= 1
  for (let i = 1; i < st.length; i++) if (st[i][1] == null) {
    let j = i
    while (st[j][1] == null) j++
    for (let k = i; k < j; k++) st[k][1] = st[i - 1][1] + (st[j][1] - st[i - 1][1]) * (k - i + 1) / (j - i + 1)
  }
  return G
}

// → gradiente SVG en coordenadas de la caja (el trazo del borde lo usa con url(#id))
function gradient(str, w, h, id, spin) {
  const G = parse(str, w, h)
  if (!G) return
  const { cx, cy, len, rx, ry } = G
  let geo, t0
  if (G.kind == 'linear') {
    const s = Math.sin(G.a), c = Math.cos(G.a)
    geo = { x1: f(cx - s * len / 2), y1: f(cy + c * len / 2), x2: f(cx + s * len / 2), y2: f(cy - c * len / 2) }
  } else {
    // la elipse se hace con un círculo unitario escalado (SVG sólo tiene gradientes circulares)
    geo = rx ? { cx: 0, cy: 0, r: 1, gradientTransform: `translate(${f(cx)} ${f(cy)}) scale(${f(rx)} ${f(ry)})` } : { cx: f(cx), cy: f(cy), r: f(len) }
    if (rx) t0 = `translate(${f(cx)}px, ${f(cy)}px) scale(${f(rx)}, ${f(ry)})`
  }
  // giro con una animación CSS (transform sobre el degradado, SVG 2) en vez de SMIL:
  // se pausa fuera de pantalla con .ns-off y no se congela en móviles
  return mk(G.kind + 'Gradient', { id, gradientUnits: 'userSpaceOnUse', ...geo }, spin ? {
    animation: `ns-sp ${spin} linear infinite`, 'transform-origin': '0 0',
    '--c': `${f(w / 2)}px, ${f(h / 2)}px`, '--nc': `${f(-w / 2)}px, ${f(-h / 2)}px`, '--t0': t0 || 'translate(0)',
  } : {}, ...G.stops.map(([col, o]) => mk('stop', { offset: o }, { 'stop-color': col })))
}

// → el mismo degradado en CSS para una caja D×D centrada sobre la de w×h (la que gira en el
// compositor: tiene que cubrir la caja en cualquier ángulo). Misma línea y mismas paradas: en un
// lineal, la línea de la caja grande es más larga y las paradas se recolocan dentro de ella; un
// radial conserva centro y radios, desplazados al origen de la caja grande
function gradientCSS(G, w, h, D) {
  const ox = (D - w) / 2, oy = (D - h) / 2, S = svgStops(G.stops)
  if (G.kind == 'linear') {
    const LD = D * (Math.abs(Math.sin(G.a)) + Math.abs(Math.cos(G.a))), o = (LD - G.len) / 2
    return `linear-gradient(${f(G.a)}rad,${S.map(([c, t]) => `${c} ${f((o + t * G.len) / LD * 100)}%`).join()})`
  }
  const size = G.rx ? `${f(G.rx)}px ${f(G.ry)}px` : `circle ${f(G.len)}px`
  return `radial-gradient(${size} at ${f(G.cx + ox)}px ${f(G.cy + oy)}px,${S.map(([c, t]) => `${c} ${f(t * 100)}%`).join()})`
}
// Un degradado SVG interpola color y opacidad por separado; uno CSS, premultiplicado: entre un verde
// opaco y un blanco translúcido, el SVG pasa por blancos apagados y el CSS conserva el verde. Para que
// la capa del compositor se vea igual que el borde SVG, entre dos paradas de distinta opacidad se
// añaden paradas intermedias con la mezcla del SVG (8 por tramo: a esa escala ya no se distingue)
let cx2d
const rgba = c => {
  cx2d ||= document.createElement('canvas').getContext('2d')
  // (un color que el canvas no entiende deja el anterior: el centinela)
  cx2d.fillStyle = 'rgba(1,2,3,0)'; const none = cx2d.fillStyle; cx2d.fillStyle = c
  const v = cx2d.fillStyle, m = /^#(..)(..)(..)$/.exec(v) || /^rgba?\(([^,]+),([^,]+),([^,)]+)(?:,([^)]+))?\)$/.exec(v.replace(/\s/g, ''))
  if (!m || v == none) return null
  return m[0][0] == '#' ? [...m.slice(1, 4).map(x => parseInt(x, 16)), 1] : [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]]
}
function svgStops(st) {
  const out = [st[0]]
  for (let i = 1; i < st.length; i++) {
    const [c0, t0] = st[i - 1], [c1, t1] = st[i], A = rgba(c0), B = rgba(c1)
    if (A && B && A[3] != B[3]) for (let k = 1; k < 8; k++) {
      const u = k / 8, L = j => A[j] + (B[j] - A[j]) * u
      out.push([`rgba(${f(L(0))},${f(L(1))},${f(L(2))},${f(L(3))})`, t0 + (t1 - t0) * u])
    }
    out.push(st[i])
  }
  return out
}

// Animaciones de borde: cada una devuelve sus nodos; las que dependen del tamaño reciben (id, w, h, t).
// estela: tres trazos con la cabeza alineada (retraso negativo = adelantado) y opacidad decreciente.
// k escala la estela: mide unos 100–130 px sea cual sea el marco (en uno grande, el 16 % del
// perímetro era una línea de cientos de píxeles). El adelanto (--d, fracción del ciclo) va con
// cuatro decimales: redondeado a uno, como el resto, se quedaba en 0 o en 0,1 y la estela salía
// desalineada (en twin, lo brillante iba detrás)
const tail = (P, n = 1, k = 1, step = {}) => mk('g', { class: 'ns-t' }, {}, ...[[16, 0, .22], [8, 8, .5], [3, 13, 1]].map(([l, o, a]) =>
  mk('path', { pathLength: 100 }, { '--d': Math.round(-o * k / n * 100) / 1e4, 'stroke-dasharray': `${f(l * k / n)} ${f(P - l * k / n)}`, opacity: a, ...step })))
// Tope de fotogramas (--ns-motion-fps, o 30 en equipos modestos): steps() en lugar de linear, y el
// trazo sólo se repinta cuando cambia de posición (cada borde animado se repinta entero en cada paso)
const cap = (t, def, fps) => {
  if (!(fps > 0)) return {}
  const ms = t ? parseFloat(t) * (/[^m]s$/.test(t) ? 1000 : 1) : def
  return { 'animation-timing-function': `steps(${Math.max(2, Math.round(ms / 1000 * fps))})` }
}
// (sin parámetros declarados: el núcleo no las rehace al cambiar de tamaño)
const fixed = fn => (...a) => fn(a[3], a[5])
const span = (w, h) => Math.max(.3, Math.min(1, 640 / (2 * (w + h))))
const paint_ = 'var(--ns-motion,var(--ns-accent,currentColor))'
const grad = (tag, id, geo, stops, ...anim) => mk('defs', {}, {}, mk(tag, { id, gradientUnits: 'userSpaceOnUse', ...geo }, {},
  ...stops.map(([o, a]) => mk('stop', { offset: o }, { 'stop-color': paint_, 'stop-opacity': a })), ...anim))
// banda de luz: un rectángulo con el degradado, movido por una animación CSS (transform) y
// enmascarado por el trazo del borde. Sin SMIL: se pausa con .ns-off como el resto y no se
// queda congelado en WebKit/iOS, donde animar gradientTransform no siempre repinta el trazo.
const band = (id, w, h, geo, rect, cls, t, css, stops = [[0, 0], [.5, 1], [1, 0]]) => [
  grad('linearGradient', id, geo, stops),
  mk('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: -20, y: -20, width: f(w + 40), height: f(h + 40) }, { 'mask-type': 'alpha' }, mk('path', {}, { fill: 'none', stroke: '#fff' })),
  mk('g', { mask: `url(#${id}m)` }, {}, mk('rect', { class: cls, ...rect }, { fill: `url(#${id})`, stroke: 'none', 'animation-duration': t, ...css }))]
// Barrido de luz que cruza el marco y enciende el borde a su paso. Viaja en la dirección de la
// diagonal de la forma (casi horizontal en una ancha; en una alta, en diagonal y cubriendo todo el
// alto) y va de justo fuera a justo fuera en línea recta: al salir una pasada entra la siguiente,
// sin tiempo muerto.
// En el compositor: una capa HTML junto a la SVG del marco, no dentro. Dentro de un SVG, mover la
// banda repintaba el SVG entero en cada fotograma (y en cada uno del desplazamiento de la página).
// Aquí la máscara (el trazo del borde, una imagen que se rasteriza una vez) y la banda son capas
// fijas, y lo único que cambia es un transform: lo mueve la GPU sin pintar nada. Capas:
//   resplandor (--ns-glow) > máscara (--m) > giro (ángulo de la diagonal) > desplazador > banda
// El desplazador mide recorrido + banda y avanza el 100 % de su ancho (fotogramas clave fijos, sin
// variables: así el compositor puede animarlo solo); la banda va a su izquierda, fuera, al empezar
const I = (...k) => { const e = document.createElement('i'); k.length && e.append(...k); return e }
// el trazo de un contorno como imagen de máscara (se rasteriza una vez), con un margen p alrededor:
// el trazo sale la mitad hacia fuera del contorno
const strokeMask = (d, w, h, p, sw, cap) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${f(w + 2 * p)}' height='${f(h + 2 * p)}'><path transform='translate(${p} ${p})' d='${d}' fill='none' stroke='#fff' stroke-width='${f(sw)}' stroke-linecap='${cap}'/></svg>`)}")`
// capa del compositor junto a la SVG del marco: su máscara sigue al contorno (sólo si cambió; en un
// morph, en cada fotograma) y se coloca donde la SVG
const place = (out, d, bl, bt, sw, cap) => {
  if (out._d == d) return
  out._d = d
  out.firstChild.style.setProperty('--m', strokeMask(d, out._w, out._h, out._p, sw, cap))
  out.style.left = -bl + 'px'; out.style.top = -bt + 'px'
}
function scan(id, w, h, t, r, fps, aw = 2) {
  const a = Math.atan2(h, w), c = Math.cos(a), s = Math.sin(a)
  const L = w * c + h * s, bw = Math.max(40, Math.min(240, L * .32)), v0 = -w * s - 20, vh = w * s + h * c + 40
  // (el trazo sale la mitad hacia fuera del contorno: la máscara lo rodea con ese margen)
  const p = Math.ceil(aw * 2), bar = I(), mov = I(bar), rot = I(mov), m = I(rot), out = I(m)
  out.className = 'ns-m ns-band'
  Object.assign(out.style, { width: f(w) + 'px', height: f(h) + 'px' })
  Object.assign(m.style, { left: -p + 'px', top: -p + 'px', width: f(w + 2 * p) + 'px', height: f(h + 2 * p) + 'px' })
  rot.style.transform = `translate(${p}px,${p}px) rotate(${f(a * 180 / Math.PI)}deg)`
  Object.assign(mov.style, { top: f(v0) + 'px', width: f(L + bw) + 'px', height: f(vh) + 'px' })
  const cp = cap(t, 3200, fps)
  for (const k in cp) mov.style.setProperty(k, cp[k])
  if (t) mov.style.animationDuration = t
  Object.assign(bar.style, { left: f(-bw) + 'px', width: f(bw) + 'px' })
  out._p = p; out._w = w; out._h = h; out._aw = aw
  return out
}
scan.html = true
scan.path = (out, d, bl, bt) => place(out, d, bl, bt, 2 * out._aw, 'round')

// Borde con degradado que gira (data-ns-spin) en el compositor: la máscara es el trazo del borde y
// dentro gira un cuadrado que cubre la caja en cualquier ángulo, con el mismo degradado (gradientCSS).
// Mover el degradado dentro de la SVG repintaba el borde y su estilo en cada fotograma; aquí sólo
// cambia un transform. Va debajo de la SVG del marco: acentos y foco siguen pintándose encima
function spin(str, w, h, t, bw) {
  const G = parse(str, w, h)
  if (!G) return null
  const D = Math.ceil(Math.hypot(w, h)) + 2, p = Math.ceil(bw * 2), r = I(), m = I(r), out = I(m)
  out.className = 'ns-spin'
  Object.assign(out.style, { width: f(w) + 'px', height: f(h) + 'px' })
  Object.assign(m.style, { left: -p + 'px', top: -p + 'px', width: f(w + 2 * p) + 'px', height: f(h + 2 * p) + 'px' })
  Object.assign(r.style, { left: f((w - D) / 2 + p) + 'px', top: f((h - D) / 2 + p) + 'px', width: D + 'px', height: D + 'px', background: gradientCSS(G, w, h, D), animationDuration: t })
  out._p = p; out._w = w; out._h = h; out._bw = bw
  return out
}
spin.path = (out, d, bl, bt) => place(out, d, bl, bt, 2 * out._bw, 'butt')
let MOTION
const motions = () => MOTION ||= {
  comet: (id, w, h, t, r, fps) => [tail(100, 1, span(w, h), cap(t, 5000, fps))],   // cometa con estela
  twin: (id, w, h, t, r, fps) => [tail(50, 2, span(w, h), cap(t, 5000, fps))],    // dos cometas opuestos
  chase: fixed((t, fps) => [mk('path', { class: 'ns-mc', pathLength: 100 }, cap(t, 4000, fps))]), // pulsos de datos
  march: fixed((t, fps) => [mk('path', { class: 'ns-mm' }, cap('', 700, fps))]),                  // hormigas en marcha
  loop: () => [mk('path', { class: 'ns-ml', pathLength: 100 })],     // se dibuja y se borra
  pulse: () => [mk('path', { class: 'ns-mp' })],                     // respira
  glitch: () => [mk('path', { class: 'ns-mg' })],                    // parpadeo desplazado
  progress: () => [mk('path', { class: 'ns-mr', pathLength: 100 })], // --ns-progress: 0–100
  scan,
  // banda que gira sobre el centro: dos destellos orbitando
  orbit: (id, w, h, t, r, fps) => { const D = Math.hypot(w, h) + 40; return band(id, w, h, { x1: 0, y1: f(h / 2), x2: f(w), y2: f(h / 2) },
    { x: f(w / 2 - D / 2), y: f(h / 2 - D / 2), width: f(D), height: f(D) }, 'ns-or', t || '4s',
    { 'transform-origin': `${f(w / 2)}px ${f(h / 2)}px`, ...cap(t, 4000, fps) }, [[.38, 0], [.5, 1], [.62, 0]]) },
  // foco de luz que sigue al puntero sobre el borde
  // (el relleno tenue ilumina el interior cerca del puntero; --ns-spot-fill: 0 lo desactiva)
  spot: (id, w, h, t, r) => [grad('radialGradient', id, { cx: -9e3, cy: -9e3, r }, [[0, 1], [1, 0]]),
    mk('path', { class: 'ns-ms' }, { stroke: 'none', fill: `url(#${id})`, 'fill-opacity': 'var(--ns-spot-fill,.07)' }), mk('path', { class: 'ns-ms' }, { stroke: `url(#${id})` })],
}


// Foco de luz global: un solo listener para toda la página. Como cada marco recibe la
// posición del puntero aunque no esté encima, la luz cruza los huecos entre tarjetas.
const SPOTS = new Set()
let px = -9e3, py = -9e3, sraf
function spots() {
  sraf = 0
  const jobs = [...SPOTS].filter(s => s.vis !== false && s.mo?.spot).map(s => [s, s.el.getBoundingClientRect()])
  for (const [s, r] of jobs) { const g = s.mo.spot.firstChild.firstChild; g.setAttribute('cx', f(px - r.left)); g.setAttribute('cy', f(py - r.top)) }
}
// sin puntero que flote (táctil) el foco no tiene nada que seguir: no se registra, y así el
// scroll no recalcula todos los marcos en cada frame (touch() viene del núcleo)
function spot(s, on) {
  on && !touch() ? SPOTS.add(s) : SPOTS.delete(s)
  if (on) track()
}
function track() {
  if (track.on) return
  track.on = 1
  const go = e => { px = e.clientX; py = e.clientY; sraf ||= requestAnimationFrame(spots) }
  addEventListener('pointermove', go, { passive: true })
  document.addEventListener('pointerout', e => e.relatedTarget || go({ clientX: -9e3, clientY: -9e3 }))
  addEventListener('scroll', () => { sraf ||= requestAnimationFrame(spots) }, { passive: true })
}

// Aperturas: la forma se despliega con sus cortes en px reales (no se deforma)
function aperture(s) {
  const { p, mode } = s.ap, { w, h } = s, E = x => x < 0 ? 0 : x > 1 ? 1 : x
  if (p <= 0) return []
  let sx = 1, sy = 1, ax = .5, ay = .5
  if (mode == 'iris') sx = sy = p
  else if (mode == 'wipe') { sx = p; ax = 0 }
  else if (mode == 'drop') { sy = p; ay = 0 }
  else if (mode == 'split') { sy = E(p / .5); sx = E((p - .4) / .6) } // primero una línea vertical
  else { sx = E(p / .5); sy = E((p - .4) / .6) }                      // open: primero una línea horizontal
  const W = Math.max(w * sx, 2), H = Math.max(h * sy, 2), ox = (w - W) * ax, oy = (h - H) * ay
  return geometry(s.src, W, H).map(v => ({ ...v, x: v.x + ox, y: v.y + oy, b: v.b?.map((z, i) => z + (i % 2 ? oy : ox)) }))
}

// una duración de una variable CSS del elemento: "720", "720ms" o ".72s"
const cssMs = (el, k, d) => { const raw = getComputedStyle(el).getPropertyValue(k).trim(), v = parseFloat(raw); return isNaN(v) ? d : /[^m]s$/.test(raw) ? v * 1000 : v }
function play(s, mode, dir, dur, delay = 0) {
  cancelAnimationFrame(s.ap?.raf)
  s.ap?.res?.()
  const from = s.ap ? s.ap.p : dir > 0 ? 0 : 1, to = dir > 0 ? 1 : 0
  const ap = (s.ap = { mode: mode || s.ap?.mode || 'open', p: from })
  if (!s.w) { s.w = s.el.offsetWidth; s.h = s.el.offsetHeight; write(s, read(s)) }
  if (reduced() || !s.w) dur = 1
  // (sin duración pedida: --ns-open-time / --ns-close-time del elemento, 720 y 420 ms)
  dur ??= dir > 0 ? cssMs(s.el, '--ns-open-time', 720) : cssMs(s.el, '--ns-close-time', 420)
  return new Promise(res => {
    ap.res = res
    const t0 = performance.now() + delay
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / dur)), e = k < .5 ? 4 * k ** 3 : 1 - (2 - 2 * k) ** 3 / 2
      ap.p = from + (to - from) * e
      if (k >= 1 && to) s.ap = null
      if (s.w && s.src) paint(s, geometry(s.src, s.w, s.h), !s.ap)
      if (k < 1) ap.raf = requestAnimationFrame(tick)
      else { ap.raf = 0; res() }
    }
    ap.raf = requestAnimationFrame(tick)
  })
}


// Formas ligadas al scroll (data-ns-scroll="forma final"): progreso 0 cuando el elemento
// asoma por abajo y 1 cuando su borde superior llega al 40 % de la ventana. Sólo se
// procesan los visibles; nada se repinta si el progreso no cambió.
const SCR = new Set()
let sraf2, bound
function scrollOne(s, vh) {
  const r = s.el.getBoundingClientRect(), p = Math.max(0, Math.min(1, (vh - r.top) / (vh * .6)))
  if (p === s.sp || s.anim || s.ap || !s.w) return
  s.sp = p
  const A = geometry(s.src, s.w, s.h), B = geometry(s.scr, s.w, s.h)
  paint(s, p <= 0 ? A : p >= 1 ? B : lerp(A, B, p), p <= 0 || p >= 1)
}
function scrolls() {
  sraf2 = 0
  const vh = innerHeight
  for (const s of SCR) if (s.scr && s.vis !== false) scrollOne(s, vh)
}
function scroll(s) {
  if (!bound) { bound = 1; addEventListener('scroll', () => { sraf2 ||= requestAnimationFrame(scrolls) }, { passive: true }) }
  SCR.add(s)
  s.sp = undefined
  scrollOne(s, innerHeight) // inmediato: sin un frame con la forma base
}

// Acentos: tramos del borde. "corners N" marca cada esquina (con N px de más a cada lado);
// "a l, b l" son tramos en % del perímetro.
function dashes(src, T, marks) {
  let iv = []
  const m = /^\s*corners\s*([\d.]+)?/.exec(src)
  if (m) { const x = +(m[1] || 16); for (const [a, b] of marks) iv.push([a - x, b + x]) }
  else for (const p of src.split(',')) {
    const [a, l] = p.trim().split(/\s+/).map(parseFloat)
    if (!isNaN(a)) iv.push([a * T / 100, (a + (l || 10)) * T / 100])
  }
  iv = iv.flatMap(([a, b]) => a < 0 ? [[0, b], [T + a, T]] : b > T ? [[a, T], [0, b - T]] : [[a, b]]).sort((p, q) => p[0] - q[0])
  const out = [0]
  let pos = 0
  for (let [a, b] of iv) { a = Math.max(a, pos); if (b <= a) continue; out.push(a - pos, b - a); pos = b }
  out.push(Math.max(0, T - pos))
  return out.map(f).join(' ')
}

function accent(pa, src, V, T, at) {
  const marks = []
  V.forEach((v, i) => { if (v.c < 0) return; const k = (marks[v.c] ||= [Infinity, -Infinity]); k[0] = Math.min(k[0], at[i][0]); k[1] = Math.max(k[1], at[i][1]) })
  pa.setAttribute('stroke-dasharray', dashes(src, T, marks.filter(Boolean)))
}
