// Mapa del sitio para los buscadores: la landing y cada guía. Sin integración aparte (una dependencia
// menos): se genera en el build a partir de la colección de guías. Las URL de un sitemap son
// absolutas, así que hace falta `site` en astro.config.mjs; sin él, el mapa sale vacío
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

export const GET: APIRoute = async ({ site }) => {
  const docs = (await getCollection('docs')).sort((a, b) => a.data.order - b.data.order)
  const paths = ['/', ...docs.map(d => `/docs/${d.id}`)]
  const urls = site ? paths.map(p => `<url><loc>${new URL(p, site).href}</loc><changefreq>${p == '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p == '/' ? '1.0' : '0.8'}</priority></url>`) : []
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
