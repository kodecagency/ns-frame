# ns-frame review checklist and common mistakes

## Before handing work back

- [ ] The core is imported exactly once per page (and modules only when used).
- [ ] No CSS `border` on shaped elements; borders come from `--ns-border`.
- [ ] Shaped containers with text use `data-ns-pad` or enough padding.
- [ ] `audit({ clearance: 5 })` returns `[]` at desktop width and at 390 px.
- [ ] No horizontal scroll at 390 px.
- [ ] Interactive elements are real `<button>` / `<a>` / `<input>`; focus ring is visible (Tab through the page).
- [ ] Anything animated also looks right with `prefers-reduced-motion: reduce`.
- [ ] No `innerHTML` with dynamic values; no `'unsafe-inline'` added to the CSP for ns-frame.
- [ ] Carousels have `aria-label`; tooltips use `role="tooltip"`; after `morph()` focus is moved.
- [ ] Images inside skeletons or carousels have `width`/`height` or `aspect-ratio` (no layout shift).

## Common mistakes

| Mistake | Fix |
|---|---|
| Border looks cut off at the corners | Remove CSS `border`; use `--ns-border` |
| Text touches a bevel | `data-ns-pad` on the container; chips need ≥ 9px vertical padding |
| Morph "jumps" instead of animating | Keep the same corner types count and the same number of edge features in both shapes |
| Shape ignored in a framework component | The attribute is `data-ns`, not `ns`; for `<ns-frame>` use the `shape` attribute |
| Two cores loaded | Don't mix `ns-frame/lite` with optional modules; import the core once |
| `[hidden]` element still visible | A `display` rule overrides `hidden`; add `.selector[hidden]{display:none}` |
| Page styles win over a module's styles | Expected: ns-frame styles live in `@layer ns`; set the variable instead of fighting specificity |
| `section { padding… }` affects a component container | Style your own containers by class, not by element type |
| `data-ns-static` shape has no border/animation | Static shapes only clip; use `data-ns` with the runtime for borders and motion |
| `css()` returns `null` | The shape uses `%` corner sizes or `@<N` queries; use the runtime for it |

## Working on the library itself

- `pnpm test` builds and runs the parity test (source vs minified vs lite, plus explicit cases). It must report 0 failures.
- Open `packages/ns-frame/test/csp.html` (strict CSP + malicious attributes): 0 violations, 0 injected nodes.
- `packages/ns-frame/test/bench.html?n=4000&src=../dist/ns-frame.js` for performance; compare versions in the same session.
- Dependencies: pnpm only, exact versions, lockfile committed.
