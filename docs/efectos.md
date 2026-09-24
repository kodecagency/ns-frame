---
title: Efectos
description: ns-fx.css — luz en U con animaciones de conjunto, aura, aurora, halo, patrones y texto animado.
order: 8
---

# Efectos (`ns-fx.css`)

Clases de CSS puro que cualquier marco recorta con su forma. Se combinan con cualquier forma, borde y animación de borde porque cada capa es independiente.

```html
<link rel="stylesheet" href="…/dist/ns-fx.css">
```

## Luz en U (`ns-u`, `ns-aura`)

La base se llena, esquinas incluidas, y la luz se desvanece **de abajo hacia arriba y de afuera hacia adentro**, abrazando la base y los costados.

```html
<article class="ns-u" data-ns="all round 18">…</article>     <!-- tarjeta destacada -->
<section class="ns-aura">…</section>                          <!-- fondo de sección -->
```

- **Direcciones:** `ns-u` (sube), `ns-u-top` (baja), `ns-u-left`, `ns-u-right`. El borde se enciende en el mismo lado. En secciones: `ns-aura` y `ns-aura-top`.
- **Sin blur:** degradados estáticos que se pintan una vez; `ns-aura` sólo anima `opacity`.

| Variable | Qué controla | Por defecto |
|---|---|---|
| `--ns-u` | color | `#3de0ff` |
| `--ns-u-glow` | intensidad (0–1) | `.6` |
| `--ns-u-rise` | altura de la luz en la base | `42%` |
| `--ns-u-side` | ancho de la luz en los costados | `22%` |
| `--ns-u-corner` | tamaño del foco en las esquinas | `62%` |
| `--ns-u-fade` | hasta dónde llega el desvanecido | `88%` |
| `--ns-aura-1/2`, `--ns-aura-o` | colores e intensidad del fondo de sección | cian, violeta, `.55` |

### Animaciones

| Clase | Movimiento |
|---|---|
| `ns-u-hover` | Sube e intensifica al pasar el mouse o enfocar |
| `ns-u-live` | **Todo el conjunto respira:** la intensidad baja un poco, se recupera y crece apenas por encima (7 s) |
| `ns-u-tide` | **Marea:** la luz sube despacio por los costados y vuelve a la base (10 s) |
| `ns-u-surge` | **Pulso de energía:** la luz trepa por los bordes del marco y se asienta (6 s) |
| `ns-u-breathe` | Respira (sólo `opacity`) |
| `ns-u-hue` | El color recorre una paleta |

Las animaciones de conjunto mueven a la vez la base, los costados, las esquinas **y el tramo encendido del borde**, con curvas suaves. Animan dos multiplicadores registrados con `@property` (`--ns-u-h` altura, `--ns-u-k` intensidad), así que respetan tus valores. La duración se ajusta con `--ns-u-time`. Repintan la capa de luz en cada frame (por tarjeta es barato); con `ns-frame/fx` se pausan fuera de pantalla.

## Otros efectos

| Clase | Efecto |
|---|---|
| `ns-aurora` | Borde multicolor; con `data-ns-spin`, gira |
| `ns-halo` | En un contenedor: glow exterior que sigue la forma |
| `ns-pulse` | Glow que respira |
| `ns-dots` `ns-grid` `ns-lines` `ns-stripes` `ns-scales` `ns-scan` | Patrones de fondo (`--ns-pat`, `--ns-pat-size`, `--ns-pat-mask`) |
| `ns-shimmer` | Destello que barre el elemento |
| `ns-text-shimmer` · `ns-text-aurora` | Texto con brillo · multicolor animado |

Los patrones y `ns-u-live`/`tide`/`surge`… usan capas distintas (`::before` y `::after`), así que se combinan.

## Texto que se descifra (`ns-frame/fx`)

```html
<h2 data-ns-decode>DECODE_42</h2>             <!-- al entrar en pantalla -->
<b data-ns-decode="hover">Pasa el mouse</b>
```

El texto real queda en `aria-label`, así que los lectores de pantalla no leen los caracteres aleatorios.

Todos los efectos respetan `prefers-reduced-motion`.
