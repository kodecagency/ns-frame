/*! ns-frame/light · la luz de la página: materiales compilados en filtros SVG de iluminación */
// Una sola luz direccional para toda la página, compartida por el relieve (ns-frame/relief) y el
// canto del vidrio (ns-frame/liquid, ns-frame/glass): todo lo que tiene volumen se ilumina desde el
// mismo sitio, así que las piezas combinan entre sí sin contradecirse.
// · Los materiales son parámetros; cada combinación se compila una vez en un <filter> compartido por
//   todas las piezas que la usan. Los calcula el navegador (feDiffuseLighting, feSpecularLighting) a la
//   resolución real de la pantalla: nítidos a cualquier zoom y en todos los motores.
// · La luz viene de arriba, algo a la izquierda. El puntero la gira un poco; en el móvil, el
//   desplazamiento; con movimiento reducido queda fija. Moverla es cambiar un atributo por filtro.
// · Dos tipos de filtro: "surface" (una superficie opaca: cara de su color, canto, sombras y hundido) y
//   "rim" (sólo la luz del canto, sin cara: para el vidrio).

import { quality, mk, reduced } from './ns-frame.js'

// (mk vive en el núcleo; se re-exporta para no romper a quien lo importaba de aquí, como ns-relief)
export { mk }
const pxv = v => parseFloat(v) || 0
// rectángulo con el border-radius real, esquina por esquina (elíptico si hace falta, con el mismo
// reparto que el navegador cuando los radios no caben). Lo usan el vidrio y el relieve.
/** Radios reales [x, y] de las cuatro esquinas (sup. izq., sup. der., inf. der., inf. izq.), ya repartidos. */
export function corners(el, w, h) {
  const s = getComputedStyle(el), R = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(c => {
    const [a, b = a] = s['border' + c + 'Radius'].split(' ')
    return [a.endsWith('%') ? pxv(a) * w / 100 : pxv(a), b.endsWith('%') ? pxv(b) * h / 100 : pxv(b)]
  })
  const f = Math.min(1, w / (R[0][0] + R[1][0] || 1), w / (R[3][0] + R[2][0] || 1), h / (R[0][1] + R[3][1] || 1), h / (R[1][1] + R[2][1] || 1))
  return R.map(([x, y]) => [x * f, y * f])
}
export function rounded(el, w, h, C = corners(el, w, h)) {
  const [tl, tr, br, bl] = C
  const A = ([x, y], X, Y) => x && y ? `A${x} ${y} 0 0 1 ${X} ${Y}` : `L${X} ${Y}`
  return `M${tl[0]} 0L${w - tr[0]} 0${A(tr, w, tr[1])}L${w} ${h - br[1]}${A(br, w - br[0], h)}L${bl[0]} ${h}${A(bl, 0, h - bl[1])}L0 ${tl[1]}${A(tl, tl[0], 0)}Z`
}
const EL = 52
let defs = null, uid = 0, AZ = 258, bound = false
const FILTERS = new Map(), LIGHTS = []

const light = (flip = 0) => { const l = mk('feDistantLight', { azimuth: (AZ + flip) % 360, elevation: EL }); l._flip = flip; LIGHTS.push(l); return l }
function host() {
  if (!defs) {
    defs = mk('svg', { 'aria-hidden': 'true', focusable: 'false' })
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
    document.body.append(defs)
  }
  bind()
  return defs
}

/**
 * Compila un material en un <filter> y devuelve su id (una vez por combinación).
 * surface: { b, s, ks, n, amb, sh: [[dy, blur, opacidad]], inset }
 * rim: { rim: true, b, s, ks, n, back (0–1, reflejo opuesto), backColor }
 */
