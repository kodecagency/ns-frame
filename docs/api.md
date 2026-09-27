---
title: API de JavaScript
description: Todas las funciones exportadas por el núcleo y los módulos, con sus firmas.
order: 10
---

# API de JavaScript

Casi nunca hace falta: `data-ns` y los atributos cubren el uso normal. La API sirve para generar paths, animar desde JS, crear componentes o compilar en el build. Los tipos de TypeScript vienen incluidos.

## Núcleo (`ns-frame`)

```js
import { path, geometry, commands, lerp, safe, define, PRESETS, attach, detach, update, shapeOf, pathOf, watch, jump, modal, quality, fontsReady, open, close, styles, reduced, mk, cssTime, cssNum, cssVal } from 'ns-frame'
```

| Función | Qué hace |
|---|---|
| `path(shape, w, h)` | SVG path `d` de la forma para una caja w×h (para `<svg>`, canvas `Path2D`, React…) |
| `geometry(shape, w, h)` | Vértices en px (con `.cn`, `.safe` y `.simple`) |
| `commands(V)` | Vértices → comandos de path con los fillets aplicados (`{ C, T, at }`) |
| `lerp(A, B, t)` | Interpola dos geometrías con la misma estructura |
| `safe(G, pad?, gap?)` | Margen seguro `[t, r, b, l]` para que el contenido no choque con los cortes |
| `define(name, shape)` · `PRESETS` | Registra un preset · presets disponibles |
| `attach(el)` · `detach(el, clear?)` | Activa / desactiva manualmente (normalmente no hace falta) |
| `update(el)` | Relee el elemento (tras cambiar variables CSS por JS). Las llamadas de una misma tarea se agrupan: se lee todo y luego se escribe todo, antes del siguiente pintado |
| `quality()` | `'high'` o `'low'`: el nivel para los efectos caros. Automático (memoria ≤ 4 GB, 2 núcleos o menos, ahorro de datos, o fotogramas lentos al cargar) o fijo con `<html data-ns-quality="low\|high">`. Queda en `<html data-ns-tier>` para tu CSS; un cambio avisa con el evento `ns-quality` en `document` |
| `reduced()` | `true` si la persona pide movimiento reducido; se consulta en el momento (y es `false` fuera del navegador). La usan todos los módulos que animan |
| `touch()` · `TOUCH_MEDIA` | `true` en una pantalla táctil sin hover (teléfono, tableta); la consulta, para escuchar su cambio |
| `mk(tag, attrs?, style?, ...hijos)` | un nodo SVG sin parsear markup (CSP estricta): atributos, estilos por CSSOM e hijos. Lo usan todos los módulos que dibujan en SVG |
| `cssTime(el, var, def)` · `cssNum` · `cssVal` | una variable CSS de `el` como duración en ms, número o texto (o `def`) |
| `fontsReady(fn)` | `fn` cuando las fuentes web ya cargaron (para volver a medir texto), en un momento libre y con una sola espera para todos |
| `shapeOf(el)` | Forma efectiva que se está usando (con hover, press, nest y `--ns-shape`) |
| `jump(el, { smooth, focus })` | Salto fiable a una sección, también con `content-visibility: auto`: suave si se pide, corrige al llegar, respeta `scroll-padding-top` y el movimiento reducido, y enfoca el destino |
| `modal(dialog, { panel, mode })` | Un `<dialog>` nativo con apertura y cierre que respetan la forma de su panel: `{ open(mode?), close(mode?), destroy() }`; Escape y el clic en el fondo cierran con la animación inversa |
| `data-ns-choice` | Grupos de elección (atributo): uno elegido a la vez con `aria-pressed` (o `aria-checked` con `role="radio"`), o varios con `data-ns-choice="many"`; flechas del teclado y evento `change` con `detail { index, button, value, pressed }`. El relieve (`ghost`, `select`) y tus estilos por `[aria-pressed=true]` siguen solos |
| `watch(attr, make)` | Arranque automático por atributo, el mismo que usan glass, liquid, relief y tabs: `make(el)` al aparecer el elemento o el atributo; el `destroy()` de lo que devuelva, al quitar el atributo o sacar el elemento del documento (moverlo de sitio no cuenta). Sirve para tus propios componentes |
| `pathOf(el)` | El path que se está pintando ahora (a mitad de un morph, la forma intermedia). Los elementos con `data-ns-glass` emiten además el evento `ns-shape` cada vez que se repintan |
| `open(el, mode?, ms?)` · `close(el, mode?, ms?)` | Apertura y cierre respetando la forma; devuelven una promesa |
| `styles(css)` | Inyecta CSS con una constructable stylesheet (CSP estricta) |

