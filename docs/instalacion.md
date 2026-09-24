---
title: Instalación
description: CDN, npm y uso con Astro, React, Vue y Svelte.
order: 2
---

# Instalación

## Por CDN (sin build)

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.8.0/packages/ns-frame/dist/ns-frame.js"></script>
<!-- opcional: efectos 100 % CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.8.0/packages/ns-frame/dist/ns-fx.css">
```

Los módulos opcionales se cargan igual, desde la misma carpeta `dist/` (por ejemplo `dist/ns-toast.js`). Fija siempre la versión en la URL (`@v0.8.0`): así una actualización nunca te cambia el sitio sin avisar.

## Con npm (pnpm, npm o yarn)

```bash
pnpm add ns-frame
```

```js
import 'ns-frame'                     // activa data-ns en toda la página
import 'ns-frame/fx.css'              // efectos (si tu bundler importa CSS)
import { toast } from 'ns-frame/toast'
import { morph } from 'ns-frame/vt'
```

| Ruta | Módulo |
|---|---|
| `ns-frame` | Núcleo |
| `ns-frame/lite` | Sólo recortes (sin capa SVG) |
| `ns-frame/css` | Compilador a CSS `shape()` |
| `ns-frame/static` | Formas sin JS en el build (Node) |
| `ns-frame/vt` | View Transitions con cortes |
| `ns-frame/toast` · `skel` · `carousel` · `pop` · `bento` · `link` | Componentes |
| `ns-frame/fx` · `ns-frame/fx.css` | Efectos |
| `ns-frame/audit` | Auditoría de texto recortado (sólo desarrollo) |

Los tipos de TypeScript vienen incluidos.

> Los módulos opcionales importan el núcleo completo (`ns-frame`). Si usas `ns-frame/lite`, no lo mezcles con ellos: cargarías dos núcleos.

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
