import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

const siteConfigUrl = new URL('../../src/config/site.ts', import.meta.url);
const jsonLdUrl = new URL('../../src/utils/json-ld.ts', import.meta.url);
const faqUrl = new URL('../../src/components/FAQ.astro', import.meta.url);

type RenderableAstroComponent = Parameters<AstroContainer['renderToString']>[0];

async function importSiteConfig() {
  expect(
    existsSync(fileURLToPath(siteConfigUrl)),
    'the shared site identity and navigation config must exist',
  ).toBe(true);

  return import(siteConfigUrl.href) as Promise<{
    SITE: {
      name: string;
      email: string;
      url: string;
      social: { instagram: string; linkedin: string };
    };
    PRIMARY_NAVIGATION: Array<{ label: string; href: string }>;
    DIAGNOSTIC_CTA: { label: string; href: string };
  }>;
}

async function importJsonLd() {
  expect(
    existsSync(fileURLToPath(jsonLdUrl)),
    'the safe JSON-LD serializer must exist',
  ).toBe(true);

  return import(jsonLdUrl.href) as Promise<{ serializeJsonLd: (value: unknown) => string }>;
}

async function importFaq(): Promise<RenderableAstroComponent> {
  const module = (await import(faqUrl.href)) as { default: RenderableAstroComponent };
  return module.default;
}

describe('shared shell contracts', () => {
  it('ships a deployment security-header baseline including anti-framing policy', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const wildcard = config.headers?.find((entry) => entry.source === '/(.*)');
    const headers = Object.fromEntries((wildcard?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('keeps identity, exact primary navigation, diagnostic CTA and public channels in one config', async () => {
    const { SITE, PRIMARY_NAVIGATION, DIAGNOSTIC_CTA } = await importSiteConfig();

    expect(SITE).toMatchObject({
      name: 'Bescheiben',
      email: 'bescheiben@gmail.com',
      url: 'https://bescheiben.com.br',
      social: {
        instagram: 'https://www.instagram.com/bescheiben/',
        linkedin: 'https://www.linkedin.com/company/bescheiben/?viewAsMember=true',
      },
    });
    expect(PRIMARY_NAVIGATION).toEqual([
      { label: 'Estratégia', href: '/estrategia' },
      { label: 'Branding', href: '/branding' },
      { label: 'Marketing', href: '/marketing' },
      { label: 'Digital', href: '/digital' },
      { label: 'Tecnologia', href: '/tecnologia' },
      { label: 'Insights', href: '/insights' },
      { label: 'Sobre', href: '/sobre' },
    ]);
    expect(DIAGNOSTIC_CTA).toEqual({ label: 'Solicitar diagnóstico', href: '/diagnostico' });
    expect(JSON.stringify(SITE).toLowerCase()).not.toContain('whatsapp');
  });

  it('serializes JSON-LD without allowing script-tag breakout', async () => {
    const { serializeJsonLd } = await importJsonLd();

    expect(serializeJsonLd({ value: '</script><script>alert("x")</script>&\u2028' })).toBe(
      '{"value":"\\u003c/script\\u003e\\u003cscript\\u003ealert(\\"x\\")\\u003c/script\\u003e\\u0026\\u2028"}',
    );
  });

  it('prefixes FAQ trigger and panel ids so multiple lists cannot collide', async () => {
    const FAQ = await importFaq();
    const container = await AstroContainer.create();
    const html = await container.renderToString(FAQ, {
      props: {
        idPrefix: 'home-faq',
        items: [{ question: 'Como começa?', answer: 'Com diagnóstico.' }],
      },
    });

    expect(html).toContain('id="home-faq-trigger-0"');
    expect(html).toContain('aria-controls="home-faq-panel-0"');
    expect(html).toContain('id="home-faq-panel-0"');
    expect(html).toContain('aria-labelledby="home-faq-trigger-0"');
  });
});
