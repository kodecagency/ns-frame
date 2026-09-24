---
title: Mosaico
description: Piezas libres en L, T, U o escalera que encajan con hueco constante, orbes con forma y contenido, y luz conectada en toda la figura.
order: 6.5
---

# Mosaico (`ns-frame/mosaic`)

Un bento donde las piezas no tienen que ser rectángulos. Cada área se dibuja con celdas, como en `grid-template-areas`, pero puede tener forma de L, T, U o escalera. Las piezas encajan entre sí con el mismo hueco en las rectas y en las curvas, y uno o varios **orbes** pueden abrir un hueco que recorta a sus vecinas.

```html
<script type="module" src="ns-frame.js"></script>
<script type="module" src="ns-mosaic.js"></script>

<div class="ns-mosaic hero-grid" data-ns-mosaic="wave ripple">
  <article data-ns-area="h">Portada</article>
  <article data-ns-area="a">…</article>
  <article data-ns-area="b">…</article>
  <article data-ns-area="x">…</article>
  <article data-ns-area="y">…</article>
  <div data-ns-orb><img src="foto.jpg" alt="…"></div>
</div>
```

```css
.hero-grid {
  --ns-areas: 'a h h b' 'a h h b' 'x x y y';
  --ns-row: 150px;
  --ns-gap: 14px;
  --ns-round: 22px;
  --ns-orb: 3 3 90 hex;
}
@media (max-width: 760px) {
  .hero-grid { --ns-areas: 'h h' 'h h' 'a b' 'x y'; --ns-orb: 2 3 56 hex; --ns-row: 120px }
}
```

## Plantilla

| Variable | Qué hace | Por defecto |
|---|---|---|
| `--ns-areas` | Filas entre comillas; cada nombre es un área; `.` deja la celda vacía | — |
| `--ns-row` | Alto de cada fila | `150px` |
| `--ns-gap` | Hueco entre piezas | `14px` |
| `--ns-round` | Radio de las esquinas convexas | `18px` |
| `--ns-round-in` | Radio de las esquinas cóncavas | `--ns-round` + hueco |
| `--ns-round-out` | Radio de las esquinas del contorno exterior del mosaico | `--ns-round` |
| `--ns-pad` | Padding del contenido de cada pieza | `22px` |

- **Hueco constante:** las esquinas cóncavas miden el radio más el hueco, así que una esquina convexa que encaja en una cóncava deja la misma distancia en la curva.
- **Responsive con CSS:** la plantilla es una variable. Cámbiala con media queries o container queries; al cambiar, las piezas se reubican (y con View Transitions se animan).
- **Contenido en el mayor rectángulo:** cada pieza recibe un padding automático para que el texto viva en el mayor rectángulo de su área, lejos de los huecos de los orbes. Se prefiere acortar en vertical para que el texto quede alineado con sus vecinas.
- **Accesible:** el orden del DOM no cambia; sólo cambia dónde se dibuja cada pieza.
- Cada hijo necesita `data-ns-area`. Un área que no aparece en la plantilla se oculta.

## Orbes

```css
--ns-orb: 3 3 96;                      /* columna, fila, radio: un círculo */
--ns-orb: 3 3 86 hex;                  /* hexágono (el radio es la apotema) */
--ns-orb: 3 3 70 diamond 15;           /* rombo girado 15° */
--ns-orb: 3 3 70 hex, 2 4 44 circle;   /* varios, cada uno con su forma */
```

- La posición va en **líneas de la cuadrícula**: `1` es el borde inicial y `3` es el hueco entre la columna 2 y la 3. Se admiten decimales.
- Formas: `circle`, `hex`, `diamond`, `square`, `tri` y `oct`.
- El hueco es concéntrico con el orbe: los lados se desplazan el valor de `--ns-orb-gap` (por defecto, el hueco del mosaico) y las esquinas repiten el radio de `--ns-orb-corner` más ese hueco. Donde el borde de la pieza se une al hueco hay una curva de enlace de radio `--ns-orb-round`.
- Cada orbe de la lista se empareja, en orden, con un hijo `[data-ns-orb]`, que se posiciona y recorta solo. **Puede tener contenido**: una foto, un dato o un botón. Si sólo es decoración, pon `aria-hidden="true"`.

## Luz conectada (`data-ns-mosaic`)

Efectos que tratan todo el mosaico como una sola figura. Se combinan libremente:

| Valor | Dónde | Qué hace |
|---|---|---|
| `wave` | bordes y fondos | Ondas que salen del primer orbe (o del centro) y cruzan todas las piezas |
| `ripple` | bordes y fondos | Una onda nace donde tocas o haces clic |
| `glow` | bordes y fondos | Una luz sigue al puntero por toda la figura |
| `sweep` | bordes y fondos | Un barrido diagonal recorre el mosaico |
| `scan` | bordes y fondos | Una línea horizontal baja por el mosaico |
| `trace` | bordes | Una luz corta recorre a la vez el contorno de cada pieza |
| `pulse` | bordes | Todos los bordes respiran juntos |
| `aurora` | fondos | Dos manchas de color derivan despacio por toda la figura |
| `dots` / `grid` | fondos | Puntos o retícula continuos: el patrón no se corta entre piezas |

Ajustes: `--ns-mo-light` (color de la luz), `--ns-mo-width` (grosor en los bordes), `--ns-mo-time` (duración), `--ns-mo-fill` (intensidad sobre los fondos), `--ns-mo-a1` y `--ns-mo-a2` (colores de la aurora), `--ns-mo-dot` y `--ns-mo-line` (color de los patrones).

- Los bordes y las luces usan una sola capa SVG sobre el mosaico, con los contornos de todas las piezas como máscara. La aurora y los patrones van en un `::before` de cada pieza, por detrás del contenido, alineados en coordenadas del mosaico.
- Todo se anima con `transform` y `opacity`. Las animaciones se pausan fuera de pantalla y se desactivan con `prefers-reduced-motion`; en alto contraste la capa desaparece.
- Como `::before` queda para los fondos compartidos, no combines `aurora`, `dots` o `grid` con las clases de patrón de `ns-fx.css` en la misma pieza.

## API

```js
import { refresh, parseAreas } from 'ns-frame/mosaic'
refresh()                                 // recalcula (p. ej. tras cambiar --ns-orb desde JS)
parseAreas("'a a b' 'c d b'")             // [['a','a','b'], ['c','d','b']]
```

Buenas prácticas: entre 5 y 10 piezas, una pieza ancla clara, orbes en cruces de líneas (donde se tocan 3 o 4 piezas) y filas lo bastante altas para que el recorte del orbe no se coma el texto.
