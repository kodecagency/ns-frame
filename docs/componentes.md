---
title: Componentes
description: Popovers, toasts, carrusel, skeletons, View Transitions y callouts HUD, todos con forma.
order: 7
---

# Componentes

Cada componente es un módulo opcional: sólo lo descargas si lo usas.

## Popovers y tooltips (`ns-frame/pop`)

```html
<button popovertarget="info">Info</button>
<div popover id="info" data-ns-arrow="tl+br bevel 10; radius 2">…</div>

<button data-ns-tip="ayuda">?</button>
<div popover="manual" id="ayuda" role="tooltip" data-ns-arrow="all round 8">…</div>
```

- **La flecha es parte de la forma:** el borde, el recorte y los efectos la rodean sin costuras.
- **Siempre apunta al disparador:** el navegador lo coloca con Anchor Positioning (con `position-try-fallbacks` para voltearlo si no cabe) y ns-pop mide dónde quedó para poner la flecha del lado correcto. Un tooltip sólo con CSS no puede hacerlo: el CSS no sabe qué alternativa eligió el navegador.
- **Popover API nativa:** Esc y click fuera cierran; `data-ns-tip` abre con hover y con foco de teclado, con `aria-describedby`.
- Sin Anchor Positioning, se posiciona con JS.
- Variables: `--ns-arrow` (9px), `--ns-pop-gap` (6px), `--ns-pop-bg`.

## Toasts (`ns-frame/toast`)

```js
import { toast, config } from 'ns-frame/toast'

toast('Cambios guardados', { type: 'ok' })
const t = toast('No se pudo enviar el formulario.', {
  type: 'error', title: 'Sin conexión', time: 0,      // time: 0 = no se cierra solo
  action: { label: 'Reintentar', onClick: enviar },
})
t.close()
config({ x: 'center', y: 'top', max: 4, time: 5000, shape: 'all bevel 10', enter: 'drop' })
```

- **Capa superior nativa:** la pila es un `popover="manual"`: queda por encima de todo, sin `z-index`. No usa `popover="hint"` a propósito: un `hint` se cierra al hacer click fuera y cuando se abre otro, lo que rompería la pila.
- **Entrada con apertura** (`open`, `split`, `iris`, `wipe`, `drop`) y salida inversa. La pila se reacomoda con animación.
- **El tiempo se consume en el borde.** Se pausa con el puntero, con el foco y con la pestaña oculta, y retoma el tiempo restante.
- **Pila automática:** el más nuevo queda junto al borde de la pantalla. Por encima de `max` se cierran los más antiguos, pero **los persistentes (`time: 0`) se quedan**, porque esperan una acción.
- **Accesible:** región `aria-live="polite"`; los errores usan `role="alert"`; Esc cierra el toast enfocado.
- **Seguro:** mensaje y título se insertan como texto, nunca como HTML.
- Tipos `info`, `ok`, `warn`, `error`. Colores: `--ns-toast-c`, `--ns-toast-ok`, `--ns-toast-warn`, `--ns-toast-error`; fondo `--ns-toast-bg`.

## Carrusel (`ns-frame/carousel`)

```html
<div data-ns-carousel aria-label="Proyectos" style="--ns-slide: calc((100% - 32px) / 3)">
  <article data-ns="card">…</article>
  <article data-ns="card">…</article>
</div>
```

- **Desplazamiento nativo:** `scroll-snap`, gesto táctil e inercia son del navegador; el módulo sólo añade los controles.
- **Flechas e indicadores con forma** (`data-ns-carousel="all bevel 8"` cambia la forma de las flechas); el indicador activo se alarga con morph.
- **Un indicador por posición alcanzable:** con 3 diapositivas visibles de 5 hay 3 posiciones. Si al final sobra recorrido, el final cuenta como una más.
- **Teclado:** ← → (invertidas en RTL), Inicio y Fin. Las flechas se desactivan en los extremos.
- **Accesible** (patrón carrusel de WAI-ARIA): región con `aria-roledescription`, diapositivas "n de N", `aria-current` en el indicador.
- Variables: `--ns-slide`, `--ns-gap`, `--ns-car`, `--ns-car-bg`, `--ns-car-dot`.
- No usa `::scroll-button` / `::scroll-marker`: son pseudo-elementos (no admiten formas ni comportamiento) y hoy sólo existen en Chromium.

