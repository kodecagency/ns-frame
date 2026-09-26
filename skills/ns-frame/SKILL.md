---
name: ns-frame
description: Build shaped web UI with the ns-frame library — bevels, notches, scoops, squircles and fillets on any corner of any element, borders that follow the cut, morph, apertures, and shaped components (toasts, carousel, skeletons, popovers, View Transitions, draggable sheet, navigation island), free-form mosaics (L/T/U pieces that interlock with a constant gap, shaped orbs, connected light effects), concentric corners, text that fills a shape, multi-line highlights, liquid (gooey) groups and materials (liquid glass with a real lens in every engine, draggable glass tabs, lit relief). Use when the project imports ns-frame, uses data-ns attributes or <ns-frame>, or the user asks for cut/chamfered/HUD/sci-fi/futuristic corners, squircle corners, shaped cards, buttons, panels or tickets without images.
---

# ns-frame

ns-frame draws shapes with a small shape language written in HTML attributes. The core (`ns-frame`, 9 KB gzip) activates every element with `data-ns` automatically, including elements added later. Optional modules add components. Docs in Spanish live in `docs/`; this skill is the working summary.

**Install from jsDelivr, not npm.** ns-frame is not published on npm yet; never install an npm package named `ns-frame` (it is not ours). Load `https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-frame.js` (modules from the same `dist/` folder, same version), map the bare names with an import map, or vendor `dist/` and alias it — see `docs/instalacion.md`.

## Decide what to use

