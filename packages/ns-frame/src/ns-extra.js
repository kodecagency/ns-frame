/*! ns-frame/extra · se carga bajo demanda: degradados en bordes y animaciones de borde */
// El núcleo lo importa sólo cuando algún elemento lo necesita y le pasa sus helpers,
// así este módulo no importa nada y no crea dependencias circulares ni chunks compartidos.
let mk, f, num, geometry, paint, write, read, reduced, lerp

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
.ns-sc{animation:ns-sc 3.2s linear infinite}
.ns-or{animation:ns-or 4s linear infinite}
@keyframes ns-sc{0%{transform:translate(var(--a),0)}62%,to{transform:translate(var(--b),0)}}
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
  ({ mk, f, num, geometry, paint, write, read, reduced, lerp } = h)
  h.styles(CSS)
  return { gradient, motions: motions(), spot, aperture, play, scroll, accent }
}

// linear-gradient()/radial-gradient() de CSS -> gradiente SVG en coordenadas de la caja
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

// linear-gradient()/radial-gradient() de CSS -> gradiente SVG en coordenadas de la caja
function gradient(str, w, h, id, spin) {
  const m = /^(linear|radial)-gradient\((.*)\)$/s.exec(str)
  if (!m) return
  const parts = split(m[2]), head = parts[0]
  let cx = w / 2, cy = h / 2, a = Math.PI, len, geo, t0
  if (m[1] == 'linear') {
    if (/^to\s/.test(head)) {
      const dx = /right/.test(head) - /left/.test(head), dy = /bottom/.test(head) - /top/.test(head)
      a = Math.atan2(dx * h, -dy * w); parts.shift()
    } else if (/^-?[\d.]+(deg|turn|rad)$/.test(head)) {
      a = parseFloat(head) * { deg: Math.PI / 180, turn: 2 * Math.PI, rad: 1 }[/[a-z]+$/.exec(head)[0]]; parts.shift()
    }
    const s = Math.sin(a), c = Math.cos(a)
    len = Math.abs(w * s) + Math.abs(h * c)
    geo = { x1: f(cx - s * len / 2), y1: f(cy + c * len / 2), x2: f(cx + s * len / 2), y2: f(cy - c * len / 2) }
  } else {
    let rx, ry
    if (/\bat\b|circle|ellipse|closest|farthest|^[\d.]+(px|%)/.test(head)) {
      let [, X = 'center', Y] = /at\s+(\S+)(?:\s+(\S+))?/.exec(head) || []
      if (!Y) Y = /top|bottom/.test(X) ? ((Y = X), (X = 'center'), Y) : 'center'
      cx = num(KW[X] || X, w); cy = num(KW[Y] || Y, h); parts.shift()
      // tamaño explícito: "70% 90% at …" (elipse) o "120px at …" (círculo)
      const sz = /^(?:ellipse\s+|circle\s+)?([\d.]+(?:px|%))(?:\s+([\d.]+(?:px|%)))?\s/.exec(head + ' ')
      if (sz) { rx = num(sz[1], w); ry = sz[2] ? num(sz[2], h) : rx }
    }
    len = rx ? Math.max(rx, ry) : Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - cx, y - cy)))
    // la elipse se hace con un círculo unitario escalado (SVG sólo tiene gradientes circulares)
    geo = rx ? { cx: 0, cy: 0, r: 1, gradientTransform: `translate(${f(cx)} ${f(cy)}) scale(${f(rx)} ${f(ry)})` } : { cx: f(cx), cy: f(cy), r: f(len) }
    if (rx) t0 = `translate(${f(cx)}px, ${f(cy)}px) scale(${f(rx)}, ${f(ry)})`
  }
  const st = parts.map(p => { const q = /\s(-?[\d.]+)(%|px)$/.exec(p); return q ? [p.slice(0, q.index), q[2] == 'px' ? q[1] / len : q[1] / 100] : [p, null] })
  st[0][1] ??= 0
  st[st.length - 1][1] ??= 1
  for (let i = 1; i < st.length; i++) if (st[i][1] == null) {
    let j = i
    while (st[j][1] == null) j++
    for (let k = i; k < j; k++) st[k][1] = st[i - 1][1] + (st[j][1] - st[i - 1][1]) * (k - i + 1) / (j - i + 1)
  }
  // giro con una animación CSS (transform sobre el degradado, SVG 2) en vez de SMIL:
  // se pausa fuera de pantalla con .ns-off y no se congela en móviles
  return mk(m[1] + 'Gradient', { id, gradientUnits: 'userSpaceOnUse', ...geo }, spin ? {
    animation: `ns-sp ${spin} linear infinite`, 'transform-origin': '0 0',
    '--c': `${f(w / 2)}px, ${f(h / 2)}px`, '--nc': `${f(-w / 2)}px, ${f(-h / 2)}px`, '--t0': t0 || 'translate(0)',
  } : {}, ...st.map(([col, o]) => mk('stop', { offset: o }, { 'stop-color': col })))
}

