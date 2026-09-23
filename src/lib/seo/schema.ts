import { SITE } from '../../config/site';
import type { SitePageContent } from '../../content/site-content';
import { plainText } from '../../utils/master-markdown';

const organizationId = `${SITE.url}/#organization`;
const professionalServiceId = `${SITE.url}/#professional-service`;

export const ENTITY_DESCRIPTION = 'A Bescheiben é uma empresa brasileira de estratégia, branding, marketing e tecnologia que investiga problemas antes de definir soluções.';

const serviceNames: Readonly<Record<string, string>> = {
  '/estrategia': 'Estratégia e Diagnóstico',
  '/branding': 'Branding e Posicionamento',
  '/marketing': 'Marketing e Conteúdo',
  '/digital': 'Sites e Experiências Digitais',
  '/tecnologia': 'CRM, Automação e Inteligência Artificial',
};

export function baseEntityGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE.name,
      url: `${SITE.url}/`,
      email: SITE.email,
      logo: `${SITE.url}/brand/logo-stacked-color.svg`,
      description: ENTITY_DESCRIPTION,
      sameAs: [SITE.social.instagram, SITE.social.linkedin],
    },
    {
      '@type': 'ProfessionalService',
      '@id': professionalServiceId,
      name: SITE.name,
      url: `${SITE.url}/`,
      email: SITE.email,
      description: ENTITY_DESCRIPTION,
      parentOrganization: { '@id': organizationId },
      sameAs: [SITE.social.instagram, SITE.social.linkedin],
    },
  ];
}

export function schemasForPage(page: SitePageContent): Record<string, unknown>[] {
  const url = new URL(page.route === '/' ? '/' : `${page.route}/`, `${SITE.url}/`).toString();
  const graph: Record<string, unknown>[] = [
    ...baseEntityGraph(),
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.seo.title,
      description: page.seo.description,
      inLanguage: SITE.language,
      isPartOf: { '@id': `${SITE.url}/#website` },
      about: { '@id': organizationId },
    },
  ];

  if (page.route === '/') graph.push({ '@type': 'WebSite', '@id': `${SITE.url}/#website`, url: `${SITE.url}/`, name: SITE.name, inLanguage: SITE.language, publisher: { '@id': organizationId } });
  if (serviceNames[page.route]) graph.push({
    '@type': 'Service',
    '@id': `${url}#service`,
    name: serviceNames[page.route],
    url,
    description: page.seo.description,
    provider: { '@id': professionalServiceId },
  });
  if (page.faqs.length > 0) graph.push({
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: page.faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: plainText(item.answer) },
    })),
  });

  return [{ '@context': 'https://schema.org', '@graph': graph }];
}
