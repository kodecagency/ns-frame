// Verifica que los builds minificados producen exactamente lo mismo que el código fuente.
import * as src from '../src/ns-frame.js'
import * as min from '../dist/ns-frame.js'
import * as lite from '../dist/ns-frame.lite.js'
import { css as cssSrc } from '../src/ns-css.js'
import { css as cssMin } from '../dist/ns-css.js'
import { extract } from '../src/ns-static.js'

let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const pick = a => a[Math.floor(rnd() * a.length)]
const n = (a, b) => Math.round(a + rnd() * (b - a))

const shapes = Object.keys(src.PRESETS)
for (let i = 0; i < 400; i++) {
  const st = []
  for (const c of ['tl', 'tr', 'br', 'bl']) if (rnd() < .7) st.push(`${c} ${pick(['bevel', 'notch', 'round', 'scoop', 'squircle', 'square'])} ${n(0, 40)}${rnd() < .3 ? ' ' + n(0, 30) : ''}${rnd() < .3 ? ' r' + n(0, 8) : ''}`)
  for (const e of ['top', 'right', 'bottom', 'left']) if (rnd() < .3)
    st.push(rnd() < .5 ? `${e} ${pick(['cut', 'tab', 'scoop'])} center ${n(10, 60)}% ${n(2, 14)}` : `${e} ${pick(['cut', 'tab'])} ${n(5, 40)}% -${n(5, 40)}% ${n(2, 12)} ${n(0, 10)}`)
  if (rnd() < .5) st.push(`radius ${n(0, 10)}`)
  if (rnd() < .2) st.push(`@<${n(200, 500)} all bevel ${n(4, 12)}`)
  shapes.push(st.join('; '))
}
shapes.push('poly 28 0 r4, 100%-60 0 r4, 100% 50% r3, 100%-60 100% r4, 28 100% r4, 0 100%-28 r3, 0 28 r3', '', 'nada válido')

let checks = 0, fails = 0
const eq = (a, b, what) => { checks++; if (a !== b) { fails++; if (fails < 6) console.log('✗', what, '\n  src:', a, '\n  min:', b) } }
for (const sh of shapes) {
  for (const [w, h] of [[320, 200], [120, 60], [900, 400], [37, 21]]) {
    const ref = src.path(sh, w, h)
    eq(ref, min.path(sh, w, h), `path(${sh}, ${w}, ${h})`)
    eq(ref, lite.path(sh, w, h), `lite path(${sh}, ${w}, ${h})`)
    if (/NaN|undefined/.test(ref)) { fails++; console.log('✗ NaN en', sh, w, h) }
  }
  eq(cssSrc(sh), cssMin(sh), `css(${sh})`)
}
// casos explícitos: esquinas lógicas, squircle y compilación a CSS
const same = (a, b, what) => eq(src.path(a, 300, 200), src.path(b, 300, 200), what)
same('ss bevel 12; ee round 20', 'tl bevel 12; br round 20', 'lógicas en LTR')
same('dir rtl; ss bevel 12; ee round 20', 'tr bevel 12; bl round 20', 'lógicas en RTL')
same('dir rtl; start cut center 30% 6', 'right cut center 30% 6', 'borde lógico en RTL')
eq(/C/.test(src.path('all squircle 30', 300, 200)), true, 'squircle usa cúbicos')
eq(/^shape\(from .*curve to .* with .* \/ .*close\)$/.test(cssSrc('all squircle 24') || ''), true, 'squircle compila a shape() con curve')
eq(src.geometry('all squircle 24', 300, 200).length, src.geometry('all round 24', 300, 200).length, 'squircle se interpola con round')
// formas sin JS: data-ns-static se compila a una clase + CSS shape()
const X = extract('<div class="a" data-ns-static="card">x</div><p data-ns-static="card"></p><i data-ns-static="tl bevel 30%"></i>')
eq(/^<div class="a ns-s-\w+">x<\/div><p class="ns-s-\w+"><\/p><i data-ns="tl bevel 30%"><\/i>$/.test(X.html), true, 'static: html')
eq(X.css.split('\n').length, 1, 'static: una regla por forma distinta')
eq(/clip-path:shape\(from/.test(X.css), true, 'static: css')
eq(X.skipped.length, 1, 'static: formas no lineales quedan para el runtime')
console.log(`${checks} comprobaciones, ${fails} fallos (${shapes.length} formas × 4 tamaños + css)`)
process.exit(fails ? 1 : 0)
