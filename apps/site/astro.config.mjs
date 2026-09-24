import { defineConfig, fontProviders } from 'astro/config'
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
  // fuentes autoalojadas (sin petición a Google en cada visita) y con fallback de métricas ajustadas
  // (menos salto al cargar). Mona Sans es variable: un solo archivo con pesos 400–800 y anchos 75–125 %
  fonts: [
    // el proveedor de Google entrega Mona Sans sin el eje de anchura (wdth), que usan los titulares:
    // se sirve el archivo variable completo (latin, pesos 400–800, anchos 75–125 %; licencia OFL)
    { provider: fontProviders.local(), name: 'Mona Sans', cssVariable: '--font-mona', fallbacks: ['system-ui', 'sans-serif'],
      options: { variants: [{ src: ['./src/assets/fonts/MonaSans-latin.woff2'], weight: '400 800', style: 'normal', stretch: '75% 125%' }] } },
    { provider: fontProviders.google(), name: 'JetBrains Mono', cssVariable: '--font-mono', weights: ['400', '500'], styles: ['normal'], subsets: ['latin'], fallbacks: ['ui-monospace', 'monospace'] },
  ],
  // CSP estricta: Astro añade el hash de cada script y estilo que genera (sin 'unsafe-inline').
  // La página no usa atributos style="…" y ns-frame sólo escribe estilos por CSSOM, que la CSP permite
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://picsum.photos https://fastly.picsum.photos",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  // las guías se precargan al pasar el puntero por sus enlaces
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
})