## Skeletons (`ns-frame/skel`)

```html
<article data-ns="card" data-ns-pad data-ns-skeleton>
  <img data-ns="media" src="…" width="640" height="360" alt="…">
  <h3>Título de relleno parecido al real</h3>
  <p>Una o dos líneas de relleno…</p>
</article>
```

```js
card.removeAttribute('data-ns-skeleton')   // llegaron los datos
```

- **Heredan la forma real:** los huesos se miden sobre el propio layout. Cada línea de texto se vuelve una barra con su largo real; imágenes y controles, un bloque; los hijos con `data-ns` conservan su forma. Las barras llevan las esquinas del componente en miniatura.
- **CLS 0:** el contenido sigue ocupando su sitio, oculto, así que al quitar el atributo nada se mueve. Para que el resultado final también sea 0, el relleno debe parecerse al contenido real y las imágenes deben llevar `width`/`height` o `aspect-ratio`.
- **Un solo barrido de luz** sincronizado para toda la página, animando sólo `transform`; se pausa fuera de pantalla y desaparece con `prefers-reduced-motion`.
- **Accesible:** `aria-busy="true"` mientras carga; el contenido oculto no se lee ni recibe foco.

| Atributo / variable | |
|---|---|
| `data-ns-skeleton` | Activa el skeleton. Con valor, forma de las barras: `"all round 4"` |
| `data-ns-bone` | Dibuja ese elemento como un bloque (gráficos, grupos de iconos); con valor, su forma |
| `--ns-sk` · `--ns-sk-glint` | Color de los huesos · del brillo |
| `--ns-sk-time` · `--ns-sk-band` | Duración del barrido (1,8 s) · ancho de la banda (280px) |

`refresh(el?)` vuelve a medir si cambias el relleno por JS sin cambiar el tamaño.

## View Transitions (`ns-frame/vt`)

```js
import { morph } from 'ns-frame/vt'

morph(card, () => { grid.hidden = true; detail.hidden = false }, detail).then(() => title.focus())
morph(detail, () => { detail.hidden = true; grid.hidden = false }, card).then(() => card.focus())
```

- La tarjeta se transforma en la vista de detalle con la View Transitions API del navegador.
- **Los cortes no se estiran:** el grupo de la transición se recorta con `shape()` en `calc(% + px)`, así un chaflán de 18 px mide 18 px durante todo el recorrido. Si origen y destino tienen la misma estructura (`tl+br bevel 18` → `tl+br bevel 34`), una forma se interpola en la otra.
- El resto de la página cambia sin fundido (evita el contenido "fantasma" duplicado) y las dos capturas cubren el grupo aunque tengan proporciones distintas.
- Sin soporte, o con `prefers-reduced-motion`, el cambio es instantáneo. Opciones: `{ duration: 480, easing }`.
- **Mueve tú el foco** al destino, como en el ejemplo.

## Hoja arrastrable (`ns-frame/sheet`)

```js
import { sheet } from 'ns-frame/sheet'

const panel = dialog.querySelector('.hoja')
const s = sheet(panel, {
  onProgress: p => dialog.style.setProperty('--p', p),   // 1 = en su sitio, 0 = fuera
  onClose: () => dialog.close(),
})
closeButton.onclick = () => s.close()                    // sale por abajo, como al soltarla
```

```css
dialog::backdrop { opacity: var(--p, 1) }                 /* el fondo se aclara al bajarla */
```

- Como una hoja nativa: el panel **sigue al dedo o al ratón** hacia abajo, y hacia arriba con resistencia elástica.
- Al soltarla decide **por distancia y velocidad**: si bajó más del 35 % de su alto o se lanzó hacia abajo, sale y llama a `onClose()`; si no, vuelve a su sitio. Se puede atrapar a medio camino.
- Un arrastre no dispara el clic de lo que había debajo; un toque sigue siendo un clic (umbral: `threshold`, 6 px).
- Sólo mueve la propiedad `translate` (se combina con cualquier `transform` que ya tenga el panel) y usa los eventos agrupados del puntero para medir bien la velocidad en pantallas de 120 Hz.
- Pone `touch-action: none` en el asa (`handle`, por defecto todo el panel) y `overscroll-behavior: contain` en el panel.
- `--ns-sheet-p` queda en el panel durante el gesto; la clase `.ns-sheet-drag` mientras se arrastra.
- Con `prefers-reduced-motion`, el cierre y el regreso son inmediatos. Devuelve `{ close(), reset(), destroy() }`.
- Escape y el clic en el fondo los decides tú (en un `<dialog>`: evento `cancel` → `s.close()`).

