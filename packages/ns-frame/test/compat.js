// Comprueba toasts y popovers sin Popover API. Resultado en window.__r
window.__err = []
addEventListener('error', e => window.__err.push(e.message))
await import('../src/ns-frame.js')
const { toast } = await import('../src/ns-toast.js')
await import('../src/ns-pop.js')
await new Promise(r => setTimeout(r, 100))
const vis = el => { const s = getComputedStyle(el); return s.display != 'none' && s.visibility != 'hidden' }
const r = { popHiddenAtStart: !vis(document.getElementById('p')) }
try { toast('Hola'); r.toastOk = true } catch (e) { r.toastOk = String(e) }
await new Promise(r => setTimeout(r, 200))
r.toastVisible = vis(document.querySelector('.ns-toasts'))
document.getElementById('t').click()
await new Promise(r => setTimeout(r, 100))
r.popOpens = vis(document.getElementById('p'))
document.body.click()
await new Promise(r => setTimeout(r, 100))
r.popClosesOutside = !vis(document.getElementById('p'))
window.__r = r
