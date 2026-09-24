// Benchmark reproducible: una ronda de calentamiento y la mediana de 7. ?n=4000 cambia la cantidad de marcos;
// ?src=../dist/ns-frame.js mide el build. Resultado en window.__bench y en pantalla.
const Q = new URLSearchParams(location.search), N = +Q.get('n') || 1000
const ns = await import(Q.get('src') || '../src/ns-frame.js')
const zone = document.getElementById('zone'), out = document.getElementById('out')
const frames = n => new Promise(r => { const f = () => --n ? requestAnimationFrame(f) : r(); requestAnimationFrame(f) })
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1]
let longest = 0
try { new PerformanceObserver(l => l.getEntries().forEach(e => { longest = Math.max(longest, e.duration) })).observe({ type: 'longtask' }) } catch {}

async function round() {
  zone.replaceChildren()
  zone.classList.remove('narrow')
  await frames(2)
  longest = 0
  // montaje: N marcos con borde hasta que están pintados
  let t = performance.now()
  const els = Array.from({ length: N }, (_, i) => {
    const d = document.createElement('div')
    d.setAttribute('data-ns', i % 2 ? 'tl+br bevel 8; radius 2' : 'all notch 6; radius 2')
    return d
  })
  zone.append(...els)
  await frames(2)
  const mount = performance.now() - t, mountLong = longest
  // redimensionado: todos cambian de ancho a la vez
  longest = 0
  t = performance.now()
  zone.classList.add('narrow')
  await frames(3)
  const resize = performance.now() - t, resizeLong = longest
  // geometría pura
  t = performance.now()
  for (let i = 0; i < 20000; i++) ns.path('tl+br bevel 18; top cut center 30% 6; radius 3', 300 + (i % 50), 200)
  const path = (performance.now() - t) / 20000 * 1000
  return { mount, mountLong, resize, resizeLong, path }
}

// una ronda de calentamiento (JIT, caché de formas) que no cuenta; luego la mediana de 7
await round()
const R = []
for (let i = 0; i < 7; i++) R.push(await round())
const m = k => Math.round(median(R.map(r => r[k])) * 10) / 10
window.__bench = { mount: m('mount'), mountLongTask: m('mountLong'), resize: m('resize'), resizeLongTask: m('resizeLong'), pathMicros: m('path') }
out.textContent = Object.entries(window.__bench).map(([k, v]) => `${k.padEnd(16)} ${v}`).join('\n')
