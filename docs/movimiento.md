---
title: Movimiento
description: Morph, estados, bordes animados, aperturas y formas ligadas al scroll.
order: 5
---

# Movimiento

Todo el movimiento de ns-frame respeta `prefers-reduced-motion` y se pausa fuera de pantalla. Durante el desplazamiento sigue en marcha (un borde que se detiene al desplazar parece un cuelgue). Si prefieres ahorrar batería con bordes que repintan, `<html data-ns-scroll-pause>` los pausa en táctil mientras se desplaza la página y siguen al parar: `<html>` lleva `.ns-scrolling` durante el desplazamiento (úsala también para tus animaciones). `data-ns-scroll-motion`, que antes evitaba la pausa, ya no hace falta.

**En reposo** (20 s sin puntero, toque, tecla ni desplazamiento), `<html>` lleva `.ns-resting` y esos mismos adornos se pausan hasta la siguiente señal de vida: una página olvidada con un borde animado a la vista ya no repinta sin fin (ni calienta el teléfono). `<html data-ns-rest="30">` cambia la espera en segundos y `data-ns-rest="off"` lo apaga. `document` recibe el evento `ns-rest` con `detail { resting }`, para pausar también tus animaciones de JS.

**Tope de fotogramas:** `--ns-motion-fps: 30` hace que los bordes animados de trazo (`comet`, `twin`, `chase`, `march`, `scan`, `orbit`) avancen a saltos de 30 por segundo en vez de en cada fotograma: cada borde se repinta entero en cada paso, así que la mitad de pasos es la mitad de trabajo. Sin la variable no hay tope, salvo en equipos modestos (`quality()` = `low`), donde es 30. `0` lo quita.

## Morph: hover, foco y presión

```html
<a class="btn" data-ns="tl+br bevel 12; radius 2"
   data-ns-hover="tl+br bevel 20; radius 2"
   data-ns-press="all bevel 5; radius 2">Presióname</a>
```

El morph interpola **vértices**, no el texto del path, así que funciona igual en todos los navegadores. La duración se ajusta con `--ns-morph-time` (`320`, `320ms` o `.32s`; `0` = al instante). Cualquier cambio de `data-ns` o de `--ns-shape` también se anima.

## Bordes en movimiento (`data-ns-motion`)

```html
<div data-ns="card" data-ns-motion="scan march">…</div>
```

| Tipo | Efecto |
|---|---|
| `comet` | Cometa con estela que recorre el borde |
| `twin` | Dos cometas opuestos |
| `scan` | Barrido de luz que cruza el marco y enciende el borde a su paso. Viaja en la dirección de la diagonal de la forma (casi horizontal en una ancha; en una alta, en diagonal y cubriendo todo el alto) y en bucle continuo: al salir una pasada entra la siguiente. Dura `--ns-motion-time` (3,2 s) |
| `orbit` | Dos destellos que giran alrededor del centro |

`scan`, `orbit` y el giro de degradados (`data-ns-spin`) se animan con CSS (`transform`), no con SMIL: se pausan fuera de pantalla y funcionan igual en móviles. `scan` y el giro van además en el compositor: una capa con la máscara del trazo, rasterizada una vez, y dentro sólo cambia un `transform` (sin repintar el borde en cada fotograma). El giro sigue en la SVG si el marco tiene doble línea (`--ns-inner`) o dibujo de entrada (`data-ns-draw`).

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
