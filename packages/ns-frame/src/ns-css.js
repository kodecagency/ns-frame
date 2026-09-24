/*! ns-frame/css · compila un shape a CSS shape() puro: responsive, cero JS en runtime */
import { geometry, commands } from './ns-frame.js'

const f = n => Math.round(n * 100) / 100
const S = [[1000, 1000], [2000, 1500], [1400, 1800]]

/**
 * Devuelve `shape(...)` con coordenadas calc(% + px), o null si el shape no es
 * lineal respecto al tamaño (tamaños en % en esquinas, consultas @<N…).
 */
export function css(shape) {
  const [a, b, c] = S.map(([w, h]) => commands(geometry(shape, w, h)).C)
  if (a.length != b.length || a.length != c.length) return null
  // coordenada = k·tamaño + o, comprobada con un tercer tamaño
  const lin = (get, ax) => {
    const v = [a, b, c].map(get), s = S.map(z => z[ax])
    const k = (v[1] - v[0]) / (s[1] - s[0]), o = v[0] - k * s[0]
    return Math.abs(o + k * s[2] - v[2]) > .05 ? null : [k * 100, o]
  }
  const co = ([p, o]) => Math.abs(p) < 1e-4 ? f(o) + 'px' : Math.abs(o) < 1e-3 ? f(p) + '%' : `calc(${f(p)}% ${o < 0 ? '-' : '+'} ${f(Math.abs(o))}px)`
  const pt = (get0, get1) => { const X = lin(get0, 0), Y = lin(get1, 1); return X && Y && co(X) + ' ' + co(Y) }
  const out = []
  for (let i = 0; i < a.length; i++) {
    const [p, q, r] = [a[i], b[i], c[i]], P = pt(C => C[i][1][0], C => C[i][1][1])
    if (p[0] != q[0] || p[0] != r[0] || !P) return null
    if (p[0] == 'A') {
      if (Math.abs(p[2] - q[2]) > .05 || Math.abs(p[3] - r[3]) > .05) return null
      out.push(`arc to ${P} of ${f(p[2])}px ${f(p[3])}px ${p[4] ? 'cw' : 'ccw'}`)
    } else if (p[0] == 'C') {
      // cúbico (squircle): los dos puntos de control también en calc(% + px)
      const c1 = pt(C => C[i][2][0], C => C[i][2][1]), c2 = pt(C => C[i][2][2], C => C[i][2][3])
      if (!c1 || !c2) return null
      out.push(`curve to ${P} with ${c1} / ${c2}`)
    } else out.push((p[0] == 'M' ? 'from ' : 'line to ') + P)
  }
  return `shape(${out.join(', ')}, close)`
}
