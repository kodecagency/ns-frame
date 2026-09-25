# ns-frame

**Formas nativas para la web.** Cortes, chaflanes, notches, scoops, esquinas squircle y radius en **cualquier vértice de cualquier elemento** — con bordes reales que siguen el corte, morph, aperturas y componentes con forma. Sin imágenes, sin dependencias, compatible con CSP estricta.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-frame.js"></script>

<article data-ns="tl+br bevel 18; radius 3" data-ns-pad>Una tarjeta con dos esquinas cortadas</article>
<a data-ns="button" data-ns-hover="tl+br bevel 20; radius 2" href="#">Un botón que se transforma</a>
<img data-ns="media" src="foto.jpg" alt="Una imagen recortada">
```

| | |
|---|---|
| **8,9 KB** gzip el núcleo | Módulos opcionales de 0,5 a 7,4 KB que se cargan sólo si se usan |
| **Cualquier forma** | bevel, notch, round, scoop, squircle, rasgos en los bordes, polígonos libres, fillet en cada vértice |
| **Bordes reales** | color, degradado, doble línea, brackets y 11 animaciones de borde |
| **Mosaicos libres** | piezas en L, T o U que encajan con hueco constante, orbes con forma (círculo, hexágono, rombo, triángulo) y luz conectada en toda la figura |
| **Componentes** | toasts, carrusel, skeletons, popovers, View Transitions, bento, callouts, hoja arrastrable, isla de navegación |
| **Lo que CSS no hace** | texto que llena la forma, esquinas concéntricas automáticas, resaltado continuo en varias líneas, formas líquidas que se funden |
| **Cero JS opcional** | formas estáticas compiladas a CSS `shape()` en el build (integración de Astro incluida) |
| **Accesible y seguro** | foco que sigue la forma, alto contraste, RTL, movimiento reducido, sin `innerHTML`, CSP estricta |

## Empezar

Desde el CDN de jsDelivr, con la versión fijada en la URL:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-frame.js"></script>
<script type="module">
  import { toast } from 'https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-toast.js'
</script>
```

> El paquete de npm llegará más adelante; hasta entonces, no instales ningún paquete llamado ns-frame desde npm: no es nuestro.

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

**ns-frame** is a tiny (9 KB gzip core), dependency-free library for **native UI shapes on the web**: bevels, notches, scoops, squircles and fillets on any corner of any element, with borders that follow the cut, geometry morphing, shape-preserving apertures and shaped components (toasts, carousel, loading skeletons, popovers with the arrow built into the outline, and View Transitions that keep their cuts). Static shapes can be compiled to CSS `shape()` at build time for zero runtime JS. It works under a strict Content Security Policy and ships TypeScript types. It is not on npm yet: load it from jsDelivr as shown above, and do not install any npm package named ns-frame — it is not ours. The documentation is currently in Spanish; the [AI agent skill](skills/ns-frame/SKILL.md) and code examples are readable in any language.

## Licencia

[MIT](LICENSE) © 2026 Kodec Agency
