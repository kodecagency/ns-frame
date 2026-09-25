# ns-frame

Native UI shapes for the web — bevels, notches, scoops, squircles and fillets on any corner of any element, with real borders that follow the cut, morph, apertures and shaped components. No images, no dependencies, strict-CSP safe. **8.9 KB gzip core.**

Formas nativas para la web: cortes, chaflanes, notches, scoops, squircles y radius en cualquier vértice de cualquier elemento.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.9.0/packages/ns-frame/dist/ns-frame.js"></script>
<!-- optional CSS effects -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.9.0/packages/ns-frame/dist/ns-fx.css">
<script type="module">
  import { toast } from 'https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.9.0/packages/ns-frame/dist/ns-toast.js'
</script>
```

> Not on npm yet. El paquete de npm llegará más adelante; hasta entonces, no instales ningún paquete llamado ns-frame desde npm: no es nuestro.

```html
<article data-ns="tl+br bevel 18; radius 3" data-ns-pad>…</article>
<button data-ns="button" data-ns-hover="tl+br bevel 20; radius 2">Hover me</button>
<div data-ns="all squircle 24" style="--ns-border:#3de0ff">…</div>
```

Every entry lives in `dist/` (`ns-frame/toast` → `dist/ns-toast.js`, `ns-frame/lite` → `dist/ns-frame.lite.js`).

| Entry | What |
|---|---|
| `ns-frame` · `ns-frame/lite` | Core · clip only |
| `ns-frame/toast` · `skel` · `carousel` · `pop` · `vt` · `bento` · `link` | Shaped components |
| `ns-frame/mosaic` | Free-form bento: L/T/U pieces, shaped orbs, connected light |
| `ns-frame/sheet` · `ns-frame/isle` | Draggable sheet · floating navigation island |
| `ns-frame/concentric` · `flow` · `mark` · `liquid` | Concentric corners · text that fills the shape · multi-line highlight · liquid (gooey) groups |
| `ns-frame/fx` · `ns-frame/fx.css` | Effects |
| `ns-frame/css` · `ns-frame/static` · `ns-frame/astro` | Compile shapes to CSS `shape()` (zero runtime JS) |
| `ns-frame/audit` | Dev tool: finds clipped text |

`isle`, `concentric`, `flow`, `mark` and `liquid` are not in the `v0.9.0` tag yet: until the next tagged release, load them (and the core) from `@main`.

Documentation (Spanish), demo and AI agent skill: **https://github.com/kodecagency/ns-frame**

MIT © 2026 Kodec Agency
