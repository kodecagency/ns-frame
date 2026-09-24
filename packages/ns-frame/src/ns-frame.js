/*! ns-frame v0.9.0 · MIT · Kodec Agency · formas nativas para la web: cortes, chaflanes, scoops y fillets */

// build "lite" (--define:NS_LITE=true): sólo recortes, sin capa SVG, gradientes ni morph
const K = Math.SQRT1_2, EPS = 1e-6
const CORNERS = ['tl', 'tr', 'br', 'bl']
const GROUPS = { all: CORNERS, diag: ['tl', 'br'], anti: ['tr', 'bl'] }

/** Presets listos para producción. Amplíalos con `define(name, shape)`. */
export const PRESETS = {
  card: 'tl+br bevel 18; radius 3',
  button: 'tl+br bevel 10; radius 2',
  chip: 'all bevel 7; radius 1.5',
  soft: 'all bevel 22; radius 9',
  notch: 'all notch 12; radius 3',
  scoop: 'all scoop 16',
  wing: 'tl bevel 44 14; br bevel 44 14; radius 2',
  panel: 'tl bevel 26; br bevel 26; tr+bl bevel 8; top cut center 34% 6; radius 3',
  plate: 'all bevel 10; top+bottom cut center 36% 6; radius 2',
  tab: 'top tab 0 44% 10; all round 8; radius 4',
  ticket: 'left+right scoop center 26 13; all round 10',
  media: 'tl+br round 34; tr+bl bevel 18; radius 3',
  pill: 'tl+bl round 50%; tr+br bevel 12; radius 2',
  hud: 'tl bevel 20; br bevel 20; top cut 18% 42% 5; bottom tab -40% -14% 5; radius 2',
}

export const define = (name, shape) => { PRESETS[name] = shape; cache.clear() }

// "30%", "-20" (desde el final), "100%-24", "50%+8"
function num(v, L = 0, pos) {
  v = String(v ?? '')
  const m = /^(-?[\d.]+)%([+-][\d.]+)?$/.exec(v)
  let n = m ? m[1] * L / 100 + (+m[2] || 0) : parseFloat(v)
  if (isNaN(n)) return 0
  if (pos && v[0] == '-') n += L
  return n
}

/** Texto -> lista de declaraciones (se cachea; se resuelve por tamaño en geometry). */
export function parse(src, out = []) {
  for (let st of String(src || '').split(/[;\n]/)) {
    st = st.trim()
    const m = /^@([<>])\s*([\d.]+)\s*/.exec(st), q = m && [m[1], +m[2]]
    if (m) st = st.slice(m[0].length)
    if (!st) continue
    if (/^poly\s/.test(st)) {
      out.push({ q, poly: st.slice(5).split(',').map(p => p.trim().split(/\s+/)).filter(p => p.length > 1) })
      continue
    }
    let fr
    const t = st.split(/[\s,]+/).filter(x => !(/^r-?[\d.]+$/.test(x) && ((fr = +x.slice(1)), 1)))
    if (t.length == 1 && PRESETS[t[0]]) { for (const s of parse(PRESETS[t[0]])) out.push(q ? { ...s, q } : s); continue }
    out.push({ q, t, fr })
  }
  return out
}

// esquinas y bordes lógicos: [en LTR, en RTL] (ss = inicio-inicio, como border-start-start-radius)
const LOGICAL = { ss: ['tl', 'tr'], se: ['tr', 'tl'], es: ['bl', 'br'], ee: ['br', 'bl'], start: ['left', 'right'], end: ['right', 'left'] }

function resolve(list, w) {
  const s = { c: {}, e: { top: [], right: [], bottom: [], left: [] }, r: 0, rtl: 0 }
  for (const d of list) {
    if (d.q && (d.q[0] == '<' ? w >= d.q[1] : w <= d.q[1])) continue
    if (d.poly) { s.poly = d.poly; continue }
    const [tg, type, ...a] = d.t
    if (tg == 'radius') { s.r = +type || 0; continue }
    if (tg == 'dir') { s.rtl = +(type == 'rtl'); continue }
    for (const g of tg.split('+')) for (const k of GROUPS[g] || [LOGICAL[g]?.[s.rtl] || g]) {
      if (CORNERS.includes(k)) s.c[k] = { type, a, r: d.fr }
      else if (s.e[k]) type == 'none' ? (s.e[k] = []) : s.e[k].push({ type, a, r: d.fr })
    }
  }
  return s
}

// esquina: [x sel, y sel, H(x,y), V(x,y), ¿el borde entrante es vertical?]
const CD = { tl: [0, 0, 1, 0, 0, 1, 1], tr: [1, 0, -1, 0, 0, 1, 0], br: [1, 1, -1, 0, 0, -1, 1], bl: [0, 1, 1, 0, 0, -1, 0] }
// borde tras la esquina: [origen x sel, origen y sel, tangente, normal hacia dentro]
const ED = { top: [0, 0, 1, 0, 0, 1], right: [1, 0, 0, 1, -1, 0], bottom: [1, 1, -1, 0, 0, -1], left: [0, 1, 0, -1, 1, 0] }
const EDGES = Object.keys(ED)
const cache = new Map()
const parsed = src => { let s = cache.get(src); if (!s) cache.set(src, (s = parse(src))); return s }

