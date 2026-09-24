---
title: Formas sin JS
description: Compila las formas estáticas a CSS shape() en el build, con css(), extract() o la integración de Astro.
order: 9
---

# Formas sin JS

Muchas formas son estáticas: una tarjeta, un botón, una imagen recortada. Para esas no hace falta JavaScript en el navegador. ns-frame las compila a CSS `shape()` con coordenadas `calc(% + px)`: el recorte es **responsive** (el corte mide lo mismo a cualquier tamaño) y lo resuelve el motor CSS.

> Sólo el **recorte** se compila. Bordes SVG, morph, animaciones de borde, aperturas y componentes necesitan el runtime: para eso sigue usando `data-ns`.

## `css()`: una forma → `shape()`

```js
import { css } from 'ns-frame/css'

css('tl+br bevel 18; radius 3')
// "shape(from 0px calc(100% - 3px), line to 0px 19.24px, arc to 0.88px 17.12px of 3px 3px cw, …, close)"
```

Devuelve `null` si la forma no es lineal respecto al tamaño (tamaños en `%` en las esquinas o consultas `@<N`): esas necesitan el runtime.

## `extract()`: HTML → HTML + hoja CSS

Para Node (build o SSR):

```js
import { extract } from 'ns-frame/static'

const { html, css, skipped } = extract('<article class="a" data-ns-static="card">…</article>')
// html → <article class="a ns-s-1k9x3">…</article>
// css  → .ns-s-1k9x3{clip-path:shape(…)}
```

- Una clase por forma distinta (hash del texto): la hoja no crece con las repeticiones.
- **Hoja externa, no estilos en línea**: funciona con una CSP estricta (`style-src 'self'`).
- Las formas que no se pueden compilar se dejan como `data-ns` y aparecen en `skipped`: el runtime las resuelve si está cargado.

## Integración de Astro

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import nsStatic from 'ns-frame/astro'

export default defineConfig({ integrations: [nsStatic()] })
```

```astro
<article data-ns-static="card">Sin JS en el navegador</article>
```

Al terminar el build, la integración recorre el HTML generado, compila cada `data-ns-static`, escribe una sola hoja (`/_ns/static.css`) y la enlaza desde las páginas que la usan. Opción: `nsStatic({ file: 'assets/shapes.css' })`.

El sitio de documentación de ns-frame usa esta integración.

## Soporte

`shape()` funciona en Chrome 135+, Safari 18.4+ y Firefox 148+. En navegadores más viejos el elemento se ve rectangular (sin romperse). Si necesitas cubrirlos, usa `data-ns` con el runtime, que funciona desde Chrome 88, Safari 13.1 y Firefox 97.
