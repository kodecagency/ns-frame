// Antes de dev/build: construye la librería y copia lo que el sitio sirve como estático.
//   public/ns-frame/   → dist de la librería (la demo y las guías la cargan desde aquí)
//   public/lab/        → src, dist y las páginas de prueba públicas (/lab/test/csp.html, bench.html…)
//   public/llms.txt    → resumen para modelos de lenguaje
import { spawnSync } from 'node:child_process'
import { cpSync, rmSync, mkdirSync } from 'node:fs'
import { basename } from 'node:path'

// (de test/ sólo lo que es público: los laboratorios locales no se sirven ni se despliegan)
const PUBLIC_TESTS = /^(bench|compat|compat-nopop|csp|mosaic)\.(html|css|js)$/
import { fileURLToPath } from 'node:url'

const at = p => fileURLToPath(new URL(p, import.meta.url))
const lib = at('../../../packages/ns-frame/'), pub = at('../public/')

const r = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: lib, stdio: 'inherit' })
if (r.status) process.exit(r.status)

for (const d of ['ns-frame', 'lab']) rmSync(pub + d, { recursive: true, force: true })
mkdirSync(pub + 'lab', { recursive: true })
cpSync(lib + 'dist', pub + 'ns-frame', { recursive: true })
for (const d of ['src', 'dist']) cpSync(lib + d, pub + 'lab/' + d, { recursive: true })
cpSync(lib + 'test', pub + 'lab/test', { recursive: true, filter: p => p == lib + 'test' || PUBLIC_TESTS.test(basename(p)) })
cpSync(at('../../../llms.txt'), pub + 'llms.txt')
console.log('prepare: librería construida y copiada a public/')