/**
 * Resuelve un shape a vértices en px para una caja w×h.
 * Cada esquina emite 3 vértices y cada rasgo de borde 4: dos shapes con la
 * misma estructura se interpolan vértice a vértice (morph).
 */
export function geometry(shape, w, h) {
  const spec = resolve(typeof shape == 'string' ? parsed(shape) : shape, w)
  const R = spec.r, ins = {}, V = [], cv = {}
  const vx = (x, y, r = 0, rx = 0, ry = 0, sw = 1, c = -1) => ({ x, y, r, rx, ry, sw, c })
  // poly: "x y [rN] [aN]" · rN redondea el vértice · aN llega a él por un arco de radio N (negativo = antihorario)
  if (spec.poly) return spec.poly.map(([x, y, ...o], i) => {
    let r = R, a = 0
    for (const t of o) t[0] == 'r' ? (r = +t.slice(1) || 0) : t[0] == 'a' && (a = +t.slice(1) || 0)
    return vx(num(x, w, 1), num(y, h, 1), r, Math.abs(a), Math.abs(a), +(a > 0), i)
  })

  for (const k of EDGES) ins[k] = Math.max(0, ...spec.e[k].filter(f => f.type == 'tab').map(f => num(f.a[2])))
  const x0 = ins.left, y0 = ins.top, x1 = w - ins.right, y1 = h - ins.bottom
  // margen seguro por lado: cuánto invaden los cortes el área de contenido (t, r, b, l)
  const safe = [ins.top, ins.right, ins.bottom, ins.left], cn = []
  const iw = Math.max(0, x1 - x0), ih = Math.max(0, y1 - y0), m = Math.min(iw, ih)

  CORNERS.forEach((k, ci) => {
    const [cx, cy, hx, hy, qx, qy, vin] = CD[k], c = spec.c[k] || {}, a = c.a || []
    const X = cx ? x1 : x0, Y = cy ? y1 : y0, r = c.r ?? R
    const sh = Math.min(num(a[0], m), iw / 2), sv = Math.min(num(a[1] ?? a[0], m), ih / 2)
    const P = (u, v, ...o) => vx(X + hx * u + qx * v, Y + hy * u + qy * v, ...o)
    const p1 = (...o) => vin ? P(0, sv, ...o) : P(sh, 0, ...o)
    const p2 = (...o) => vin ? P(sh, 0, ...o) : P(0, sv, ...o)
    let out
    switch (c.type) {
      case 'bevel': out = [p1(r), P(sh / 2, sv / 2), p2(r)]; break
      case 'notch': out = [p1(r), P(sh, sv, r), p2(r)]; break
      case 'round': case 'scoop': {
        const rd = c.type == 'round', q = rd ? 1 - K : K, sw = +rd
        out = [p1(), P(sh * q, sv * q, 0, sh, sv, sw), p2(0, sh, sv, sw)]; break
      }
      case 'squircle': {
        // superelipse (≈ n 4): un cúbico con tangente continua a los lados, partido en su punto
        // medio para conservar 3 vértices por esquina (así se interpola con cualquier otra forma)
        const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], a = .09
        let q = [[0, sv], [0, sv * a], [sh * a, 0], [sh, 0]]
        if (!vin) q = q.reverse()
        const m01 = m(q[0], q[1]), m12 = m(q[1], q[2]), m23 = m(q[2], q[3]), m012 = m(m01, m12), m123 = m(m12, m23), mid = m(m012, m123)
        const A = ([u, v]) => { const p = P(u, v); return [p.x, p.y] }, B = (...cs) => cs.flatMap(A)
        out = [P(...q[0]), P(...mid), P(...q[3])]
        out[1].b = B(m01, m012)
        out[2].b = B(m123, m23)
        break
      }
      default: out = [P(0, 0, r), P(0, 0, r), P(0, 0, r)]
    }
    out.forEach(v => (v.c = ci))
    cn[ci] = [c.type, sh, sv]
    cv[k] = out
  })

  CORNERS.forEach((k, ci) => {
    V.push(...cv[k])
    const e = EDGES[ci], [ox, oy, tx, ty, nx, ny] = ED[e], L = tx ? w : h, b0 = ins[e]
    const O = [ox * w + nx * b0, oy * h + ny * b0]
    const along = p => (p.x - O[0]) * tx + (p.y - O[1]) * ty
    const lo = along(cv[k][2]), hi = along(cv[CORNERS[(ci + 1) % 4]][0]), flip = e == 'bottom' || e == 'left'
    const feats = spec.e[e].map(f => {
      const [p, q, dd, ss] = f.a
      let a, b
      if (p == 'center') { const W = num(q, L); a = (L - W) / 2; b = a + W }
      else { a = num(p, L, 1); b = num(q, L, 1) }
      if (flip) [a, b] = [L - b, L - a]
      if (a > b) [a, b] = [b, a]
      a = Math.max(a, lo); b = Math.min(b, hi)
      if (b - a < EPS) return
      const d = num(dd), s = Math.min(ss == null ? d : num(ss), (b - a) / 2)
      if (f.type != 'tab') safe[ci] = Math.max(safe[ci], b0 + d)
      return { a, b, d, s, t: f.type, r: f.r ?? R }
    }).filter(Boolean).sort((u, v) => u.a - v.a)
    const Q = (u, o, ...z) => V.push(vx(O[0] + tx * u + nx * o, O[1] + ty * u + ny * o, ...z))
    for (const f of feats) {
      if (f.t == 'scoop') {
        const ra = (f.b - f.a) / 2, rx = tx ? ra : f.d, ry = tx ? f.d : ra
        Q(f.a, 0); Q(f.a + ra, f.d, 0, rx, ry, 0); Q(f.b, 0, 0, rx, ry, 0); Q(f.b, 0)
      } else {
        const o = f.t == 'tab' ? -f.d : f.d
        Q(f.a, 0, f.r); Q(f.a + f.s, o, f.r); Q(f.b - f.s, o, f.r); Q(f.b, 0, f.r)
      }
    }
  })
  V.safe = safe
  V.cn = cn
  // "simple": sólo esquinas, sin rasgos de borde ni fillets → representable con corner-shape nativo
  V.simple = !spec.r && EDGES.every(k => !spec.e[k].length) && CORNERS.every(k => !spec.c[k]?.r && /^(bevel|round|scoop|notch|squircle|square|undefined)$/.test(spec.c[k]?.type))
  return V
}

