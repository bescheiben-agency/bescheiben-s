import { expect, test } from '@playwright/test';

const expectedRoutes = [
  '/', '/estrategia', '/branding', '/marketing', '/digital', '/tecnologia', '/insights', '/sobre',
  '/diagnostico', '/privacidade', '/cookies', '/termos', '/acessibilidade',
] as const;

const sitemapRoutes = async (request: import('@playwright/test').APIRequestContext) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBeTruthy();
  return [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname.replace(/\/$/, '') || '/');
};

test('sitemap contains only canonical public routes and discovery files are production-ready', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  expect(await sitemapRoutes(request)).toEqual(expectedRoutes);
  for (const route of ['/robots.txt', '/llms.txt', '/sitemap.xml', '/og-bescheiben.png']) {
    expect((await request.get(route)).status(), `${route} should load`).toBe(200);
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /api/');
  const llms = await (await request.get('/llms.txt')).text();
  expect(llms).toContain('investiga problemas antes de definir soluções');
  expect(llms).not.toContain('protótipo');
});

test('public pages expose unique canonicals, complete metadata and parseable entity graphs', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const routes = await sitemapRoutes(request);
  const titles = new Set<string>();
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('h1')).toHaveCount(1);
    const expectedCanonical = `https://bescheiben.com.br${route === '/' ? '/' : route}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expectedCanonical);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://bescheiben.com.br/og-bescheiben.png');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const title = await page.title();
    expect(titles.has(title), `${route} title must be unique`).toBe(false);
    titles.add(title);
    for (const raw of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(() => JSON.parse(raw)).not.toThrow();
  }
});

test('capability pages publish visible service schemas without invented geography', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  for (const route of ['/estrategia', '/branding', '/marketing', '/digital', '/tecnologia']) {
    await page.goto(route);
    const graphs = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((raw) => {
      const parsed = JSON.parse(raw) as { '@graph'?: Array<Record<string, unknown>> };
      return parsed['@graph'] ?? [];
    });
    const service = graphs.find((entry) => entry['@type'] === 'Service');
    expect(service).toBeTruthy();
    expect(service).not.toHaveProperty('areaServed');
  }
});

test('public routes and internal links stay within the responsive viewport', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const routes = await sitemapRoutes(request);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const route of routes) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} overflows at ${width}px`).toBeLessThanOrEqual(1);
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean));
      for (const href of hrefs) expect(expectedRoutes.some((candidate) => href === candidate || href?.startsWith(`${candidate}#`)), `broken internal href ${href}`).toBe(true);
    }
  }
});

test('not-found document is excluded from indexing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/404.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});
