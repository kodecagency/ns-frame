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
- **Accesible:** región `aria-live="polite"`; los errores usan `role="alert"`; Esc cierra el toast enfocado. Al cerrarse con el foco dentro, el foco vuelve a donde estaba (o a `back`, un elemento que se pasa en las opciones).
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
- `--ns-sheet-p` queda en el panel durante el gesto; la clase `.ns-sheet-drag` mientras se arrastra y `.ns-glass-hold` mientras vuelve o sale sola (un vidrio de ns-frame no se repinta en esos fotogramas).
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
- **La cápsula se convierte en la hoja**, como la Dynamic Island de Apple: una silueta nace con la forma y el tinte de la cápsula y crece con un muelle (rebote leve) hasta los de la hoja; al asentarse, la hoja ya está ahí y su contenido entra escalonado. Al cerrar, el camino inverso: el contenido se desvanece y la silueta vuelve a la cápsula. La silueta es una sola capa con desenfoque nativo que sólo cambia su recorte: durante la animación no se recalcula ninguna forma ni ningún vidrio (en Safari, antes, la hoja de vidrio se rasterizaba en cada fotograma de la subida).
- **La hoja se prepara al apoyar el dedo** (o al pasar el ratón o enfocar el botón), oculta en su sitio final: su vidrio ya está pintado cuando aparece. Radio final de la silueta: `--ns-isle-radius` en la hoja (32px). `morph: false` vuelve a la entrada desde abajo (sólo `translate`).
- **Se arrastra como una hoja nativa** (usa `ns-frame/sheet`, con el asa en `[data-ns-isle-handle]` o todo el panel) y se cierra al soltarla o lanzarla, con Escape, con el fondo o con `[data-ns-isle-close]`.
- **Accesible**: `aria-expanded` en el botón; la hoja es `inert` mientras está cerrada; al abrir, el foco va a la sección actual y al cerrar vuelve al botón.
- **Elegir una sección** cierra la hoja, actualiza la URL (`pushState`) y va hasta ella con `go(target, link)`; por defecto `scrollIntoView` suave, que respeta `scroll-padding-top` y `scroll-margin`.
- `data-ns-isle-panel="top"`: la hoja baja desde arriba.
- Variables: `--ns-isle-time` (.4s), `--ns-isle-ease`, `--ns-isle-scrim` (color del fondo), `--ns-isle-w` (ancho máximo de la hoja, 430px), `--ns-isle-z` (40). Clases: `.ns-hide` en la cápsula mientras la hoja está abierta, `.ns-open` en la hoja y el fondo.
- **De vidrio líquido:** añade `data-ns-glass` a la cápsula y a la hoja (con `ns-frame/glass`) y un `--ns-glass-tint` oscuro propio, así el texto blanco se lee sobre cualquier sección. La hoja tiene la página detrás: dale más desenfoque (`--ns-glass-blur: 16px`). No les pongas `background` (ganaría al vidrio) ni `contain: paint` (recortaría el canto); para antes de que cargue el vidrio, usa `:not(.ns-glass)` para un fondo opaco.
- Accesible: el foco entra en la hoja al abrirla y no sale con Tab mientras está abierta (modal); Escape y el fondo la cierran y el foco vuelve a la cápsula.
- Devuelve `{ open(), close(), toggle(), go(i), index, destroy() }`. Con `prefers-reduced-motion`, todo es instantáneo.

## Callouts HUD (`ns-frame/link`)

```html
<div data-ns-link="#punto-a" data-ns-link-flow>Sensor térmico</div>
<i id="punto-a"></i>
```

Traza una línea recta más una diagonal a 45° desde el lado del elemento que mira hacia el destino. Usa coordenadas de página (el scroll no cuesta nada) y se recalcula al cambiar el tamaño de los extremos, del `<body>` o de la ventana (`refresh()` para forzarlo). Se ilumina al pasar el mouse por cualquiera de los extremos. Variables: `--ns-link`, `--ns-link-width`, `--ns-link-z` (en `:root`).

## Lo que CSS todavía no hace

