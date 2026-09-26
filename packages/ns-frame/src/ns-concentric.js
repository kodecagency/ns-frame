/*! ns-frame/concentric · esquinas concéntricas automáticas: el hijo repite la forma del padre, desplazada el hueco */
// <article data-ns="tl+br bevel 36; tr+bl round 24">
//   <img data-ns-concentric src="…">          ← chaflanes de 36 − 0,59·hueco y redondeos de 24 − hueco
// </article>
//
// Regla del diseño de Apple (ConcentricRectangle en SwiftUI): lo que va dentro de una forma
// redondeada debe tener el radio exterior menos la distancia al borde, o las curvas "no casan".
// En CSS no existe (hay una propuesta abierta en el CSSWG para border-radius); aquí funciona con
// cualquier forma de ns-frame, no sólo con redondeos:
// · Redondeo y squircle: radio − hueco (en cada eje, con el hueco de ese lado).
// · Chaflán: la diagonal se desplaza el hueco en perpendicular (el tamaño baja ≈ 0,59 × hueco).
// · Muesca: el escalón se desplaza entero (conserva su tamaño). Scoop: el arco crece con el hueco.
// · Cortes y scoops de los bordes: misma profundidad, boca más ancha (o pestaña más estrecha).
// · Fillets (`rN`, `radius`): convexos − hueco; `poly`: el polígono se desplaza hacia dentro.
// · Si el padre no es un marco de ns-frame, se usa su border-radius de CSS.
// El padre es el marco más cercano, o el que indique el atributo (un selector: data-ns-concentric=".card").
// El hueco se mide en cada cambio de tamaño del padre o del hijo, y cada esquina usa el suyo.
// --ns-concentric-min: radio de las esquinas que quedan lejos de las del padre (0 = en ángulo recto).
// Sin dependencias (salvo el núcleo) y CSP-safe: sólo escribe el atributo data-ns del hijo.

import { shapeOf, spec } from './ns-frame.js'

const CORNERS = ['tl', 'tr', 'br', 'bl'], EDGES = ['top', 'right', 'bottom', 'left']
const r1 = n => Math.round(n * 2) / 2
function num(v, L = 0, pos) {
  v = String(v ?? '')
  const m = /^(-?[\d.]+)%([+-][\d.]+)?$/.exec(v)
  let n = m ? m[1] * L / 100 + (+m[2] || 0) : parseFloat(v)
  if (isNaN(n)) return 0
  if (pos && v[0] == '-') n += L
  return n
}

/**
 * Forma concéntrica: `shape` es la del padre (w×h) y `ins` el hueco [arriba, derecha, abajo, izquierda]
 * hasta el hijo; `min`: radio de las esquinas que quedarían más pequeñas (las que están lejos de las
 * del padre, p. ej. las de arriba de un botón al pie de una tarjeta). Devuelve la forma del hijo (en px).
 */
