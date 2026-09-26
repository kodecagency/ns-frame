# ns-frame components and modules

Every module is optional. Not on npm yet (do not install any npm package named `ns-frame`). With the CDN: `https://cdn.jsdelivr.net/gh/kodecagency/ns-frame@v0.10.0/packages/ns-frame/dist/ns-<module>.js`, same version as the core. With an import map or a bundler alias to a vendored `dist/`: `import 'ns-frame/<module>'` (see `docs/instalacion.md`).

## Attributes handled by the core

| Attribute | Meaning |
|---|---|
| `data-ns` | Shape |
| `data-ns-hover` / `data-ns-press` | Shape on hover+focus / while pressed (morphs) |
| `data-ns-accent="corners 16"` | Corner brackets (or `"0 10, 50 10"` perimeter % ranges) |
| `data-ns-motion="…"` / `data-ns-trace` | Border animation (`comet twin scan orbit chase march loop pulse glitch progress spot`, combinable, `hover` = only on hover) |
| `data-ns-draw` | Border draws itself when entering the viewport |
| `data-ns-spin="4s"` | Gradient border rotates |
| `data-ns-enter="open 0"` | Aperture when entering the viewport (`open split iris wipe drop` + delay ms) |
| `data-ns-scroll="shape"` | Morph to this shape while the element crosses the viewport |
| `data-ns-native` | Use native `corner-shape` when supported (box-shadow/outline follow the shape) |
| `data-ns-pad` / `data-ns-safe` | Shape-aware padding / expose `--ns-safe-t/r/b/l` only |
| `data-ns-nest="round 2"` | Concentric with the shaped parent |

CSS variables: `--ns-border`, `--ns-border-width`, `--ns-inner`, `--ns-inner-color`, `--ns-inner-width`, `--ns-inner-opacity`, `--ns-accent`, `--ns-accent-width`, `--ns-motion`, `--ns-motion-time`, `--ns-progress`, `--ns-glow`, `--ns-morph-time`, `--ns-draw-time`, `--ns-focus`, `--ns-focus-width`, `--ns-pad`, `--ns-shape`.

JS: `open(el, mode, ms)` / `close(el, mode, ms)` return promises; `update(el)` after changing CSS variables from JS; `shapeOf(el)`; `path(shape, w, h)` for SVG/canvas.

## Toasts — `ns-frame/toast`

```js
import { toast, config } from 'ns-frame/toast'
toast('Saved', { type: 'ok' })                                   // info | ok | warn | error
toast('Upload failed', { type: 'error', title: 'Network', time: 0, action: { label: 'Retry', onClick: retry } })
config({ x: 'end', y: 'bottom', max: 4, time: 5000, shape: 'tl+br bevel 12; radius 2', enter: 'open' })
```

Top-layer `popover="manual"` stack, timer drawn on the border (pauses on hover/focus/hidden tab), persistent toasts (`time: 0`) are never evicted, errors use `role="alert"`, closing a toast that holds focus returns focus to where it came from (or to the `back` element option). Messages are text only.

## Skeletons — `ns-frame/skel`

Put `data-ns-skeleton` on the real component with placeholder content of similar length; remove the attribute when data arrives. Bones are measured from the real layout (CLS 0). `data-ns-bone` marks a block; `data-ns-skeleton="all round 4"` sets the text bar shape. Images need `width`/`height` or `aspect-ratio`.

## Carousel — `ns-frame/carousel`

```html
<div data-ns-carousel aria-label="Projects" style="--ns-slide: calc((100% - 32px) / 3)">…slides…</div>
```

Native scroll-snap; the module adds shaped arrows + indicators (one per reachable position), keyboard (←/→, Home/End, RTL aware) and the WAI-ARIA carousel pattern. Always give it an `aria-label`.

## Popovers & tooltips — `ns-frame/pop`

```html
<button popovertarget="p">Info</button>
<div popover id="p" data-ns-arrow="tl+br bevel 10; radius 2">…</div>
<button data-ns-tip="t">?</button>
<div popover="manual" id="t" role="tooltip" data-ns-arrow="all round 8">…</div>
```

Arrow is part of the shape and always points at the trigger (Anchor Positioning + measured side; JS fallback).

## View Transitions — `ns-frame/vt`

```js
import { morph } from 'ns-frame/vt'
await morph(card, () => { grid.hidden = true; detail.hidden = false }, detail); title.focus()
await morph(detail, () => { detail.hidden = true; grid.hidden = false }, card); card.focus()
```

Cuts keep their px size during the transition; same-structure shapes interpolate. Instant without support or with reduced motion. Make sure `[hidden]` really hides your containers (a `display: grid` rule overrides it — add `.x[hidden]{display:none}`).

## Bento — `ns-frame/bento`

`<div class="ns-bento" data-ns-bento="outer bevel 30; inner round 12; radius 2">` with children classes `ns-big`, `ns-w2`, `ns-h2`, `ns-full`.

## Mosaic — `ns-frame/mosaic`

