---
title: Sintaxis de formas
description: El mini lenguaje de ns-frame, con todas sus piezas y ejemplos.
order: 3
---

# Sintaxis de formas

Una forma es texto: declaraciones separadas por `;` o por saltos de línea. Se escribe en `data-ns`, en el atributo `shape` de `<ns-frame>` o en la variable CSS `--ns-shape`.

```html
<div data-ns="tl+br bevel 18; radius 3">…</div>
<ns-frame shape="panel">…</ns-frame>
<style>.card { --ns-shape: card } @media (max-width: 600px) { .card { --ns-shape: tl bevel 10 } }</style>
```

## Unidades

- Los valores van en **px**.
- `%` es relativo al lado (en las esquinas, al lado menor).
- Un número negativo en una posición se mide **desde el final**: `-20` es "a 20 px del final".
- Se pueden combinar: `100%-24`, `50%+8`.

## Esquinas

```
<esquina> <tipo> <tamaño> [tamaño-vertical] [rN]
```

| Esquina | |
|---|---|
| `tl` `tr` `br` `bl` | Arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda |
| `all` · `diag` · `anti` | Las cuatro · `tl`+`br` · `tr`+`bl` |
| `ss` `se` `es` `ee` | **Lógicas** (inicio-inicio, inicio-fin, fin-inicio, fin-fin): con `direction: rtl` se invierten solas |

Se combinan con `+`: `tl+br bevel 18`.

| Tipo | Forma |
|---|---|
| `bevel` | Chaflán recto |
| `notch` | Escalón (esquina hundida en ángulo recto) |
| `round` | Radius normal |
| `scoop` | Radius invertido (cóncavo) |
| `squircle` | Superelipse (esquina continua, estilo iOS / Figma) |
| `square` | Sin corte |

Con dos tamaños, el corte es asimétrico: `tl bevel 44 14` (44 px en horizontal, 14 en vertical). `rN` redondea los vértices de ese corte: `tl notch 24 r6`.

## Rasgos de los bordes

```
<borde> <rasgo> <desde> <hasta> <profundidad> [pendiente] [rN]
<borde> <rasgo> center <ancho> <profundidad> [pendiente] [rN]
<borde> none
```

| Borde | |
|---|---|
| `top` `right` `bottom` `left` | Físicos |
| `start` `end` | **Lógicos**: izquierda y derecha en LTR, al revés en RTL |

| Rasgo | Forma |
|---|---|
| `cut` | Muesca hacia dentro, con pendiente de 45° por defecto (`0` = recta) |
| `tab` | Pestaña que sobresale: el resto del borde baja `profundidad` |
| `scoop` | Mordida curva (tipo ticket) |

`<borde> none` quita los rasgos de ese borde (útil dentro de una consulta `@<N`).

## Polígonos libres

```
poly x y [rN] [aN], x y [rN] [aN], …
```

Cualquier polígono, con radius por vértice: `poly 28 0 r4, 100%-60 0, 100% 50%, 100%-60 100%, 28 100% r4, 0 100%-28, 0 28`.

`aN` hace que se llegue a ese vértice por un arco de radio N (horario; `a-N`, antihorario): `poly 0 0, 40% 0, 50% 20 a-20, 60% 0, 100% 0, 100% 100%, 0 100%` muerde el borde superior con un semicírculo. Así dibuja [el mosaico](mosaico.md) los huecos de sus orbes, y también compila a CSS `shape()`.

## Consultas por ancho del elemento

```
@<420 …    sólo si el elemento mide menos de 420 px de ancho
@>800 …    sólo si mide más de 800 px
```

Es el ancho **del propio elemento**, no de la ventana: la misma tarjeta cambia de forma en una columna estrecha aunque la pantalla sea grande.

## Global

| Declaración | |
|---|---|
| `radius N` | Fillet en **todos** los vértices, convexos y cóncavos |
| `dir rtl` | Fuerza RTL para las esquinas y bordes lógicos (útil al compilar con `css()` en el build) |
| `<preset>` | Una forma con nombre; se combina con más declaraciones |

## Presets

| Preset | Forma |
|---|---|
| `card` | `tl+br bevel 18; radius 3` |
| `button` | `tl+br bevel 10; radius 2` |
| `chip` | `all bevel 7; radius 1.5` |
| `soft` | `all bevel 22; radius 9` |
| `notch` | `all notch 12; radius 3` |
| `scoop` | `all scoop 16` |
| `wing` | `tl bevel 44 14; br bevel 44 14; radius 2` |
| `panel` | `tl bevel 26; br bevel 26; tr+bl bevel 8; top cut center 34% 6; radius 3` |
| `plate` | `all bevel 10; top+bottom cut center 36% 6; radius 2` |
| `tab` | `top tab 0 44% 10; all round 8; radius 4` |
| `ticket` | `left+right scoop center 26 13; all round 10` |
| `media` | `tl+br round 34; tr+bl bevel 18; radius 3` |
| `pill` | `tl+bl round 50%; tr+br bevel 12; radius 2` |
| `hud` | `tl bevel 20; br bevel 20; top cut 18% 42% 5; bottom tab -40% -14% 5; radius 2` |

Registra los tuyos con `define('mi-card', 'tl bevel 30; br round 12; radius 2')`.

## Ejemplos

```
card; top cut center 30% 6                   preset + ajuste
tl notch 24 r6; br scoop 20                  notch con radius + radius invertido
all squircle 24                              esquinas continuas
ss bevel 16; ee round 12                     lógicas: se invierten en RTL
panel; @<420 all bevel 10; @<420 top none    otra forma cuando el elemento es estrecho
left+right scoop center 26 13; all round 10  ticket
```

## Morph entre formas

Dos formas se interpolan vértice a vértice cuando tienen **la misma estructura**: cada esquina aporta 3 vértices y cada rasgo de borde 4. Cambiar `bevel 18` por `bevel 34`, o `round` por `squircle`, se anima; cambiar el número de rasgos de un borde cambia de golpe.
