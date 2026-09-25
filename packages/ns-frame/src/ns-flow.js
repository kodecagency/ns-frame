/*! ns-frame/flow · el texto llena la forma: recorre su interior con margen constante (shape-inside que CSS no tiene) */
// <article data-ns="all bevel 60; top cut center 40% 14" data-ns-flow style="height: 320px">
//   <h3>…</h3><p>…</p>                          ← las líneas se ajustan a los chaflanes y al corte
// </article>
//
// CSS especificó shape-inside hace más de una década y ningún navegador lo ha implementado: el
// texto siempre se reparte en un rectángulo aunque la caja tenga otra forma. Aquí el contorno real
// de la forma (curvas, cortes, muescas, polígonos) se mide y se describe con pares de flotantes
// invisibles con shape-outside, que sí es nativo: el navegador acomoda cada línea entre ellos.
// · Margen: el valor del atributo (px), si no --ns-pad, si no el padding que tuviera el elemento.
//   Se respeta en todo el borde, también en las curvas (erosión con un disco, no con un cuadrado).
// · Necesita un alto definido (height, aspect-ratio, una celda de grid…): la forma depende del alto
//   y el texto del contorno. Con alto automático se ajusta unas pocas veces y se detiene.
// · Se recalcula al cambiar el tamaño, la forma (data-ns) o las fuentes; nada si no cambió.
// · El orden y la selección del texto no cambian (los flotantes son <i aria-hidden> vacíos).
// Sin dependencias (salvo el núcleo) y CSP-safe: estilos adoptados en @layer ns.

import { styles, path, shapeOf } from './ns-frame.js'

const CSS = `@layer ns{
.ns-flow{display:flow-root}
[data-ns-flow].ns-flow{padding:0}
.ns-flow>.ns-fl,.ns-flow>.ns-fr{display:block;pointer-events:none;margin:0}
.ns-flow>.ns-fl{float:left;clear:left}.ns-flow>.ns-fr{float:right;clear:right}
}`
let styled = 0
const fx = n => Math.round(n * 100) / 100 || 0

// ── Texto que fluye por la figura. CSS no tiene shape-inside, pero sí shape-outside: dos flotantes
// invisibles, a izquierda y derecha, dibujan lo que NO es pieza, y el texto se acomoda línea a
// línea dentro del contorno real (curvas, mordidas del orbe y huecos incluidos), con --ns-pad de
// margen en todo el borde. El contorno se mide con Path2D (sin DOM): filas cada 2 px.
let c2d
export function profile(d, w, h, pad) {
  c2d ||= document.createElement('canvas').getContext('2d')
  const P = new Path2D(d), S = 2, n = Math.ceil(h / S) + 1, raw = [], inn = (x, y) => c2d.isPointInPath(P, x, y)
  // borde exacto entre a (fuera) y b (dentro), por bisección
  const edge = (a, b, y) => { while (Math.abs(b - a) > .25) { const m = (a + b) / 2; inn(m, y) ? b = m : a = m } return b }
  for (let i = 0; i < n; i++) {
    const y = Math.min(h - .25, i * S + .25)
    let l = null, r = null
    for (let x = .25; x < w; x += 6) if (inn(x, y)) { l = x == .25 ? 0 : edge(x - 6, x, y); break }
    if (l != null) for (let x = w - .25; x > l; x -= 6) if (inn(x, y)) { r = x == w - .25 ? w : edge(x + 6, x, y); break }
    raw.push(l == null ? null : [l, r ?? l])
  }
  // erosión con un disco de radio pad: cada punto del texto queda a ≥ pad del contorno, también en
  // las curvas (un cuadrado sangraría de más en las esquinas redondeadas)
  const k = Math.ceil(pad / S)
  return raw.map((_, i) => {
    let L = -1e9, R = 1e9
    for (let j = i - k; j <= i + k; j++) {
      const q = raw[j], dy = Math.abs(j - i) * S
      if (dy >= pad) continue
      if (!q) return null
      const c = Math.sqrt(pad * pad - dy * dy)
      L = Math.max(L, q[0] + c); R = Math.min(R, q[1] - c)
    }
    return L < R - 1 ? [L, R] : null
  })
}
// Cada franja lleva un par de flotantes (izquierdo hasta s, derecho desde s + 1) que se apilan con
// clear; una franja crece mientras todas sus filas quepan a los dos lados de un mismo s. Así una
// escalera o una T se describen con dos o tres franjas.
export function flow({ k, d, w, h }, pad) {
  if (w < 4 * pad || h < 2 * pad) return false
  // misma silueta, mismo tamaño y mismo margen: los flotantes ya están bien (no se vuelve a medir)
  const key = d + '|' + w + '|' + h + '|' + pad
  if (k._nsFK == key && k._nsF && k.classList.contains('ns-flow')) return true
  k._nsFK = key
  if (!styled) { styled = 1; styles(CSS) }
  const rows = profile(d, w, h, pad), S = 2
  if (!rows.some(Boolean)) return false
  const bands = []
  let b = null
  rows.forEach((q, i) => {
    if (b && (!q || (Math.max(b.s, q[0]) <= Math.min(b.m, q[1]) - 1))) { if (q) { b.s = Math.max(b.s, q[0]); b.m = Math.min(b.m, q[1]) } b.i1 = i; return }
    bands.push(b = { i0: i, i1: i, s: q ? q[0] : -1e9, m: q ? q[1] : 1e9 })
  })
  // franjas sin ninguna fila útil (margen superior o inferior): se cierran por la mitad
  for (const x of bands) if (x.s < -1e8) x.s = w / 2
  const F = k._nsF ||= []
  const mk2 = c => { const e = document.createElement('i'); e.className = 'ns-f' + c; e.setAttribute('aria-hidden', 'true'); return e }
  while (F.length < bands.length * 2) F.push(mk2(F.length % 2 ? 'r' : 'l'))
  F.splice(bands.length * 2).forEach(e => e.remove())
  if (F.some((e, i) => k.children[i] != e)) k.prepend(...F)
  bands.forEach(({ i0, i1, s }, n) => {
    const y0 = i0 * S, y1 = n == bands.length - 1 ? h : (i1 + 1) * S, bh = y1 - y0, wr = Math.max(0, w - s - 1)
    const lp = [], rp = []
    for (let i = i0; i <= i1; i++) {
      // en cada tramo de 2 px se toma lo más estrecho de sus dos filas (nunca invade el margen)
      const a = rows[i], c = rows[Math.min(i + 1, i1)], t0 = i * S - y0, t1 = Math.min(bh, t0 + S)
      const l = Math.min(s, Math.max(a ? a[0] : s, c ? c[0] : s)), r = Math.max(s + 1, Math.min(a ? a[1] : s + 1, c ? c[1] : s + 1))
      lp.push(`${fx(l)}px ${fx(t0)}px`, `${fx(l)}px ${fx(t1)}px`)
      rp.push(`${fx(r - s - 1)}px ${fx(t0)}px`, `${fx(r - s - 1)}px ${fx(t1)}px`)
    }
    const put = (e, width, pts, edge) => {
      e.style.width = fx(width) + 'px'; e.style.height = fx(bh) + 'px'
      e.style.setProperty('shape-outside', `polygon(${fx(edge)}px 0px, ${pts.join(', ')}, ${fx(edge)}px ${fx(bh)}px)`)
    }
    put(F[2 * n], s, lp, 0)
    put(F[2 * n + 1], wr, rp, wr)
  })
  k.classList.add('ns-flow')
  k._nsIn = null
  return true
}
export function unflow(k) {
  if (!k._nsF) return
  k._nsF.forEach(e => e.remove())
  k._nsF = null
  k._nsFK = ''
  k.classList.remove('ns-flow')
}

