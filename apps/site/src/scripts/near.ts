// Ejecuta fn una sola vez, cuando el elemento está a menos de una pantalla de la vista (o ya en
// ella, como al llegar con un enlace #sección). Las secciones de más abajo cargan y activan sus
// módulos entonces, no al abrir la página: la carga no bloquea el hilo con lo que nadie ve aún.
export function near(el: Element, fn: () => void, margin = '100% 0px') {
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return
    io.disconnect()
    fn()
  }, { rootMargin: margin })
  io.observe(el)
}