export function concentric(shape, w, h, ins, min = 0) {
  const [t, r, b, l] = ins, s = spec(shape, w), out = []
  const dmin = Math.max(0, Math.min(...ins)), R = s.r || 0
  // fillet propio de una esquina o rasgo (el `radius` general va aparte, al final)
  const fil = (v, d) => { if (v == null) return ''; const x = r1(Math.max(0, v - d)); return ' r' + x }
  if (s.poly) return poly(s.poly, w, h, ins, R)
  // pestañas: el cuerpo del padre empieza tras ellas (igual que en geometry)
  const tab = {}
  for (const e of EDGES) tab[e] = Math.max(0, ...s.e[e].filter(f => f.type == 'tab').map(f => num(f.a[2])))
  const iw = Math.max(0, w - tab.left - tab.right), ih = Math.max(0, h - tab.top - tab.bottom), m = Math.min(iw, ih)
  const pad = { tl: [l, t], tr: [r, t], br: [r, b], bl: [l, b] }
  const free = k => min >= .5 && out.push(`${k} round ${r1(min)}`)
  for (const k of CORNERS) {
    const c = s.c[k]
    if (!c || !c.type || c.type == 'square') { free(k); continue }
    const a = c.a || [], sh = Math.min(num(a[0], m), iw / 2), sv = Math.min(num(a[1] ?? a[0], m), ih / 2)
    // el hueco visible en la esquina es el menor de sus dos lados: con huecos distintos (una foto
    // arriba de la tarjeta: 6 px al lado, 70 px abajo) la esquina lejana no debe heredar el corte
    const [dx, dy] = pad[k], d = Math.min(dx, dy)
    let H = 0, V = 0
    switch (c.type) {
      case 'round': case 'squircle': H = sh - dx; V = sv - dy; break
      case 'bevel': {
        // la diagonal x/sh + y/sv = 1 desplazada d hacia dentro, vista desde la esquina del hijo
        const q = sh && sv ? 1 + d * Math.hypot(1 / sh, 1 / sv) - dx / sh - dy / sv : 0
        H = sh * q; V = sv * q; break
      }
      case 'notch': H = sh + d - dx; V = sv + d - dy; break
      case 'scoop': H = Math.sqrt(Math.max(0, (sh + d) ** 2 - dy * dy)) - dx; V = Math.sqrt(Math.max(0, (sv + d) ** 2 - dx * dx)) - dy; break
      default: free(k); continue
    }
    if (H < Math.max(.5, min) || V < Math.max(.5, min)) { free(k); continue }
    out.push(`${k} ${c.type} ${r1(H)} ${r1(V)}${fil(c.r, d)}`)
  }
  // rasgos de los bordes: [posición a lo largo (desde el inicio natural), hueco de ese borde]
  const along = { top: l, bottom: l, left: t, right: t }, gap = { top: t, right: r, bottom: b, left: l }
  for (const e of EDGES) {
    const L = e == 'top' || e == 'bottom' ? w : h, L2 = L - (e == 'top' || e == 'bottom' ? l + r : t + b), d = gap[e]
    for (const f of s.e[e]) {
      const [p, q, dd, ss] = f.a
      let A, B
      if (p == 'center') { const W = num(q, L); A = (L - W) / 2; B = A + W } else { A = num(p, L, 1); B = num(q, L, 1) }
      if (A > B) [A, B] = [B, A]
      const D = num(dd), S = Math.min(ss == null ? D : num(ss), (B - A) / 2)
      let a = A, z = B
      if (f.type == 'scoop') {
        // media elipse que crece d: donde corta al borde del hijo
        const c = (A + B) / 2, ra = (B - A) / 2, hw = (ra + d) * Math.sqrt(Math.max(0, 1 - (d / (D + d)) ** 2))
        a = c - hw; z = c + hw
      } else {
        // los lados inclinados se desplazan d en perpendicular: la boca se ensancha (corte) o se
        // estrecha (pestaña) lo mismo en cada extremo; la profundidad y la pendiente se conservan
        const k = D ? d * (Math.hypot(S, D) - S) / D : 0
        if (f.type == 'tab') { if (d >= D + 1) continue; a += k; z -= k } else { a -= k; z += k }
      }
      a = Math.max(0, a - along[e]); z = Math.min(L2, z - along[e])
      if (z - a < 1) continue
      out.push(`${e} ${f.type} ${r1(a)} ${r1(z)} ${r1(D)}${f.type == 'scoop' ? '' : ' ' + r1(S)}${fil(f.r, d)}`)
    }
  }
  const rr = r1(Math.max(0, R - dmin))
  if (rr) out.push('radius ' + rr)
  return out.join('; ')
}

// poly: cada lado se desplaza hacia dentro el hueco (el promedio, si no es uniforme); los fillets
// convexos pierden el hueco y los cóncavos lo ganan
function poly(P, w, h, [t, r, b, l], R) {
  const d = (t + r + b + l) / 4
  const pts = P.map(([x, y, ...o]) => {
    let rv = R, a = 0
    for (const z of o) z[0] == 'r' ? (rv = +z.slice(1) || 0) : z[0] == 'a' && (a = +z.slice(1) || 0)
    return { x: num(x, w, 1), y: num(y, h, 1), rv, a }
  })
  const n = pts.length
  if (n < 3) return ''
  let area = 0
  pts.forEach((p, i) => { const q = pts[(i + 1) % n]; area += p.x * q.y - q.x * p.y })
  const o = area > 0 ? 1 : -1 // horario en pantalla (y hacia abajo) si el área es positiva
  const out = pts.map((p, i) => {
    const A = pts[(i + n - 1) % n], B = pts[(i + 1) % n]
    const n1 = norm(A, p, o), n2 = norm(p, B, o)
    // intersección de los dos lados desplazados (inglete); con lados casi paralelos, la normal media
    const u = [p.x - A.x, p.y - A.y], v = [B.x - p.x, B.y - p.y], cr = u[0] * v[1] - u[1] * v[0]
    let x, y
    if (Math.abs(cr) < 1e-6) { x = p.x + n1[0] * d; y = p.y + n1[1] * d }
    else {
      const a1 = [A.x + n1[0] * d, A.y + n1[1] * d], b1 = [p.x + n2[0] * d, p.y + n2[1] * d]
      const tt = ((b1[0] - a1[0]) * v[1] - (b1[1] - a1[1]) * v[0]) / cr
      x = a1[0] + u[0] * tt; y = a1[1] + u[1] * tt
    }
    const convex = cr * o > 0
    let tok = `${r1(Math.max(0, x - l))} ${r1(Math.max(0, y - t))}`
    const rv = r1(Math.max(0, convex ? p.rv - d : p.rv + d))
    if (rv) tok += ' r' + rv
    // arco hacia este vértice: convexo si gira como el polígono (pierde el hueco), cóncavo si no (lo gana)
    if (p.a) { const bul = Math.sign(p.a) == o, ra = r1(Math.max(1, Math.abs(p.a) + (bul ? -d : d))); tok += ' a' + (p.a > 0 ? ra : -ra) }
    return tok
  })
  return 'poly ' + out.join(', ')
}
const norm = (A, B, o) => { const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1; return [-dy / L * o, dx / L * o] }

