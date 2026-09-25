# Changelog

## Sin publicar

### Vidrio líquido (`ns-frame/liquid`)
- `data-ns-liquid="glass"`: el material del Liquid Glass de Apple, con la forma exacta del grupo: cuerpo desenfocado y tintado, **lente** que curva el fondo junto al borde (mapa de desplazamiento sacado del propio campo de distancias; Chromium), canto que brilla y se desvanece hacia dentro sin línea interior, y reflejo especular. `prefers-reduced-transparency` lo vuelve opaco.
- El recorte del vidrio usa además una máscara: Chromium ignora un `clip-path` libre en el desenfoque de fondo dentro de un contenedor redondeado y pintaba el rectángulo entero.
- El contenedor ya no usa `isolation` (hacía de raíz del fondo) y las capas se apilan por orden.
- El puente entre gotas sale redondo, no en punta hacia la vecina.
- `field()` y `contour()` exponen el campo y sus contornos a cualquier nivel.
- **Lente en Safari y Firefox:** con `data-ns-liquid-src="selector"` (u `o.source`) el vidrio pinta debajo una copia alineada del fondo (imagen o `background-image`) y le aplica la lente con `filter: url()`, que sí funciona fuera de Chromium. Allí el filtro usa la región del objeto y un mapa a tamaño de la capa: WebKit hace desaparecer el elemento con `filterUnits="userSpaceOnUse"`.
- **Vidrio visible en Safari:** WebKit no aplica a HTML una máscara `url(#…)` del documento y la capa del cuerpo desaparecía (el vidrio no desenfocaba nada). En WebKit el cuerpo se recorta sólo con `clip-path` y el canto usa la máscara como imagen SVG en línea.
- **Sin parpadeo:** el recorte pasa a una máscara SVG del documento (sin imágenes por frame) y la lente usa dos filtros que se turnan; el mapa nuevo sólo entra cuando ya está decodificado (antes, durante un frame el filtro leía un mapa vacío y desplazaba todo el fondo). En movimiento el mapa se estira; al detenerse se regenera con `toBlob`, fuera del hilo principal.
- **Más rápido:** unión suave sólo cerca de los puentes, sin desestructurar en el bucle caliente, rejilla adaptativa, movimiento detectado por eventos y estilos en caché. CPU ×4: de ~38 a ~17 ms por frame, sin fotogramas largos.
- Sin `backdrop-filter`, tinte casi opaco.

### Mosaico
- Efecto nuevo `stream` (corriente): tres luces corren por los bordes de las piezas y saltan de una a la vecina donde se tocan (el contorno real de cada pieza y del anillo del orbe se muestrea y se buscan los relevos); cada una se desvanece en degradado y lleva un foco que enciende los bordes por donde pasa. `--ns-mo-speed`.
- **Arreglo:** las capas animadas ya no se rehacen en cada `resize` si nada cambió: en el móvil, la barra del navegador al subir y bajar reiniciaba las animaciones.

### Arreglos
- Núcleo: la primera apertura o cierre (`open`, `close`, y con ellos el primer toast) antes de que cargaran los extras fallaba: la promesa de carga no devolvía el módulo.
- Compatibilidad: toasts y popovers funcionan sin Popover API (Safari < 17, Firefox < 125): antes `toast()` lanzaba un error y los popovers se veían siempre. Los tooltips se abren con un toque en pantallas táctiles.
- `ns-fx.css`: la luz en U tiene valores de respaldo donde no hay `@property` (Firefox 115, Safari < 16.4); antes desaparecía.
- `overflow: clip` con respaldo `hidden` (Safari 15).
- `sheet`: si el navegador cancela el gesto, la hoja vuelve a su sitio (antes podía cerrarse); con todo el panel como asa y contenido con scroll, el scroll táctil ya no se bloquea.
- `concentric`: con huecos distintos en cada lado, la esquina usa el menor (una foto con 6 px al lado y 70 abajo ya no hereda un chaflán en la esquina lejana).
- `mark`: el resaltado se redibuja al cambiar una clase (color, margen, radio), no sólo al cambiar el texto.
- Núcleo: fuera de pantalla sólo se pausa con `animation-play-state` (sin `pauseAnimations()` del SVG, que ya no hacía falta).

