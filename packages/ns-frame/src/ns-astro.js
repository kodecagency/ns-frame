/*! ns-frame/astro · integración de Astro: compila data-ns-static a CSS al terminar el build */
// astro.config.mjs
//   import nsStatic from 'ns-frame/astro'
//   export default defineConfig({ integrations: [nsStatic()] })
//
// Recorre el HTML generado, convierte cada data-ns-static="forma" en una clase y escribe una sola hoja
// (/_ns/static.css por defecto) enlazada desde cada página que la usa. Sin JS en el navegador para esas formas.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extract } from './ns-static.js'

async function* html(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* html(p)
    else if (e.name.endsWith('.html')) yield p
  }
}

export default function nsStatic({ file = '_ns/static.css' } = {}) {
  return {
    name: 'ns-frame-static',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir), rules = new Set(), skipped = new Set()
        let pages = 0
        for await (const p of html(root)) {
          const src = await readFile(p, 'utf8')
          if (!src.includes('data-ns-static=')) continue
          const r = extract(src)
          r.css && r.css.split('\n').forEach(x => rules.add(x))
          r.skipped.forEach(x => skipped.add(x))
          const link = `<link rel="stylesheet" href="/${file}">`
          await writeFile(p, r.css && !r.html.includes(link) ? r.html.replace('</head>', link + '</head>') : r.html)
          pages++
        }
        if (!rules.size) return
        await mkdir(join(root, file, '..'), { recursive: true })
        await writeFile(join(root, file), [...rules].join('\n'))
        logger?.info(`${rules.size} formas compiladas a CSS en ${pages} páginas${skipped.size ? ` (${skipped.size} quedan para el runtime)` : ''}`)
      },
    },
  }
}
