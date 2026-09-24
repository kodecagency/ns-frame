---
title: Layout
description: Padding que respeta la forma, formas concéntricas y bento unificado.
order: 6
---

# Layout

## Padding que respeta la forma (`data-ns-pad`)

```html
<article data-ns="card" data-ns-pad style="--ns-pad: 2rem">…</article>
```

El padding se calcula solo: `var(--ns-pad, 1.25rem)` más lo que haga falta para que el contenido no choque con los cortes.

- Mide el padding real y calcula, con la geometría de cada corte (bevel, notch, round, scoop, squircle), cuánto invade el corte la primera línea. Mide 4 px por encima, porque el área de contenido de la fuente sobresale de la caja de línea.
- **Si el padding ya alcanza, no añade nada**: el texto queda alineado entre tarjetas.
- Las esquinas sólo empujan en horizontal (las líneas cercanas al corte se acortan); las muescas y pestañas de los bordes empujan en su lado.
- Expone `--ns-safe-t/r/b/l`. Para usarlas en tu propio CSS sin el padding automático, pon `data-ns-safe`: `padding-left: calc(var(--ns-safe-l) + 2rem)`. Los demás elementos no pagan este cálculo.

## Formas concéntricas (`data-ns-nest`)

Un elemento dentro de un marco hereda las esquinas del padre que tiene cerca, desplazadas hacia dentro la misma distancia que los separa: la regla de radios concéntricos, pero para chaflanes, notches, scoops y squircles. Las esquinas lejanas usan la forma interior que indiques (por defecto `round 3`).

```html
<div data-ns="all bevel 10; radius 2" style="padding: 6px; display: flex; gap: 4px">
  <button data-ns-nest="round 2">Redonda</button>    <!-- hereda tl y bl, en paralelo -->
  <button data-ns-nest="round 2">Futurista</button>  <!-- centro: sólo round 2 -->
  <button data-ns-nest="round 2">HUD</button>        <!-- hereda tr y br -->
</div>
```

Ideal para controles segmentados, botones dentro de tarjetas, imágenes dentro de paneles y modales. Si el padre cambia de forma (hover, morph, resize), los hijos se recalculan y se animan con él.

## Bento unificado (`ns-frame/bento`)

```html
<div class="ns-bento" data-ns-bento="outer bevel 30; inner round 12; radius 2">
  <article class="ns-big">Anclaje (2×2)</article>
  <article>…</article>
  <article>…</article>
  <article class="ns-w2">Ancha (2×1)</article>
  <article class="ns-h2">Alta (1×2)</article>
</div>
```

- **Un solo objeto:** las esquinas que tocan el contorno del conjunto reciben el corte `outer` y las interiores el `inner`; la cuadrícula se lee como una pieza esculpida.
- **Se reacomoda, no se encoge:** columnas según el ancho real del contenedor (`--ns-min`, `--ns-cols-max`). A 2 columnas, el ancla ocupa todo el ancho; a 1, pasa primero.
- **Espaciado con proporción:** padding interno = 2 × `--ns-gap`, más el margen seguro de los cortes.
- Tamaños: `ns-big` (2×2), `ns-w2`, `ns-h2`, `ns-full`. Por celda, `data-ns-add` agrega declaraciones a la forma calculada.

Buenas prácticas: una celda ancla clara (al menos 1,5 veces la siguiente), una idea por celda, 20–30 % de aire interno y entre 5 y 9 celdas.
