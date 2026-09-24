// Antes de dev/build: construye la librería y copia lo que el sitio sirve como estático.
//   public/ns-frame/   → dist de la librería (la demo y las guías la cargan desde aquí)
//   public/lab/        → src, dist y test, para abrir /lab/test/csp.html y /lab/test/bench.html
//   public/llms.txt    → resumen para modelos de lenguaje
import { spawnSync } from 'node:child_process'
import { cpSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const at = p => fileURLToPath(new URL(p, import.meta.url))
const lib = at('../../../packages/ns-frame/'), pub = at('../public/')

const r = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: lib, stdio: 'inherit' })
if (r.status) process.exit(r.status)

for (const d of ['ns-frame', 'lab']) rmSync(pub + d, { recursive: true, force: true })
mkdirSync(pub + 'lab', { recursive: true })
cpSync(lib + 'dist', pub + 'ns-frame', { recursive: true })
for (const d of ['src', 'dist', 'test']) cpSync(lib + d, pub + 'lab/' + d, { recursive: true })
cpSync(at('../../../llms.txt'), pub + 'llms.txt')
console.log('prepare: librería construida y copiada a public/')
