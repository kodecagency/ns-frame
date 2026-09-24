# Changelog

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

### Rendimiento en táctil
- **Arreglo:** en pantallas táctiles la forma de hover (`data-ns-hover`) ya no se queda pegada: el hover sólo se activa con ratón o lápiz (para el dedo está `data-ns-press`).
- En táctil (`hover: none` y `pointer: coarse`), el resplandor `--ns-glow` de las animaciones de borde y el del mosaico se desactivan (filtros que repintan cada frame y podían congelar la animación). `--ns-glow-touch` permite fijar uno propio.
- El foco `spot` no se registra en táctil: ya no recalcula los marcos en cada scroll.
- `ns-fx.css`: en táctil, la luz en U en movimiento (`ns-u-live`, `ns-u-tide`, `ns-u-surge`), `ns-u-hue` y `ns-scan` quedan fijos, y `ns-pulse` anima sólo la opacidad.

### Bento y auditoría
- El bento sigue siendo bento en móvil: al menos `--ns-cols-min` columnas (2 por defecto).
- `audit()` ignora las imágenes y vídeos a sangre (recortarlos es la intención).

### Sitio
- Landing rediseñada en Astro, por componentes: hero con mosaico, antes y después, muro de presets, playground (atributo, ruta SVG y CSS `shape()`), bordes en degradado y luz en U (con una tabla de precios real), mosaico interactivo, las 12 animaciones de borde, componentes funcionando, aperturas y View Transitions, anatomía con callouts y formas responsive, ficha técnica en bento unificado sobre fondo aura y la isla de navegación en móvil. Firmada por Kodec Agency.
- La galería antigua (`galeria.html`) se retira: todas las demos viven en la landing.

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
