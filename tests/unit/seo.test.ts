import { describe, expect, it } from 'vitest';
import { siteContent } from '../../src/content/site-content';
import { ENTITY_DESCRIPTION, schemasForPage } from '../../src/lib/seo/schema';

describe('SEO, AEO and GEO entity graph', () => {
  it('keeps one official entity definition and exact social identities', () => {
    const schema = schemasForPage(siteContent['/'])[0] as { '@graph': Array<Record<string, unknown>> };
    const organization = schema['@graph'].find((entry) => entry['@type'] === 'Organization');
    expect(organization).toMatchObject({
      description: ENTITY_DESCRIPTION,
      email: 'bescheiben@gmail.com',
      sameAs: [
        'https://www.instagram.com/bescheiben/',
        'https://www.linkedin.com/company/bescheiben/?viewAsMember=true',
      ],
    });
    expect(organization).not.toHaveProperty('address');
    expect(organization).not.toHaveProperty('telephone');
  });

  it('adds service schemas only to visible capability pages', () => {
    for (const route of ['/estrategia', '/branding', '/marketing', '/digital', '/tecnologia'] as const) {
      const graph = (schemasForPage(siteContent[route])[0] as { '@graph': Array<Record<string, unknown>> })['@graph'];
      expect(graph.some((entry) => entry['@type'] === 'Service')).toBe(true);
    }
    const insights = (schemasForPage(siteContent['/insights'])[0] as { '@graph': Array<Record<string, unknown>> })['@graph'];
    expect(insights.some((entry) => entry['@type'] === 'Service')).toBe(false);
  });

  it('keeps FAQ schema in exact parity with visible FAQ data', () => {
    for (const route of ['/', '/estrategia', '/branding', '/marketing', '/digital', '/tecnologia'] as const) {
      const page = siteContent[route];
      const graph = (schemasForPage(page)[0] as { '@graph': Array<Record<string, unknown>> })['@graph'];
      const faq = graph.find((entry) => entry['@type'] === 'FAQPage') as { mainEntity: unknown[] };
      expect(faq.mainEntity).toHaveLength(page.faqs.length);
    }
  });
});