Cuatro módulos para cosas que la web pide desde hace años y CSS no resuelve. Se activan solos con su atributo, también en elementos añadidos después, y no hace falta llamar a nada. Todos son CSP-safe y sólo dependen del núcleo.

Desde la versión 0.10.0.

### Esquinas concéntricas (`ns-frame/concentric`)

```html
<article data-ns="tl+br bevel 36; tr+bl round 24">
  <img data-ns-concentric src="foto.jpg" alt="…">
</article>
```

- **Qué resuelve:** lo que va dentro de una forma redondeada debe llevar el radio exterior menos la distancia al borde, o las curvas no casan (la regla de `ConcentricRectangle` en SwiftUI). CSS no tiene una propiedad para eso: hay una propuesta abierta en el CSSWG ([issue #7707](https://github.com/w3c/csswg-drafts/issues/7707)), y mientras tanto se calcula a mano con `calc()`.
- **Con cualquier forma, no sólo redondeos.** Redondeo y squircle: radio − hueco. Chaflán: la diagonal se desplaza el hueco en perpendicular (baja ≈ 0,59 × hueco). Notch: el escalón conserva su tamaño. Scoop: el arco crece con el hueco. Cortes, pestañas y scoops de los bordes, fillets (`rN`, `radius`) y polígonos (`poly`) también se desplazan.
- **El hueco se mide en cada lado** y en cada cambio de tamaño del padre o del hijo: un botón al pie de una tarjeta hereda sólo las esquinas de abajo.
- **El padre** es el marco más cercano (`[data-ns]`, `[data-ns-nest]` o `<ns-frame>`), o el que indique el atributo con un selector: `data-ns-concentric=".card"`. Si el padre no tiene forma de ns-frame, se usa su `border-radius` de CSS.
- `--ns-concentric-min`: radio de las esquinas que quedan lejos de las del padre (`0` = en ángulo recto).
- **Escribe el `data-ns` del hijo:** no le pongas uno propio, se sobrescribe. Si cambias la forma del padre por JS sin tocar su `data-ns` ni su clase, llama a `refresh()`.
- Diferencia con `data-ns-nest` (núcleo, ver [Layout](layout.md)): `data-ns-nest` hereda las esquinas del marco padre; `data-ns-concentric` además sigue rasgos de los bordes y polígonos, mide el hueco de cada lado y funciona con padres que sólo tienen `border-radius`.

### Texto que llena la forma (`ns-frame/flow`)

```html
<article data-ns="all bevel 60; top cut center 40% 14" data-ns-flow style="height: 320px">
  <h3>…</h3>
  <p>…</p>
</article>
```

- **Qué resuelve:** el texto siempre se reparte en un rectángulo, aunque la caja tenga otra forma. CSS especificó `shape-inside` hace más de una década y ningún navegador lo ha implementado.
- **Cómo:** el contorno real de la forma (curvas, cortes, notches, polígonos) se mide y se describe con pares de flotantes invisibles con `shape-outside`, que sí es nativo. El navegador acomoda cada línea entre ellos. El elemento necesita una forma (`data-ns`).
- **Margen:** el valor del atributo en px (`data-ns-flow="22"`); si no, `--ns-pad`; si no, el padding que tuviera el elemento (y si no hay ninguno, 20 px). Se respeta en todo el borde, también en las curvas.
- **Necesita un alto definido** (`height`, `aspect-ratio`, una celda de grid…): la forma depende del alto y el texto del contorno. Con alto automático se ajusta como mucho tres veces y se detiene.
- **Contenido de bloque o en línea.** El elemento pasa a `display: flow-root` con `padding: 0` (clase `.ns-flow`). Un hijo con `display: flex`, `grid` u `overflow: hidden` se coloca como un rectángulo entero debajo de los flotantes.
- Se recalcula al cambiar el tamaño, la forma (`data-ns`) o las fuentes; nada si no cambió. `refresh()` fuerza una nueva medición.
- El orden y la selección del texto no cambian: los flotantes son `<i aria-hidden="true">` vacíos.
- `data-ns-flow="off"` lo desactiva. Dentro de un mosaico no hace falta: `ns-frame/mosaic` usa este mismo módulo en cada pieza.

### Resaltado en varias líneas (`ns-frame/mark`)

```html
<h2>Diseña con <mark data-ns-mark>formas que se adaptan a cada línea del texto</mark></h2>
```

```css
h2 mark { background: none; color: inherit; --ns-mark: #ffe066 }
```

- **Qué resuelve:** un fondo por línea es fácil (`box-decoration-break`), pero uno solo que abrace todas las líneas, con curvas hacia fuera y hacia dentro donde una línea es más corta que otra (el resaltado de las stories de Instagram), sólo se imitaba con un filtro de desenfoque + contraste: bordes borrosos, caro de repintar y sin trazo posible.
- **Cómo:** la unión de los rectángulos de cada línea, con un fillet en cada vértice (convexo o cóncavo) calculado por el motor de ns-frame. Un solo `<path>` SVG detrás del texto, que se redibuja al cambiar el ajuste de línea, el tamaño o el texto.
- **Color:** `--ns-mark`. Por defecto, el color de sistema `Mark`, legible en alto contraste. Quita el fondo nativo de `<mark>` (`background: none`) para que no se sume al resaltado.
- `--ns-mark-pad`: margen alrededor del texto, "vertical horizontal" (`2px 6px`). `--ns-mark-round`: radio de las curvas (`8px`); las que no caben se ajustan solas.
- `--ns-mark-border` y `--ns-mark-width`: trazo opcional del contorno.
- `data-ns-mark="draw"`: se dibuja de izquierda a derecha al entrar en pantalla (`--ns-mark-time`, `.9s`). Con `prefers-reduced-motion` aparece sin transición.
- Las líneas que no se tocan en horizontal quedan como piezas separadas.
- El SVG se inserta justo después del resaltado; el primer antecesor que no es en línea recibe `position: relative` e `isolation: isolate` (clase `.ns-mark-host`). `refresh()` redibuja si cambias algo que no detecta.

### Formas líquidas (`ns-frame/liquid`)

```html
<nav data-ns-liquid style="--ns-liquid: 14px; --ns-liquid-fill: #1c1c1f">
  <button>…</button> <button>…</button> <button>…</button>
</nav>
```

- **Qué resuelve:** el efecto "gooey" de la web es un filtro (desenfoque + contraste sobre píxeles): borde borroso, caro de repintar, sin trazo y con problemas en Safari. Aquí es geometría, con borde vectorial nítido.
- **Cómo:** cada hijo es un rectángulo redondeado, con su `border-radius` real (el de la esquina superior izquierda) y su posición real, transformaciones incluidas. Las formas a menos de `--ns-liquid` se funden con un puente cóncavo, como dos gotas, y el contorno se dibuja como un `<path>` SVG detrás de los hijos.
- `--ns-liquid`: hueco máximo (px) que se funde (`14`). Más cerca, puente más grueso; más lejos, gotas separadas. `0` = unión sin fundido.
- `--ns-liquid-fill` (por defecto `currentColor`), `--ns-liquid-border`, `--ns-liquid-width`: relleno y trazo del conjunto.
- **Los hijos no llevan fondo:** el conjunto lo pinta. `data-ns-blob` marca cuáles cuentan; si ninguno lo lleva, cuentan todos. Los ocultos (`visibility: hidden` u `opacity: 0`) no cuentan.
- **Sólo redibuja mientras algo se mueve** (transiciones, Web Animations, hover, foco, cambios de clase o estilo). En reposo no hace nada.
- Desde JS: `liquid(el, { blobs, k, step, glass })` devuelve `{ update(), destroy() }`. `blobs` es un selector o una función que devuelve los elementos. `field()` y `contour()` exponen el campo de distancias y sus contornos a cualquier nivel (0 = el borde, −8 = 8 px hacia dentro).

#### Vidrio líquido (`data-ns-liquid="glass"`)

```html
<nav data-ns-liquid="glass" style="--ns-liquid: 0px">
  <i data-ns-blob class="cápsula"></i>                      <!-- la barra entera, de vidrio -->
  <div data-ns-liquid="glass"><i data-ns-blob class="activa"></i></div>  <!-- lente más clara -->
  <button>…</button> <button>…</button>
</nav>
```

El material del Liquid Glass de Apple, en capas, con la forma exacta del grupo (también mientras se funde y se estira):

**Listo para usar:** no hace falta ninguna variable. Los valores por defecto se ajustan al tamaño y al fondo; las variables sólo sirven para afinar.

1. **Cuerpo:** el fondo desenfocado, saturado y tintado (`--ns-glass-blur` 3px, 7px en el tono claro; `--ns-glass-sat` 1.3; `--ns-glass-tint`).
2. **Lente:** el fondo se curva junto al borde como a través de un cristal grueso. El mapa de desplazamiento sale del mismo campo de distancias: cada punto a menos de `--ns-glass-depth` del borde toma el fondo un poco más allá, en la dirección de la normal, con una caída suave; `--ns-glass-lens` es la fuerza. **Por defecto dependen del tamaño**, como el cristal de Apple: la profundidad es el 42 % del lado corto (entre 8 y 36px) y la fuerza el 55 % (entre 10 y 44px), así que una barra o un botón refractan enteros y un panel grande sólo su borde. En Chromium va en `backdrop-filter` con un `feDisplacementMap`. Safari (y todos los navegadores de iPhone) y Firefox no admiten filtros SVG en `backdrop-filter`, pero sí en `filter`. Allí el vidrio pinta debajo una copia alineada del fondo, le aplica la lente y la desenfoca y tiñe encima, igual que al fondo real. Qué se copia:

   | Fondo | Copia |
   |---|---|
   | `<img>`, `<video>`, `<canvas>` legibles (mismo origen, o CORS) | **lente en WebGL**: refracción, desenfoque, saturación y canto en un solo paso en la GPU, recalculados con la forma de cada fotograma. Es el camino preferido. Los vidrios que tienen detrás la misma foto comparten su textura |
   | contenido HTML o la página, con WebGL | **lente en WebGL sobre la página rasterizada**: la zona bajo el vidrio se pinta en un canvas (fondos, esquinas, bordes, degradados lineales, imágenes con CORS y texto) y se repinta al desplazarse o al cambiar la página. Una barra fija sobre un feed refracta lo que pasa por detrás, a 60 fps |
   | `<img>` | la misma imagen, con su `object-fit`, `object-position` y `filter` |
   | `<video>`, `<canvas>` | un canvas que se redibuja con cada fotograma mientras el grupo está a la vista |
   | elemento con `background-image` | sus propiedades de fondo |
   | contenido HTML (texto, tarjetas, una lista que se desplaza por detrás de una barra fija) | en Firefox, `-moz-element()` en vivo; en Safari, un clon con los estilos calculados que se rehace cuando el original cambia (hasta 1500 nodos) |

   | la página, sin nada que elegir (una barra fija sobre texto y tarjetas, una foto con un título encima) | la **escena**: un clon de la página sólo en la zona bajo el grupo, más un margen para desplazarse; los bloques de fuera quedan como cajas vacías del mismo tamaño para que todo siga en su sitio. Se rehace cuando la página cambia o cuando el grupo se aleja de la zona (unos 20–80 nodos para una barra) |

   **Sin indicar nada**, se detecta: una imagen, un vídeo o un canvas anterior que cubra el centro del grupo, o el antepasado con `background-image`, si es de verdad lo primero que se ve debajo; si no, la escena. Para elegirlo tú:

   ```html
   <main id="feed">…</main>
   <nav data-ns-liquid="glass" data-ns-liquid-src="#feed">…</nav>   <!-- barra fija sobre el feed -->
   ```

   `data-ns-liquid-src` (o la opción `source`) es un selector —se busca el más cercano subiendo por los antepasados—, un elemento, `page` para la escena o `none` para desactivarlo. La copia sigue al original al desplazarse, sin recalcular la forma, y se recorta a la forma antes de la lente (como hace Chromium con el fondo): lo que queda fuera no entra doblado por el canto.

   **Tono:** el vidrio mira lo que pasa por detrás (un color liso, o la zona exacta de una foto legible con CORS) y se adapta al desplazarse:
   - **sin tinte propio**, sobre lo claro se aclara (clase `ns-glass-light`, tinte `--ns-glass-tint-light`) y vuelve a oscurecerse sobre lo oscuro;
   - **con un `--ns-glass-tint` propio** (un vidrio oscuro de diseño, como una barra de pestañas) no se invierte: sobre lo claro se oscurece un poco más (clase `ns-glass-deep`, `--ns-glass-deep`) y el texto sigue blanco, como la barra de Instagram.

   `--ns-glass-ink` da siempre el color de texto que contrasta (`color: var(--ns-glass-ink)`). Úsalo en el contenido del vidrio y el contraste queda resuelto solo.
3. **Canto:** un brillo junto al borde que se desvanece hacia dentro, sin línea interior (`--ns-glass-edge`, 8px). Va dentro del filtro de la lente (Chromium no recorta un `backdrop-filter` con la máscara del propio elemento); sin lente, una capa aparte de respaldo. En todos los navegadores.

> El contenido de un vidrio va dentro de elementos (`<button><span>+</span></button>`): un texto suelto quedaría bajo las capas del vidrio.
4. **Luz:** un reflejo especular fino que recoge la luz arriba y la devuelve tenue abajo, y un brillo interior (`--ns-glass-shine`, 0–1).

- El recorte es una máscara SVG del propio documento (`mask: url(#…)`, se actualiza cambiando un `<path>`, sin imágenes) y además `clip-path: path()`: Chromium no aplica un `clip-path` libre al desenfoque de fondo si un antepasado recorta con esquinas redondeadas (lo normal en una tarjeta) y pintaría el rectángulo entero; la máscara sí la respeta. WebKit, al revés: no aplica a HTML una máscara que apunta a un `<mask>` del documento (la capa desaparecería entera), así que allí el cuerpo se recorta sólo con `clip-path` y el canto usa la misma máscara como imagen SVG en línea.
- **Sin parpadeos:** el mapa de la lente es una imagen generada en local (la CSP necesita `img-src data:` para la lente; sin ella queda el resto del vidrio). Hay dos filtros que se turnan: el mapa nuevo se prepara en el que no se usa y sólo se cambia cuando ya está decodificado (un filtro sin mapa desplazaría todo el fondo durante un frame). Mientras la forma se mueve, el mapa vigente se estira con ella; al detenerse se regenera, codificado fuera del hilo principal.
- **Rendimiento:** el campo sólo hace la unión suave cerca de los puentes, la rejilla pasa a 3 px en grupos grandes, el estado de movimiento sale de los eventos de transición y los estilos se leen en caché. Medido con la CPU ×4: ~17 ms por frame en movimiento, sin fotogramas largos.
- Sin `backdrop-filter`, el vidrio usa un tinte casi opaco (`--ns-glass-solid`) para que el contenido se lea.
- **No pongas `filter`, `opacity < 1`, `mask` ni `backdrop-filter` en un antepasado del grupo:** lo convierten en la raíz del fondo y el vidrio sólo vería lo que hay dentro de él.
- Con `prefers-reduced-transparency` se vuelve opaco (`--ns-glass-solid`); en alto contraste desaparece y queda el trazo del sistema.
- Las transiciones de los hijos son tuyas: respeta tú `prefers-reduced-motion`. En alto contraste deja un trazo del sistema (`CanvasText`).
- Limitación: sólo entiende rectángulos redondeados. Un hijo con `data-ns` o `clip-path` se funde como su caja, no como su forma.
- El contorno pasa por puntos exactos del campo y se traza con cúbicas (Catmull-Rom), con los lados rectos en línea: un círculo sale redondo con menos de 0,05 px de error. La rejilla se adapta al tamaño (entre 1,25 y 3 px). Para que dos gotas separadas no se abomben una hacia la otra, déjalas a más de `--ns-liquid × 2,4` de hueco.
- Si mueves piezas por JS en cada frame, `liquid(el).frame()` redibuja sin releer estilos (los estilos en línea de las piezas ya sólo despiertan el bucle).

#### Vidrio en cualquier elemento y cualquier forma (`ns-frame/glass`)

```html
<aside data-ns-glass>…</aside>                                   <!-- con su border-radius -->
<article data-ns="panel" data-ns-glass>…</article>               <!-- con la forma del marco -->
<article data-ns="hud" data-ns-glass="facet prism">…</article>   <!-- cristal tallado + prisma -->
```

El material de `ns-frame/liquid` (cuerpo, lente, canto, reflejos) sobre cualquier elemento, con su **forma exacta**: chaflanes, muescas, cortes, pestañas, curvas y squircles de ns-frame, o su `border-radius` esquina por esquina (elíptico incluido). La lente sale del **campo de distancias del propio path**: se rellena en un canvas y se calcula la distancia euclídea exacta (transformada de Felzenszwalb, lineal), así que el fondo se curva igual junto a un chaflán que junto a una esquina redonda. El recorte y los reflejos usan el path exacto. Lente en todos los motores, como en `ns-frame/liquid`: en Safari y Firefox, sobre una copia del fondo.

- `data-ns-glass="clear"`: casi sin tinte, una lente. `"tint"`: más cuerpo, para texto largo.
- **Sin contorno: el canto lo dibuja la luz.** Cada tramo del contorno tiene su normal y brilla según el ángulo con la luz: fuerte y estrecho donde mira hacia ella, un reflejo tenue enfrente y casi nada en los costados, como el especular del Liquid Glass. Un chaflán es una cara que se enciende entera; una curva, un degradado. Se pinta en un canvas recortado a la forma (el brillo queda por dentro del borde, nítido) con mezcla `lighten`, así que los tramos se unen sin costuras. La luz sigue al puntero; sin puntero fino (móvil), barre el canto al desplazar la página, sin pedir permisos de giroscopio; con movimiento reducido queda fija arriba a la izquierda. Una **sombra** suave (`--ns-glass-shadow`, `none` para quitarla) separa el cristal del fondo. El borde de ns-frame (`--ns-border`) no se dibuja sobre el vidrio (quedaba un doble contorno); si lo quieres, `data-ns-glass="border"`.
- **`"facet"` — cristal tallado.** Además, cada cara tiene una banda hacia dentro que se ilumina con ella y una arista de corte (`--ns-facet-width`, 8px), y la lente es **plana por caras**: dentro de la banda, el fondo se desvía lo mismo en toda la cara, así que se ve partido en cada corte, como a través de una gema.
- **`"prism"` — dispersión.** En el canto, el rojo se desvía un poco más y el azul un poco menos que el verde, como un cristal real: tres desplazamientos que se suman. Sólo se monta si se pide.
- **Halo:** `--ns-glass-glow` (color) y `--ns-glass-glow-size`: un brillo que sigue la forma y sólo se ve por fuera.
- Un marco de ns-frame con vidrio **no se recorta con `clip-path`**: haría de raíz del fondo y el vidrio no vería la página. La silueta la pone el vidrio y el borde del marco se sigue dibujando. Lo que haya dentro no se recorta: si una imagen llega a los cortes, recórtala con su propio `data-ns`.
- **Con los efectos de `ns-fx.css`:** con `data-ns-glass`, la luz en U y el aura quedan dentro del cristal (sin aislar el elemento ni ponerle fondo opaco), los patrones (`ns-dots`, `ns-grid`…) se ven a través de él, y `ns-halo` pasa a ser el halo del propio vidrio (sin `filter` en el elemento). El borde que gira, el cometa, el destello y el pulso funcionan tal cual.
- **Rendimiento:** la forma y el campo sólo se recalculan si cambian el tamaño o la forma; la luz de las facetas sólo cambia opacidades (como atributo SVG, sin despertar a nadie), lee todas las posiciones antes de escribir y sólo en las piezas a la vista; y los vidrios que aparecen a la vez se reparten entre frames con un presupuesto de ~8 ms por frame. Doce piezas con la CPU ×4: 16 ms de bloqueo al cargar y 14,6 ms por frame moviendo el puntero, sin frames lentos.

- **`"u"` — luz en U dentro del cristal.** El tinte del vidrio lleva la luz en U de la base (`--ns-u`) y el canto de abajo brilla con su color aunque la luz venga de otro lado, como el borde de `ns-u`.
- **Aumento** (`--ns-glass-zoom`, 0–1): todo el interior aumenta lo que hay debajo, como una lupa (lo usa el indicador de `ns-frame/tabs` al levantarse). El mapa de la lente se regenera en cuanto cambian sus variables, aunque la forma siga en marcha.

#### La luz de la página (`ns-frame/light`)

El motor que comparten el relieve y el canto del vidrio: **una sola luz direccional para toda la página** (arriba, algo a la izquierda; el puntero la gira un poco, en el móvil el desplazamiento, con movimiento reducido queda fija) y los **materiales compilados en filtros SVG de iluminación** (`feDiffuseLighting`, `feSpecularLighting`), que el navegador calcula a la resolución real de la pantalla. Todo lo que tiene volumen se ilumina desde el mismo sitio, así que un panel con relieve, una barra de vidrio y un botón combinan sin contradecirse. `material(parámetros)` devuelve el id de un `<filter>`; cada combinación se compila una vez y la comparten todas las piezas que la usan.

- **Superficie** (relieve): cara de su color, línea de luz en el canto, sombras de contacto y ambiente, hundido.
- **Canto** (vidrio): sólo la luz del canto, sin cara: una línea especular donde el borde mira a la luz y un reflejo tenue enfrente. En el vidrio: `--ns-glass-rim` (intensidad), `--ns-glass-rim-back` (reflejo opuesto, 0–1) y `--ns-glass-rim-color` (su color: la variante `u` lo tiñe con `--ns-u`).

#### Relieve (`ns-frame/relief`)

```html
<article data-ns="card" data-ns-relief>…</article>
<button role="switch" aria-checked="true" data-ns-relief="inset"><i data-ns-relief></i></button>
<div role="group" data-ns-relief="inset">
  <button data-ns-relief="select" aria-pressed="true">Auto</button><button data-ns-relief="ghost" aria-pressed="false">Frío</button>
</div>
```

La tendencia propia de ns-frame: superficies con un **volumen mínimo y exacto, calculado de la forma**, como el hardware bien hecho (no el plástico del esqueuomorfismo). Con cualquier forma: chaflanes, muescas, cortes, curvas o `border-radius`.

**Un motor de materiales** sobre los filtros de iluminación de SVG (`feDiffuseLighting`, `feSpecularLighting` y una luz direccional), que el navegador calcula a la resolución real de la pantalla: nítido a cualquier zoom y en todos los motores, Safari incluido. La silueta exacta de la pieza, desenfocada, es el mapa de alturas del bisel, y de ahí sale todo sin costuras:

- **Cara** exactamente de su color (`--ns-relief`, o el fondo del padre: la pieza se lee por el volumen, no por un borde). La difusa sólo oscurece, con un mínimo, lo que no mira a la luz.
- **Canto:** una línea de luz donde el borde mira a la luz (especular dura: no toca la cara plana). El chaflán de una tarjeta recibe su propia luz.
- **Dos sombras:** de contacto (pequeña y nítida) y ambiental (amplia y suave).
- **Hundido:** la altura se invierte (el canto queda arriba) y aparece una sombra interior.
- **Materiales como parámetros:** `surface` (paneles; por defecto a partir de 60 px), `raised` (controles), `knob` (mando de interruptor, más redondo), `inset`; tonos `metal` y `paper`. Ajuste fino: `--ns-relief-bevel`, `--ns-relief-height`, `--ns-relief-gloss`, `--ns-relief-shadow` (0 = sin sombras). **Cada combinación se compila una vez en un `<filter>` compartido** por todas las piezas que la usan: cien botones, un filtro.
- **Una luz para toda la página:** desde arriba; el puntero sólo la gira un poco (en el móvil, el desplazamiento; con movimiento reducido, fija). Moverla es cambiar un atributo de cada filtro.
- **El estado se ve en el volumen:** se hunde mientras se pulsa (puntero, Espacio o Enter); con `aria-pressed` / `aria-checked="true"` queda hundido; `select` hace lo contrario, sube al estar elegido (el segmento activo en su carril, como en iOS); `ghost` no dibuja nada hasta que se elige o se pulsa. El color se relee al cambiar el estado (un interruptor encendido en verde con `--ns-relief` en su selector).
- La capa va detrás del contenido (el elemento aísla su apilamiento) y un marco de ns-frame con relieve no se recorta con `clip-path` (cortaría la sombra).

#### Pestañas de vidrio líquido (`ns-frame/tabs`)

```html
<nav data-ns-tabs aria-label="Periodo">
  <button>Semana</button> <button aria-pressed="true">Mes</button> <button>Año</button>
</nav>
```

La barra de pestañas de iOS 26, hecha con dos grupos de `ns-frame/liquid` (la barra y el indicador):

- **Pulsa** una pestaña y el indicador viaja con un muelle (llega con un rebote corto), se **estira** un poco en la dirección del movimiento según la velocidad (y se aplana, para conservar el volumen). Con `data-ns-tabs="drop"`, además deja una gota detrás que se funde con él (por defecto no: más limpio).
- **`data-ns-tabs="shrink"`:** como la barra de iOS 26, se encoge un poco (`--ns-tabs-min`, 0,84) al desplazar hacia abajo y vuelve al subir o al tocarla. Escucha la página, o el contenedor de `data-ns-tabs-scroll="selector"`. Sólo cambia `scale`: el vidrio escala con la barra sin recalcular nada (`ns-frame/liquid` mide sus piezas en coordenadas del grupo, así que funciona bajo cualquier escala).
- **Arrastra** desde cualquier pestaña, o mantén pulsada la activa, y el indicador **se levanta**: crece un 14 % y se vuelve una lente clara que **aumenta** lo que hay debajo (`--ns-tabs-zoom-lift`, 0,55; `--ns-tabs-lens-lift`, `--ns-tabs-tint-lift`). Dentro de una barra con `data-ns-liquid-src`, el indicador hereda ese fondo (en Safari, su lente se aplica sobre la misma copia). Sigue al dedo; más allá de los extremos se resiste como una goma, y al soltar encaja en la pestaña más cercana. Un gesto más vertical que horizontal es un desplazamiento de la página, no un arrastre.
- **Teclado:** flechas (dan la vuelta en los extremos; al revés en RTL), Inicio y Fin. Con `role="tablist"` y `role="tab"` usa `aria-selected` y foco itinerante; si no, `aria-pressed`.
- La pestaña elegida lleva la clase `ns-tabs-on`. La pestaña bajo el indicador lleva la clase `ns-tabs-hot` mientras la lente pasa por encima (para cambiar el color del texto a la vez). Evento `change` con `detail { index, tab }`; `tabs(el).select(i)` la cambia por código.
- Vidrio o sólido como cualquier grupo líquido (`data-ns-liquid="glass"` por defecto; `""` para sólido, con `--ns-tabs-fill`). El indicador sigue al material de la barra.
- Variables: `--ns-tabs-radius` (999px), `--ns-tabs-ind-radius`, `--ns-tabs-fuse` (16px, cuánto se funde la gota), `--ns-tabs-tint`, `--ns-tabs-blur`, `--ns-tabs-lens`, `--ns-tabs-depth`, `--ns-tabs-edge` y sus versiones `-lift`.
- Con `prefers-reduced-motion`: sin muelle, sin estiramiento y sin levantarse. Los muelles se integran en subpasos: con pocos frames (un móvil con carga) siguen estables y llegan a tiempo.
