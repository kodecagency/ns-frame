// Verifica que los builds minificados producen exactamente lo mismo que el código fuente.
import * as src from '../src/ns-frame.js'
import * as min from '../dist/ns-frame.js'
import * as lite from '../dist/ns-frame.lite.js'
import { css as cssSrc } from '../src/ns-css.js'
import { css as cssMin } from '../dist/ns-css.js'
import { extract } from '../src/ns-static.js'
import { parseAreas } from '../src/ns-mosaic.js'
import { rubber, release } from '../src/ns-sheet.js'
import { concentric } from '../src/ns-concentric.js'
import { concentric as concentricMin } from '../dist/ns-concentric.js'
import { outline } from '../src/ns-mark.js'
import { blend } from '../src/ns-liquid.js'
import { blend as blendMin } from '../dist/ns-liquid.js'

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
shapes.push('poly 0 0 r12, 40% 0 r0, 50% 20 a-20 r0, 60% 0 r0, 100% 0 r12, 100% 100% r12, 0 100% r12') // mordida con arco (mosaico)

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
// poly con arcos: "aN" llega al vértice por un arco (negativo = antihorario) y compila a shape()
eq(/A20 20 0 0 0 /.test(src.path('poly 0 0, 80 0, 100 20 a-20, 120 0, 200 0, 200 100, 0 100', 200, 100)), true, 'poly: arco antihorario')
eq(/A20 20 0 0 1 /.test(src.path('poly 0 0, 80 0, 100 20 a20, 120 0, 200 0, 200 100, 0 100', 200, 100)), true, 'poly: arco horario')
eq(/arc to .* of 20px 20px ccw/.test(cssSrc('poly 0 0, 40% 0, 40%+20 20 a-20, 40%+40 0, 100% 0, 100% 100%, 0 100%') || ''), true, 'poly: arco compila a CSS')
// mosaico: plantilla de áreas
eq(JSON.stringify(parseAreas(`'a a b' "c d"`)), '[["a","a","b"],["c","d","."]]', 'mosaic: parseAreas')
// hoja: resistencia elástica y decisión al soltar
eq(rubber(0, 400), 0, 'sheet: rubber en 0')
eq(rubber(4000, 400) < 100, true, 'sheet: rubber nunca supera h/4')
eq(rubber(100, 400) > rubber(50, 400), true, 'sheet: rubber crece')
eq(release(160, 0, 400), true, 'sheet: se cierra al pasar el 35 %')
eq(release(60, 0, 400), false, 'sheet: vuelve si bajó poco')
eq(release(40, .9, 400), true, 'sheet: se cierra al lanzarla')
eq(release(4, .9, 400), false, 'sheet: un toque rápido no la cierra')
// concéntricas: redondeo − hueco, chaflán − 0,59·hueco, muesca igual, rasgos de borde desplazados
const C = (s, i, m) => concentric(s, 300, 200, i, m)
eq(C('all round 24', [8, 8, 8, 8]), 'tl round 16 16; tr round 16 16; br round 16 16; bl round 16 16', 'concentric: redondeo')
eq(C('tl bevel 36', [12, 12, 12, 12]), 'tl bevel 29 29', 'concentric: chaflán (36 − 0,59 × 12)')
eq(C('all notch 12', [10, 10, 10, 10]).split('; ').every(x => / 12 12$/.test(x)), true, 'concentric: la muesca conserva su tamaño')
eq(C('all round 24', [30, 30, 30, 30]), '', 'concentric: hueco mayor que el radio → recto')
eq(C('br bevel 34', [60, 12, 12, 60], 10), 'tl round 10; tr round 10; br bevel 27 27; bl round 10', 'concentric: min en las esquinas libres')
eq(C('top cut center 34% 6', [10, 10, 10, 10]), 'top cut 85 195 6 6', 'concentric: corte del borde más ancho, misma profundidad')
eq(/^poly /.test(C('poly 0 0 r8, 100% 0 r8, 100% 100% r8, 50% 70% r8, 0 100% r8', [10, 10, 10, 10])), true, 'concentric: poly')
for (const [s, i] of [['panel', [10, 10, 10, 10]], ['ticket', [8, 8, 8, 8]], ['tab', [4, 6, 6, 6]], ['hud', [9, 9, 9, 9]]])
  eq(C(s, i), concentricMin(s, 300, 200, i), `concentric: build = fuente (${s})`)
eq(/NaN|undefined/.test(shapes.slice(0, 120).map(s => C(s, [7, 9, 11, 5])).join()), false, 'concentric: sin NaN en formas aleatorias')
// resaltado: tres líneas → un solo polígono ortogonal; líneas que no se tocan → piezas separadas
const R = (l, r, t) => ({ left: l, right: r, top: t, bottom: t + 20, width: r - l, height: 20 })
eq(outline([R(100, 400, 0), R(0, 400, 30), R(0, 180, 60)]).length, 1, 'mark: líneas seguidas, una pieza')
eq(outline([R(300, 400, 0), R(0, 120, 30)]).length, 2, 'mark: líneas que no se tocan, dos piezas')
eq(outline([R(0, 100, 0), R(0, 100, 30)])[0].length, 4, 'mark: líneas iguales, un rectángulo (sin vértices sobrantes)')
// líquido: dos píldoras cercanas se funden en un contorno; lejos, dos; build = fuente
const P = x => ({ x, y: 0, w: 48, h: 48, r: 24 })
eq((blend([P(0), P(58)], 16 * 2.4).match(/M/g) || []).length, 1, 'liquid: hueco de 10 px con alcance 16 → una gota')
eq((blend([P(0), P(120)], 16 * 2.4).match(/M/g) || []).length, 2, 'liquid: hueco de 72 px → dos gotas')
eq(blend([P(0), P(58), P(116)], 38), blendMin([P(0), P(58), P(116)], 38), 'liquid: build = fuente')
eq(/NaN/.test(blend([P(0), { x: 20, y: 10, w: 48, h: 48, r: 24 }], 38)), false, 'liquid: solapadas, sin NaN')
// formas sin JS: data-ns-static se compila a una clase + CSS shape()
const X = extract('<div class="a" data-ns-static="card">x</div><p data-ns-static="card"></p><i data-ns-static="tl bevel 30%"></i>')
eq(/^<div class="a ns-s-\w+">x<\/div><p class="ns-s-\w+"><\/p><i data-ns="tl bevel 30%"><\/i>$/.test(X.html), true, 'static: html')
eq(X.css.split('\n').length, 1, 'static: una regla por forma distinta')
eq(/clip-path:shape\(from/.test(X.css), true, 'static: css')
eq(X.skipped.length, 1, 'static: formas no lineales quedan para el runtime')
console.log(`${checks} comprobaciones, ${fails} fallos (${shapes.length} formas × 4 tamaños + css)`)
process.exit(fails ? 1 : 0)