```js
path('card', 320, 200)                                // "M0 197L0 19.2A3 3 0 0 1 0.9 17.1L9 9…Z"
define('mi-card', 'tl bevel 30; br round 12; radius 2')
await open(panel, 'iris', 500)
```

## Módulos

| Módulo | Exporta |
|---|---|
| `ns-frame/css` | `css(shape)` → `shape(…)` o `null` |
| `ns-frame/static` | `extract(html)` → `{ html, css, skipped }` (Node) |
| `ns-frame/astro` | `nsStatic({ file? })` (integración de Astro, por defecto) |
| `ns-frame/vt` | `morph(from, update, to?, { duration, easing })` |
| `ns-frame/toast` | `toast(msg, options)` → `{ el, close }` · `config(options)` |
| `ns-frame/skel` | `refresh(el?)` |
| `ns-frame/bento` · `ns-frame/link` | `refresh()` |
| `ns-frame/mosaic` | `refresh()`, `parseAreas(areas)`, `arrange(el, update)` (otra plantilla con View Transitions: las piezas viajan a su sitio) |
| `ns-frame/sheet` | `sheet(el, { handle, onClose, onProgress, threshold, track, settle, dialog })` → `{ open(), close(), reset(), destroy() }` (dentro de un `<dialog>`, se encarga de él: `open()` lo abre y la hoja entra; Escape y el fondo la cierran deslizándola; el fondo se aclara al bajarla) · `rubber(x, h)` · `release(y, v, h)`. Con `track(y, h)` el gesto no mueve el panel, sólo informa, y al soltar llama a `settle(cerrar, v)` |
| `ns-frame/isle` | `isle(el, { panel, links, media, collapse, collapseOn, swipe, morph, tile, current, line, go, pos, onChange, onOpen, onClose })` → `{ open(), close(), toggle(), go(i), index, destroy() }` |
| `ns-frame/concentric` | `concentric(shape, w, h, ins, min?)` → forma del hijo · `refresh()` |
| `ns-frame/flow` | `flow({ k, d, w, h }, pad)` → `true` / `false` · `unflow(k)` · `profile(d, w, h, pad)` · `refresh()` |
| `ns-frame/mark` | `outline(rects, px?, py?)` → polígonos · `refresh()` |
| `ns-frame/liquid` | `liquid(el, { blobs, k, step, glass, source })` → `{ update(), frame(), destroy() }` · `field()`, `contour()`, `blend(boxes, k?, step?)` → `d` · `drops(el, { dir, stay })` → `{ open(), close(), toggle(), isOpen, destroy() }` (botón de gotas; automático con `data-ns-drops`, evento `toggle` con `detail { open }`) |
| `ns-frame/glass` | `glass(el, opciones de liquid)` → `{ update(), frame(), destroy() }` · automático con `data-ns-glass` (`clear`, `tint`, `u`, `facet`, `prism`, `border`, `lens`, `frost`) · `glassGroup(el)` → `{ update(), destroy() }` · automático con `data-ns-glass-group` (vacío, un selector del fondo o `native`) · en `ns-frame/liquid`: `pathField(d, w, h, step?)`, `shift(d, dx, dy)`, `lensURL(campo, rim)`, `LENS` |
| `ns-frame/glass-gl` | `glEngine(host, fuente, onFail?, onReady?)` → `{ draw(d?, moving?, boxes?), destroy() }` o `null` (con `boxes`, las cajas redondeadas de 9 en 9 —x, y, ancho, alto, cuatro radios y opacidad—, el shader calcula su distancia exacta y desvanece cada una con su pieza) · lo carga `ns-frame/glass` solo, cuando un grupo tiene un fondo conocido · variables `--ns-glass-lens`, `-depth`, `-group-blur`, `-sat`, `-dispersion`, `-rim` |
| `ns-frame/light` | `material(parámetros)` → id de un `<filter>` compartido, iluminado por la luz de la página · `corners(el, w, h)` → radios reales de las cuatro esquinas · `rounded(el, w, h)` → path del rectángulo redondeado |
| `ns-frame/relief` | `relief(el)` → `{ update(), destroy() }` · automático con `data-ns-relief` (`surface`, `raised`, `knob`, `inset`, `select`, `ghost`; tonos `metal`, `paper`) |
| `ns-frame/tabs` | `tabs(el, { items, drop, shrink })` → `{ select(i), index, destroy() }` · evento `change` con `detail { index, tab }` |
| `ns-frame/fx` | `decode(el, ms?)` |
| `ns-frame/audit` | `audit({ root, mark, margin, clearance })` → problemas encontrados |
| `ns-frame/carousel` | `carousel(el)` → `{ go(i), index, destroy() }` · automático con `data-ns-carousel` · evento `change` con `detail { index, slide }` |
| `ns-frame/controls` | Automático con `data-ns-segment`, `data-ns-chips`, `data-ns-field`, `data-ns-range`, `data-ns-swatches` · `range(el)` → `{ update(), destroy() }` · `swatches(el)` |
| `ns-frame/pop` | Sin exportaciones: se activa con sus atributos |