// ── automático: [data-ns-flow] en cualquier marco ──
const E = new Map()
let ro, raf = 0
function run() {
  raf = 0
  const jobs = []
  for (const [k, st] of E) {
    if (!k.isConnected) { E.delete(k); continue }
    const src = shapeOf(k) ?? k.getAttribute('data-ns')
    const w = k.offsetWidth, h = k.offsetHeight
    if (!src || !w || !h) continue
    // alto automático: si el propio flujo cambió el alto, se reintenta como mucho 3 veces seguidas
    if (st.w == w && st.h != h && ++st.n > 3) continue
    if (st.w != w) st.n = 0
    const cs = getComputedStyle(k), v = parseFloat(k.getAttribute('data-ns-flow'))
    // el padding original se guarda antes de que .ns-flow lo ponga a 0
    st.p ??= parseFloat(cs.paddingTop) || 0
    const pad = v >= 0 ? v : parseFloat(cs.getPropertyValue('--ns-pad')) || st.p || 20
    st.w = w; st.h = h
    jobs.push({ k, d: path(src, w, h), w, h, pad })
  }
  for (const j of jobs) flow(j, j.pad) || unflow(j.k)
}
const schedule = () => { raf ||= requestAnimationFrame(run) }
/** Vuelve a medir todos los elementos con data-ns-flow. */
export const refresh = schedule

if (typeof document != 'undefined') {
  const add = k => { if (E.has(k) || k.getAttribute('data-ns-flow') == 'off' || k.closest('.ns-mosaic')) return; E.set(k, {}); (ro ||= new ResizeObserver(schedule)).observe(k); schedule() }
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-flow]') && add(n); n.querySelectorAll('[data-ns-flow]').forEach(add) }
  const boot = () => {
    scan(document.body)
    document.fonts?.ready.then(() => { for (const st of E.values()) st.w = 0; schedule() })
    new MutationObserver(ms => {
      for (const m of ms) {
        m.addedNodes.forEach(scan)
        if (m.type != 'attributes') continue
        const k = m.target
        if (m.attributeName == 'data-ns-flow') {
          if (k.getAttribute('data-ns-flow') == 'off' || !k.hasAttribute('data-ns-flow')) { E.delete(k); ro?.unobserve(k); unflow(k) } else add(k)
        } else if (E.has(k)) { E.get(k).w = 0; schedule() }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ns', 'data-ns-flow'] })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
