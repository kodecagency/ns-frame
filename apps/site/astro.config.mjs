import { defineConfig } from 'astro/config'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import nsStatic from 'ns-frame/astro'

// En GitHub las guías se enlazan como "instalacion.md"; en el sitio la ruta es "/docs/instalacion".
// Se corrige sobre el HTML generado (Astro 7 usa Sätteri y así no hace falta un plugin de Markdown).
const docLinks = () => ({
  name: 'doc-links',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const walk = async d => {
        for (const e of await readdir(d, { withFileTypes: true })) {
          const p = join(d, e.name)
          if (e.isDirectory()) await walk(p)
          else if (e.name.endsWith('.html')) {
            const s = await readFile(p, 'utf8'), t = s.replace(/href="([\w-]+)\.md(#[^"]*)?"/g, 'href="$1$2"')
            if (t != s) await writeFile(p, t)
          }
        }
      }
      await walk(join(fileURLToPath(dir), 'docs'))
    },
  },
})

export default defineConfig({
  // site: 'https://…',   ← pon aquí la URL de producción cuando esté desplegado (URLs canónicas)
  // formas estáticas (data-ns-static) compiladas a CSS en el build: sin JS en el navegador
  integrations: [nsStatic(), docLinks()],
})
