---
title: Instalación
description: CDN, import maps y uso con Astro, React, Vue y Svelte.
order: 2
---

# Instalación

> El paquete de npm llegará más adelante; hasta entonces, no instales ningún paquete llamado ns-frame desde npm: no es nuestro.

## Por CDN (sin build)

ns-frame se sirve desde jsDelivr, directamente de las etiquetas de este repositorio:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-frame.js"></script>
<!-- opcional: efectos 100 % CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-fx.css">
```

Los módulos opcionales se cargan igual, desde la misma carpeta `dist/` (por ejemplo `dist/ns-toast.js` o `dist/ns-mosaic.js`). Fija siempre la versión en la URL (`@v0.9.0`): así una actualización nunca te cambia el sitio sin avisar.

```html
<script type="module">
  import { toast } from 'https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-toast.js'
  toast('Cambios guardados', { type: 'ok' })
</script>
```

Cada módulo importa el núcleo por ruta relativa (`./ns-frame.js`), así que núcleo y módulos deben salir **de la misma versión**: con versiones distintas cargarías dos núcleos.

## Import map (nombres cortos sin build)

Para escribir `import … from 'ns-frame/toast'`, como en el resto de esta documentación, declara un import map antes de cualquier módulo:

```html
<script type="importmap">
{
  "imports": {
    "ns-frame": "https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-frame.js",
    "ns-frame/toast": "https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-toast.js",
    "ns-frame/vt": "https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-vt.js"
  }
}
</script>
<script type="module">
  import 'ns-frame'                     // activa data-ns en toda la página
  import { toast } from 'ns-frame/toast'
  import { morph } from 'ns-frame/vt'
</script>
```

Añade una entrada por cada módulo que uses. Cada ruta corresponde a un archivo de `dist/`:

| Ruta | Archivo | Módulo |
|---|---|---|
| `ns-frame` | `ns-frame.js` | Núcleo |
| `ns-frame/lite` | `ns-frame.lite.js` | Sólo recortes (sin capa SVG) |
| `ns-frame/css` | `ns-css.js` | Compilador a CSS `shape()` |
| `ns-frame/static` · `ns-frame/astro` | `ns-static.js` · `ns-astro.js` | Formas sin JS en el build (Node) |
| `ns-frame/vt` | `ns-vt.js` | View Transitions con cortes |
| `ns-frame/toast` · `skel` · `carousel` · `pop` · `bento` · `link` | `ns-<nombre>.js` | Componentes |
| `ns-frame/mosaic` | `ns-mosaic.js` (+ `ns-flow.js`) | Mosaicos de piezas libres |
| `ns-frame/sheet` | `ns-sheet.js` | Hoja arrastrable |
| `ns-frame/isle` | `ns-isle.js` (usa `ns-sheet.js`) | Isla de navegación |
| `ns-frame/concentric` | `ns-concentric.js` | Esquinas concéntricas automáticas |
| `ns-frame/flow` | `ns-flow.js` | Texto que llena la forma |
| `ns-frame/mark` | `ns-mark.js` | Resaltado continuo en varias líneas |
| `ns-frame/liquid` | `ns-liquid.js` | Formas líquidas que se funden y vidrio líquido |
| `ns-frame/glass` | `ns-glass.js` | Vidrio en cualquier elemento y forma; cristal tallado y prisma |
| `ns-frame/tabs` | `ns-tabs.js` | Pestañas de vidrio líquido que se arrastran |
| `ns-frame/fx` · `ns-frame/fx.css` | `ns-fx.js` · `ns-fx.css` | Efectos |
| `ns-frame/audit` | `ns-audit.js` | Auditoría de texto recortado (sólo desarrollo) |

Los tipos de TypeScript están en `packages/ns-frame/types/`.

> Los módulos opcionales importan el núcleo completo (`ns-frame.js`). Si usas `ns-frame/lite`, no lo mezcles con ellos: cargarías dos núcleos.

## Con un bundler (Vite, Astro, webpack…)

Mientras no haya paquete de npm, copia los archivos de `packages/ns-frame/dist/` de una etiqueta (por ejemplo `v0.10.0`) a tu proyecto, en una carpeta propia (`src/vendor/ns-frame/`), y apunta el alias `ns-frame` a ella. Con Vite:

```js
// vite.config.js (o `vite` dentro de astro.config.mjs)
import { fileURLToPath } from 'node:url'
const dist = fileURLToPath(new URL('./src/vendor/ns-frame/', import.meta.url))

export default {
  resolve: {
    alias: [
      { find: /^ns-frame$/, replacement: dist + 'ns-frame.js' },
      { find: /^ns-frame\/lite$/, replacement: dist + 'ns-frame.lite.js' },
      { find: /^ns-frame\/fx\.css$/, replacement: dist + 'ns-fx.css' },
      { find: /^ns-frame\/(.+)$/, replacement: dist + 'ns-$1.js' },
    ],
  },
}
```

Así los ejemplos de esta documentación (`import 'ns-frame'`, `import { toast } from 'ns-frame/toast'`) funcionan tal cual, y los archivos quedan versionados en tu repositorio. Los ejemplos de Astro, React, Vue y Svelte de más abajo suponen este alias.

En archivos que ejecuta Node directamente (`astro.config.mjs`, scripts de build) el alias de Vite no se aplica: importa la ruta relativa, por ejemplo `import nsStatic from './src/vendor/ns-frame/ns-astro.js'`.

## Qué pasa al importarlo

El núcleo activa por sí solo:

- todo elemento con `data-ns` o `data-ns-nest`,
- el custom element `<ns-frame>`,
- y cualquiera que se agregue después (lo detecta un único `MutationObserver`).

No hay que inicializar nada, ni siquiera en frameworks que re-renderizan.

## Astro

```astro
---
// src/layouts/Base.astro
---
<script>
  import 'ns-frame'
</script>

<article data-ns="card" data-ns-pad>…</article>
```

Para compilar formas estáticas a CSS sin JS en el navegador, mira [Formas sin JS](sin-js.md).

## React

```jsx
import 'ns-frame'

export function Card({ children }) {
  return <article data-ns="tl+br bevel 18; radius 3" data-ns-pad>{children}</article>
}
```

Los atributos `data-*` pasan tal cual. Para `<ns-frame>` en React 19 no hace falta nada especial; en React 18 usa `data-ns` sobre un elemento normal.

## Vue

```vue
<script setup>
import 'ns-frame'
</script>

<template>
  <article data-ns="panel" data-ns-pad><slot /></article>
</template>
```

## Svelte

```svelte
<script>
  import 'ns-frame'
</script>

<article data-ns="card" data-ns-pad><slot /></article>
```

## Soporte de navegadores

- Núcleo: `clip-path: path()` + `ResizeObserver` → Chrome 88+, Safari 13.1+, Firefox 97+.
- `css()` / `ns-frame/static`: `shape()` → Chrome 135+, Safari 18.4+, Firefox 148+.
- Modo nativo (`data-ns-native`): `corner-shape`, hoy sólo en Chromium; en el resto se usa `clip-path` automáticamente.
- View Transitions: donde no hay soporte, el cambio de vista es instantáneo.
- `ns-fx.css` usa `color-mix()` y `@property`.
