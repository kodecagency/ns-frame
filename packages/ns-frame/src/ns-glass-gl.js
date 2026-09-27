/*! ns-frame/glass-gl · motor WebGL de un grupo de vidrio sobre un fondo conocido */
// Lo carga ns-frame/glass cuando un grupo (data-ns-glass-group) tiene detrás una imagen, un vídeo o
// un fondo CSS con url(): el vidrio de todas sus piezas se dibuja en UN lienzo y en UNA pasada, como
// el GlassEffectContainer de Apple. Coste independiente del número de piezas.
// · Formas: la unión de siluetas del grupo → campo de distancias con signo (en CPU, sólo cuando
//   cambian las formas) → textura de un canal.
// · Por píxel: normal del borde (del campo), lente (el fondo se desvía cerca del borde, hacia fuera,
//   como un cristal grueso), desenfoque (mipmaps del fondo con varias muestras), saturación, canto
//   iluminado según la luz y dispersión cromática opcional.
// · Estático: sólo se repinta si cambian las formas o el fondo (un vídeo, cada fotograma mientras
//   se reproduce). El desplazamiento de la página no cuesta nada: el lienzo va dentro del grupo.
// · Variables del grupo: --ns-glass-lens (fuerza de la lente, 22px), --ns-glass-depth (ancho del
//   canto que refracta, 18px), --ns-glass-group-blur (10px), --ns-glass-sat (1.3),
//   --ns-glass-dispersion (0–1, 0), --ns-glass-rim (brillo del canto, 1).
// Sin WebGL2, sin CORS en la imagen o si se pierde el contexto: el grupo sigue con su capa de
// desenfoque nativa (ns-frame/glass).
import { pathField } from './ns-liquid.js'

const VS = `#version 300 es
in vec2 a; out vec2 p; uniform vec2 size;
void main(){ p = (a * .5 + .5) * size; p.y = size.y - p.y; gl_Position = vec4(a, 0., 1.); }`
const FS = `#version 300 es
precision highp float;
in vec2 p; out vec4 o;
uniform sampler2D bg, sdf;
uniform vec2 size, bgPos, bgSize, sdfK, sdfO, light;
uniform float R, depth, lens, lod, sat, disp, rim;
// (el nodo i de la rejilla está en x = i·step: centro del texel i)
float sd(vec2 q){ return (texture(sdf, q * sdfK + sdfO).r - .5) * 2. * R; }
vec3 tap(vec2 q){
  vec2 u = (q - bgPos) / bgSize, t = exp2(lod) / bgSize * .6;
  // cinco muestras alrededor, al nivel de desenfoque pedido: suaviza los escalones de los mipmaps
  return (textureLod(bg, u, lod).rgb * 2. + textureLod(bg, u + vec2(t.x, 0.), lod).rgb + textureLod(bg, u - vec2(t.x, 0.), lod).rgb
    + textureLod(bg, u + vec2(0., t.y), lod).rgb + textureLod(bg, u - vec2(0., t.y), lod).rgb) / 6.;
}
void main(){
  float d = sd(p);
  float a = clamp(.5 - d, 0., 1.);
  if (a <= 0.) discard;
  vec2 e = vec2(1.5, 0.);
  vec2 g = vec2(sd(p + e.xy) - sd(p - e.xy), sd(p + e.yx) - sd(p - e.yx));
  vec2 n = g / max(length(g), 1e-4);
  // perfil del canto: 1 en el borde, 0 a "depth" hacia dentro (curva suave, como un bisel redondo)
  float k = clamp(1. + d / depth, 0., 1.), b = k * k;
  vec2 off = n * lens * b;
  vec3 c = disp > 0. ? vec3(tap(p + off * (1. + disp)).r, tap(p + off).g, tap(p + off * (1. - disp)).b) : tap(p + off);
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, sat);
  // canto: una línea de luz donde el borde mira a la luz, y un reflejo tenue enfrente
  float edge = pow(clamp(1. + d / 2.5, 0., 1.), 2.), facing = dot(n, light);
  c += vec3(1.) * rim * edge * (max(facing, 0.) * .55 + max(-facing, 0.) * .18);
  c += vec3(1.) * rim * .06 * b;
  o = vec4(c * a, a);
}`

