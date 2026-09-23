import type { APIRoute } from 'astro';

export const PUBLIC_SITEMAP_ROUTES = [
  '/', '/estrategia', '/branding', '/marketing', '/digital', '/tecnologia', '/insights', '/sobre',
  '/diagnostico', '/privacidade', '/cookies', '/termos', '/acessibilidade',
] as const;

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[character] ?? character));

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://bescheiben.com.br/');
  const urls = PUBLIC_SITEMAP_ROUTES.map((route) => `  <url>\n    <loc>${escapeXml(new URL(route === '/' ? '/' : route, base).href)}</loc>\n  </url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
