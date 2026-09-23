import masterCopy from './master/Bescheiben_Copy_Master_Final_SEO_AEO_GEO.md?raw';

export const PUBLIC_ROUTES = [
  '/',
  '/estrategia',
  '/branding',
  '/marketing',
  '/digital',
  '/tecnologia',
  '/insights',
  '/sobre',
  '/diagnostico',
] as const;

export type PublicRoute = (typeof PUBLIC_ROUTES)[number];

export interface SeoContent {
  readonly title: string;
  readonly description: string;
}

export interface CallToAction {
  readonly label: string;
  readonly href?: string;
}

export interface HeroContent {
  readonly eyebrow: string;
  readonly heading: readonly string[];
  readonly supportingCopy: readonly string[];
  readonly ctas: readonly CallToAction[];
  readonly microcopy?: string;
}

export interface ContentSection {
  readonly id: string;
  readonly heading: string;
  /** Exact Markdown following the section heading in the approved master copy. */
  readonly body: string;
}

export interface FaqContent {
  readonly question: string;
  /** Exact answer Markdown from the approved master copy. */
  readonly answer: string;
}

export interface FinalCtaContent {
  /** Exact final-CTA Markdown, including its display heading and button labels. */
  readonly body: string;
  readonly ctas: readonly CallToAction[];
}

export interface SitePageContent {
  readonly route: PublicRoute;
  readonly seo: SeoContent;
  readonly hero: HeroContent;
  readonly sections: readonly ContentSection[];
  readonly faqEyebrow?: string;
  readonly faqs: readonly FaqContent[];
  readonly ctas: readonly CallToAction[];
  readonly finalCta?: FinalCtaContent;
  readonly entitySentence?: typeof OFFICIAL_ENTITY_SENTENCE;
}

export const OFFICIAL_ENTITY_SENTENCE =
  'A Bescheiben é uma empresa brasileira de estratégia, branding, marketing e tecnologia que investiga problemas antes de definir soluções.' as const;

const normalizedMasterCopy = masterCopy.replace(/\r\n/g, '\n');

const CTA_HREFS: Readonly<Record<string, string>> = {
  'Solicitar diagnóstico': '/diagnostico',
  'Conhecer nosso método': '/estrategia#como-funciona',
  'Entender nossa abordagem': '/estrategia',
  'Explorar Estratégia': '/estrategia',
  'Explorar Branding': '/branding',
  'Explorar Marketing': '/marketing',
  'Explorar Digital': '/digital',
  'Explorar Tecnologia': '/tecnologia',
  'Conhecer Branding e Posicionamento': '/branding',
  'Conhecer Marketing e Conteúdo': '/marketing',
  'Conhecer Sites e Digital': '/digital',
  'Conhecer Tecnologia': '/tecnologia',
  'Explorar Insights': '/insights',
  'Conhecer a Bescheiben': '/sobre',
  'Conversar com a Bescheiben': '/diagnostico',
  'Conversar sobre a marca': '/diagnostico',
  'Construir uma estratégia de marketing': '/diagnostico',
  'Conversar sobre um site': '/diagnostico',
  'Mapear uma operação': '/diagnostico',
  'Conversar sobre Branding': '/diagnostico',
  'Conversar sobre Marketing': '/diagnostico',
  'Conversar sobre Digital': '/diagnostico',
  'Conversar sobre Tecnologia': '/diagnostico',
  'Explorar conteúdos': '#conteudos',
  'Enviar contexto': '#formulario',
};

interface SectionSpec {
  readonly id: string;
  readonly marker: string;
}

interface PageDefinition {
  readonly route: PublicRoute;
  readonly pageMarker: string;
  readonly nextPageMarker: string;
  readonly seo: SeoContent;
  readonly hero: Omit<HeroContent, 'ctas'>;
  readonly sectionSpecs: readonly SectionSpec[];
  readonly sectionsEndMarker: string;
  readonly faqMarker?: string;
  readonly faqEndMarker?: string;
  readonly finalCtaMarker?: string;
  readonly entitySentence?: typeof OFFICIAL_ENTITY_SENTENCE;
}