// Hasta dónde llega el corte (en x) a una distancia y del borde: bevel/notch/round/scoop
function reach(type, sh, sv, y) {
  if (y >= sv || !sh) return 0
  const k = y / sv
  return type == 'bevel' ? sh * (1 - k) : type == 'notch' ? sh : type == 'round' || type == 'squircle' ? sh * (1 - Math.sqrt(1 - (1 - k) ** 2)) : type == 'scoop' ? sh * Math.sqrt(1 - k * k) : 0
}

/**
 * Margen seguro (t, r, b, l) para que el contenido no choque con los cortes, dado el
 * padding base de cada lado. Las esquinas sólo empujan en horizontal y sólo lo que falte:
 * si el padding ya alcanza, no se añade nada (el texto queda alineado entre tarjetas).
 */
export function safe(G, pad = [0, 0, 0, 0], gap = 12) {
  const out = [...(G.safe || [0, 0, 0, 0])]
  G.cn?.forEach(([type, sh, sv], ci) => {
    const side = ci == 0 || ci == 3 ? 3 : 1, v = ci < 2 ? 0 : 2
    // se mide 4px por encima de la primera línea: el área de contenido de la fuente sobresale de la caja de línea
    out[side] = Math.max(out[side], reach(type, sh, sv, Math.max(0, pad[v] + out[v] - 4)) + gap - pad[side])
  })
  return out.map(x => Math.max(0, Math.round(x)))
}

const arcLen = (c, rx, ry) => { const r = (rx + ry) / 2; return c >= 2 * r ? c * Math.PI / 2 : 2 * r * Math.asin(c / (2 * r)) }

/** Vértices -> comandos de path con fillet en cada vértice (convexo o cóncavo). */
export function commands(V) {
  const n = V.length, same = (p, q) => Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS
  const start = V.findIndex((v, i) => !same(v, V[(i + n - 1) % n]))
  if (start < 0) return { C: [], T: 0, at: [] }
  const io = new Array(n)
  for (let i = start; i < start + n;) {
    let j = i + 1
    while (j < start + n && same(V[j % n], V[i % n])) j++
    const P = V[i % n], A = V[(i + n - 1) % n], B = V[j % n]
    let r = 0
    for (let k = i; k < j; k++) r = Math.max(r, V[k % n].r)
    if (P.rx || B.rx || P.b || B.b) r = 0
    let pin = [P.x, P.y], pout = pin, rr = 0, sw = 1
    const dx1 = A.x - P.x, dy1 = A.y - P.y, dx2 = B.x - P.x, dy2 = B.y - P.y
    const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2)
    if (r > 0 && l1 > EPS && l2 > EPS) {
      const ux = dx1 / l1, uy = dy1 / l1, wx = dx2 / l2, wy = dy2 / l2
      const th = Math.acos(Math.max(-1, Math.min(1, ux * wx + uy * wy)))
      if (th > 1e-3 && th < Math.PI - 1e-3) {
        const tn = Math.tan(th / 2), t = Math.min(r / tn, Math.min(l1, l2) / 2)
        rr = t * tn
        pin = [P.x + ux * t, P.y + uy * t]
        pout = [P.x + wx * t, P.y + wy * t]
        sw = ux * wy - uy * wx < 0 ? 1 : 0
      }
    }
    io[i % n] = [pin, pout, rr, sw]
    for (let k = i + 1; k < j; k++) io[k % n] = [pout, pout, 0, 1]
    i = j
  }
  let cur = io[(start + n - 1) % n][1], T = 0
  const C = [['M', cur]], at = new Array(n)
  const go = (cmd, len) => { C.push(cmd); T += len; cur = cmd[1] }
  for (let i = start; i < start + n; i++) {
    const v = V[i % n], [pin, pout, rr, sw] = io[i % n], ch = Math.hypot(pin[0] - cur[0], pin[1] - cur[1])
    // arco sólo si la cuerda cabe en un cuarto de elipse (evita "abombados" durante el morph)
    if (v.b) go(['C', pin, v.b], ch * 1.05)
    else if (v.rx > EPS && v.ry > EPS && ch <= Math.hypot(v.rx, v.ry) * 1.02) go(['A', pin, v.rx, v.ry, v.sw], arcLen(ch, v.rx, v.ry))
    else go(['L', pin], ch)
    const d0 = T
    if (rr > EPS) go(['A', pout, rr, rr, sw], arcLen(Math.hypot(pout[0] - pin[0], pout[1] - pin[1]), rr, rr))
    at[i % n] = [d0, T]
  }
  return { C, T, at }
}