// ── automático: [data-ns-concentric] ──
// el padre sin forma de ns-frame: sus radios de CSS como forma "round"
function cssShape(el, w) {
  const cs = getComputedStyle(el), out = []
  for (const [k, p] of [['tl', 'TopLeft'], ['tr', 'TopRight'], ['br', 'BottomRight'], ['bl', 'BottomLeft']]) {
    const [x, y = x] = cs[`border${p}Radius`].split(' '), X = num(x, w), Y = num(y, w)
    if (X > 0 && Y > 0) out.push(`${k} round ${r1(X)} ${r1(Y)}`)
  }
  return out.join('; ')
}
const E = new Map(), HOSTS = new Set()
let ro, raf = 0
const host = el => { const sel = el.getAttribute('data-ns-concentric'); return (sel ? el.parentElement?.closest(sel) : el.parentElement?.closest('[data-ns],[data-ns-nest],ns-frame')) || el.parentElement }
function run() {
  raf = 0
  // primero todas las lecturas, luego todas las escrituras (un solo recálculo de estilos)
  const jobs = []
  for (const [el] of E) {
    if (!el.isConnected) { drop(el); continue }
    const p = host(el)
    if (!p) continue
    const P = p.getBoundingClientRect(), C = el.getBoundingClientRect()
    if (!P.width || !C.width) continue
    // medidas sin transformaciones: un padre que se escala (hover, apertura) no cambia la forma;
    // offsetWidth no existe en SVG, allí vale la medida en pantalla
    const k = p.offsetWidth ? P.width / p.offsetWidth : 1, w = P.width / k, h = P.height / k
    const src = shapeOf(p) ?? p.getAttribute('data-ns') ?? cssShape(p, w)
    // el hueco hasta el borde exterior del padre (su propio borde CSS cuenta como hueco)
    const min = parseFloat(getComputedStyle(el).getPropertyValue('--ns-concentric-min')) || 0
    const ins = [C.top - P.top, P.right - C.right, P.bottom - C.bottom, C.left - P.left].map(v => v / k)
    jobs.push([el, p, src ? concentric(src, w, h, ins, min) : ''])
  }
  for (const [el, p, v] of jobs) {
    if (E.get(el) != p) { E.set(el, p); HOSTS.add(p); ro.observe(p) }
    if (el.getAttribute('data-ns') != v) v ? el.setAttribute('data-ns', v) : el.removeAttribute('data-ns')
  }
}
// deja de seguir un hijo (desconectado o sin el atributo); el padre sigue observado si otro lo usa
function drop(el) {
  const p = E.get(el)
  E.delete(el); ro?.unobserve(el)
  if (p && ![...E.values()].includes(p)) { HOSTS.delete(p); ro.unobserve(p) }
}
const schedule = () => { raf ||= requestAnimationFrame(run) }
/** Recalcula todas las formas concéntricas (p. ej. tras cambiar la forma del padre por JS). */
export const refresh = schedule

if (typeof document != 'undefined') {
  const add = el => { if (!E.has(el)) { E.set(el, null); (ro ||= new ResizeObserver(schedule)).observe(el); schedule() } }
  const scan = n => { if (n.nodeType != 1) return; n.matches('[data-ns-concentric]') && add(n); n.querySelectorAll('[data-ns-concentric]').forEach(add) }
  const boot = () => {
    scan(document.body)
    // hijos nuevos, y padres que cambian de forma (su data-ns) o de radio (su clase)
    new MutationObserver(ms => {
      for (const m of ms) {
        m.addedNodes.forEach(scan)
        if (m.type != 'attributes') continue
        const t = m.target
        if (m.attributeName == 'data-ns-concentric') t.hasAttribute('data-ns-concentric') ? add(t) : drop(t)
        // el padre cambia de forma o de radio; el hijo cambia de clase (--ns-concentric-min)
        else if (HOSTS.has(t) || (m.attributeName == 'class' && E.has(t))) schedule()
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ns', 'data-ns-concentric', 'class'] })
    addEventListener('resize', schedule, { passive: true })
  }
  document.readyState == 'loading' ? addEventListener('DOMContentLoaded', boot) : boot()
}