A bento whose pieces can be L, T, U or staircase shapes. Children need `data-ns-area`; the layout is a CSS variable, so media/container queries can change it.

```html
<div class="ns-mosaic grid" data-ns-mosaic="wave ripple">
  <article data-ns-area="h">…</article> <article data-ns-area="a">…</article> …
  <div data-ns-orb><img src="…" alt="…"></div>
</div>
```
```css
.grid { --ns-areas: 'a h h b' 'a h h c' 'd x y c'; --ns-row: 150px; --ns-gap: 14px; --ns-round: 22px; --ns-orb: 3 3 90 hex }
@media (max-width: 760px) { .grid { --ns-areas: 'h h' 'h h' 'x y' 'a b' 'd c'; --ns-orb: 2 3 56 hex } }
```

- Concave corners = `--ns-round` + gap, so interlocking pieces keep a constant gap around bends.
- `--ns-orb: col row radius [circle|hex|diamond|square|tri|oct] [deg]`, comma-separated for several; positions are grid LINES (3 = the gap between columns 2 and 3). Each entry pairs with a `[data-ns-orb]` child, which may hold content (photo, stat, button). Put orbs where 3–4 pieces meet.
- In non-rectangular pieces the text flows through the real outline (uses `ns-frame/flow`); content must be block/inline, not a flex/grid child. `data-ns-flow="off"` (on the mosaic or a piece) puts content in the largest free rectangle instead. Keep rows tall enough.
- Effects: `wave ripple glow sweep scan` (borders + backgrounds), `trace pulse` (borders), `aurora dots grid` (backgrounds, continuous across pieces, drawn in each piece's `::before` — don't combine with ns-fx pattern classes on the same piece).
- Keep 2 columns on mobile; never collapse a mosaic to a single-column list.
- On mobile the bento module also keeps ≥ 2 columns (`--ns-cols-min`).

## Sheet — `ns-frame/sheet`

```js
import { sheet } from 'ns-frame/sheet'
const s = sheet(panel, { onClose: () => dialog.close(), onProgress: p => dialog.style.setProperty('--p', p) })
```

Panel follows the finger/mouse down (rubber band up), closes on release past 35 % of its height or on a downward fling. Moves only `translate`. Options `handle`, `threshold` (6 px). Returns `{ close(), reset(), destroy() }`. Escape/backdrop are yours (`<dialog>` `cancel` → `s.close()`). Pure helpers: `rubber(x, h)`, `release(y, v, h)`.

## Navigation island — `ns-frame/isle`

`<nav data-ns-isle>` with `[data-ns-isle-toggle]` (+ `-icon`, `-label`, `-pos`) and a `[data-ns-isle-panel]` sheet of section links (`[data-ns-isle-close]`, `[data-ns-isle-handle]`); `isle(el, { pos, onChange })` → `{ open(), close(), toggle(), go(i), index, destroy() }`. Tracks the current section with IntersectionObserver, stays full while scrolling down and collapses to an icon on scroll up (`collapseOn: 'down'` inverts it), swipe = previous/next section. Tapping morphs the capsule into the sheet like Apple's Dynamic Island: an opaque 7-piece (9-slice) silhouette springs from one shape to the other animating only transform/opacity (compositor thread; Safari does not composite clip-path), then fades into the pre-painted sheet (`morph: false` = slide up; `--ns-isle-radius` 32px, `--ns-isle-morph` color). Page scroll is locked while the sheet is open, including iOS touch. Uses `ns-frame/sheet`. Full options in `docs/componentes.md`.

## What CSS can't do yet — `concentric`, `flow`, `mark`, `liquid`

All four activate by attribute (also on elements added later) and export `refresh()` (`liquid()` returns `update()` instead).

**`ns-frame/concentric`** — `<img data-ns-concentric>` inside a shaped parent gets the parent's shape offset by the measured gap on each side (round/squircle: radius − gap; bevel: diagonal moved by the gap; notch keeps its step; edge features, fillets and `poly` too). Parent = nearest `[data-ns]`/`[data-ns-nest]`/`<ns-frame>` or a selector in the attribute (`data-ns-concentric=".card"`); a parent without ns shape contributes its CSS `border-radius`. `--ns-concentric-min`: radius for corners far from the parent's (0 = square). It **writes the child's `data-ns`** — do not set one yourself. Pure: `concentric(shape, w, h, [t, r, b, l], min)`.

**`ns-frame/flow`** — `data-ns-flow` on a `data-ns` element: text fills the shape (the `shape-inside` CSS never shipped), via invisible `shape-outside` floats. Margin: attribute px (`data-ns-flow="22"`), else `--ns-pad`, else the element's padding. **Needs a defined height** (height, aspect-ratio, grid cell); with auto height it retries 3 times and stops. Content must be block/inline. `data-ns-flow="off"` disables. Exports `flow`, `unflow`, `profile`, `refresh`.

