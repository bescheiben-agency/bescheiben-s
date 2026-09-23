import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const contentModuleUrl = new URL('../../src/content/site-content.ts', import.meta.url);

type ContentModule = typeof import('../../src/content/site-content');

async function loadContent(): Promise<ContentModule> {
  expect(
    existsSync(fileURLToPath(contentModuleUrl)),
    'the typed public-site content module must exist',
  ).toBe(true);

  return import(contentModuleUrl.href) as Promise<ContentModule>;
}

const expectedSeo = {
  '/': {
    title: 'Bescheiben | Estratégia, Branding, Marketing e Tecnologia',
    description:
      'Estratégia, branding, marketing, sites, performance, CRM, automação e inteligência artificial conectados por diagnóstico, posicionamento e execução.',
  },
  '/estrategia': {
    title: 'Consultoria de Estratégia e Diagnóstico | Bescheiben',
    description:
      'Diagnóstico estratégico, pesquisa, mercado, cliente e concorrência para identificar prioridades e orientar decisões de marca, marketing e crescimento.',
  },
  '/branding': {
    title: 'Agência de Branding e Posicionamento | Bescheiben',
    description:
      'Estratégia de marca, posicionamento, rebranding, narrativa, identidade verbal e identidade visual construídos a partir do negócio e do mercado.',
  },
  '/marketing': {
    title: 'Estratégia de Marketing e Conteúdo | Bescheiben',
    description:
      'Estratégia de marketing, conteúdo, social media, campanhas e performance orientados por posicionamento, mensagens, jornada e objetivos.',
  },
  '/digital': {
    title: 'Criação de Sites, UX e Desenvolvimento | Bescheiben',
    description:
      'Estratégia digital, copy, UX, UI, desenvolvimento de sites, SEO, AEO, GEO e analytics integrados à marca e à jornada do público.',
  },
  '/tecnologia': {
    title: 'CRM, Automação e Inteligência Artificial | Bescheiben',
    description:
      'CRM, integrações, automação e aplicações de inteligência artificial orientadas por processos, contexto e necessidades reais da operação.',
  },
  '/insights': {
    title: 'Insights sobre Branding, Marketing e Estratégia | Bescheiben',
    description:
      'Análises da Bescheiben sobre estratégia, branding, marketing, comportamento, tecnologia, negócios e decisões de marca.',
  },
  '/sobre': {
    title: 'Sobre a Bescheiben | Estratégia, Marca e Tecnologia',
    description:
      'Conheça a Bescheiben, empresa de estratégia, branding, marketing, experiências digitais e tecnologia orientada por diagnóstico e decisões fundamentadas.',
  },
  '/diagnostico': {
    title: 'Diagnóstico Estratégico | Fale com a Bescheiben',
    description:
      'Conte o contexto da sua empresa. A Bescheiben analisa o cenário antes de definir a solução mais adequada para marca, marketing, digital ou tecnologia.',
  },
} as const;

describe('public-site content contract', () => {
  it('covers every public route with complete hero and body content', async () => {
    const { siteContent } = await loadContent();

    expect(Object.keys(siteContent)).toEqual(Object.keys(expectedSeo));

    for (const route of Object.keys(expectedSeo) as Array<keyof typeof expectedSeo>) {
      const page = siteContent[route];
      expect(page.route).toBe(route);
      expect(page.hero.eyebrow.length).toBeGreaterThan(0);
      expect(page.hero.heading.length).toBeGreaterThan(0);
      expect(page.hero.supportingCopy.length).toBeGreaterThan(0);
      expect(page.ctas.length).toBeGreaterThan(0);
      expect(page.sections.length).toBeGreaterThan(0);
    }
  });

  it('preserves every exact SEO title and meta description from the master copy', async () => {
    const { siteContent } = await loadContent();

    for (const [route, seo] of Object.entries(expectedSeo)) {
      expect(siteContent[route as keyof typeof siteContent].seo).toEqual(seo);
    }
  });

  it('provides the complete FAQ sets only on routes that define them', async () => {
    const { siteContent } = await loadContent();

    expect(siteContent['/'].faqEyebrow).toBe('PERGUNTAS FREQUENTES');
    expect(siteContent['/'].faqs).toHaveLength(8);

    for (const route of ['/estrategia', '/branding', '/marketing', '/digital', '/tecnologia'] as const) {
      expect(siteContent[route].faqs).toHaveLength(4);
    }

    for (const route of ['/insights', '/sobre', '/diagnostico'] as const) {
      expect(siteContent[route].faqs).toEqual([]);
    }

    for (const page of Object.values(siteContent)) {
      for (const faq of page.faqs) {
        expect(faq.question.length).toBeGreaterThan(0);
        expect(faq.answer.length).toBeGreaterThan(0);
      }
    }
  });

  it('provides routable Home CTAs for Technology and About', async () => {
    const { siteContent } = await loadContent();

    expect(siteContent['/'].ctas).toContainEqual({
      label: 'Conhecer Tecnologia',
      href: '/tecnologia',
    });
    expect(siteContent['/'].ctas).toContainEqual({
      label: 'Conhecer a Bescheiben',
      href: '/sobre',
    });
  });

  it('exports the exact official entity sentence', async () => {
    const { OFFICIAL_ENTITY_SENTENCE, siteContent } = await loadContent();
    const expected =
      'A Bescheiben é uma empresa brasileira de estratégia, branding, marketing e tecnologia que investiga problemas antes de definir soluções.';

    expect(OFFICIAL_ENTITY_SENTENCE).toBe(expected);
    expect(siteContent['/'].entitySentence).toBe(expected);
    expect(siteContent['/sobre'].entitySentence).toBe(expected);
  });

  it('keeps plain H1 CTA markers distinct from nested CTA labels', async () => {
    const { siteContent } = await loadContent();

    expect(siteContent['/marketing'].finalCta?.body).toBe(
      '# Calendário é consequência.\n\n# Estratégia vem antes.\n\n**Conversar sobre Marketing**',
    );
    expect(siteContent['/marketing'].finalCta?.ctas).toEqual([
      { label: 'Conversar sobre Marketing', href: '/diagnostico' },
    ]);
  });
});
