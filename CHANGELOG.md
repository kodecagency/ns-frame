# Changelog

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
