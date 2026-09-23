# Bescheiben — site institucional

Site em Astro para apresentar a Bescheiben, suas seis capacidades conectadas e o diagnóstico estratégico. A implementação combina identidade editorial própria, conteúdo SEO/AEO/GEO, composições vetoriais responsivas, dados estruturados e um formulário server-side protegido.

## Escopo

- Home, Estratégia, Branding, Marketing, Digital, Tecnologia, Insights, Sobre e Diagnóstico.
- Privacidade, Cookies, Termos de uso, Acessibilidade e página 404.
- Sitemap XML, `robots.txt`, `llms.txt`, canonical, Open Graph e dados estruturados JSON-LD.
- Formulário entregue por Resend para `bescheiben@gmail.com`.
- Proteção por Cloudflare Turnstile, limite durável de frequência no Upstash Redis, validação de origem e limite de payload.
- Cabeçalhos de segurança e política anti-framing configurados em `vercel.json`.
- Identidade oficial em `public/brand/`, arte responsiva em `src/assets/artwork/` e Plus Jakarta Sans auto-hospedada.

As páginas legais refletem a arquitetura técnica atual, mas a identificação jurídica do controlador, a hipótese legal, transferências e os prazos de retenção precisam de revisão jurídica antes da publicação definitiva.

## Configuração

Copie `.env.example` para `.env.local` e preencha:

| Variável | Finalidade |
| --- | --- |
| `PUBLIC_SITE_URL` | URL pública usada em canonical e validação de origem |
| `PUBLIC_TURNSTILE_SITE_KEY` | Chave pública do Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Chave secreta do Cloudflare Turnstile |
| `UPSTASH_REDIS_REST_URL` | Endpoint REST do banco usado no rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST do Upstash |
| `RATE_LIMIT_HASH_SECRET` | Segredo aleatório usado para proteger os identificadores do rate limit |
| `RESEND_API_KEY` | Chave de envio do Resend |
| `CONTACT_FROM_EMAIL` | Remetente em domínio verificado no Resend |

O destinatário é fixado no servidor como `bescheiben@gmail.com`; o navegador não pode alterá-lo.

O endpoint falha de forma segura quando Turnstile, Upstash ou Resend não estão configurados.

## Desenvolvimento

```sh
npm install
npm run dev
```

## Movimento e origem dos efeitos

O hero usa Three.js para a camada WebGL2 de partículas e órbitas, com SVG como base quando WebGL2 está indisponível ou o usuário prefere movimento reduzido. A faixa roxa usa uma adaptação própria da ideia de velocidade por rolagem do React Bits ScrollVelocity; o canvas de linhas do CTA é uma implementação original inspirada no comportamento público de Reactive Lines do OriginKit. Nenhum código-fonte do OriginKit foi incorporado.

Fontes: [Three.js](https://threejs.org/), [React Bits ScrollVelocity](https://www.reactbits.dev/text-animations/scroll-velocity), [OriginKit Reactive Lines](https://www.originkit.dev/components/reactive-lines).

## Verificação

```sh
npm run check
npm run test:unit
npm run build
npm audit --omit=dev
```

Depois de instalar o navegador do Playwright, a validação completa pode ser executada com:

```sh
npx playwright install --only-shell chromium
npm run validate
```

Esse comando executa diagnóstico Astro/TypeScript, testes unitários, build de produção e a suíte de navegador em desktop e mobile.

Os testes de navegador usam arquivos estáticos e respostas simuladas do endpoint; não comprovam entrega real pelo Resend. Os testes do handler verificam separadamente validação, Turnstile, limite de frequência e falhas dos serviços.

## Pendências para publicação

- Configurar as variáveis acima no ambiente de destino da Vercel antes do build; as chaves públicas são incorporadas às páginas geradas.
- Confirmar que `PUBLIC_SITE_URL` corresponde à origem final, que o hostname está autorizado no Turnstile e que o remetente está verificado no Resend.
- Validar em um deployment configurado o desafio real e o recebimento de uma solicitação de teste, incluindo nova tentativa após falha temporária. O formulário descarta o campo automático do widget e renova o desafio após falhas, preservando o texto.
- Concluir a revisão jurídica indicada no início deste documento.

As capturas locais de QA são geradas por `npm run capture:qa` com o preview ativo em `127.0.0.1:4321`.
