// Genera dist/: núcleo, lite (sólo recortes), extras bajo demanda y módulos opcionales.
// Pipeline: esbuild (bundle + minify + tree-shaking) → terser (3 pasadas) → informe gzip y brotli.
// esbuild y terser son devDependencies con versión fija (pnpm-lock.yaml): nada se descarga al construir.
import { buildSync } from 'esbuild'
import { minify } from 'terser'
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'

const dir = 'src', out = 'dist'
rmSync(out, { recursive: true, force: true })
mkdirSync(out)
const esb = o => buildSync({ minify: true, logLevel: 'warning', tsconfigRaw: {}, ...o })
const bundle = (src, dst, o) => esb({ entryPoints: [`${dir}/${src}`], bundle: true, format: 'esm', external: ['./ns-extra.js'], outfile: `${out}/${dst}`, ...o })

bundle('ns-frame.js', 'ns-frame.js')
bundle('ns-frame.js', 'ns-frame.lite.js', { define: { NS_LITE: 'true' } })
// no importan el núcleo: van empaquetados
for (const m of ['ns-extra.js', 'ns-fx.js', 'ns-link.js']) bundle(m, m)
// importan ./ns-frame.js: no se empaquetan, así comparten la instancia del núcleo que cargó la página
esb({ entryPoints: ['ns-css.js', 'ns-audit.js', 'ns-skel.js', 'ns-toast.js', 'ns-pop.js', 'ns-bento.js', 'ns-mosaic.js', 'ns-sheet.js', 'ns-carousel.js', 'ns-vt.js', 'ns-static.js', 'ns-astro.js', 'ns-fx.css'].map(f => `${dir}/${f}`), outdir: out })

// segunda pasada con terser; se queda la versión más pequeña en gzip (a veces esbuild gana)
const gz = b => gzipSync(b, { level: 9 }).length
for (const f of readdirSync(out).filter(f => f.endsWith('.js'))) {
  const file = `${out}/${f}`, src = readFileSync(file, 'utf8')
  const { code } = await minify(src, { module: true, compress: { passes: 3, pure_getters: true }, mangle: true, format: { comments: /^!/ } })
  if (gz(Buffer.from(code)) < gz(Buffer.from(src))) writeFileSync(file, code)
}

const kb = n => (n / 1024).toFixed(1).padStart(5) + ' KB'
for (const f of readdirSync(out)) {
  const b = readFileSync(`${out}/${f}`)
  const br = brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length
  console.log(f.padEnd(18), kb(b.length), '  gzip', kb(gz(b)), '  brotli', kb(br))
}
