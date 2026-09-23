export const SITE = {
  name: 'Bescheiben',
  url: 'https://bescheiben.com.br',
  locale: 'pt_BR',
  language: 'pt-BR',
  email: 'bescheiben@gmail.com',
  themeColor: '#0A0718',
  defaultOgImage: '/og-bescheiben.png',
  social: {
    instagram: 'https://www.instagram.com/bescheiben/',
    linkedin: 'https://www.linkedin.com/company/bescheiben/?viewAsMember=true',
  },
} as const;

export const PRIMARY_NAVIGATION = [
  { label: 'Estratégia', href: '/estrategia' },
  { label: 'Branding', href: '/branding' },
  { label: 'Marketing', href: '/marketing' },
  { label: 'Digital', href: '/digital' },
  { label: 'Tecnologia', href: '/tecnologia' },
  { label: 'Insights', href: '/insights' },
  { label: 'Sobre', href: '/sobre' },
] as const;

export const DIAGNOSTIC_CTA = {
  label: 'Solicitar diagnóstico',
  href: '/diagnostico',
} as const;

export const FOOTER_NAVIGATION = [
  {
    label: 'Capacidades',
    links: PRIMARY_NAVIGATION.slice(0, 5),
  },
  {
    label: 'Bescheiben',
    links: [
      { label: 'Insights', href: '/insights' },
      { label: 'Sobre', href: '/sobre' },
      DIAGNOSTIC_CTA,
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacidade', href: '/privacidade' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Termos', href: '/termos' },
      { label: 'Acessibilidade', href: '/acessibilidade' },
    ],
  },
] as const;
