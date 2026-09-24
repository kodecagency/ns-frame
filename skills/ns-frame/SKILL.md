---
name: ns-frame
description: Build shaped web UI with the ns-frame library — bevels, notches, scoops, squircles and fillets on any corner of any element, borders that follow the cut, morph, apertures, and shaped components (toasts, carousel, skeletons, popovers, View Transitions). Use when the project imports ns-frame, uses data-ns attributes or <ns-frame>, or the user asks for cut/chamfered/HUD/sci-fi/futuristic corners, squircle corners, shaped cards, buttons, panels or tickets without images.
---

# ns-frame

ns-frame draws shapes with a small shape language written in HTML attributes. The core (`ns-frame`, 8 KB gzip) activates every element with `data-ns` automatically, including elements added later. Optional modules add components. Docs in Spanish live in `docs/`; this skill is the working summary.

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
| Glow / patterns | classes from `ns-fx.css` (`ns-u`, `ns-u-live`, `ns-aura`, `ns-grid`…) |

Read `references/shapes.md` before writing any non-trivial shape and `references/components.md` before using a module.

## Shape language in one screen

```
<corner> <type> <size> [v-size] [rN]      corner: tl tr br bl all diag anti | ss se es ee (logical)
                                          type:   bevel notch round scoop squircle square
<edge> <feature> <from> <to> <depth>      edge: top right bottom left | start end ; feature: cut tab scoop
<edge> <feature> center <width> <depth>
poly x y [rN], x y [rN], …                free polygon
@<420 …  /  @>800 …                       only when the ELEMENT (not the viewport) is narrower / wider
radius N                                  fillet on every vertex
card button chip soft notch scoop wing panel plate tab ticket media pill hud   (presets)
```

Units are px; `%` is relative to the side; negative positions count from the end; `100%-24` mixes both. Combine declarations with `;`. Examples: `tl+br bevel 18; radius 3`, `all squircle 24`, `card; top cut center 30% 6`, `left+right scoop center 26 13; all round 10`.

## Rules

1. **Import the core once** (`import 'ns-frame'` or one `<script type="module">`). Do not call `attach()` for normal use.
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