### Sitio
- Demo de vidrio líquido sobre una foto: barra con lente clara que se estira y acciones que se separan en gotas de vidrio; «Vidrio / Sólido».
- `content-visibility: auto` desactivado en WebKit de Apple con una detección en CSS (en iPhone podía reiniciar las animaciones al volver a una sección). Al hacerlo por CSS y no por JS, la carga vuelve a ser rápida.
- Tarjeta concéntrica con chaflán 24 (el botón al pie ya no queda comido por el chaflán con huecos pequeños).

## 0.10.0 — lo que CSS todavía no hace

### Lo que CSS todavía no hace
Cuatro módulos que resuelven con geometría real lo que la web sólo imitaba con capturas, filtros borrosos o cálculos a mano.
- **`ns-frame/concentric` (2,4 KB)**: esquinas concéntricas automáticas con `data-ns-concentric`. El hijo repite la forma del padre desplazada el hueco: redondeos − hueco, chaflanes − 0,59 × hueco, muescas que conservan su tamaño, scoops que crecen, cortes y pestañas de los bordes con la misma profundidad y la boca desplazada, fillets y `poly`. Si el padre no es un marco, usa su `border-radius`. `--ns-concentric-min` redondea las esquinas que quedan lejos de las del padre. CSS no tiene nada equivalente (hay una propuesta abierta en el CSSWG, sólo para redondeos).
- **`ns-frame/flow` (2,0 KB)**: el texto llena la forma con `data-ns-flow`, con el mismo margen en todo el contorno (curvas, diagonales, vértices). Es el `shape-inside` que CSS especificó y ningún navegador ha implementado, hecho con `shape-outside` nativo. El mosaico lo usa también (antes lo llevaba dentro).
- **`ns-frame/mark` (2,1 KB)**: resaltado continuo en varias líneas con `data-ns-mark`: un solo contorno con curvas hacia fuera y hacia dentro, nítido y con trazo opcional, en vez del filtro de desenfoque habitual. `data-ns-mark="draw"` lo dibuja al entrar en pantalla. Se redibuja al cambiar el texto o el ajuste de línea.
- **`ns-frame/liquid` (2,5 KB)**: formas líquidas con `data-ns-liquid`: los hijos cercanos se funden con un puente curvo y se separan en gotas al alejarse. Campo de distancias con una unión suave que tiene en cuenta el ángulo (no se infla donde dos formas se solapan alineadas), contorno con marching squares y curvas. Sólo redibuja mientras algo se mueve (< 1 ms por frame en una barra típica).

### Nuevo: `ns-frame/isle` (2,3 KB)
- **Isla de navegación**: una cápsula flotante con la sección actual (icono, nombre y posición, seguidos con `IntersectionObserver`) que se pliega al bajar, cambia de sección al deslizarla y abre una hoja con todas. La hoja entra moviendo sólo `translate`, se prepara al apoyar el dedo (al abrirse ya está pintada) y se arrastra con `ns-frame/sheet`. Accesible (`aria-expanded`, `aria-current`, `inert`, foco que entra y vuelve) y con el marcado y las formas del usuario.
- `sheet`: el progreso del gesto se calcula de la temporización de la animación, sin leer estilos en cada frame (sin micro-parones al cerrar).

### Mosaico
- En táctil se quitan `glow` (sigue a un puntero que no existe) y `ripple` (cada toque, que casi siempre es scroll, era una onda). `data-ns-mosaic-touch` elige los efectos para táctil.
- Al cambiar a una plantilla con menos filas, las piezas aún colocadas según la anterior creaban filas implícitas y el mosaico reintentaba en cada frame sin terminar: se quedaba con la plantilla vieja, dejaba de responder y podía verse con piezas superpuestas. Ahora sólo cuentan las pistas explícitas y los reintentos están acotados.
- Los listeners de la luz conectada se registran una vez por mosaico y leen la capa actual (antes se duplicaban si la capa se quitaba y volvía).

### Núcleo y auditoría
- `spec(shape, w)`: las declaraciones de una forma para un ancho, para módulos que transforman formas.
- Hover, pulsado y foco con 6 listeners delegados en el documento en vez de varios por marco.
- `audit()` avisa cuando un reset como `all: unset` deja el borde sin dibujar (tipos `unanchored` y `reset`).