## Geometría sin DOM (concentric, flow, mark, liquid)

Los cuatro módulos se activan solos con su atributo (ver [Componentes](componentes.md#lo-que-css-todavía-no-hace)). Sus funciones puras sirven para usar la geometría fuera de ellos (canvas, SVG propio, tests):

| Función | Entrada | Devuelve |
|---|---|---|
| `concentric(shape, w, h, ins, min)` | Forma del padre, su tamaño, el hueco `[arriba, derecha, abajo, izquierda]` hasta el hijo y el radio de las esquinas lejanas | La forma del hijo, en px (texto para `data-ns`) |
| `profile(d, w, h, pad)` | Un path `d`, su caja y el margen | Una fila cada 2 px: `[izquierda, derecha]` libres, o `null` |
| `flow({ k, d, w, h }, pad)` | Elemento, path, tamaño y margen | Coloca los flotantes; `false` si la caja es demasiado pequeña. `unflow(k)` los quita |
| `outline(rects, px, py)` | Rectángulos de cada línea (`getClientRects()`) y margen (6 y 2 por defecto) | Polígonos (listas de `[x, y]`) sin fillets |
| `blend(boxes, k, step)` | Rectángulos redondeados `{ x, y, w, h, r }`, alcance (14) y resolución (2 px) | El `d` del contorno fundido |

Cada módulo exporta además `refresh()` (salvo `liquid`, cuyo `liquid()` devuelve `update()`), para volver a medir tras cambiar algo por JS.

```js
import { concentric } from 'ns-frame/concentric'
concentric('all round 24', 320, 200, [12, 12, 12, 12])   // "tl round 12 12; tr round 12 12; br round 12 12; bl round 12 12"
```

## Auditoría (sólo desarrollo)

```js
const { audit } = await import('ns-frame/audit')
audit({ mark: true, clearance: 5 })
```

Devuelve (y con `mark` resalta) los elementos cuyo texto o controles quedan recortados por la forma (`type: 'clipped'`) o a menos de `clearance` px del borde (`type: 'tight'`). Respeta los contenedores con scroll y los hijos con `data-ns-nest`, y usa la misma geometría que el runtime.
