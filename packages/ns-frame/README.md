# ns-frame

Native UI shapes for the web — bevels, notches, scoops, squircles and fillets on any corner of any element, with real borders that follow the cut, morph, apertures and shaped components. No images, no dependencies, strict-CSP safe. **8.2 KB gzip core.**

Formas nativas para la web: cortes, chaflanes, notches, scoops, squircles y radius en cualquier vértice de cualquier elemento.

```bash
pnpm add ns-frame
```

```js
import 'ns-frame'                       // activates every data-ns element, now and later
import 'ns-frame/fx.css'                // optional CSS effects
import { toast } from 'ns-frame/toast'
```

```html
<article data-ns="tl+br bevel 18; radius 3" data-ns-pad>…</article>
<button data-ns="button" data-ns-hover="tl+br bevel 20; radius 2">Hover me</button>
<div data-ns="all squircle 24" style="--ns-border:#3de0ff">…</div>
```

| Entry | What |
|---|---|
| `ns-frame` · `ns-frame/lite` | Core · clip only |
| `ns-frame/toast` · `skel` · `carousel` · `pop` · `vt` · `bento` · `link` | Shaped components |
| `ns-frame/fx` · `ns-frame/fx.css` | Effects |
| `ns-frame/css` · `ns-frame/static` · `ns-frame/astro` | Compile shapes to CSS `shape()` (zero runtime JS) |
| `ns-frame/audit` | Dev tool: finds clipped text |

Documentation (Spanish), demo and AI agent skill: **https://github.com/kodecagency/ns-frame**

MIT © 2026 Kodec Agency
