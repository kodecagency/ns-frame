# ns-frame shape language — full reference

A shape is text: declarations separated by `;` or newlines. Put it in `data-ns`, in `shape` on `<ns-frame>`, in the CSS variable `--ns-shape`, or in `data-ns-static` (build-time, clip only).

## Units

- Numbers are px. `%` is relative to the side (for corners, to the shorter side).
- A negative position counts from the end: `-20` = 20 px before the end.
- Mixed: `100%-24`, `50%+8`.

## Corners

`<corner> <type> <size> [vertical-size] [rN]`

- Corners: `tl` `tr` `br` `bl`; groups `all`, `diag` (tl+br), `anti` (tr+bl); combine with `+` (`tl+br`).
- Logical corners: `ss` (start-start), `se`, `es`, `ee`. They equal `tl tr bl br` in LTR and mirror under `direction: rtl`. Prefer them for UI that may be localized to Arabic/Hebrew.
- Types: `bevel` (straight chamfer), `notch` (stepped), `round`, `scoop` (inverted radius), `squircle` (continuous superellipse corner), `square`.
- Two sizes = asymmetric cut: `tl bevel 44 14`. `rN` rounds the vertices of that cut: `tl notch 24 r6`.

## Edge features

`<edge> <feature> <from> <to> <depth> [slope] [rN]` or `<edge> <feature> center <width> <depth> [slope] [rN]`

- Edges: `top` `right` `bottom` `left`, logical `start` `end`; combine with `+`.
- Features: `cut` (notch inward, 45° slope by default, `0` = vertical walls), `tab` (protruding tab: the rest of the edge moves in by `depth`), `scoop` (curved bite, ticket style).
- `<edge> none` removes features from that edge (useful inside `@<N`).

## Other declarations

- `poly x y [rN], x y [rN], …` free polygon with per-vertex radius.
- `@<420 …` / `@>800 …` apply only when the **element's own width** is below/above N px.
- `radius N` global fillet on every vertex (convex and concave).
- `dir rtl` force RTL for logical corners (for build-time compilation).
- Presets (can be combined with more declarations):
  - `card` = `tl+br bevel 18; radius 3`
  - `button` = `tl+br bevel 10; radius 2`
  - `chip` = `all bevel 7; radius 1.5`
  - `soft` = `all bevel 22; radius 9`
  - `notch` = `all notch 12; radius 3`
  - `scoop` = `all scoop 16`
  - `wing` = `tl bevel 44 14; br bevel 44 14; radius 2`
  - `panel` = `tl bevel 26; br bevel 26; tr+bl bevel 8; top cut center 34% 6; radius 3`
  - `plate` = `all bevel 10; top+bottom cut center 36% 6; radius 2`
  - `tab` = `top tab 0 44% 10; all round 8; radius 4`
  - `ticket` = `left+right scoop center 26 13; all round 10`
  - `media` = `tl+br round 34; tr+bl bevel 18; radius 3`
  - `pill` = `tl+bl round 50%; tr+br bevel 12; radius 2`
  - `hud` = `tl bevel 20; br bevel 20; top cut 18% 42% 5; bottom tab -40% -14% 5; radius 2`
- `define('name', 'shape')` registers a custom preset.

## Morph rules

Each corner contributes 3 vertices and each edge feature 4. Two shapes interpolate vertex by vertex when those counts match. Size changes, `bevel`↔`notch`↔`round`↔`squircle` changes and `radius` changes morph; adding or removing an edge feature switches instantly.

## Build-time compilation

`css(shape)` (ns-frame/css) returns `shape(...)` with `calc(% + px)` or `null` when the shape is not linear in size (corner sizes in `%`, `@<N` queries). `data-ns-static` / `extract()` fall back to `data-ns` for those.

## Good defaults

- Cards: `card` or `tl+br bevel 18; radius 3` + `data-ns-pad`.
- Buttons: `button`, hover `tl+br bevel 16; radius 2`, press `all bevel 5; radius 2`.
- Images: `media` or `tl round 16; br round 16; tr+bl bevel 8; radius 2`.
- Chips/tags: `chip` with ≥ 9px vertical padding.
- Soft modern UI: `all squircle 20`.
