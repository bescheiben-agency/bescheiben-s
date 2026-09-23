import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

type RenderableAstroComponent = Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create({
    astroConfig: { site: 'https://bescheiben.com.br/' },
  });
});

async function component(name: string): Promise<RenderableAstroComponent> {
  const url = new URL(`../../src/components/${name}.astro`, import.meta.url);
  expect(existsSync(fileURLToPath(url)), `${name} must exist`).toBe(true);
  const module = (await import(url.href)) as { default: RenderableAstroComponent };
  return module.default;
}

describe('editorial component contracts', () => {
  it('composes the document shell with one named main landmark', async () => {
    const SiteLayout = await component('../layouts/SiteLayout');
    const html = await container.renderToString(SiteLayout, {
      partial: false,
      request: new Request('https://bescheiben.com.br/branding'),
      props: {
        title: 'Branding | Bescheiben',
        description: 'Descrição da página.',
        pageClass: 'page-branding',
      },
      slots: { default: '<h1>Branding</h1>' },
    });

    expect(html).toContain('class="skip-link"');
    expect(html).toContain('<header');
    expect(html).toContain('<main id="conteudo"');
    expect(html).toContain('<h1>Branding</h1>');
    expect(html).toContain('<footer');
    expect(html).toContain('class="page-branding"');
  });

  it('renders a single page H1 from data and keeps actions routable', async () => {
    const PageHero = await component('PageHero');
    const html = await container.renderToString(PageHero, {
      props: {
        eyebrow: 'ESTRATÉGIA E DIAGNÓSTICO',
        title: ['Antes de decidir.', 'Entenda o que precisa mudar.'],
        supportingCopy: ['Uma leitura antes da solução.'],
        actions: [
          { label: 'Solicitar diagnóstico', href: '/diagnostico' },
          { label: 'Entender nossa abordagem', href: '/estrategia', variant: 'secondary' },
        ],
      },
    });

    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Antes de decidir.');
    expect(html).toContain('Entenda o que precisa mudar.');
    expect(html).toContain('href="/diagnostico"');
    expect(html).toContain('href="/estrategia"');
  });

  it('renders an editorial section with an addressable id and deliberate surface', async () => {
    const EditorialSection = await component('EditorialSection');
    const html = await container.renderToString(EditorialSection, {
      props: {
        id: 'diagnostico-estrategico',
        label: '01',
        title: 'Diagnóstico antes da execução.',
        body: ['O contexto orienta a escolha.', 'A prioridade organiza o trabalho.'],
        tone: 'subtle',
      },
    });

    expect(html).toContain('id="diagnostico-estrategico"');
    expect(html).toContain('data-tone="subtle"');
    expect(html).toContain('<h2');
    expect(html).toContain('O contexto orienta a escolha.');
    expect(html).toContain('A prioridade organiza o trabalho.');
  });

  it('renders copy-defined section CTAs as real links', async () => {
    const MasterSection = await component('MasterSection');
    const html = await container.renderToString(MasterSection, {
      props: {
        section: {
          id: 'antes-da-solucao',
          heading: 'SEÇÃO 01',
          body: '### CTA\n\n**Entender nossa abordagem**',
        },
        index: 0,
        route: '/',
        ctas: [{ label: 'Entender nossa abordagem', href: '/estrategia' }],
      },
    });

    expect(html).toContain('href="/estrategia"');
    expect(html).not.toContain('<p>Entender nossa abordagem</p>');
  });

  it('renders a capability index with one semantic destination per linked item', async () => {
    const CapabilityIndex = await component('CapabilityIndex');
    const html = await container.renderToString(CapabilityIndex, {
      props: {
        items: [
          { title: 'Branding', description: 'Posição e significado.', href: '/branding' },
          { title: 'Marketing', description: 'Mensagem e movimento.', href: '/marketing' },
        ],
      },
    });

    expect(html.match(/<li\b/g)).toHaveLength(2);
    expect(html.match(/<a\b/g)).toHaveLength(2);
    expect(html).toContain('href="/branding"');
    expect(html).toContain('href="/marketing"');
  });

  it('keeps statement and final conversion components below the page heading level', async () => {
    const QuoteStatement = await component('QuoteStatement');
    const FinalCTA = await component('FinalCTA');
    const quote = await container.renderToString(QuoteStatement, {
      props: { statement: 'Equilíbrio é a base de tudo.' },
    });
    const cta = await container.renderToString(FinalCTA, {
      props: {
        title: 'Comece pelo que precisa mudar.',
        body: 'Compartilhe seu contexto.',
        actions: [{ label: 'Solicitar diagnóstico', href: '/diagnostico' }],
      },
    });

    expect(quote).toContain('<aside');
    expect(quote).toContain('aria-label="Ponto de vista Bescheiben"');
    expect(quote).not.toContain('<h1');
    expect(cta).toContain('<h2');
    expect(cta).not.toContain('<h1');
    expect(cta).toContain('href="/diagnostico"');
  });
});
