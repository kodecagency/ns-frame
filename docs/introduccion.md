---
title: Introducción
description: "Qué es ns-frame, la librería de formas para la web: chaflanes, muescas y squircles en cualquier elemento HTML, qué resuelve y cómo se organiza."
order: 1
---

# Introducción

**ns-frame** es una librería de **formas nativas para la web**: cortes, chaflanes (bevel), escalones (notch), mordidas (scoop), esquinas squircle y radius en **cualquier vértice de cualquier elemento**, sin imágenes y sin dependencias.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.18.0/packages/ns-frame/dist/ns-frame.js"></script>

<article data-ns="tl+br bevel 18; radius 3">Una tarjeta con dos esquinas cortadas</article>
```

## Qué la hace distinta

- **Los cortes miden lo mismo a cualquier tamaño.** Un chaflán de 18 px mide 18 px en un botón y en un panel de pantalla completa; nada se estira.
- **Fillet en cualquier vértice**, convexo o cóncavo: cortes redondeados, radius invertidos dentro de un notch, polígonos libres con radius por vértice.
- **Bordes reales que siguen el corte**: color, degradado, doble línea, brackets en las esquinas y 11 animaciones de borde (cometa, escaneo, progreso…).
- **Morph de geometría**: hover, foco, presión o un cambio de atributo interpolan los vértices, no el texto del path, así que funciona igual en Chrome, Safari y Firefox.
- **Componentes con forma**: popovers con la flecha dentro del contorno, toasts, carrusel, skeletons, callouts HUD, bento unificado, mosaicos de piezas libres, hoja arrastrable, isla de navegación y View Transitions que conservan los cortes.
- **Lo que CSS todavía no hace**: texto que llena la forma, esquinas concéntricas automáticas, resaltado continuo en varias líneas y grupos líquidos que se funden (ver [Componentes](componentes.md#lo-que-css-todavía-no-hace)).
- **Cero JS cuando no hace falta**: las formas estáticas se pueden compilar a CSS `shape()` en el build.
- **Seguro y accesible por diseño**: sin `innerHTML`, compatible con CSP estricta, estilos en `@layer ns`, anillo de foco que sigue la forma, alto contraste, RTL y `prefers-reduced-motion`.

## Cómo está organizada

| Pieza | Peso (gzip) | Para qué |
|---|---|---|
| `ns-frame` (núcleo) | 10,9 KB | Formas, recortes, bordes, foco, morph, estados, modo nativo, formas concéntricas (`data-ns-nest`), padding según la forma, grupos de elección, `modal`, `jump` y `watch` |
| `ns-extra` | 3,9 KB | **Se carga solo, bajo demanda**: degradados, animaciones de borde, acentos, aperturas y formas ligadas al scroll |
| `ns-frame/lite` | 8,4 KB | Sólo recortes, sin capa SVG |
| `ns-frame/mosaic` | 9,0 KB + 2,0 KB | Mosaicos de piezas libres, orbes y luz conectada (usa `ns-flow.js`) |
| `ns-frame/glass` · `liquid` · `tabs` | 3,4 · 18,8 · 3,7 KB | Vidrio en cualquier forma y en grupo (con motor WebGL bajo demanda, 3,8 KB) · formas líquidas y lente · pestañas de vidrio |
| `ns-frame/controls` | 4,2 KB | Segmentos, fichas, campos, deslizadores, niveles, interruptores, copiar, insignias, código, tarjetas y asas |
| `ns-frame/concentric` · `flow` · `mark` | 2,5 · 2,0 · 2,3 KB | Esquinas concéntricas automáticas · texto que llena la forma · resaltado en varias líneas |
| `ns-frame/skel` · `isle` · `toast` | 2,6 · 8,6 · 2,3 KB | Skeletons · isla de navegación · toasts |
| `ns-frame/carousel` · `link` · `bento` · `pop` · `sheet` | 1,5–2,1 KB c/u | Carrusel · callouts · bento · popovers · hoja arrastrable |
| `ns-frame/audit` | 1,3 KB | Auditoría de texto recortado (sólo desarrollo) |
| `ns-frame/css` · `vt` · `fx` · `static` | 0,5–0,8 KB c/u | Compilador a `shape()` · View Transitions · decode · build sin JS |
| `ns-fx.css` | 2,3 KB | Efectos 100 % CSS: luz en U, aurora, halo, patrones, texto animado |

Una página que sólo recorta formas carga el núcleo (o nada, si las compila en el build). Todo lo demás llega cuando un elemento lo pide. Cifras completas, también en brotli, en [Rendimiento](rendimiento.md).

## Siguientes pasos

- [Instalación](instalacion.md) — CDN, import maps, Astro, React, Vue y Svelte.
- [Sintaxis de formas](sintaxis.md) — el mini lenguaje, con ejemplos.
- [Componentes](componentes.md) — toasts, carrusel, skeletons, popovers y más.
