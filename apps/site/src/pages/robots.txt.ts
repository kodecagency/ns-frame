// robots.txt: la landing y las guías se indexan; /lab (páginas de prueba) no. /ns-frame/ sí se deja:
// son scripts que el buscador necesita para renderizar. Con `site`, apunta al mapa del sitio
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /lab/\n${site ? `\nSitemap: ${new URL('/sitemap.xml', site).href}\n` : ''}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