const f = n => Math.round(n * 10) / 10
const svgD = C => C.length ? C.map(([c, p, rx, ry, sw]) => (c == 'A' ? `A${f(rx)} ${f(ry)} 0 0 ${sw} ` : c == 'C' ? 'C' + rx.map(f).join(' ') + ' ' : c) + f(p[0]) + ' ' + f(p[1])).join('') + 'Z' : ''

/** SVG path `d` para una caja w×h (útil en <svg>, canvas Path2D, React, etc). */
export const path = (shape, w, h) => svgD(commands(geometry(shape, w, h)).C)

export const lerp = (A, B, t) => A.length != B.length ? B : B.map((q, i) => {
  const p = A[i], m = k => p[k] + (q[k] - p[k]) * t
  return { x: m('x'), y: m('y'), r: m('r'), rx: m('rx'), ry: m('ry'), sw: t < .5 ? p.sw : q.sw, c: q.c, b: p.b && q.b ? q.b.map((z, i) => p.b[i] + (z - p.b[i]) * t) : t < .5 ? p.b : q.b }
})

const SVGNS = 'http://www.w3.org/2000/svg'
const TIME = /^\d*\.?\d+m?s$/

// Constructor de nodos SVG sin parsear markup: atributos con setAttribute y estilos
// con CSSOM. Ningún valor (de atributos o de CSS) puede inyectar nodos, y funciona
// con una Content-Security-Policy estricta (sin 'unsafe-inline').
function mk(tag, a = {}, st = {}, ...kids) {
  const e = document.createElementNS(SVGNS, tag)
  for (const k in a) e.setAttribute(k, a[k])
  for (const k in st) e.style.setProperty(k, st[k])
  e.append(...kids)
  return e
}

// ───────────────────────────── runtime DOM ─────────────────────────────

const BASE = 'ns-frame{display:block}:where([data-ns],[data-ns-nest],ns-frame){position:relative}' +
  ':where([data-ns-pad],ns-frame[pad]){--p:var(--ns-pad,1.25rem);padding:calc(var(--ns-safe-t,0px) + var(--p)) calc(var(--ns-safe-r,0px) + var(--p)) calc(var(--ns-safe-b,0px) + var(--p)) calc(var(--ns-safe-l,0px) + var(--p))}'
const STYLE = `
.ns-svg{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:1;filter:var(--ns-glow,none)}
@media (hover:none) and (pointer:coarse){.ns-svg{filter:var(--ns-glow-touch,none)}}
.ns-svg path{fill:none}
.ns-b{stroke:var(--ns-border);stroke-width:calc(2*var(--ns-border-width,1px))}
.ns-i{stroke:var(--ns-inner-color,var(--ns-border));stroke-width:var(--ns-inner-width,1px);opacity:var(--ns-inner-opacity,.45);vector-effect:non-scaling-stroke}
.ns-a{stroke:var(--ns-accent,var(--ns-border));stroke-width:calc(2*var(--ns-accent-width,2px))}
.ns-f{display:none;stroke:var(--ns-focus,currentColor);stroke-width:calc(2*var(--ns-focus-width,2px))}
:focus-visible>.ns-svg>.ns-f{display:inline}
.ns-pre .ns-b,.ns-pre .ns-a{stroke-dasharray:100 100;stroke-dashoffset:100}
.ns-draw .ns-b{stroke-dasharray:100 100;animation:ns-d var(--ns-draw-time,1.2s) cubic-bezier(.65,0,.35,1) both}
.ns-draw .ns-a{animation:ns-o .4s var(--ns-draw-time,1.2s) both}
.ns-off *{animation-play-state:paused!important}
@keyframes ns-d{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes ns-o{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.ns-svg *{animation:none!important;stroke-dashoffset:0!important}.ns-pre .ns-b{stroke-dasharray:none}}
@media (forced-colors:active){.ns-b,.ns-i,.ns-a{stroke:CanvasText!important}.ns-f{stroke:Highlight!important}}`

const DOM = typeof window != 'undefined' && typeof document != 'undefined'
const NOKIDS = /^(img|video|canvas|input|textarea|select|iframe|audio|object|embed|progress|meter|svg|picture)$/i
const ATTRS = ['shape', 'hover', 'press', 'accent', 'trace', 'draw', 'spin', 'motion', 'enter', 'nest', 'native', 'scroll']
const S = new WeakMap()
let ro, vo, styled, uid = 0