| Need | Use |
|---|---|
| A shaped element (card, button, image, panel) | `data-ns="…"` + import `ns-frame` once |
| A static shape with no JS in the browser | `data-ns-static="…"` + the Astro integration or `extract()` at build time |
| Border that follows the cut | CSS vars `--ns-border`, `--ns-border-width`, `--ns-inner` — **never** CSS `border` |
| Padding that avoids the cuts | `data-ns-pad` (+ `--ns-pad`) |
| Buttons inside a shaped container | `data-ns-nest="round 2"` on the children |
| Hover / press / animated change | `data-ns-hover`, `data-ns-press`, or change `data-ns` (morphs automatically) |
| Animated border | `data-ns-motion="comet|twin|scan|orbit|chase|march|loop|pulse|glitch|progress|spot"` |
| Reveal on scroll / open a panel | `data-ns-enter="open 0"` or `open(el, 'iris')` / `close(el)` |
| Notifications | `toast()` from `ns-frame/toast` |
| Loading state with the real shape | `data-ns-skeleton` + `ns-frame/skel` |
| Carousel | `data-ns-carousel` + `ns-frame/carousel` |
| Popover / tooltip with the arrow in the shape | `data-ns-arrow` on a `[popover]` + `ns-frame/pop` |
| Card → detail view transition | `morph()` from `ns-frame/vt` |
| Bento whose pieces are L/T/U shapes, or a central orb (circle, hex, diamond, triangle) that cuts its neighbours | `ns-frame/mosaic`: `--ns-areas`, `data-ns-area`, `--ns-orb`, `[data-ns-orb]` |
| Light/pattern that flows across a whole mosaic | `data-ns-mosaic="wave ripple glow sweep scan trace pulse aurora dots grid"` |
| Glow / patterns | classes from `ns-fx.css` (`ns-u`, `ns-u-live`, `ns-aura`, `ns-grid`…) |
| Bottom sheet that follows the finger and closes on release | `sheet(panel, { onClose })` from `ns-frame/sheet` |
| Floating nav capsule that tracks the current section and opens a sheet | `data-ns-isle` + `isle(el)` from `ns-frame/isle` |
| Child whose corners are concentric with its parent (any shape, or a CSS `border-radius` parent) | `data-ns-concentric` + `ns-frame/concentric` (writes the child's `data-ns`) |
| Text that fills a non-rectangular shape (shape-inside) | `data-ns-flow` on a `data-ns` element with a defined height + `ns-frame/flow` |
| One continuous highlight across several lines, with inner and outer curves | `<mark data-ns-mark>` + `ns-frame/mark` |
| Nearby elements that melt together (gooey) with a crisp vector edge; liquid glass | `data-ns-liquid` / `data-ns-liquid="glass"` (+ `data-ns-blob`) + `ns-frame/liquid` |
| Liquid glass on any element / any ns-frame shape (bevels, notches, cuts); cut-glass facets lit by the pointer; prism edge | `data-ns-glass` (`clear`, `tint`, `facet`, `prism`) + `ns-frame/glass` |
| Tactile controls / cards with real bevels (ceramic, metal, paper, clay) that sink when pressed | `data-ns-relief` (`inset`, `flat`) + `ns-frame/relief` |
| iOS-style tab bar whose glass indicator can be dragged between tabs | `data-ns-tabs` + `ns-frame/tabs` |

Read `references/shapes.md` before writing any non-trivial shape and `references/components.md` before using a module.

## Liquid glass: ready to use

- One attribute is enough: `data-ns-glass` (any element, any ns-frame shape) or `data-ns-liquid="glass"` (groups that melt). Do **not** set `--ns-glass-lens`, `--ns-glass-depth` or `--ns-glass-blur` unless asked: the defaults scale with the element's size and look right.
- Text colour: use `color: var(--ns-glass-ink)` inside glass. The glass measures what passes behind it and flips/deepens its tone; the ink follows. Hard-coded white or black text breaks this.
- Put glass content inside elements (`<button><span>+</span></button>`), never as a bare text node: it would sit under the glass layers.
- The lens is real everywhere: native `backdrop-filter` in Chromium; WebGL in Safari, every iOS browser and Firefox (over images, videos, canvases or the page itself). Images behind glass must be same-origin or served with CORS (`Access-Control-Allow-Origin`) for the WebGL lens and the tone detection; otherwise the glass falls back to SVG filters.
- A dark designed bar: set only `--ns-glass-tint` (e.g. `rgba(22,22,26,.28)`); it stays dark over light content and deepens instead of flipping.
- Strict CSP: the lens needs `img-src data:`.

## Shape language in one screen

```
<corner> <type> <size> [v-size] [rN]      corner: tl tr br bl all diag anti | ss se es ee (logical)
                                          type:   bevel notch round scoop squircle square
<edge> <feature> <from> <to> <depth>      edge: top right bottom left | start end ; feature: cut tab scoop
<edge> <feature> center <width> <depth>
poly x y [rN] [aN], …                     free polygon (aN: reach the vertex through an arc of radius N; a-N counter-clockwise)
@<420 …  /  @>800 …                       only when the ELEMENT (not the viewport) is narrower / wider
radius N                                  fillet on every vertex
card button chip soft notch scoop wing panel plate tab ticket media pill hud   (presets)
```

Units are px; `%` is relative to the side; negative positions count from the end; `100%-24` mixes both. Combine declarations with `;`. Examples: `tl+br bevel 18; radius 3`, `all squircle 24`, `card; top cut center 30% 6`, `left+right scoop center 26 13; all round 10`.

## Rules

1. **Import the core once** (`import 'ns-frame'` via an import map or alias, or one `<script type="module">` from the CDN). Core and modules must come from the same version. Do not call `attach()` for normal use.
2. **No CSS `border` on shaped elements** — it is clipped. Use `--ns-border`. Backgrounds are fine: they get clipped to the shape.
3. **Text near cuts:** add `data-ns-pad` to shaped containers with text, or give enough padding. Verify with the audit (below).
4. **Morph needs matching structure:** same corner types count and same number of edge features, otherwise the shape switches instantly. `round` ↔ `squircle` and size changes morph fine.
5. **Security:** never build shapes or toast messages with `innerHTML`; pass text. ns-frame works under strict CSP (`style-src 'self'`) — do not add `'unsafe-inline'` for it.
6. **Accessibility:** keep real semantics (`<button>`, `<a>`, `<dialog>`); decorative layers are already `aria-hidden`. After `morph()` move focus yourself. Respect `prefers-reduced-motion` in your own CSS too.
7. **Optional modules import the full core.** Do not mix `ns-frame/lite` with modules.
8. **Static vs runtime:** `data-ns-static` only clips. Borders, motion, morph and components need `data-ns` + the runtime.

## Verify before claiming it works

- Load the page and run the audit: `(await import('ns-frame/audit')).audit({ clearance: 5, mark: true })` → must return `[]` (no clipped or tight text). Check at desktop and at 390 px.
- No horizontal scroll: `document.documentElement.scrollWidth <= innerWidth`.
- If you changed the library itself: `pnpm test` (parity between source, minified and lite builds must be 0 failures) and open `packages/ns-frame/test/csp.html` (0 violations, 0 injected nodes).

See `references/checklist.md` for the full review list and common mistakes.