### Sitio
- Sección «Lo que CSS todavía no sabe hacer» con las cuatro demos: tarjeta de reserva concéntrica, pieza editorial que cambia de silueta, titular con resaltado editable y selector y acciones líquidas.
- Los controles del mosaico van en una barra fija (en el móvil, una fila que se desliza): se cambia de opción sin subir y bajar. Al cambiar de plantilla sólo se animan las piezas; la barra superior y la isla quedan por encima durante la transición.
- La isla usa `ns-frame/isle` y el menú lleva suave hasta la sección elegida.
- Contorno suave, teñido con el tono de cada pieza, en el muro de formas y en las tarjetas de aperturas.
- La fuente recortada se llama Frame Sans: la licencia OFL de Mona Sans reserva el nombre «Mona» para la fuente sin modificar.

## 0.9.0 — mosaicos de piezas libres

### Nuevo: `ns-frame/mosaic`
- **Piezas en L, T, U o escalera** a partir de una plantilla tipo `grid-template-areas` en una variable CSS (`--ns-areas`), que se cambia con media queries o container queries.
- **Hueco constante también en las curvas**: las esquinas cóncavas miden el radio más el hueco, así dos piezas encajadas mantienen la misma distancia.
- **Orbes con forma**: círculo, hexágono, rombo, cuadrado, triángulo u octógono, uno o varios a la vez (`--ns-orb: 3 3 70 hex, 2 4 44 circle`). Recortan a sus vecinas con un hueco concéntrico y curvas de enlace, y pueden tener contenido (foto, dato, botón).
- **El texto recorre toda la figura**: en piezas en L, T, escalera o mordidas por un orbe, el texto fluye por el contorno real con `--ns-pad` de margen en cada punto, usando `shape-outside` nativo (`data-ns-flow="off"` lo desactiva). En los rectángulos, el contenido va al primer rectángulo de celdas en el que cabe entero.
- La luz conectada dibuja los orbes poligonales con sus esquinas redondeadas, igual que el relleno.
- **Luz conectada** en toda la figura con `data-ns-mosaic`: `wave`, `ripple` (onda donde tocas), `glow`, `sweep`, `scan`, `trace`, `pulse`, `aurora`, `dots` y `grid`, combinables. Se pausan fuera de pantalla y respetan `prefers-reduced-motion`.

### Núcleo
- `poly` admite arcos: `aN` llega al vértice por un arco de radio N (`a-N`, antihorario). También compila a CSS `shape()`.
- `--ns-morph-time: 0` aplica el cambio de forma al instante.
- **Arreglo:** las animaciones de borde `scan` y `orbit` y el giro de degradados (`data-ns-spin`) pasan de SMIL a animaciones CSS; ya no se quedan congeladas en móviles.

### Nuevo: `ns-frame/sheet` (1,3 KB)
- Hoja que se arrastra como en una app nativa: sigue al dedo arriba (con resistencia elástica) y abajo, y al soltarla vuelve o sale según la distancia y la velocidad. Sólo mueve `translate`, expone el progreso (`--ns-sheet-p`, `onProgress`) para atenuar el fondo y no convierte un arrastre en clic.

### Motor más rápido
- **Memo de geometría** por (forma, ancho, alto): los marcos que comparten forma y tamaño reutilizan geometría, comandos y path.
- **Repintado perezoso:** al redimensionar sólo se recalculan los marcos en pantalla o cerca; el resto se pinta al acercarse. Con 4.000 marcos, redimensionar pasa de ~283 a ~105 ms.
- El texto que fluye del mosaico no vuelve a medirse si la silueta, el tamaño y el margen no cambiaron.
- Build: el CSS que inyectan los módulos se minifica, y cada archivo se queda con la combinación de terser que da menos bytes en brotli.

### Vía rápida nativa
- Las formas sólo de esquinas (redondas; con `corner-shape`, también chaflanes, scoops, notches y squircles) con borde liso y sin capas extra se dibujan con `border-radius` + una sombra interior como borde, sin `clip-path` ni capa SVG. Pasan solas a SVG si un hover o un pulsado las convierte en una forma compleja. `--ns-shadow` añade sombras propias; el foco usa `outline` (`--ns-focus`). En la landing: 45 capas SVG menos y ~140 ms menos de LCP en un móvil emulado.

