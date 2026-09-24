# ns-frame components and modules

Every module is optional. With npm: `import 'ns-frame/<module>'`. With the CDN: `…/packages/ns-frame/dist/ns-<module>.js`.

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

Top-layer `popover="manual"` stack, timer drawn on the border (pauses on hover/focus/hidden tab), persistent toasts (`time: 0`) are never evicted, errors use `role="alert"`. Messages are text only.

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
