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
  --ns-morph-time: 320ms;       /* 320, 320ms o .32s */
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

## Nombres de las variables

Todos los módulos siguen la misma convención, así lo que aprendes en uno vale en los demás:

| Qué | Nombre | Ejemplos |
|---|---|---|
| Duración | `--ns-<módulo>-time`: admite `320`, `320ms` o `.32s` | `--ns-morph-time`, `--ns-isle-time`, `--ns-drops-time`, `--ns-skel-time`, `--ns-mark-time` |
| Curva | `--ns-<módulo>-ease` | `--ns-isle-ease` |
| Radio | `--ns-<módulo>-radius` (y `-radius-in`, `-radius-out`) | `--ns-tabs-radius`, `--ns-isle-radius`, `--ns-mark-radius`, `--ns-mosaic-radius`, `--ns-orb-radius` |
| Ancho | `--ns-<módulo>-width` (el de una pieza: `--ns-<módulo>-<pieza>-width`) | `--ns-isle-width`, `--ns-isle-sheet-width` |
| Color de texto | `--ns-<módulo>-ink` (y `-ink-muted`, `-ink-hot`) | `--ns-glass-ink`, `--ns-tabs-ink`, `--ns-isle-ink`, `--ns-isle-action-ink` |
| Relleno / fondo | `--ns-<módulo>-fill` o `-bg` | `--ns-liquid-fill`, `--ns-tabs-fill`, `--ns-isle-bg` |

Los nombres anteriores siguen funcionando como alias: `--ns-mark-round`, `--ns-sk-time`, `--ns-round` (y `-in`, `-out`), `--ns-orb-round` y `--ns-mo-*` (hoy `--ns-mosaic-light`, `-width`, `-fill`, `-dot`, `-line`, `-a1`, `-a2`, `-speed` y `-fx-time`; `--ns-mosaic-time` es la duración de `arrange()`).

### Lo que se ajusta en cada componente

Nada visual va escrito a fuego: duraciones, curvas, tamaños y colores tienen su variable (en el propio elemento o en un antepasado).

| Módulo | Variables |
|---|---|
| Núcleo | `--ns-morph-time` · `--ns-open-time` y `--ns-close-time` (aperturas, 720 y 420) · `--ns-draw-time` · `--ns-focus`, `--ns-focus-width` |
| Isla | `--ns-isle-open-time` (600) y `--ns-isle-close-time` (480) de la transformación · `--ns-isle-item-time` (entrada del contenido, 320) · `--ns-isle-ease` · `--ns-isle-size` (alto de la cápsula, 54px) · `--ns-isle-width` · `--ns-isle-fill` (cápsula sin vidrio) · `--ns-isle-bg` y `--ns-isle-radius` (hoja) · `--ns-isle-ink`, `-ink-muted`, `-action-ink` · `--ns-isle-glow`, `--ns-isle-rim` · `--ns-isle-feather` |
| Hoja | `--ns-sheet-time` (máximo, 420) · `--ns-sheet-ease` |
| Pestañas | `--ns-tabs-speed` (1: más alto, más rápido) · `--ns-tabs-bounce` (1: el rebote de serie; 0: sin rebote) · `--ns-tabs-shrink-time`, `--ns-tabs-ease` · radios, tinte y tinta (ver Componentes) |
| Avisos | `--ns-toast-time` (entrada, 420), `--ns-toast-close-time` (260), `--ns-toast-move-time` (240), `--ns-toast-ease` · `--ns-toast-width` (400px), `--ns-toast-gap` · colores por tipo |
| Popovers | `--ns-pop-delay` (120), `--ns-pop-hide-delay` (80) · `--ns-pop-width` (340px) · `--ns-pop-bg`, `--ns-pop-gap` |
| Carrusel | `--ns-car-size` (flechas) · `--ns-car-dot-size`, `--ns-car-dot-on` · `--ns-car-time`, `--ns-car-ease` · `--ns-car`, `--ns-car-bg`, `--ns-car-dot` |
| Gotas | `--ns-drops-time`, `--ns-drops-ease`, `--ns-drops-stagger` · `--ns-drops-turn`, `--ns-drops-turn-time` · tamaños |
| Mosaico | `--ns-mosaic-ease` (reordenado) · `--ns-mosaic-dot-step`, `--ns-mosaic-grid-step` (patrones) · luz, grosor, relleno, velocidad, `-fx-time`, `-glow-size`, `-ripple-time` |
| Esqueleto | `--ns-skel-time`, `--ns-skel-fade-time` · `--ns-sk`, `--ns-sk-glint`, `--ns-sk-band` |
| Líneas (`link`) | `--ns-link`, `--ns-link-width` · `--ns-link-time` (flujo, 900) |
| Efectos | `--ns-u`, `--ns-u-glow`, `--ns-u-time`… · `--ns-aurora-1` a `--ns-aurora-4` (aurora y texto aurora) |
| Controles | `--ns-ui-*` (ver Componentes) |

Desde JS, el núcleo exporta `cssTime(el, "--variable", def)`, `cssNum` y `cssVal`, los mismos lectores que usan los módulos.

## Cascada predecible

Los estilos del runtime van en `@layer ns`: **tu CSS siempre gana**, sin importar el orden de carga ni la especificidad.

La otra cara: un reset total también gana. `all: unset` (habitual para limpiar un `<button>`) quita dos cosas que el borde necesita:

- `position: relative` en el marco: la capa del borde se coloca respecto a otro contenedor y el recorte la oculta.
- `box-shadow` en la vía rápida nativa, donde el borde es una sombra interior.

Resetea sólo lo que quieres quitar (`appearance: none; border: 0; font: inherit; color: inherit; …`) o vuelve a poner `position: relative` y no toques `box-shadow`. `audit()` (de `ns-frame/audit`) avisa de ambos casos: tipos `unanchored` y `reset`.