function markerIndex(source: string, marker: string, fromIndex = 0): number {
  let index = source.indexOf(marker, fromIndex);

  while (index >= 0) {
    const beforeIsBoundary = index === 0 || source[index - 1] === '\n';
    const after = index + marker.length;
    const afterIsBoundary = after === source.length || source[after] === '\n';

    if (beforeIsBoundary && afterIsBoundary) return index;
    index = source.indexOf(marker, index + 1);
  }

  return -1;
}

function segment(source: string, startMarker: string, endMarker?: string): string {
  const start = markerIndex(source, startMarker);
  if (start < 0) {
    throw new Error(`Missing master-copy marker: ${startMarker}`);
  }

  const contentStart = start + startMarker.length;
  const end = endMarker ? markerIndex(source, endMarker, contentStart) : source.length;
  if (endMarker && end < 0) {
    throw new Error(`Missing master-copy marker: ${endMarker}`);
  }

  return source.slice(contentStart, end).trim();
}

function cta(label: string): CallToAction {
  const href = CTA_HREFS[label];
  return href ? { label, href } : { label };
}

function labeledCtas(source: string): CallToAction[] {
  return Array.from(
    source.matchAll(/^### (?:CTA(?: principal| secundário)?|Botão)\n\n\*\*(.+)\*\*$/gm),
    ([, label]) => cta(label.trim()),
  );
}

function boldLineCtas(source: string): CallToAction[] {
  return Array.from(source.matchAll(/^\*\*(.+)\*\*$/gm), ([, label]) => cta(label.trim()));
}

function uniqueCtas(ctas: readonly CallToAction[]): CallToAction[] {
  return ctas.filter(
    (candidate, index) => ctas.findIndex(({ label }) => label === candidate.label) === index,
  );
}

function makeSections(
  pageSource: string,
  specs: readonly SectionSpec[],
  endMarker: string,
): ContentSection[] {
  return specs.map((spec, index) => {
    const nextMarker = specs[index + 1]?.marker ?? (endMarker || undefined);
    return {
      id: spec.id,
      heading: spec.marker.replace(/^# /, ''),
      body: segment(pageSource, spec.marker, nextMarker),
    };
  });
}

function makeFaqs(pageSource: string, startMarker?: string, endMarker?: string): FaqContent[] {
  if (!startMarker) return [];

  const faqSource = segment(pageSource, startMarker, endMarker);
  return Array.from(
    faqSource.matchAll(/^## (.+)\n\n([\s\S]*?)(?=\n## |\n# |$)/gm),
    ([, question, answer]) => ({ question: question.trim(), answer: answer.trim() }),
  );
}

function makeFaqEyebrow(
  pageSource: string,
  startMarker?: string,
  endMarker?: string,
): string | undefined {
  if (!startMarker) return undefined;

  const match = segment(pageSource, startMarker, endMarker).match(/^### (.+)$/m);
  return match?.[1]?.trim();
}

function makeFinalCta(pageSource: string, marker?: string): FinalCtaContent | undefined {
  if (!marker) return undefined;

  const body = segment(pageSource, marker);
  const ctas = labeledCtas(body);
  return {
    body,
    ctas: uniqueCtas(ctas.length > 0 ? ctas : boldLineCtas(body)),
  };
}

function makePage(definition: PageDefinition): SitePageContent {
  const pageSource = segment(
    normalizedMasterCopy,
    definition.pageMarker,
    definition.nextPageMarker,
  );
  const finalCta = makeFinalCta(pageSource, definition.finalCtaMarker);
  const pageCtas = uniqueCtas([...labeledCtas(pageSource), ...(finalCta?.ctas ?? [])]);
  const faqEyebrow = makeFaqEyebrow(
    pageSource,
    definition.faqMarker,
    definition.faqEndMarker,
  );

  return {
    route: definition.route,
    seo: definition.seo,
    hero: {
      ...definition.hero,
      ctas: labeledCtas(segment(pageSource, '# HERO', definition.sectionSpecs[0].marker)),
    },
    sections: makeSections(pageSource, definition.sectionSpecs, definition.sectionsEndMarker),
    ...(faqEyebrow ? { faqEyebrow } : {}),
    faqs: makeFaqs(pageSource, definition.faqMarker, definition.faqEndMarker),
    ctas: pageCtas,
    ...(finalCta ? { finalCta } : {}),
    ...(definition.entitySentence ? { entitySentence: definition.entitySentence } : {}),
  };
}

const home = makePage({
  route: '/',
  pageMarker: '# HOME',
  nextPageMarker: '# PÁGINA ESTRATÉGIA',
  seo: {
    title: 'Bescheiben | Estratégia, Branding, Marketing e Tecnologia',
    description:
      'Estratégia, branding, marketing, sites, performance, CRM, automação e inteligência artificial conectados por diagnóstico, posicionamento e execução.',
  },
  hero: {
    eyebrow: 'ESTRATÉGIA · MARCA · CRESCIMENTO',
    heading: ['Mais que marketing, um sistema.'],
    supportingCopy: [
      'A Bescheiben é uma empresa brasileira de estratégia, branding, marketing e tecnologia.',
      'Investigamos negócio, mercado, cliente, concorrência, comunicação e dados para compreender o que realmente precisa mudar antes de definir posicionamento, marca, conteúdo, experiência digital, performance ou tecnologia.',
    ],
    microcopy: 'Entender. Decidir. Construir.',
  },
  sectionSpecs: [
    { id: 'antes-da-solucao', marker: '# SEÇÃO 01' },
    { id: 'nosso-ponto-de-vista', marker: '# SEÇÃO 02' },
    { id: 'nosso-metodo', marker: '# SEÇÃO 03' },
    { id: 'por-que-diagnostico', marker: '# SEÇÃO 04' },
    { id: 'capacidades', marker: '# SEÇÃO 05' },
    { id: 'um-unico-sistema', marker: '# SEÇÃO 06' },
    { id: 'branding', marker: '# SEÇÃO 07' },
    { id: 'marketing', marker: '# SEÇÃO 08' },
    { id: 'digital', marker: '# SEÇÃO 09' },
    { id: 'inteligencia-artificial', marker: '# SEÇÃO 10' },
    { id: 'insights', marker: '# SEÇÃO 11' },
    { id: 'sobre', marker: '# SEÇÃO 12' },
  ],
  sectionsEndMarker: '# SEÇÃO 13',
  faqMarker: '# SEÇÃO 13',
  faqEndMarker: '# CTA FINAL DA HOME',
  finalCtaMarker: '# CTA FINAL DA HOME',
  entitySentence: OFFICIAL_ENTITY_SENTENCE,
});

const estrategia = makePage({
  route: '/estrategia',
  pageMarker: '# PÁGINA ESTRATÉGIA',
  nextPageMarker: '# PÁGINA BRANDING',
  seo: {
    title: 'Consultoria de Estratégia e Diagnóstico | Bescheiben',
    description:
      'Diagnóstico estratégico, pesquisa, mercado, cliente e concorrência para identificar prioridades e orientar decisões de marca, marketing e crescimento.',
  },
  hero: {
    eyebrow: 'ESTRATÉGIA E DIAGNÓSTICO',
    heading: ['Antes de decidir o que fazer, descubra o que realmente precisa mudar.'],
    supportingCopy: [
      'Empresas frequentemente chegam com uma solução na cabeça.',
      '“Precisamos de um novo site.”',
      '“Precisamos reposicionar.”',
      '“Precisamos investir em marketing.”',
      '“Precisamos de mais conteúdo.”',
      '“Precisamos automatizar.”',
      'Começamos uma pergunta antes.',
      'Por quê?',
      'Investigamos o contexto para transformar sintomas em um problema estratégico claro.',
    ],
  },
  sectionSpecs: [
    { id: 'diagnostico-estrategico', marker: '# O QUE É DIAGNÓSTICO ESTRATÉGICO?' },
    { id: 'sintoma-nao-e-causa', marker: '# SINTOMA NÃO É CAUSA' },
    { id: 'o-que-investigamos', marker: '# O QUE INVESTIGAMOS' },
    { id: 'o-que-buscamos', marker: '# O QUE BUSCAMOS' },
    { id: 'como-funciona', marker: '# COMO FUNCIONA' },
    { id: 'estrategia-nao-e-lista', marker: '# ESTRATÉGIA NÃO É UMA LISTA DE TAREFAS' },
  ],
  sectionsEndMarker: '# FAQ',
  faqMarker: '# FAQ',
  faqEndMarker: '# CTA FINAL',
  finalCtaMarker: '# CTA FINAL',
});

const branding = makePage({
  route: '/branding',
  pageMarker: '# PÁGINA BRANDING',
  nextPageMarker: '# PÁGINA MARKETING',
  seo: {
    title: 'Agência de Branding e Posicionamento | Bescheiben',
    description:
      'Estratégia de marca, posicionamento, rebranding, narrativa, identidade verbal e identidade visual construídos a partir do negócio e do mercado.',
  },
  hero: {
    eyebrow: 'BRANDING E POSICIONAMENTO',
    heading: ['Antes de mudar a aparência da marca, decida o que ela precisa significar.'],
    supportingCopy: [
      'Branding não começa pela escolha de uma estética.',
      'Começa pela definição da posição que a empresa pretende ocupar e da percepção que deseja construir.',
    ],
  },
  sectionSpecs: [
    { id: 'o-que-e-branding', marker: '# O QUE É BRANDING?' },
    { id: 'posicionamento', marker: '# O QUE É POSICIONAMENTO DE MARCA?' },
    { id: 'competicao', marker: '# UMA MARCA NÃO COMPETE APENAS POR ATENÇÃO' },
    { id: 'rebranding', marker: '# O QUE É REBRANDING?' },
    { id: 'rebranding-nao-comeca-no-logo', marker: '# REBRANDING NÃO COMEÇA NO LOGO' },
    { id: 'como-trabalhamos', marker: '# COMO TRABALHAMOS' },
    { id: 'o-que-podemos-construir', marker: '# O QUE PODEMOS CONSTRUIR' },
    { id: 'nossa-visao', marker: '# NOSSA VISÃO' },
  ],
  sectionsEndMarker: '# FAQ',
  faqMarker: '# FAQ',
  faqEndMarker: '# CTA FINAL',
  finalCtaMarker: '# CTA FINAL',
});

const marketing = makePage({
  route: '/marketing',
  pageMarker: '# PÁGINA MARKETING',
  nextPageMarker: '# PÁGINA DIGITAL',
  seo: {
    title: 'Estratégia de Marketing e Conteúdo | Bescheiben',
    description:
      'Estratégia de marketing, conteúdo, social media, campanhas e performance orientados por posicionamento, mensagens, jornada e objetivos.',
  },
  hero: {
    eyebrow: 'MARKETING E CONTEÚDO',
    heading: ['Pare de produzir para preencher espaços.', 'Comece a comunicar com uma função.'],
    supportingCopy: [
      'Frequência não substitui direção.',
      'Antes do calendário existem decisões sobre posicionamento, tese, argumentos, mensagens, jornada e prioridades.',
    ],
  },
  sectionSpecs: [
    { id: 'marketing-estrategico', marker: '# O QUE É MARKETING ESTRATÉGICO?' },
    { id: 'falta-de-conteudo', marker: '# O PROBLEMA NÃO É FALTA DE CONTEÚDO' },
    { id: 'conteudo-como-sistema', marker: '# CONTEÚDO É PARTE DE UM SISTEMA' },
    { id: 'nosso-fluxo', marker: '# NOSSO FLUXO' },
    { id: 'arquitetura-de-mensagens', marker: '# ARQUITETURA DE MENSAGENS' },
    { id: 'sistema-editorial', marker: '# SISTEMA EDITORIAL' },
    { id: 'social-media', marker: '# SOCIAL MEDIA' },
    { id: 'performance', marker: '# PERFORMANCE' },
    { id: 'o-que-podemos-construir', marker: '# O QUE PODEMOS CONSTRUIR' },
  ],
  sectionsEndMarker: '# FAQ',
  faqMarker: '# FAQ',
  faqEndMarker: '# CTA',
  finalCtaMarker: '# CTA',
});

const digital = makePage({
  route: '/digital',
  pageMarker: '# PÁGINA DIGITAL',
  nextPageMarker: '# PÁGINA TECNOLOGIA',
  seo: {
    title: 'Criação de Sites, UX e Desenvolvimento | Bescheiben',
    description:
      'Estratégia digital, copy, UX, UI, desenvolvimento de sites, SEO, AEO, GEO e analytics integrados à marca e à jornada do público.',
  },
  hero: {
    eyebrow: 'SITES E EXPERIÊNCIAS DIGITAIS',
    heading: ['Seu site deveria ajudar alguém a entender por que escolher sua empresa.'],
    supportingCopy: [
      'Construímos experiências digitais a partir da estratégia, não de uma coleção de referências visuais.',
    ],
  },
  sectionSpecs: [
    { id: 'site-estrategico', marker: '# O QUE É UM SITE ESTRATÉGICO?' },
    { id: 'mais-do-que-interface', marker: '# UM SITE É MAIS DO QUE INTERFACE' },
    { id: 'antes-da-interface', marker: '# ANTES DA INTERFACE' },
    { id: 'copy', marker: '# COPY' },
    { id: 'ux', marker: '# UX' },
    { id: 'ui', marker: '# UI' },
    { id: 'desenvolvimento', marker: '# DESENVOLVIMENTO' },
    { id: 'seo', marker: '# SEO' },
    { id: 'aeo', marker: '# AEO' },
    { id: 'geo', marker: '# GEO' },
    { id: 'o-que-podemos-construir', marker: '# O QUE PODEMOS CONSTRUIR' },
  ],
  sectionsEndMarker: '# FAQ',
  faqMarker: '# FAQ',
  faqEndMarker: '# CTA FINAL',
  finalCtaMarker: '# CTA FINAL',
});

const tecnologia = makePage({
  route: '/tecnologia',
  pageMarker: '# PÁGINA TECNOLOGIA',
  nextPageMarker: '# PÁGINA INSIGHTS',
  seo: {
    title: 'CRM, Automação e Inteligência Artificial | Bescheiben',
    description:
      'CRM, integrações, automação e aplicações de inteligência artificial orientadas por processos, contexto e necessidades reais da operação.',
  },
  hero: {
    eyebrow: 'TECNOLOGIA',
    heading: ['Automatizar um processo ruim apenas acelera o problema.'],
    supportingCopy: [
      'Antes da ferramenta, entendemos o fluxo.',
      'Informação.',
      'Responsabilidades.',
      'Decisões.',
      'Atritos.',
      'Dependências.',
      'Só depois definimos qual tecnologia faz sentido.',
    ],
  },
  sectionSpecs: [
    { id: 'antes-da-ferramenta', marker: '# TECNOLOGIA NÃO DEVERIA COMEÇAR PELA FERRAMENTA' },
    { id: 'automacao-empresarial', marker: '# O QUE É AUTOMAÇÃO EMPRESARIAL?' },
    { id: 'crm', marker: '# CRM' },
    { id: 'inteligencia-artificial', marker: '# INTELIGÊNCIA ARTIFICIAL' },
    { id: 'nossa-visao-sobre-ia', marker: '# NOSSA VISÃO SOBRE IA' },
    { id: 'o-que-podemos-construir', marker: '# O QUE PODEMOS CONSTRUIR' },
  ],
  sectionsEndMarker: '# FAQ',
  faqMarker: '# FAQ',
  faqEndMarker: '# CTA FINAL',
  finalCtaMarker: '# CTA FINAL',
});

const insights = makePage({
  route: '/insights',
  pageMarker: '# PÁGINA INSIGHTS',
  nextPageMarker: '# PÁGINA SOBRE',
  seo: {
    title: 'Insights sobre Branding, Marketing e Estratégia | Bescheiben',
    description:
      'Análises da Bescheiben sobre estratégia, branding, marketing, comportamento, tecnologia, negócios e decisões de marca.',
  },
  hero: {
    eyebrow: 'INSIGHTS',
    heading: ['Ideias para quem precisa tomar decisões melhores.'],
    supportingCopy: [
      'Analisamos estratégia, branding, marketing, tecnologia, comportamento e negócios para entender o raciocínio por trás das mudanças que aparecem no mercado.',
      'NÃO QUEREMOS APENAS NOTICIAR.',
      'Queremos interpretar.',
      'O que mudou?',
      'Por que mudou?',
      'Que comportamento existe por trás disso?',
      'Que decisão estratégica conseguimos observar?',
      'Que hipótese podemos levantar?',
      'Que aprendizado outras empresas podem extrair?',
    ],
  },
  sectionSpecs: [
    { id: 'temas', marker: '# TEMAS' },
    { id: 'linha-editorial', marker: '# NOSSA LINHA EDITORIAL' },
  ],
  sectionsEndMarker: '# CTA',
  finalCtaMarker: '# CTA',
});

const sobre = makePage({
  route: '/sobre',
  pageMarker: '# PÁGINA SOBRE',
  nextPageMarker: '# PÁGINA DIAGNÓSTICO',
  seo: {
    title: 'Sobre a Bescheiben | Estratégia, Marca e Tecnologia',
    description:
      'Conheça a Bescheiben, empresa de estratégia, branding, marketing, experiências digitais e tecnologia orientada por diagnóstico e decisões fundamentadas.',
  },
  hero: {
    eyebrow: 'BESCHEIBEN',
    heading: ['Não queríamos construir apenas mais uma agência.'],
    supportingCopy: [
      'Queríamos construir uma empresa capaz de conectar o que normalmente é tratado separadamente.',
      'Negócio.',
      'Estratégia.',
      'Marca.',
      'Marketing.',
      'Design.',
      'Experiência.',
      'Tecnologia.',
      'Execução.',
      'Porque o público não experimenta departamentos.',
      'Experimenta uma única empresa.',
    ],
  },
  sectionSpecs: [
    { id: 'o-que-e-a-bescheiben', marker: '# O QUE É A BESCHEIBEN?' },
    { id: 'nossa-crenca', marker: '# NOSSA CRENÇA' },
    { id: 'por-que-existimos', marker: '# POR QUE EXISTIMOS' },
    { id: 'como-pensamos', marker: '# COMO PENSAMOS' },
    { id: 'nossa-posicao', marker: '# NOSSA POSIÇÃO' },
    { id: 'o-que-nos-interessa', marker: '# O QUE NOS INTERESSA' },
    { id: 'o-que-nao-queremos-ser', marker: '# O QUE NÃO QUEREMOS SER' },
  ],
  sectionsEndMarker: '# CTA',
  finalCtaMarker: '# CTA',
  entitySentence: OFFICIAL_ENTITY_SENTENCE,
});

const diagnostico = makePage({
  route: '/diagnostico',
  pageMarker: '# PÁGINA DIAGNÓSTICO',
  nextPageMarker: '# FOOTER',
  seo: {
    title: 'Diagnóstico Estratégico | Fale com a Bescheiben',
    description:
      'Conte o contexto da sua empresa. A Bescheiben analisa o cenário antes de definir a solução mais adequada para marca, marketing, digital ou tecnologia.',
  },
  hero: {
    eyebrow: 'DIAGNÓSTICO',
    heading: ['Conte o que está acontecendo.', 'Você não precisa chegar com a solução pronta.'],
    supportingCopy: [
      'Talvez já exista uma necessidade clara.',
      'Talvez exista apenas a percepção de que alguma coisa precisa mudar.',
      'Nos dois casos, começamos entendendo o contexto.',
    ],
  },
  sectionSpecs: [
    { id: 'antes-do-formulario', marker: '# ANTES DO FORMULÁRIO' },
    { id: 'formulario', marker: '# FORMULÁRIO' },
    { id: 'confirmacao', marker: '# CONFIRMAÇÃO' },
  ],
  sectionsEndMarker: '',
});

export const siteContent: Readonly<Record<PublicRoute, SitePageContent>> = {
  '/': home,
  '/estrategia': estrategia,
  '/branding': branding,
  '/marketing': marketing,
  '/digital': digital,
  '/tecnologia': tecnologia,
  '/insights': insights,
  '/sobre': sobre,
  '/diagnostico': diagnostico,
};