// Animaciones de borde: cada una devuelve sus nodos; las que dependen del tamaño reciben (id, w, h, t).
// estela: tres trazos con la cabeza alineada (retraso negativo = adelantado) y opacidad decreciente
const tail = (P, n = 1) => mk('g', { class: 'ns-t' }, {}, ...[[16, 0, .22], [8, 8, .5], [3, 13, 1]].map(([l, o, a]) =>
  mk('path', { pathLength: 100 }, { '--d': -o / n / 100, 'stroke-dasharray': `${l / n} ${P - l / n}`, opacity: a })))
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
let MOTION
const motions = () => MOTION ||= {
  comet: () => [tail(100)],                                          // cometa con estela
  twin: () => [tail(50, 2)],                                          // dos cometas opuestos
  chase: () => [mk('path', { class: 'ns-mc', pathLength: 100 })],    // pulsos de datos
  march: () => [mk('path', { class: 'ns-mm' })],                     // hormigas en marcha
  loop: () => [mk('path', { class: 'ns-ml', pathLength: 100 })],     // se dibuja y se borra
  pulse: () => [mk('path', { class: 'ns-mp' })],                     // respira
  glitch: () => [mk('path', { class: 'ns-mg' })],                    // parpadeo desplazado
  progress: () => [mk('path', { class: 'ns-mr', pathLength: 100 })], // --ns-progress: 0–100
  // barrido de luz que cruza el marco y enciende el borde a su paso
  scan: (id, w, h, t) => band(id, w, h, { x1: 0, y1: 0, x2: f(w * .22), y2: f(w * .07) },
    { x: f(-w * 1.2), y: f(-h - 20), width: f(w * 2.6), height: f(h * 3 + 40) }, 'ns-sc', t || '3.2s',
    { '--a': f(-w * .3) + 'px', '--b': f(w * 1.05) + 'px' }),
  // banda que gira sobre el centro: dos destellos orbitando
  orbit: (id, w, h, t) => { const D = Math.hypot(w, h) + 40; return band(id, w, h, { x1: 0, y1: f(h / 2), x2: f(w), y2: f(h / 2) },
    { x: f(w / 2 - D / 2), y: f(h / 2 - D / 2), width: f(D), height: f(D) }, 'ns-or', t || '4s',
    { 'transform-origin': `${f(w / 2)}px ${f(h / 2)}px` }, [[.38, 0], [.5, 1], [.62, 0]]) },
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
function spot(s, on) {
  on ? SPOTS.add(s) : SPOTS.delete(s)
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

function play(s, mode, dir, dur, delay = 0) {
  cancelAnimationFrame(s.ap?.raf)
  s.ap?.res?.()
  const from = s.ap ? s.ap.p : dir > 0 ? 0 : 1, to = dir > 0 ? 1 : 0
  const ap = (s.ap = { mode: mode || s.ap?.mode || 'open', p: from })
  if (!s.w) { s.w = s.el.offsetWidth; s.h = s.el.offsetHeight; write(s, read(s)) }
  if (reduced() || !s.w) dur = 1
  dur ??= dir > 0 ? 720 : 420
  return new Promise(res => {
    ap.res = res
    const t0 = performance.now() + delay
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / dur)), e = k < .5 ? 4 * k ** 3 : 1 - (2 - 2 * k) ** 3 / 2
      ap.p = from + (to - from) * e
      if (k >= 1 && to) s.ap = null
      if (s.w) paint(s, geometry(s.src, s.w, s.h), !s.ap)
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
