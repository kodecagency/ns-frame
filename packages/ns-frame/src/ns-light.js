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

const NS = 'http://www.w3.org/2000/svg'
export const mk = (t, a = {}, ...k) => { const e = document.createElementNS(NS, t); for (const n in a) e.setAttribute(n, a[n]); e.append(...k); return e }
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
 * rim: { rim: true, b, s, ks, n, back (0–1, reflejo opuesto), backColor, edge (0–1, sombra del canto opuesto) }
 */
export function material(M) {
  const key = JSON.stringify(M)
  if (FILTERS.has(key)) return FILTERS.get(key)
  const id = 'nsl' + ++uid, k = 1 / Math.sin(EL * Math.PI / 180)
  const f = mk('filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%', 'color-interpolation-filters': 'sRGB' })
  f.append(mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: M.b, result: 'h0' }))
  f.append(mk('feComponentTransfer', { in: 'h0', result: 'h' }, mk('feFuncA', M.inset ? { type: 'linear', slope: -1, intercept: 1 } : { type: 'identity' })))
  if (M.rim) {
    // canto del vidrio: la luz principal y un reflejo tenue por el lado contrario (la luz que atraviesa
    // el cristal); especular muy dura, así que la cara plana queda limpia
    f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks, specularExponent: M.n, 'lighting-color': '#fff', result: 's1' }, light()))
    f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks * (M.back ?? .45), specularExponent: M.n, 'lighting-color': M.backColor || '#fff', result: 's2' }, light(180)))
    f.append(mk('feComposite', { in: 's1', in2: 's2', operator: 'arithmetic', k2: 1, k3: 1, result: 's' }))
    f.append(mk('feComposite', { in: 's', in2: 'SourceAlpha', operator: 'in' }))
  } else {
    // superficie: difusa llevada a [amb, 1] (la cara plana queda de su color) + especular del canto
    f.append(mk('feDiffuseLighting', { in: 'h', surfaceScale: M.s, diffuseConstant: 1, 'lighting-color': '#fff', result: 'd0' }, light()))
    f.append(mk('feComponentTransfer', { in: 'd0', result: 'd1' }, ...['R', 'G', 'B'].map(c => mk('feFunc' + c, { type: 'linear', slope: k * (1 - M.amb), intercept: M.amb }))))
    // (un desenfoque mínimo quita el grano de cuantizar las alturas a 8 bits)
    f.append(mk('feGaussianBlur', { in: 'd1', stdDeviation: .35, result: 'd' }))
    f.append(mk('feBlend', { in: 'SourceGraphic', in2: 'd', mode: 'multiply', result: 'lit' }))
    f.append(mk('feSpecularLighting', { in: 'h', surfaceScale: M.s, specularConstant: M.ks, specularExponent: M.n, 'lighting-color': '#fff', result: 'sp' }, light()))
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
      f.append(mk('feComponentTransfer', { in: 'SourceAlpha', result: 'iv' }, mk('feFuncA', { type: 'linear', slope: -1, intercept: 1 })))
      f.append(mk('feGaussianBlur', { in: 'iv', stdDeviation: 2, result: 'ib' }))
      f.append(mk('feOffset', { in: 'ib', dx: 0, dy: 1.5, result: 'io' }))
      f.append(mk('feFlood', { 'flood-color': '#000', 'flood-opacity': M.inset, result: 'if' }))
      f.append(mk('feComposite', { in: 'if', in2: 'io', operator: 'in', result: 'i0' }))
      f.append(mk('feComposite', { in: 'i0', in2: 'SourceAlpha', operator: 'in', result: 'is' }))
      merge.push('is')
    }
    f.append(mk('feMerge', {}, ...merge.map(n => mk('feMergeNode', { in: n }))))
  }
  host().append(f)
  FILTERS.set(key, id)
  return id
}

// la luz: el puntero la gira un poco (±18°); en el móvil, el desplazamiento; con movimiento reducido, fija
let MQ = null, lraf = 0, px = .5
const calm = () => (MQ ||= [matchMedia('(prefers-reduced-motion: reduce)'), matchMedia('(hover: hover) and (pointer: fine)')])[0].matches
const aim = () => {
  lraf = 0
  const az = +(258 + (calm() ? 0 : (px - .5) * 36)).toFixed(1)
  if (az == AZ) return
  AZ = az
  for (const l of LIGHTS) l.setAttribute('azimuth', ((az + l._flip) % 360).toFixed(1))
}
const move = v => { px = v; lraf ||= requestAnimationFrame(aim) }
function bind() {
  if (bound || typeof addEventListener == 'undefined') return
  bound = true
  addEventListener('pointermove', e => { if (e.pointerType == 'mouse' || e.pointerType == 'pen') move(e.clientX / innerWidth) }, { passive: true })
  addEventListener('scroll', () => { if (!MQ?.[1].matches) move(Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))) }, { passive: true })
}
