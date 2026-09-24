// ns-frame/astro · integración de Astro
/** Compila cada data-ns-static a una clase y escribe una sola hoja CSS al terminar el build. */
export default function nsStatic(options?: { /** ruta de la hoja dentro de dist (por defecto _ns/static.css) */ file?: string }): { name: string; hooks: Record<string, (...args: any[]) => unknown> }