## Isla de navegación (`ns-frame/isle`)

Una cápsula flotante que dice en qué sección estás y, al tocarla, abre una hoja con todas. Pensada para el móvil (en escritorio suele bastar una barra), pero funciona en cualquier pantalla. El marcado y las formas son tuyos:

```html
<nav data-ns-isle data-ns="all round 27" aria-label="Secciones">
  <button data-ns-isle-toggle aria-controls="menu">
    <span data-ns-isle-icon></span>
    <b data-ns-isle-label>Inicio</b> <small data-ns-isle-pos>1 / 6</small>
  </button>
</nav>
<div id="menu" data-ns-isle-panel data-ns="all squircle 30" role="dialog" aria-modal="true" aria-label="Secciones">
  <header data-ns-isle-handle>Secciones <button data-ns-isle-close aria-label="Cerrar">×</button></header>
  <a href="#inicio"><svg>…</svg>Inicio</a>
  <a href="#precios"><svg>…</svg>Precios</a>
  …
</div>
```

```js
import { isle } from 'ns-frame/isle'

const nav = isle(document.querySelector('[data-ns-isle]'), {
  pos: (i, n) => `${i + 1} de ${n}`,          // texto de posición
  onChange: (i, link) => { /* la sección actual cambió */ },
})
```

- **Sigue la sección en pantalla** con `IntersectionObserver` (la que cruza la línea de lectura, `line: .45` de la ventana): nada se mide en cada scroll. Actualiza el nombre, la posición, el icono (clona el `svg`/`img` del enlace) y `aria-current`.
- **La cápsula se pliega al bajar** (clase `.ns-mini`, a partir de `collapse: 200` px; `false` = nunca) y vuelve al subir. Plegada, anima sólo su ancho: con una forma de redondeo simple va por la vía rápida nativa y no recalcula nada.
- **Deslizar la cápsula** a los lados va a la sección anterior o siguiente (`swipe: false` lo desactiva). Un toque la abre.
- **La hoja entra moviendo sólo `translate`**, en el compositor: ni su tamaño ni su forma cambian durante la animación. Se prepara al apoyar el dedo (o al pasar el ratón o enfocar el botón), así que al abrirse ya está pintada: sin parón en el primer frame.
- **Se arrastra como una hoja nativa** (usa `ns-frame/sheet`, con el asa en `[data-ns-isle-handle]` o todo el panel) y se cierra al soltarla o lanzarla, con Escape, con el fondo o con `[data-ns-isle-close]`.
- **Accesible**: `aria-expanded` en el botón; la hoja es `inert` mientras está cerrada; al abrir, el foco va a la sección actual y al cerrar vuelve al botón.
- **Elegir una sección** cierra la hoja, actualiza la URL (`pushState`) y va hasta ella con `go(target, link)`; por defecto `scrollIntoView` suave, que respeta `scroll-padding-top` y `scroll-margin`.
- `data-ns-isle-panel="top"`: la hoja baja desde arriba.
- Variables: `--ns-isle-time` (.4s), `--ns-isle-ease`, `--ns-isle-scrim` (color del fondo), `--ns-isle-w` (ancho máximo de la hoja, 430px), `--ns-isle-z` (40). Clases: `.ns-hide` en la cápsula mientras la hoja está abierta, `.ns-open` en la hoja y el fondo.
- Devuelve `{ open(), close(), toggle(), go(i), index, destroy() }`. Con `prefers-reduced-motion`, todo es instantáneo.

## Callouts HUD (`ns-frame/link`)

```html
<div data-ns-link="#punto-a" data-ns-link-flow>Sensor térmico</div>
<i id="punto-a"></i>
```

Traza una línea recta más una diagonal a 45° desde el lado del elemento que mira hacia el destino. Usa coordenadas de página (el scroll no cuesta nada) y se recalcula al cambiar el tamaño de los extremos, del `<body>` o de la ventana (`refresh()` para forzarlo). Se ilumina al pasar el mouse por cualquiera de los extremos. Variables: `--ns-link`, `--ns-link-width`, `--ns-link-z` (en `:root`).
