---
title: Estilo y bordes
description: Variables CSS, bordes que siguen el corte, degradados, doble línea, acentos, foco y modo nativo.
order: 4
---

# Estilo y bordes

Todo se ajusta con **variables CSS**. No uses `border` de CSS en un elemento con forma: el borde lo dibuja ns-frame para que siga el corte.

```css
.card {
  background: #0b1520;          /* el fondo normal se recorta con la forma */
  --ns-border: #3de0ff88;       /* color del borde… */
  --ns-border: linear-gradient(to top, #3de0ff, transparent 75%);   /* …o degradado */
  --ns-border: radial-gradient(at 50% 100%, #3de0ff, transparent);
  --ns-border-width: 1px;
  --ns-inner: 6px;              /* doble línea, 6 px hacia dentro */
  --ns-inner-color: #3de0ff; --ns-inner-width: 1px; --ns-inner-opacity: .45;
  --ns-accent: #3de0ff;         /* brackets y cometa */
  --ns-accent-width: 2px;
  --ns-glow: drop-shadow(0 0 6px #3de0ff);   /* glow del borde */
  --ns-morph-time: 320;         /* ms */
  --ns-shape: card;             /* la forma, desde CSS */
}
```

Cambiar `data-ns` por JS, o una clase que cambie `--ns-shape`, anima la transición.

En pantallas táctiles (`hover: none` y `pointer: coarse`) `--ns-glow` no se aplica: un filtro sobre un borde animado se repinta en cada frame y en móviles puede ralentizar o congelar la animación. Si lo quieres igualmente, defínelo en `--ns-glow-touch`. En táctil tampoco hay hover (`data-ns-hover`); para el dedo usa `data-ns-press`.

## Atributos

| Atributo (`data-ns-*`) / en `<ns-frame>` | Qué hace |
|---|---|
| `data-ns` / `shape` | La forma. Vacío: se usa `--ns-shape` |
| `data-ns-hover` / `hover` | Forma en hover o foco, con morph |
| `data-ns-press` / `press` | Forma mientras se presiona (mouse, dedo o Enter/Espacio) |
| `data-ns-accent` / `accent` | Acentos: `corners 16` (brackets en las esquinas) o tramos en % del perímetro: `0 10, 50 10` |
| `data-ns-motion` / `motion` | Animación del borde (ver [Movimiento](movimiento.md)) |
| `data-ns-trace` / `trace` | Atajo de `data-ns-motion="comet"` |
| `data-ns-draw` / `draw` | El borde se dibuja al entrar en pantalla |
| `data-ns-spin` / `spin` | El degradado del borde gira (`"4s"`) |
| `data-ns-enter` / `enter` | Apertura al entrar en pantalla (ver [Movimiento](movimiento.md)) |
| `data-ns-scroll` / `scroll` | Forma final a la que se transforma mientras cruza la pantalla |
| `data-ns-native` / `native` | Modo nativo con `corner-shape` (ver abajo) |
| `data-ns-pad` / `pad` | Padding que respeta la forma (ver [Layout](layout.md)) |
| `data-ns-nest` | Forma concéntrica con el padre (ver [Layout](layout.md)) |

## Acentos

`data-ns-accent="corners 16"` dibuja brackets en cada esquina, 16 px hacia cada lado. Con tramos (`"0 10, 50 10"`) marcas porcentajes del perímetro. Los acentos se calculan en el módulo que se carga bajo demanda: mientras llega, el trazo espera oculto (nunca aparece una línea sin cortar).

## Foco

`clip-path` corta el contorno de foco nativo, así que en los elementos enfocables ns-frame dibuja un anillo que sigue la forma con `:focus-visible`. Se ajusta con `--ns-focus` (color) y `--ns-focus-width`. El anillo va por dentro del recorte: su color tiene que contrastar con el **fondo de la pieza**, no con el de la página (por defecto es `currentColor`, el color del texto, que ya contrasta).

**Sombras:** con `clip-path`, el recorte se come cualquier sombra exterior (`box-shadow`, `filter: drop-shadow()`) del propio elemento. `--ns-shadow` sólo sigue la forma en el modo nativo. Para cualquier forma, pon la sombra en un contenedor: `filter: drop-shadow(0 12px 24px rgb(0 0 0 / .18))` en el padre sigue el contorno recortado exacto.

**Alto contraste** (colores forzados de Windows): cada marco recibe un borde del sistema aunque no tenga `--ns-border`, y no usa la vía rápida nativa (el sistema quita las sombras interiores que la dibujan). Si se activa con la página abierta, los marcos se releen solos.

## Modo nativo (`data-ns-native`)

Si el navegador soporta `corner-shape` y la forma es **simple** (sólo esquinas, sin rasgos de borde ni fillets), el recorte lo hace el motor CSS: `border-radius` + `corner-shape` + `overflow: clip`, en vez de `clip-path`. Así **`box-shadow`, `outline` y los filtros exteriores siguen la forma**, algo imposible con `clip-path`.

En los navegadores sin soporte, o con formas complejas, se usa `clip-path` automáticamente. Durante morphs y aperturas también, y al terminar vuelve al modo nativo. `squircle` se traduce a `corner-shape: squircle`.

## Cascada predecible

Los estilos del runtime van en `@layer ns`: **tu CSS siempre gana**, sin importar el orden de carga ni la especificidad.

La otra cara: un reset total también gana. `all: unset` (habitual para limpiar un `<button>`) quita dos cosas que el borde necesita:

- `position: relative` en el marco: la capa del borde se coloca respecto a otro contenedor y el recorte la oculta.
- `box-shadow` en la vía rápida nativa, donde el borde es una sombra interior.

Resetea sólo lo que quieres quitar (`appearance: none; border: 0; font: inherit; color: inherit; …`) o vuelve a poner `position: relative` y no toques `box-shadow`. `audit()` (de `ns-frame/audit`) avisa de ambos casos: tipos `unanchored` y `reset`.
