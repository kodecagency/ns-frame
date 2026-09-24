---
title: Introducción
description: Qué es ns-frame, qué resuelve y cómo está organizado.
order: 1
---

# Introducción

**ns-frame** es una librería de **formas nativas para la web**: cortes, chaflanes (bevel), escalones (notch), mordidas (scoop), esquinas squircle y radius en **cualquier vértice de cualquier elemento**, sin imágenes y sin dependencias.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.8.0/packages/ns-frame/dist/ns-frame.js"></script>

<article data-ns="tl+br bevel 18; radius 3">Una tarjeta con dos esquinas cortadas</article>
```

## Qué la hace distinta

- **Los cortes miden lo mismo a cualquier tamaño.** Un chaflán de 18 px mide 18 px en un botón y en un panel de pantalla completa; nada se estira.
- **Fillet en cualquier vértice**, convexo o cóncavo: cortes redondeados, radius invertidos dentro de un notch, polígonos libres con radius por vértice.
- **Bordes reales que siguen el corte**: color, degradado, doble línea, brackets en las esquinas y 11 animaciones de borde (cometa, escaneo, progreso…).
- **Morph de geometría**: hover, foco, presión o un cambio de atributo interpolan los vértices, no el texto del path, así que funciona igual en Chrome, Safari y Firefox.
- **Componentes con forma**: popovers con la flecha dentro del contorno, toasts, carrusel, skeletons, callouts HUD, bento unificado y View Transitions que conservan los cortes.
- **Cero JS cuando no hace falta**: las formas estáticas se pueden compilar a CSS `shape()` en el build.
- **Seguro y accesible por diseño**: sin `innerHTML`, compatible con CSP estricta, estilos en `@layer ns`, anillo de foco que sigue la forma, alto contraste, RTL y `prefers-reduced-motion`.

## Cómo está organizada

| Pieza | Peso (gzip) | Para qué |
|---|---|---|
| `ns-frame` (núcleo) | 8,2 KB | Formas, recortes, bordes, foco, morph, estados, modo nativo, formas concéntricas, padding según la forma |
| `ns-extra` | 3,6 KB | **Se carga solo, bajo demanda**: degradados, animaciones de borde, acentos, aperturas y formas ligadas al scroll |
| `ns-frame/lite` | 6,1 KB | Sólo recortes, sin capa SVG |
| Módulos opcionales | 0,5–2,5 KB c/u | `toast`, `skel`, `carousel`, `pop`, `vt`, `bento`, `link`, `fx`, `css`, `static`, `audit` |
| `ns-fx.css` | 2,0 KB | Efectos 100 % CSS: luz en U, aurora, halo, patrones, texto animado |

Una página que sólo recorta formas carga el núcleo (o nada, si las compila en el build). Todo lo demás llega cuando un elemento lo pide.

## Siguientes pasos

- [Instalación](instalacion.md) — CDN, npm, Astro, React, Vue y Svelte.
- [Sintaxis de formas](sintaxis.md) — el mini lenguaje, con ejemplos.
- [Componentes](componentes.md) — toasts, carrusel, skeletons, popovers y más.