**`ns-frame/mark`** — `<mark data-ns-mark>…</mark>`: one continuous highlight across all lines, with convex and concave fillets (no blur filter). Set `background: none` on the `<mark>`. Vars: `--ns-mark` (default system color `Mark`), `--ns-mark-pad` (`2px 6px`, vertical horizontal), `--ns-mark-round` (8px), `--ns-mark-border`, `--ns-mark-width`, `--ns-mark-time`. `data-ns-mark="draw"` draws left to right on entering the viewport. Pure: `outline(rects, px, py)`.

**`ns-frame/liquid`** — `<nav data-ns-liquid>` with children: nearby children melt into one blob with a crisp SVG edge (no gooey filter). Children must have no background; the group paints `--ns-liquid-fill` (+ `--ns-liquid-border`, `--ns-liquid-width`). `--ns-liquid`: max gap that melts (14px; 0 = plain union). `data-ns-blob` limits which children count. Children are treated as rounded rectangles (their `border-radius`), not ns shapes. Redraws only while something moves. JS: `liquid(el, { blobs, k, step })` → `{ update(), destroy() }`; pure `blend(boxes, k, step)`.

## Materials — `glass`, `tabs`, `relief`, `light`

**`ns-frame/glass`** — `data-ns-glass` on any element (with or without `data-ns`): liquid glass with the element's exact shape. Tokens: `clear` (almost no tint), `tint` (more legible), `u` (U light), `facet` (cut glass), `prism` (chromatic edge). Layers: blurred body, **lens** (the background bends at the edge), rim light from `ns-frame/light`, shadow. **Ready to use: set no variables.** Lens strength and depth scale with the element (42 % / 55 % of the short side); blur 3px (7px in light tone). Engines: Chromium bends the real backdrop (`backdrop-filter` + `feDisplacementMap`); Safari, iOS browsers and Firefox render the lens in WebGL over a readable image/video/canvas behind it or over the page rasterised under the glass (repainted on scroll), with an SVG-filter fallback. One shared WebGL context; glasses over the same photo share one texture. Tone: the glass reads what passes behind (flat colour or the exact photo region, CORS required) — without its own tint it flips to light (`ns-glass-light`); with `--ns-glass-tint` set it deepens instead (`ns-glass-deep`). **Use `color: var(--ns-glass-ink)` for its content.** Content goes inside elements, never as a bare text node. `data-ns-liquid-src="selector|page|none"` forces the background. CSP needs `img-src data:`. JS: `glass(el, opts)` → `{ update(), frame(), destroy() }`.

**`ns-frame/liquid` glass** — `data-ns-liquid="glass"`: the same material on a group of melting blobs (a tab bar, drops that come out of a button).

**`ns-frame/tabs`** — `<div data-ns-tabs data-ns-liquid="glass" role="group">` + buttons: a glass indicator you tap or drag between tabs; while dragged it lifts as a magnifying lens (vars `-lift`). `data-ns-tabs="shrink"` shrinks the bar while a scroll container (`data-ns-tabs-scroll`) scrolls down, like iOS/Instagram. Event `change` with `detail { index, tab }`. JS: `tabs(el, { items })` → `{ select(i), index, destroy() }`. Keyboard: arrows move, `aria-pressed` kept in sync.

**`ns-frame/relief`** — `data-ns-relief` (`surface`, `raised`, `knob`, `inset`, `select`, `ghost`; tones `metal`, `paper`): opaque materials with real bevel lit per pixel by the page light; controls sink on press / `aria-pressed` / `aria-checked`. No CSS `border`.

**`ns-frame/light`** — one directional light for the whole page (follows pointer/scroll); `material(params)` → id of a shared SVG lighting `<filter>`. Used by relief and the glass rim; rarely needed directly.

## Callouts — `ns-frame/link`

`<div data-ns-link="#target">Label</div>` draws a straight + 45° line to `#target`.

## Effects — `ns-fx.css` (+ `ns-frame/fx`)

U light: `ns-u` (`-top`, `-left`, `-right`), section glow `ns-aura`; animations `ns-u-hover`, `ns-u-live`, `ns-u-tide`, `ns-u-surge`, `ns-u-breathe`, `ns-u-hue`; variables `--ns-u`, `--ns-u-glow`, `--ns-u-rise`, `--ns-u-side`, `--ns-u-corner`, `--ns-u-fade`, `--ns-u-time`. Others: `ns-aurora`, `ns-halo`, `ns-pulse`, patterns `ns-dots ns-grid ns-lines ns-stripes ns-scales ns-scan`, `ns-shimmer`, `ns-text-shimmer`, `ns-text-aurora`, and `data-ns-decode` (needs `ns-frame/fx`).

## Build-time — `ns-frame/static`, `ns-frame/astro`, `ns-frame/css`

```js
// astro.config.mjs
import nsStatic from 'ns-frame/astro'
export default defineConfig({ integrations: [nsStatic()] })
```

`<article data-ns-static="card">` becomes a class + one external stylesheet (strict-CSP safe). Clip only.
