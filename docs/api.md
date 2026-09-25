---
title: API de JavaScript
description: Todas las funciones exportadas por el núcleo y los módulos, con sus firmas.
order: 10
---

# API de JavaScript

Casi nunca hace falta: `data-ns` y los atributos cubren el uso normal. La API sirve para generar paths, animar desde JS, crear componentes o compilar en el build. Los tipos de TypeScript vienen incluidos.

## Núcleo (`ns-frame`)

```js
import { path, geometry, commands, lerp, safe, define, PRESETS, attach, detach, update, shapeOf, open, close, styles } from 'ns-frame'
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
| `update(el)` | Relee el elemento (tras cambiar variables CSS por JS) |
| `shapeOf(el)` | Forma efectiva que se está usando (con hover, press, nest y `--ns-shape`) |
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
| `ns-frame/mosaic` | `refresh()`, `parseAreas(areas)` |
| `ns-frame/sheet` | `sheet(el, { handle, onClose, onProgress, threshold })` → `{ close(), reset(), destroy() }` · `rubber(x, h)` · `release(y, v, h)` |
| `ns-frame/isle` | `isle(el, options)` → `{ open(), close(), toggle(), go(i), index, destroy() }` |
| `ns-frame/concentric` | `concentric(shape, w, h, ins, min?)` → forma del hijo · `refresh()` |
| `ns-frame/flow` | `flow({ k, d, w, h }, pad)` → `true` / `false` · `unflow(k)` · `profile(d, w, h, pad)` · `refresh()` |
| `ns-frame/mark` | `outline(rects, px?, py?)` → polígonos · `refresh()` |
| `ns-frame/liquid` | `liquid(el, { blobs, k, step, glass, source })` → `{ update(), frame(), destroy() }` · `field()`, `contour()`, `blend(boxes, k?, step?)` → `d` |
| `ns-frame/tabs` | `tabs(el, { items })` → `{ select(i), index, destroy() }` · evento `change` con `detail { index, tab }` |
| `ns-frame/fx` | `decode(el, ms?)` |
| `ns-frame/audit` | `audit({ root, mark, margin, clearance })` → problemas encontrados |
| `ns-frame/pop` · `ns-frame/carousel` | Sin exportaciones: se activan con sus atributos |

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
