---
title: Movimiento
description: Morph, estados, bordes animados, aperturas y formas ligadas al scroll.
order: 5
---

# Movimiento

Todo el movimiento de ns-frame respeta `prefers-reduced-motion` y se pausa fuera de pantalla.

## Morph: hover, foco y presión

```html
<a class="btn" data-ns="tl+br bevel 12; radius 2"
   data-ns-hover="tl+br bevel 20; radius 2"
   data-ns-press="all bevel 5; radius 2">Presióname</a>
```

El morph interpola **vértices**, no el texto del path, así que funciona igual en todos los navegadores. La duración se ajusta con `--ns-morph-time` (ms). Cualquier cambio de `data-ns` o de `--ns-shape` también se anima.

## Bordes en movimiento (`data-ns-motion`)

```html
<div data-ns="card" data-ns-motion="scan march">…</div>
```

| Tipo | Efecto |
|---|---|
| `comet` | Cometa con estela que recorre el borde |
| `twin` | Dos cometas opuestos |
| `scan` | Barrido de luz que cruza el marco y enciende el borde a su paso |
| `orbit` | Dos destellos que giran alrededor del centro |
| `chase` | Pulsos cortos, tipo flujo de datos |
| `march` | Borde discontinuo en marcha (selección, zonas para soltar) |
| `loop` | El borde se dibuja y se borra en bucle |
| `pulse` | El borde respira |
| `glitch` | Parpadeo desplazado de interferencia |
| `progress` | Barra de progreso en el propio borde: `--ns-progress: 0–100` (con transición) |
| `spot` | Foco de luz que sigue al puntero sobre el borde y el interior. Un solo listener para toda la página: la luz cruza los huecos entre tarjetas (`--ns-spot-size`, `--ns-spot-fill`) |

- Se combinan: `"scan march"`. Con `hover` (`"twin hover"`) sólo aparecen al pasar el mouse.
- Variables: `--ns-motion` (color), `--ns-motion-time` (duración), `--ns-accent-width` (grosor).
- Con `prefers-reduced-motion` desaparecen, salvo `progress`, que sigue visible sin animación.

## Borde que se dibuja (`data-ns-draw`)

El borde se traza al entrar en pantalla. Duración: `--ns-draw-time` (1,2 s).

## Aperturas

La forma se despliega **manteniendo sus cortes en px**: el borde la sigue y el contenido se revela recortado.

| Modo | Efecto |
|---|---|
| `open` | Línea horizontal que luego se abre en vertical (panel HUD) |
| `split` | Línea vertical que luego se abre en horizontal |
| `iris` | Desde el centro |
| `wipe` | De izquierda a derecha |
| `drop` | De arriba hacia abajo (menús) |

```js
import { open, close } from 'ns-frame'

dialog.showModal(); open(panel, 'open')           // modal
await close(panel, 'open'); dialog.close()
menu.hidden = false; open(menu, 'drop', 380)      // menú
```

En HTML: `data-ns-enter="open"` al entrar en pantalla, o `data-ns-enter="split 140"` con retraso (ms) para escalonar. `open()` oculta el elemento de forma síncrona antes de esperar al módulo que se carga bajo demanda, así que nunca hay un frame con el panel completo.

## Formas ligadas al scroll (`data-ns-scroll`)

```html
<section data-ns="all bevel 70" data-ns-scroll="all bevel 10">…</section>
```

La forma se interpola mientras el elemento cruza la pantalla: progreso 0 cuando asoma por abajo y 1 cuando su borde superior llega al 40 % de la ventana. Sólo se procesan los elementos visibles y nada se repinta si el progreso no cambió. Las dos formas deben tener la misma estructura para interpolarse.