const attr = (el, k) => el.getAttribute(el.localName == 'ns-frame' ? k : k == 'shape' ? 'data-ns' : 'data-ns-' + k)
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
// alto contraste (Windows): un marco sin borde quedaría invisible, así que recibe uno del sistema
const FORCED = DOM && matchMedia('(forced-colors: active)')

// Capas SVG perezosas: sólo existen las que se usan (orden de pintado: d, i, b, a, f)
const ORDER = 'dibaf'
const PARTS = {
  d: () => mk('defs'), i: () => mk('path', { class: 'ns-i' }), b: () => mk('path', { class: 'ns-b', pathLength: 100 }),
  a: () => mk('path', { class: 'ns-a' }), f: () => mk('path', { class: 'ns-f' }),
}

// Extras bajo demanda (degradados en bordes y animaciones de borde): una página que no
// los usa no los descarga. Se cargan una vez y repintan a los elementos que esperaban.
let X, XP
const WAIT = new Set()
const need = () => X ? Promise.resolve(X) : (extras(), XP)
function extras(s) {
  if (X) return X
  if (s) WAIT.add(s)
  XP ||= import('./ns-extra.js').then(m => {
    X = m.init({ mk, f, num, geometry, paint, write, read, reduced, styles, lerp })
    for (const q of WAIT) { q.key = 0; refresh(q) }
    WAIT.clear()
  })
}

function layer(s) {
  if (s.svg || NOKIDS.test(s.el.localName)) return s.svg
  const svg = (s.svg = mk('svg', { class: 'ns-svg', 'aria-hidden': 'true' }))
  s.p = {}
  s.el.append(svg)
  if (attr(s.el, 'draw') != null) svg.classList.add('ns-pre')
  vo.observe(s.el)
  return svg
}

// devuelve la capa k (creándola si hace falta) o la oculta si on es falso
function part(s, k, on) {
  let el = s.p[k]
  if (!on) { if (el) el.style.display = 'none'; return }
  if (!el) {
    el = s.p[k] = PARTS[k]()
    const next = [...ORDER.slice(ORDER.indexOf(k) + 1)].map(x => s.p[x]).find(Boolean)
    s.svg.insertBefore(el, next || null)
  }
  el.style.display = ''
  return el
}

// Modo nativo (data-ns-native): si el navegador soporta corner-shape y la forma es simple,
// el recorte lo hace el motor CSS (border-radius + corner-shape + overflow: clip) en vez de
// clip-path. Así box-shadow, outline y filtros exteriores siguen la forma.
const NATIVE = DOM && CSS.supports?.('corner-shape', 'bevel')
function native(s, V, on) {
  const st = s.el.style
  if (on) {
    const r = V.cn.map(([, h, v]) => [h || 0, v || 0])
    st.borderRadius = r.map(x => x[0] + 'px').join(' ') + ' / ' + r.map(x => x[1] + 'px').join(' ')
    st.setProperty('corner-shape', V.cn.map(([t]) => t && t != 'square' ? t : 'round').join(' '))
    st.overflow = 'clip'
  } else if (s.nt) { st.borderRadius = st.overflow = ''; st.removeProperty('corner-shape') }
  s.nt = on
}

function paint(s, V, fin) {
  s.cur = V
  // apertura en curso (si el módulo extra aún no llegó, el elemento queda oculto: sin destellos)
  if (typeof NS_LITE == 'undefined' && s.ap && !s.enter) V = X ? X.aperture(s) : []
  const { C, T, at } = commands(V), d = svgD(C), nat = !!(fin && s.nat && NATIVE && V.simple && !s.ap)
  if (nat || s.nt) native(s, V, nat)
  s.el.style.clipPath = nat ? '' : d ? `path('${d}')` : s.ap ? 'inset(50%)' : ''
  if (typeof NS_LITE == 'undefined') decorate(s, V, d, T, at)
}

