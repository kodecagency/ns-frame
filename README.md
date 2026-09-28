# ns-frame

**Formas nativas para la web.** Cortes, chaflanes, notches, scoops, esquinas squircle y radius en **cualquier vértice de cualquier elemento** — con bordes reales que siguen el corte, morph, aperturas y componentes con forma. Sin imágenes, sin dependencias, compatible con CSP estricta.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.17.0/packages/ns-frame/dist/ns-frame.js"></script>

<article data-ns="tl+br bevel 18; radius 3" data-ns-pad>Una tarjeta con dos esquinas cortadas</article>
<a data-ns="button" data-ns-hover="tl+br bevel 20; radius 2" href="#">Un botón que se transforma</a>
<img data-ns="media" src="foto.jpg" alt="Una imagen recortada">
```

| | |
|---|---|
| **11 KB** gzip el núcleo | Módulos opcionales de 0,5 a 19 KB (el mayor, el vidrio líquido con su lente) que se cargan sólo si se usan |
| **Cualquier forma** | bevel, notch, round, scoop, squircle, rasgos en los bordes, polígonos libres, fillet en cada vértice |
| **Bordes reales** | color, degradado, doble línea, brackets y 11 animaciones de borde |
| **Mosaicos libres** | piezas en L, T o U que encajan con hueco constante, orbes con forma (círculo, hexágono, rombo, triángulo) y luz conectada en toda la figura |
| **Componentes** | toasts, carrusel, skeletons, popovers, View Transitions, bento, callouts, hoja arrastrable, isla de navegación |
| **Materiales** | vidrio líquido en cualquier forma con lente real en todos los navegadores (nativa en Chromium, WebGL en Safari, iPhone y Firefox), que adapta su tono y el color del texto a lo que pasa por detrás; pestañas de vidrio que se arrastran; relieve iluminado; una sola luz para toda la página. Todo con `data-ns-glass`, `data-ns-tabs` o `data-ns-relief`, sin configurar nada |
| **Lo que CSS no hace** | texto que llena la forma, esquinas concéntricas automáticas, resaltado continuo en varias líneas, formas líquidas que se funden |
| **Cero JS opcional** | formas estáticas compiladas a CSS `shape()` en el build (integración de Astro incluida) |
| **Accesible y seguro** | foco que sigue la forma, alto contraste, RTL, movimiento reducido, sin `innerHTML`, CSP estricta |

## Empezar

Desde el CDN de jsDelivr, con la versión fijada en la URL:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.17.0/packages/ns-frame/dist/ns-frame.js"></script>
<script type="module">
  import { toast } from 'https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.17.0/packages/ns-frame/dist/ns-toast.js'
</script>
```

> El paquete de npm llegará más adelante; hasta entonces, no instales ningún paquete llamado ns-frame desde npm: no es nuestro.

## Módulos

Cada módulo es una ruta aparte y carga sólo lo que necesita. Casi todos arrancan solos con su atributo; los que tocan la página (una hoja, una isla, un aviso) se llaman desde JS.

| Ruta | Para qué | Arranque |
|---|---|---|
| `ns-frame` (y `ns-frame/lite`) | Formas, bordes, morph, aperturas | `data-ns` |
| `ns-frame/fx` + `ns-fx.css` | Luz en U, aura, patrones, texto animado | clases `ns-*` |
| `ns-frame/glass` | Vidrio líquido en cualquier forma | `data-ns-glass` |
| `ns-frame/liquid` | Formas que se funden; vidrio líquido de grupos; botón de gotas | `data-ns-liquid`, `data-ns-drops` |
| `ns-frame/tabs` | Pestañas de vidrio que se arrastran | `data-ns-tabs` |
| `ns-frame/relief` | Relieve iluminado | `data-ns-relief` |
| `ns-frame/light` | La luz de la página que comparten vidrio y relieve | (interna) |
| `ns-frame/isle` | Isla de navegación que se convierte en hoja | `isle(el)` |
| `ns-frame/sheet` | Hoja arrastrable | `sheet(el)` |
| `ns-frame/toast` | Avisos con forma | `toast(msg)` |
| `ns-frame/pop` · `carousel` · `skel` | Popovers y tooltips · carrusel · skeletons | sus atributos |
| `ns-frame/mosaic` · `bento` | Mosaicos libres · bento unificado | `data-ns-mosaic` · `data-ns-bento` |
| `ns-frame/concentric` · `flow` · `mark` · `link` | Esquinas concéntricas · texto que llena la forma · resaltado en varias líneas · callouts | sus atributos |
| `ns-frame/vt` | View Transitions que conservan los cortes | `morph()` |
| `ns-frame/css` · `static` · `astro` | Formas compiladas a CSS `shape()` en el build | build |
| `ns-frame/audit` | Detecta texto recortado por la forma (desarrollo) | `audit()` |

**Se combinan:** una misma pieza puede llevar forma, vidrio y efectos (`data-ns="card" data-ns-glass class="ns-u"`); el vidrio sigue a la forma también durante un morph; vidrio y relieve se iluminan con la misma luz; la isla usa la hoja y, con `data-ns-glass`, el vidrio. Los límites (qué no se puede anidar bajo un vidrio, por qué una apertura no lo recorta) están en [Componentes](docs/componentes.md).

- [Documentación](docs/README.md) — instalación, sintaxis de formas, componentes, API, accesibilidad, seguridad y rendimiento.
- [Skill para agentes de IA](skills/ns-frame/SKILL.md) y [`llms.txt`](llms.txt).
- [Demo y sitio de documentación](apps/site) — `pnpm install && pnpm dev`.

## Repositorio

```
packages/ns-frame   la librería: src, dist, tipos y tests
apps/site           demo y documentación (Astro, listo para Vercel)
docs                guías en Markdown
skills/ns-frame     skill para agentes de código
```

```bash
pnpm install        # dependencias (pnpm, con lockfile)
pnpm test           # build + test de paridad (fuente = minificado = lite)
pnpm dev            # sitio local en http://localhost:4321
pnpm build          # librería + sitio
```

## In English

**ns-frame** is a tiny (11 KB gzip core), dependency-free library for **native UI shapes on the web**: bevels, notches, scoops, squircles and fillets on any corner of any element, with borders that follow the cut, geometry morphing, shape-preserving apertures and shaped components (toasts, carousel, loading skeletons, popovers with the arrow built into the outline, and View Transitions that keep their cuts). It also ships materials: refractive glass on any shape with a real lens in every engine (native in Chromium, WebGL in Safari, iOS and Firefox) that adapts its tone and text colour to whatever passes behind it, draggable glass tabs and lit relief — each one attribute, ready to use. Static shapes can be compiled to CSS `shape()` at build time for zero runtime JS. It works under a strict Content Security Policy and ships TypeScript types. It is not on npm yet: load it from jsDelivr as shown above, and do not install any npm package named ns-frame — it is not ours. The documentation is currently in Spanish; the [AI agent skill](skills/ns-frame/SKILL.md) and code examples are readable in any language.

## Licencia

[MIT](LICENSE) © 2026 Francesco Sierchio · Kodec Agency. La licencia pide conservar este aviso de autoría en toda copia o redistribución (también en los archivos compilados, que lo llevan en su cabecera).
