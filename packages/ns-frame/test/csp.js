// Registra violaciones de CSP y ejecuta todas las funciones que tocan el DOM.
window.__violations = []
document.addEventListener('securitypolicyviolation', e => window.__violations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sample}`))
window.alert = () => window.__violations.push('alert ejecutado: inyección')
const ns = await import('../src/ns-frame.js')
await import('../src/ns-link.js')
await import('../src/ns-fx.js')
await import('../src/ns-skel.js')
await import('../src/ns-carousel.js')
await import('../src/ns-mosaic.js')
const { morph } = await import('../src/ns-vt.js')
const { toast } = await import('../src/ns-toast.js')
toast('<img src=x onerror=alert(1)><script>alert(1)</script>', { title: '<b onclick=alert(1)>t</b>', type: 'error', time: 0 })
toast('temporal', { time: 300 })
await new Promise(r => setTimeout(r, 400))
await ns.close(document.getElementById('d'), 'iris', 50)
await ns.open(document.getElementById('d'), 'open', 50)
await morph(document.getElementById('d'), () => document.getElementById('d').setAttribute('data-ns', 'all squircle 20'), document.getElementById('d'), { duration: 60 })
document.getElementById('b').focus()
document.getElementById('e').removeAttribute('data-ns-skeleton')
// mosaico: onda al tocar y luz que sigue al puntero (Web Animations y CSSOM, nada inline)
const mo = document.getElementById('mo'), mr = mo.getBoundingClientRect()
mo.dispatchEvent(new PointerEvent('pointerdown', { clientX: mr.left + 20, clientY: mr.top + 20 }))
mo.dispatchEvent(new PointerEvent('pointermove', { clientX: mr.left + 40, clientY: mr.top + 30 }))
await new Promise(r => setTimeout(r, 200))
window.__done = true

// Resultado visible para quien abra la página
const injected = document.querySelectorAll('svg script, svg image, .ns-toast img, .ns-toast script, .ns-toast [onclick]').length
const out = document.createElement('pre')
out.id = 'result'
out.textContent = `CSP estricta: ${window.__violations.length} violaciones\nNodos inyectados: ${injected}\n` +
  (window.__violations.length || injected ? '✗ FALLO\n' + window.__violations.join('\n') : '✓ OK: todo funciona sin \'unsafe-inline\' y sin inyección')
document.body.prepend(out)