const E = new WeakMap()
/**
 * Motor del grupo `host` sobre la fuente `src` (un <img>, <video>, <canvas> o { url } de un fondo
 * CSS). Devuelve { draw(d), destroy() } o null si no se puede (sin WebGL2). onFail: si deja de
 * poder (sin CORS, contexto perdido); onReady: al primer dibujo con el fondo cargado.
 */
export function glEngine(host, src, onFail, onReady) {
  if (E.has(host)) return E.get(host)
  const cv = document.createElement('canvas')
  cv.className = 'ns-glass-gl'
  cv.setAttribute('aria-hidden', 'true')
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x }
  const pr = gl.createProgram()
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null
  gl.useProgram(pr)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aLoc = gl.getAttribLocation(pr, 'a')
  gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
  const U = n => gl.getUniformLocation(pr, n)
  const tBg = gl.createTexture(), tSd = gl.createTexture()
  gl.uniform1i(U('bg'), 0); gl.uniform1i(U('sdf'), 1)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  host.prepend(cv)

  let img = null, iw = 0, ih = 0, lastD = '', field = null, fieldKey = '', raf = 0, dead = false, vid = 0
  const fail = () => { if (dead) return; api.destroy(); onFail?.() }
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fail() })

  // el fondo: una copia con CORS (una textura legible); sin CORS, el motor no sirve
  const upload = () => {
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tBg)
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img) } catch { return fail() }
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }
  const load = () => {
    const url = src.url || (src.tagName == 'IMG' ? src.currentSrc || src.src : null)
    // (un vídeo sin fotograma aún —readyState < 2— no se sube: esperará a loadeddata)
    if (src.tagName == 'VIDEO' || src.tagName == 'CANVAS') { img = src; iw = src.videoWidth ?? src.width; ih = src.videoHeight ?? src.height; if (iw && ih && !(src.readyState < 2)) { upload(); schedule() } else iw = ih = 0; return }
    if (!url) return fail()
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => { img = im; iw = im.naturalWidth; ih = im.naturalHeight; upload(); schedule() }
    im.onerror = fail
    im.src = url
  }
  // vídeo: la textura sigue a cada fotograma mientras se reproduce
  const tick = () => { vid = 0; if (dead || src.tagName != 'VIDEO') return; if (!src.paused && src.readyState >= 2) { iw = src.videoWidth; ih = src.videoHeight; upload(); draw(lastD, true) } vid = requestAnimationFrame(tick) }
  if (src.tagName == 'VIDEO') { src.addEventListener('loadeddata', load); vid = requestAnimationFrame(tick) }

  // dónde se pinta el fondo, en px del grupo (origen: su caja de relleno)
  const bgRect = (W, H) => {
    if (src.url) {
      const s = getComputedStyle(host), [sx, sy = sx] = s.backgroundSize.split(' '), [px_, py_ = px_] = s.backgroundPosition.split(' ')
      let w = iw, h = ih
      if (sx == 'cover' || sx == 'contain') { const k = (sx == 'cover' ? Math.max : Math.min)(W / iw, H / ih); w = iw * k; h = ih * k }
      else if (sx != 'auto') { w = sx.endsWith('%') ? parseFloat(sx) / 100 * W : parseFloat(sx) || iw; h = sy == 'auto' ? w * ih / iw : sy.endsWith('%') ? parseFloat(sy) / 100 * H : parseFloat(sy) || ih }
      const at = (v, free) => v?.endsWith('%') ? parseFloat(v) / 100 * free : v == 'center' ? free / 2 : v == 'right' || v == 'bottom' ? free : parseFloat(v) || 0
      return [at(px_, W - w), at(py_, H - h), w, h]
    }
    const Hr = host.getBoundingClientRect(), r = src.getBoundingClientRect(), s = getComputedStyle(src), fit = s.objectFit
    let w = r.width, h = r.height
    if (fit == 'cover' || fit == 'contain') { const k = (fit == 'cover' ? Math.max : Math.min)(r.width / iw, r.height / ih); w = iw * k; h = ih * k }
    return [r.left - Hr.left - host.clientLeft + (r.width - w) / 2, r.top - Hr.top - host.clientTop + (r.height - h) / 2, w, h]
  }

  const num = (s, k, d) => { const v = parseFloat(s.getPropertyValue(k)); return isNaN(v) ? d : v }
  function draw(d = lastD) {
    // (sin fotogramas —un vídeo aún sin datos— no hay nada que dibujar)
    if (dead || !img || !iw || !ih || !d) return
    const W = host.clientWidth, H = host.clientHeight, q = Math.min(2, devicePixelRatio || 1)
    if (!W || !H) return
    const s = getComputedStyle(host)
    const lens = num(s, '--ns-glass-lens', 22), depth = num(s, '--ns-glass-depth', 18), R = Math.max(depth, lens) + 6
    // el campo sólo si cambió la forma, el tamaño o el alcance del canto
    const fk = d + '|' + W + '|' + H + '|' + R
    if (fk != fieldKey || !field) {
      fieldKey = fk
      const step = Math.min(3, Math.max(1, Math.sqrt(W * H / 120000)))
      const f = pathField(d, W, H, step)
      if (!f) return
      const B = new Uint8Array(f.nx * f.ny)
      for (let i = 0; i < B.length; i++) B[i] = Math.max(0, Math.min(255, Math.round((f.F[i] / R * .5 + .5) * 255)))
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tSd)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, f.nx, f.ny, 0, gl.RED, gl.UNSIGNED_BYTE, B)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      field = f
    }
    lastD = d
    const pw = Math.round(W * q), ph = Math.round(H * q)
    if (cv.width != pw || cv.height != ph) { cv.width = pw; cv.height = ph }
    Object.assign(cv.style, { width: W + 'px', height: H + 'px' })
    gl.viewport(0, 0, pw, ph)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    const [bx, by, bw, bh] = bgRect(W, H)
    // el desenfoque en niveles de mipmap: px del desenfoque → nivel, en px de la imagen
    const blur = num(s, '--ns-glass-group-blur', 10), k = iw / bw
    gl.uniform2f(U('size'), W, H); gl.uniform2f(U('bgPos'), bx, by); gl.uniform2f(U('bgSize'), bw, bh)
    gl.uniform2f(U('sdfK'), 1 / (field.nx * field.step), 1 / (field.ny * field.step))
    gl.uniform2f(U('sdfO'), .5 / field.nx, .5 / field.ny)
    // (la luz: arriba, algo a la izquierda, como ns-frame/light)
    gl.uniform2f(U('light'), -.35, -.94)
    gl.uniform1f(U('R'), R); gl.uniform1f(U('depth'), depth); gl.uniform1f(U('lens'), lens)
    gl.uniform1f(U('lod'), Math.max(0, Math.log2(Math.max(1, blur * k))))
    gl.uniform1f(U('sat'), num(s, '--ns-glass-sat', 1.3)); gl.uniform1f(U('disp'), num(s, '--ns-glass-dispersion', 0) * .12)
    gl.uniform1f(U('rim'), num(s, '--ns-glass-rim', 1))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    // (el primer dibujo con fondo: hasta aquí el grupo sigue con su capa nativa, sin un vidrio vacío)
    if (onReady) { const f = onReady; onReady = null; f() }
  }
  const schedule = () => { raf ||= requestAnimationFrame(() => { raf = 0; draw(lastD, false) }) }
  const api = {
    draw: d => { if (d != null) lastD = d; schedule() },
    destroy() {
      if (E.get(host) != api) return
      // (dead antes de soltar el contexto: su webglcontextlost no cuenta como un fallo)
      dead = true
      E.delete(host); cancelAnimationFrame(raf); cancelAnimationFrame(vid)
      src.removeEventListener?.('loadeddata', load)
      cv.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
  E.set(host, api)
  load()
  return api
}