export function material(M) {
  const key = JSON.stringify(M)
  if (FILTERS.has(key)) return FILTERS.get(key)
  const id = 'nsl' + ++uid, k = 1 / Math.sin(EL * Math.PI / 180)
  const f = mk('filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%', 'color-interpolation-filters': 'sRGB' })
  f.append(mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: M.b, result: 'h0' }))
  f.append(mk('feComponentTransfer', { in: 'h0', result: 'h' }, {}, mk('feFuncA', M.inset ? { type: 'linear', slope: -1, intercept: 1 } : { type: 'identity' })))
  if (M.rim) {
    // canto del vidrio: la luz principal y un reflejo tenue por el lado contrario (la luz que atraviesa
    // el cristal); especular muy dura, así que la cara plana queda limpia
    f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks, specularExponent: M.n, 'lighting-color': '#fff', result: 's1' }, {}, light()))
    f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks * (M.back ?? .45), specularExponent: M.n, 'lighting-color': M.backColor || '#fff', result: 's2' }, {}, light(180)))
    f.append(mk('feComposite', { in: 's1', in2: 's2', operator: 'arithmetic', k2: 1, k3: 1, result: 's' }))
    f.append(mk('feComposite', { in: 's', in2: 'SourceAlpha', operator: 'in' }))
  } else {
    // superficie: difusa llevada a [amb, 1] (la cara plana queda de su color) + especular del canto
    f.append(mk('feDiffuseLighting', { in: 'h', surfaceScale: M.s, diffuseConstant: 1, 'lighting-color': '#fff', result: 'd0' }, {}, light()))
    f.append(mk('feComponentTransfer', { in: 'd0', result: 'd1' }, {}, ...['R', 'G', 'B'].map(c => mk('feFunc' + c, { type: 'linear', slope: k * (1 - M.amb), intercept: M.amb }))))
    // (un desenfoque mínimo quita el grano de cuantizar las alturas a 8 bits)
    f.append(mk('feGaussianBlur', { in: 'd1', stdDeviation: .35, result: 'd' }))
    f.append(mk('feBlend', { in: 'SourceGraphic', in2: 'd', mode: 'multiply', result: 'lit' }))
    f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks, specularExponent: M.n, 'lighting-color': '#fff', result: 'sp' }, {}, light()))
    f.append(mk('feComposite', { in: 'sp', in2: 'lit', operator: 'arithmetic', k2: 1, k3: 1, result: 'sum' }))
    f.append(mk('feComposite', { in: 'sum', in2: 'SourceAlpha', operator: 'in', result: 'face' }))
    const merge = []
    ;(M.sh || []).forEach(([dy, b, o], i) => {
      f.append(mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: b, result: 'sb' + i }))
      f.append(mk('feOffset', { in: 'sb' + i, dx: 0, dy, result: 'so' + i }))
      f.append(mk('feFlood', { 'flood-color': '#000', 'flood-opacity': o, result: 'sf' + i }))
      f.append(mk('feComposite', { in: 'sf' + i, in2: 'so' + i, operator: 'in', result: 'sh' + i }))
      merge.push('sh' + i)
    })
    merge.push('face')
    if (M.inset) {
      f.append(mk('feComponentTransfer', { in: 'SourceAlpha', result: 'iv' }, {}, mk('feFuncA', { type: 'linear', slope: -1, intercept: 1 })))
      f.append(mk('feGaussianBlur', { in: 'iv', stdDeviation: 2, result: 'ib' }))
      f.append(mk('feOffset', { in: 'ib', dx: 0, dy: 1.5, result: 'io' }))
      f.append(mk('feFlood', { 'flood-color': '#000', 'flood-opacity': M.inset, result: 'if' }))
      f.append(mk('feComposite', { in: 'if', in2: 'io', operator: 'in', result: 'i0' }))
      f.append(mk('feComposite', { in: 'i0', in2: 'SourceAlpha', operator: 'in', result: 'is' }))
      merge.push('is')
    }
    f.append(mk('feMerge', {}, {}, ...merge.map(n => mk('feMergeNode', { in: n }))))
  }
  host().append(f)
  FILTERS.set(key, id)
  return id
}

// la luz: el puntero la gira un poco (±18°); en el móvil, el desplazamiento; con movimiento reducido, fija
let MQ = null, lraf = 0, px = .5
const aim = () => {
  lraf = 0
  // (en pasos de 2°: cada cambio repinta todos los filtros de luz a la vista; con 0,1° cambiaba en
  // casi cada fotograma del desplazamiento. En calidad baja, fija)
  const az = 258 + (reduced() || quality() == 'low' ? 0 : Math.round((px - .5) * 18) * 2)
  if (az == AZ) return
  AZ = az
  for (const l of LIGHTS) l.setAttribute('azimuth', ((az + l._flip) % 360).toFixed(1))
}
const move = v => { px = v; lraf ||= requestAnimationFrame(aim) }
function bind() {
  if (bound || typeof addEventListener == 'undefined') return
  bound = true
  addEventListener('pointermove', e => { if (e.pointerType == 'mouse' || e.pointerType == 'pen') move(e.clientX / innerWidth) }, { passive: true })
  addEventListener('scroll', () => { if (!(MQ ||= matchMedia('(hover: hover) and (pointer: fine)')).matches) move(Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))) }, { passive: true })
}
