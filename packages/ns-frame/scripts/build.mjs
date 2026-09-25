// Genera dist/: núcleo, lite (sólo recortes), extras bajo demanda y módulos opcionales.
// Pipeline: esbuild (bundle + minify + tree-shaking) → terser (3 pasadas) → informe gzip y brotli.
// esbuild y terser son devDependencies con versión fija (pnpm-lock.yaml): nada se descarga al construir.
import { buildSync, transformSync } from 'esbuild'
import { minify } from 'terser'
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'

const out = 'dist', dir = '.build-src'
rmSync(out, { recursive: true, force: true })
mkdirSync(out)

// 1) CSS embebido: los bloques `const CSS = \`…\`` (estilos que la librería inyecta) son texto opaco
// para terser; se minifican aquí con el minificador de CSS de esbuild sobre una copia de src/.
rmSync(dir, { recursive: true, force: true })
cpSync('src', dir, { recursive: true })
let cssSaved = 0
for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const s = readFileSync(`${dir}/${f}`, 'utf8')
  const t = s.replace(/((?:const|let)\s+(?:CSS_?|STYLE)\s*=\s*`)([^`$]*)(`)/g, (m, a, css, b) => {
    // STYLE es un fragmento que luego se envuelve en @layer: se minifica igual (reglas sueltas)
    const min = transformSync(css, { loader: 'css', minify: true, logLevel: 'error' }).code.trim()
    cssSaved += css.length - min.length
    return a + min + b
  })
  if (t != s) writeFileSync(`${dir}/${f}`, t)
}
const esb = o => buildSync({ minify: true, logLevel: 'warning', tsconfigRaw: {}, ...o })
const bundle = (src, dst, o) => esb({ entryPoints: [`${dir}/${src}`], bundle: true, format: 'esm', external: ['./ns-extra.js'], outfile: `${out}/${dst}`, ...o })

bundle('ns-frame.js', 'ns-frame.js')
bundle('ns-frame.js', 'ns-frame.lite.js', { define: { NS_LITE: 'true' } })
// no importan el núcleo: van empaquetados
for (const m of ['ns-extra.js', 'ns-fx.js', 'ns-link.js']) bundle(m, m)
// importan ./ns-frame.js: no se empaquetan, así comparten la instancia del núcleo que cargó la página
esb({ entryPoints: ['ns-css.js', 'ns-audit.js', 'ns-skel.js', 'ns-toast.js', 'ns-pop.js', 'ns-bento.js', 'ns-mosaic.js', 'ns-sheet.js', 'ns-isle.js', 'ns-concentric.js', 'ns-flow.js', 'ns-mark.js', 'ns-liquid.js', 'ns-tabs.js', 'ns-carousel.js', 'ns-vt.js', 'ns-static.js', 'ns-astro.js', 'ns-fx.css'].map(f => `${dir}/${f}`), outdir: out })

rmSync(dir, { recursive: true, force: true })

// 2) terser: por archivo se prueban varias combinaciones seguras (ninguna cambia la semántica: sin
// unsafe_proto/regexp/Function) y se queda la que da menos bytes en brotli (lo que sirven los CDN),
// con gzip como desempate. A veces la salida de esbuild ya es la mejor y se deja tal cual.
const gz = b => gzipSync(b, { level: 9 }).length
const br = b => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length
const base = { module: true, ecma: 2020, mangle: true, format: { comments: /^!/, ecma: 2020 } }
const CANDIDATES = [1, 2, 3, 4].flatMap(passes => [
  { passes, pure_getters: true },
  { passes, pure_getters: true, keep_fargs: false, unsafe_arrows: true, unsafe_methods: true },
  { passes, pure_getters: 'strict', keep_fargs: false, hoist_props: true },
])
const picks = {}
for (const f of readdirSync(out).filter(f => f.endsWith('.js'))) {
  const file = `${out}/${f}`, src = readFileSync(file, 'utf8')
  let best = src, score = [br(Buffer.from(src)), gz(Buffer.from(src))], pick = 'esbuild'
  for (const compress of CANDIDATES) {
    const { code } = await minify(src, { ...base, compress })
    const b = Buffer.from(code), s = [br(b), gz(b)]
    if (s[0] < score[0] || (s[0] == score[0] && s[1] < score[1])) { best = code; score = s; pick = JSON.stringify(compress) }
  }
  writeFileSync(file, best)
  picks[f] = pick
}
console.log(`CSS embebido: ${cssSaved} bytes menos antes de comprimir`)
for (const [f, p] of Object.entries(picks)) console.log('  ' + f.padEnd(18), p)

const kb = n => (n / 1024).toFixed(1).padStart(5) + ' KB'
for (const f of readdirSync(out)) {
  const b = readFileSync(`${out}/${f}`)
  const br = brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length
  console.log(f.padEnd(18), kb(b.length), '  gzip', kb(gz(b)), '  brotli', kb(br))
}