function decorate(s, V, d, T, at) {
  const L = s.look
  if (!L.border && !L.inner && !s.accent && !s.motion && !s.fo && !s.svg) return
  const svg = layer(s)
  if (!svg) return
  const { w, h } = s, gk = /gradient\(/.test(L.border) && [L.border, w, h, s.spin].join('|')
  const id = (s.id ||= 'nsg' + ++uid), url = gk ? `url(#${id})` : ''
  svg.setAttribute('width', w)
  svg.setAttribute('height', h)
  svg.style.left = -L.bl + 'px'
  svg.style.top = -L.bt + 'px'
  const pb = part(s, 'b', L.border), pi = part(s, 'i', L.inner), pa = part(s, 'a', s.accent), pf = part(s, 'f', s.fo)
  for (const p of [pb, pi, pa, pf]) p?.setAttribute('d', d)
  const names = s.motion.split(/[\s,]+/).filter(Boolean), M = names.length ? extras(s)?.motions : 0
  const want = M ? names.filter(k => M[k]) : [], mo = (s.mo ||= {})
  for (const k in mo) if (!want.includes(k)) { mo[k].remove(); delete mo[k] }
  M && X.spot(s, want.includes('spot'))
  for (const k of want) {
    const key = M[k].length ? [w, h, s.mt, s.ss].join() : 1
    let g = mo[k]
    if (g?._k !== key) {
      g?.remove()
      g = mo[k] = mk('g', { class: 'ns-m' }, {}, ...M[k](id + k, w, h, s.mt, s.ss))
      g._k = key
      svg.insertBefore(g, s.p.f || null)
    }
    for (const p of g.getElementsByTagName('path')) p.setAttribute('d', d)
  }
  if (pi) pi.setAttribute('transform', `translate(${L.inner} ${L.inner}) scale(${(w - 2 * L.inner) / w} ${(h - 2 * L.inner) / h})`)
  const E = gk && extras(s)
  if (gk != s.gk && (!gk || E)) {
    s.gk = gk
    const defs = part(s, 'd', gk || s.p.d)
    if (defs) defs.replaceChildren(...(gk ? [E.gradient(L.border, w, h, id, s.spin)].filter(Boolean) : []))
  }
  if (pb) pb.style.stroke = s.gk ? url : ''
  if (pi) pi.style.stroke = s.gk ? `var(--ns-inner-color,${url})` : ''
  // acentos (brackets): se calculan en el módulo extra; mientras llega, el trazo espera oculto
  if (pa) { const A = extras(s); A ? A.accent(pa, s.accent, V, T, at) : (pa.style.display = 'none') }
}

function morph(s) {
  const from = s.cur, t0 = performance.now(), v = parseFloat(getComputedStyle(s.el).getPropertyValue('--ns-morph-time')), dur = isNaN(v) ? 320 : v
  cancelAnimationFrame(s.anim)
  // --ns-morph-time: 0 = cambio instantáneo
  if (!(dur > 0)) return (s.anim = 0, paint(s, geometry(s.src, s.w, s.h), 1))
  const tick = now => {
    const p = Math.min(1, (now - t0) / dur)
    const G = geometry(s.src, s.w, s.h)
    paint(s, p < 1 ? lerp(from, G, 1 - (1 - p) ** 3) : G, p >= 1)
    s.anim = p < 1 ? requestAnimationFrame(tick) : 0
  }
  s.anim = requestAnimationFrame(tick)
}

// Fase de lectura: estilos y bordes CSS. Se separa de la escritura para que N
// elementos cuesten 1 recálculo de estilo/layout, no N (sin layout thrashing).
// Formas concéntricas: el hijo hereda las esquinas del padre que tiene cerca, desplazadas
// hacia dentro la misma distancia que los separa (como la regla de radios concéntricos,
// pero para chaflanes, notches y scoops). Las esquinas lejanas usan la forma interior.
function nested(s, inner) {
  const el = s.el, par = el.parentElement?.closest('[data-ns],[data-ns-nest],ns-frame'), ps = par && S.get(par)
  const out = ['all ' + (inner || 'round 3')]
  if (!ps?.cn) return out[0]
  const a = el.getBoundingClientRect(), b = par.getBoundingClientRect()
  const dl = a.left - b.left, dt = a.top - b.top, dr = b.right - a.right, db = b.bottom - a.bottom
  ps.cn.forEach(([type, sh, sv], i) => {
    const [dx, dy] = [[dl, dt], [dr, dt], [dr, db], [dl, db]][i], g = Math.max(0, Math.min(dx, dy))
    if (!type || type == 'square' || dx >= sh || dy >= sv) return
    let x, y
    if (type == 'bevel') { const k = Math.hypot(1 / sh, 1 / sv); x = sh * (1 + g * k - dy / sv) - dx; y = sv * (1 + g * k - dx / sh) - dy }
    else if (type == 'round' || type == 'squircle') { x = sh - dx; y = sv - dy }
    else if (type == 'notch') { x = sh - dx + g; y = sv - dy + g }
    else { x = sh + g - dx; y = sv + g - dy }
    if (x > .5 && y > .5) out.push(`${CORNERS[i]} ${type} ${f(x)} ${f(y)}`)
  })
  return out.join('; ')
}

function read(s) {
  const el = s.el, cs = getComputedStyle(el), b = cs.getPropertyValue('--ns-border').trim(), sp = attr(el, 'spin') ?? '-'
  const mt = cs.getPropertyValue('--ns-motion-time').trim(), nest = attr(el, 'nest')
  const src = (s.dn && attr(el, 'press')) || (s.hot && attr(el, 'hover')) || (nest != null ? nested(s, nest) : attr(el, 'shape') || cs.getPropertyValue('--ns-shape').trim())
  return {
    // en RTL las esquinas lógicas (ss, se, es, ee) y los bordes start/end se invierten
    src: src && cs.direction == 'rtl' ? 'dir rtl;' + src : src,
    look: { border: b && b != 'none' ? b : FORCED.matches ? 'CanvasText' : '', inner: parseFloat(cs.getPropertyValue('--ns-inner')) || 0, bl: el.clientLeft, bt: el.clientTop },
    accent: attr(el, 'accent') || '', spin: TIME.test(sp) ? sp : sp ? '' : '6s', fo: el.tabIndex >= 0,
    motion: (attr(el, 'motion') || '') + (attr(el, 'trace') != null ? ' comet' : ''), mt: TIME.test(mt) ? mt : '',
    ss: parseFloat(cs.getPropertyValue('--ns-spot-size')) || 140,
    nat: attr(el, 'native') != null, scr: attr(el, 'scroll'),
    // padding base = padding actual menos el margen seguro ya aplicado (sólo si se usa el margen seguro)
    pad: (el.hasAttribute('data-ns-pad') || el.hasAttribute('data-ns-safe') || (el.localName == 'ns-frame' && el.hasAttribute('pad'))) &&
      ['Top', 'Right', 'Bottom', 'Left'].map((k, i) => (parseFloat(cs['padding' + k]) || 0) - (s.sa?.[i] || 0)),
  }
}

// Fase de escritura: sólo repinta si algo cambió.
function write(s, r, animate) {
  if (!s.w || !s.h) return
  const { src, look } = r
  const key = [s.w, s.h, src, look.border, look.inner, look.bl, look.bt, r.accent, r.motion, r.mt, r.spin, r.fo, r.ss, r.pad, r.nat, r.scr].join('|')
  if (key == s.key) return
  const moved = src != s.src
  Object.assign(s, r)
  s.key = key
  const G = geometry(src, s.w, s.h), sa = r.pad ? safe(G, r.pad) : [], sk = sa.join()
  // si cambian las esquinas, los hijos concéntricos se recalculan
  const ck = JSON.stringify(G.cn)
  if (ck != s.ck) { s.ck = ck; s.cn = G.cn; s.el.querySelectorAll('[data-ns-nest]').forEach(k => { const q = S.get(k); q && requestAnimationFrame(() => refresh(q, 1)) }) }
  // --ns-safe-t/r/b/l: padding que respeta los cortes (lo usa [data-ns-pad])
  if (sk != (s.sk ?? '')) {
    s.sk = sk; s.sa = sa
    for (let i = 0; i < 4; i++) sa.length ? s.el.style.setProperty('--ns-safe-' + 'trbl'[i], sa[i] + 'px') : s.el.style.removeProperty('--ns-safe-' + 'trbl'[i])
  }
  if (typeof NS_LITE == 'undefined' && animate && moved && s.cur && !s.ap && !reduced()) morph(s)
  else if (!s.anim && !s.ap?.raf) paint(s, G, 1)
  if (typeof NS_LITE == 'undefined' && s.scr) extras(s)?.scroll(s)
}

const refresh = (s, animate) => s.w && write(s, read(s), animate)

// cede el hilo principal entre lotes (scheduler.yield donde existe) para no bloquear la interacción
const pause = () => globalThis.scheduler?.yield?.() || new Promise(r => setTimeout(r))
async function onResize(es) {
  for (const e of es) {
    const s = S.get(e.target)
    if (!s) continue
    const b = e.borderBoxSize?.[0]
    s.w = b ? b.inlineSize : s.el.offsetWidth
    s.h = b ? b.blockSize : s.el.offsetHeight
  }
  const todo = es.map(e => S.get(e.target)).filter(s => s?.w)
  // por lotes de 150: cada lote lee todo y luego escribe todo (1 recálculo de estilo por lote)
  for (let i = 0; i < todo.length; i += 150) {
    if (i) await pause()
    const part = todo.slice(i, i + 150)
    part.map(read).forEach((r, k) => write(part[k], r))
  }
}

function onView(es) {
  for (const e of es) {
    const s = S.get(e.target), svg = s?.svg
    if (s?.enter == 1 && e.intersectionRatio >= .2) {
      // IntersectionObserver ignora elementos recortados a área cero, así que la espera
      // se hace con opacity:0 y la forma completa; al entrar, se recorta y se despliega.
      s.enter = 2
      need().then(E => {
        s.enter = 0
        if (s.w) paint(s, geometry(s.src, s.w, s.h))
        s.el.style.opacity = s.op
        E.play(s, s.ap?.mode, 1, undefined, s.delay)
      })
    }
    if (!svg) continue
    s.vis = e.isIntersecting
    svg.classList.toggle('ns-off', !e.isIntersecting)
    e.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations()
    if (e.intersectionRatio >= .2 && svg.classList.contains('ns-pre')) svg.classList.replace('ns-pre', 'ns-draw')
  }
}

// Hoja de estilos del runtime: constructable stylesheet (compatible con CSP estricta);
// si el navegador no la soporta, <style> con el nonce de <meta name="csp-nonce">.
export function styles(css) {
  try {
    const sh = new CSSStyleSheet()
    sh.replaceSync(css)
    document.adoptedStyleSheets = [sh, ...document.adoptedStyleSheets]
  } catch {
    const st = document.createElement('style')
    st.nonce = document.querySelector('meta[name=csp-nonce]')?.content || ''
    st.textContent = css
    document.head.prepend(st)
  }
}

/** Activa ns-frame sobre cualquier elemento (normalmente vía data-ns / <ns-frame>). */
export function attach(el) {
  if (!DOM) return el
  if (!styled) {
    styled = 1
    // @layer: el CSS del autor siempre gana a estos estilos base, sin importar el orden
    styles('@layer ns{' + BASE + (typeof NS_LITE == 'undefined' ? STYLE : '') + '}')
    ro = new ResizeObserver(onResize)
    if (typeof NS_LITE == 'undefined') vo = new IntersectionObserver(onView, { threshold: [0, .2] })
  }
  let s = S.get(el)
  if (!s) {
    S.set(el, (s = { el, w: 0, h: 0 }))
    const hot = () => { s.hot = s.ptr || el.matches(':focus-within'); refresh(s, 1) }
    // hover sólo con ratón o lápiz: en táctil el pointerleave casi nunca llega y la forma
    // se quedaba "pegada" en su estado hover (para el dedo está data-ns-press)
    el.addEventListener('pointerenter', e => { if (e.pointerType != 'touch') { s.ptr = 1; hot() } })
    el.addEventListener('pointerleave', () => { if (s.ptr) { s.ptr = 0; hot() } })
    // estado presionado (data-ns-press): mouse, dedo o teclado (Enter / Espacio)
    const down = v => () => { if (!v || attr(el, 'press') != null) { s.dn = v; refresh(s, 1) } }
    el.addEventListener('pointerdown', down(1))
    for (const e of ['pointerup', 'pointercancel', 'pointerleave', 'keyup', 'blur']) el.addEventListener(e, down(0))
    el.addEventListener('keydown', e => (e.key == 'Enter' || e.key == ' ') && !e.repeat && down(1)())
    el.addEventListener('focusin', hot)
    el.addEventListener('focusout', () => requestAnimationFrame(hot))
    if (typeof NS_LITE == 'undefined') {
      const en = attr(el, 'enter')
      if (en != null && !reduced()) {
        const [mode, delay] = en.split(/\s+/)
        s.ap = { mode: mode || 'open', p: 0 }
        s.enter = 1
        s.op = el.style.opacity
        el.style.opacity = '0'
        s.delay = +delay || 0
        vo.observe(el)
      }
    }
  }
  if (s.svg && !s.svg.isConnected) el.append(s.svg) // un framework re-renderizó los hijos
  ro.observe(el, { box: 'border-box' })
  if (s.svg) vo.observe(el)
  refresh(s, 1)
  return el
}

/** Deja de observar. Con `clear`, además quita el recorte y la capa SVG. */
export function detach(el, clear) {
  const s = S.get(el)
  if (!s) return
  ro.unobserve(el)
  vo?.unobserve(el)
  cancelAnimationFrame(s.anim)
  s.anim = 0
  if (clear) { el.style.clipPath = ''; s.svg?.remove(); S.delete(el) }
}

/** Forma efectiva que ns-frame está usando en un elemento (incluye data-ns-nest y --ns-shape). */
export const shapeOf = el => S.get(el)?.src

/** Fuerza una relectura (p. ej. tras cambiar variables CSS por JS). */
export const update = el => { const s = S.get(el); s && refresh(s, 1) }

/**
 * Apertura / cierre respetando la forma: 'open' | 'split' | 'iris' | 'wipe' | 'drop'.
 * Devuelven una promesa que se resuelve al terminar (útil para <dialog>, menús, toasts).
 */
export function open(el, mode, dur) {
  if (typeof NS_LITE != 'undefined') return Promise.resolve()
  const s = S.get(attach(el))
  // se oculta ya (síncrono) para que no se vea el panel completo mientras carga el módulo
  if (!s.ap) { s.ap = { mode: mode || 'open', p: 0 }; s.el.style.clipPath = 'inset(50%)' }
  return need().then(E => E.play(s, mode, 1, dur))
}
export const close = (el, mode, dur) => typeof NS_LITE == 'undefined' ? need().then(E => E.play(S.get(attach(el)), mode, -1, dur)) : Promise.resolve()

if (DOM) {
  const sel = '[data-ns],[data-ns-nest],ns-frame'
  const scan = n => { if (n.nodeType != 1) return; n.matches(sel) && attach(n); n.querySelectorAll(sel).forEach(attach) }
  const gone = n => { if (n.nodeType != 1 || n.isConnected) return; detach(n); n.querySelectorAll(sel).forEach(x => detach(x)) }
  if (!customElements.get('ns-frame')) customElements.define('ns-frame', class extends HTMLElement {
    static observedAttributes = ATTRS
    connectedCallback() { attach(this) }
    disconnectedCallback() { detach(this) }
    attributeChangedCallback() { update(this) }
  })
  const boot = () => {
    // si la página usa animaciones de borde, el módulo extra se pide ya, en paralelo al primer pintado
    if (typeof NS_LITE == 'undefined' && document.querySelector('[data-ns-motion],[data-ns-trace],[data-ns-enter],[data-ns-scroll],[data-ns-accent],ns-frame:is([motion],[trace],[enter],[scroll],[accent])')) extras()
    scan(document.documentElement)
    new MutationObserver(ms => {
      for (const m of ms) {
        const t = m.target
        if (m.type != 'attributes') { m.addedNodes.forEach(scan); m.removedNodes.forEach(gone) }
        else if (m.attributeName == 'class') update(t)
        else if (t.localName != 'ns-frame') t.hasAttribute('data-ns') || t.hasAttribute('data-ns-nest') ? attach(t) : detach(t, 1)
      }
    }).observe(document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', ...ATTRS.map(k => k == 'shape' ? 'data-ns' : 'data-ns-' + k)],
    })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
