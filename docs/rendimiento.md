---
title: Rendimiento
description: Tamaños, cómo se mantiene ligero y resultados del benchmark.
order: 13
---

# Rendimiento

## Tamaños (minificado + gzip / brotli)

| Archivo | gzip | brotli | |
|---|---|---|---|
| `ns-frame.js` | 8,5 KB | 7,8 KB | Núcleo |
| `ns-mosaic.js` | 8,1 KB | 7,3 KB | Mosaicos de piezas libres, orbes, luz conectada y texto que fluye por la figura |
| `ns-frame.lite.js` | 6,3 KB | 5,8 KB | Sólo recortes |
| `ns-extra.js` | 3,9 KB | 3,6 KB | **Bajo demanda**: degradados, animaciones de borde, acentos, aperturas, formas con scroll |
| `ns-skel.js` | 2,5 KB | 2,2 KB | Skeletons |
| `ns-toast.js` | 2,1 KB | 1,8 KB | Toasts |
| `ns-fx.css` | 2,1 KB | 1,9 KB | Efectos CSS |
| `ns-carousel.js` | 1,6 KB | 1,4 KB | Carrusel |
| `ns-link.js` · `ns-bento.js` | 1,5 KB | 1,3 KB | Callouts HUD · bento |
| `ns-pop.js` | 1,4 KB | 1,2 KB | Popovers |
| `ns-sheet.js` | 1,2 KB | 1,1 KB | Hoja arrastrable |
| `ns-audit.js` | 1,0 KB | 0,9 KB | Sólo desarrollo |
| `ns-css.js` · `ns-vt.js` · `ns-fx.js` | 0,7 KB | 0,6 KB | Compilador · View Transitions · decode |
| `ns-static.js` | 0,5 KB | 0,5 KB | Build (Node) |

Como referencia (bundlephobia, gzip): `@floating-ui/dom` 8,2 KB sólo para posicionar popovers, `augmented-ui` 18,4 KB de CSS de cortes sin animaciones, `flubber` 18,1 KB sólo para morph y `gsap` 27,4 KB.

## Cómo se mantiene ligero

- **Vía rápida nativa.** Una forma sólo de esquinas (redondas; con `corner-shape`, también chaflanes, scoops, notches y squircles) con borde liso y sin capas extra se dibuja con `border-radius` y una sombra interior como borde: sin `clip-path` ni capa SVG. En la landing de ns-frame eso quita 45 de 153 capas SVG. Si la forma cambia (hover, pulsado) a una que no cabe en CSS, pasa sola al modo SVG y vuelve al terminar. En alto contraste no se usa. Las sombras propias van en `--ns-shadow`.
- **Táctil.** En pantallas táctiles no se aplican los filtros de resplandor (`--ns-glow`), el foco `spot` no se registra y las animaciones que repintan grandes degradados en cada frame quedan fijas: son las que calientan la GPU y pueden congelarse en móviles.
- **Carga bajo demanda.** Degradados, animaciones de borde, acentos y aperturas viven en `ns-extra.js`. Una página que sólo usa formas y bordes nunca lo descarga; si hay elementos que lo necesitan, se pide al arrancar, en paralelo al primer pintado.
- **Módulos que comparten el núcleo** (y su código de estilos) en vez de duplicarlo.
- **Build:** esbuild (bundle, tree-shaking, eliminación de código muerto para el build lite) y luego terser con 3 pasadas; por archivo se queda la variante más pequeña en gzip.
- **Formas sin JS**: las formas estáticas se pueden compilar a CSS en el build ([Formas sin JS](sin-js.md)).

## Trabajo en ejecución

- Un único `ResizeObserver`, `IntersectionObserver` y `MutationObserver` para toda la página.
- Lectura y escritura del DOM por lotes: N elementos cuestan un recálculo de estilo, no N.
- **En cambios masivos, el trabajo se reparte en lotes de 150 y cede el hilo principal** entre lotes (`scheduler.yield()` donde existe), para no bloquear la interacción (INP).
- Las capas SVG sólo existen si se usan; nada se repinta si tamaño, forma y estilo no cambiaron.
- Las animaciones se pausan fuera de pantalla (CSS y SMIL).
- El morph interpola vértices, no texto de path.

## Benchmark

`packages/ns-frame/test/bench.html` monta N marcos con borde, los redimensiona todos a la vez y genera 20.000 paths. Hace una ronda de calentamiento y da la mediana de 7. Parámetros: `?n=4000` (cantidad) y `?src=../dist/ns-frame.js` (medir el build).

Medido en Chromium (Windows, 1280×900), build minificado. Con **4.000 marcos**, antes y después de repartir el trabajo en lotes:

| | v0.7 | v0.8 |
|---|---|---|
| Tarea más larga al montar | ~205 ms | **< 50 ms** (ninguna tarea larga) |
| Redimensionar todos | ~610 ms | **~165–250 ms** |
| Tarea más larga al redimensionar | ~165–180 ms | **0–53 ms** |
| Montaje completo | ~215 ms | ~255–275 ms (el trabajo se reparte en más frames, pero la página sigue respondiendo) |

Con **1.000 marcos**, ninguna versión produce tareas largas: montar ronda 40–60 ms, redimensionar 40–65 ms y generar un path 5–9 µs. Estos números varían con el equipo y su temperatura: compara siempre en la misma sesión y alternando versiones.