### Rendimiento en táctil
- **Arreglo:** en pantallas táctiles la forma de hover (`data-ns-hover`) ya no se queda pegada: el hover sólo se activa con ratón o lápiz (para el dedo está `data-ns-press`).
- En táctil (`hover: none` y `pointer: coarse`), el resplandor `--ns-glow` de las animaciones de borde y el del mosaico se desactivan (filtros que repintan cada frame y podían congelar la animación). `--ns-glow-touch` permite fijar uno propio.
- El foco `spot` no se registra en táctil: ya no recalcula los marcos en cada scroll.
- `ns-fx.css`: en táctil, la luz en U en movimiento (`ns-u-live`, `ns-u-tide`, `ns-u-surge`), `ns-u-hue` y `ns-scan` quedan fijos, y `ns-pulse` anima sólo la opacidad.

### Bento y auditoría
- El bento sigue siendo bento en móvil: al menos `--ns-cols-min` columnas (2 por defecto).
- `audit()` ignora las imágenes y vídeos a sangre (recortarlos es la intención).

### Sitio
- Landing rediseñada en Astro, por componentes: hero con mosaico, antes y después, muro de presets, playground (atributo, ruta SVG y CSS `shape()`), bordes en degradado y luz en U (con una tabla de precios real), mosaico interactivo, las 11 animaciones de borde, componentes funcionando, aperturas y View Transitions, anatomía con callouts y formas responsive, ficha técnica en bento unificado sobre fondo aura y la isla de navegación en móvil. Firmada por Kodec Agency.
- La galería antigua (`galeria.html`) se retira: todas las demos viven en la landing.
- Sitio más ligero y seguro: secciones con `content-visibility: auto` (saltos a anclas exactos con `scripts/jump.ts`), fuentes autoalojadas con la API de fuentes de Astro (Mona Sans variable con su eje de anchura), fotos de demostración en WebP, sin `backdrop-filter` en táctil, CSP estricta generada por Astro con hashes (sin `unsafe-inline`; en las guías sólo se permiten atributos de estilo para el resaltado de código), caché inmutable para `/_astro/*`, HSTS y COOP. En un móvil emulado (CPU ×4): bloqueo del hilo principal de ~700 a ~290 ms y LCP de ~1,65 a ~1,2 s.

## 0.8.0 — primera versión pública

### Formas
- Lenguaje de formas: esquinas `bevel`, `notch`, `round`, `scoop`, **`squircle`** y `square`; rasgos de borde `cut`, `tab` y `scoop`; polígonos libres; consultas por ancho del elemento (`@<N`); fillet global y por vértice; 14 presets.
- **Esquinas y bordes lógicos** (`ss`, `se`, `es`, `ee`, `start`, `end`) que se invierten en RTL.
- Morph de geometría en hover, foco, presión y cambios de atributo; formas ligadas al scroll; modo nativo con `corner-shape`.

### Bordes y movimiento
- Bordes SVG que siguen el corte: color, degradado (que puede girar), doble línea y acentos; 11 animaciones de borde; borde que se dibuja; aperturas que conservan los cortes.

### Layout y componentes
- Padding que respeta la forma, formas concéntricas y bento unificado.
- Popovers con la flecha integrada, **toasts** en la capa superior con el tiempo en el borde, **carrusel** con scroll-snap nativo, **skeletons** que heredan la forma (CLS 0), **View Transitions** que conservan los cortes y callouts HUD.

### Efectos
- `ns-fx.css`: luz en U con animaciones de conjunto (`ns-u-live`, `ns-u-tide`, `ns-u-surge`), aura, aurora, halo, patrones y texto animado.

### Sin JS
- `css()` compila una forma a CSS `shape()`; `extract()` y la integración de Astro (`ns-frame/astro`) convierten `data-ns-static` en clases y una hoja CSS en el build.

### Accesibilidad, seguridad y rendimiento
- Foco que sigue la forma, alto contraste (`forced-colors`), RTL y `prefers-reduced-motion`.
- Sin `innerHTML`, compatible con CSP estricta, estilos en `@layer ns`; test de CSP con atributos maliciosos.
- Carga bajo demanda de `ns-extra.js`; cambios masivos en lotes que ceden el hilo principal (con 4.000 marcos, ninguna tarea larga al montar).
- Tipos de TypeScript, skill para agentes de IA y `llms.txt`.
