# Entrega da reconstrução Bescheiben

Data: 22 de setembro de 2026. Base: `site/` do worktree `bescheiben-figma-production`.

## Resultado

O frontend foi reconstruído em Astro com hero escuro vetorial, faixa estratégica animada, narrativa de diagnóstico, método conectado, bento assimétrico de seis capacidades, sistema orbital com seis disciplinas, FAQ orbital clara, formulário compartilhado e footer novo. As páginas institucionais, estratégicas, legais e de diagnóstico receberam a mesma direção visual. A versão anterior em `reconstruction/` não foi usada nesta entrega.

Arquivos centrais alterados: `src/components/{Header,PageHero,MasterPage,MasterSection,FinalCTA,Footer}.astro`, `src/layouts/BaseLayout.astro`, `src/content/site-content.ts`, `src/styles/global.css`, as páginas de apoio e as suítes E2E. Novos componentes: `CapabilityBento`, `CapabilityVisual`, `ContactSection`, `CopyBlocks`, `FAQOrbit`, `HeroVisual`, `MethodStory`, `MotionController`, `OrbitalSystem`, `SocialLinks`, `StrategicMarquee`, `SymptomStory` e a ilha React `interactive/FAQOrbit.tsx`. Os componentes órfãos `InsightCard` e `StrategicField` foram removidos; componentes antigos ainda cobertos por testes unitários foram mantidos como regressão.

## Arquitetura e dependências

- Astro continua responsável por rotas, HTML, SEO e geração estática. O endpoint do formulário permanece na função Vercel e preserva Turnstile, Upstash e Resend.
- React hidrata somente a FAQ quando ela entra na viewport. GSAP anima a narrativa de sintomas e a troca de posições na FAQ. Os demais visuais usam CSS/SVG.
- React, `@astrojs/react`, GSAP e ferramentas ESLint foram adicionados. A demonstração Skiper, Tailwind, shadcn, `clsx`, `tailwind-merge` e Lucide foram removidos por não serem usados nas rotas ou testes atuais.
- Lenis e Three.js não são utilizados. A rolagem nativa e os vetores resolvem os movimentos necessários sem um loop de renderização global.
- Animações ambientais pausam fora da viewport; `prefers-reduced-motion` desativa movimento não essencial. Menus, FAQ, capacidades e sistema orbital mantêm teclado, foco visível e controles sem depender de hover.

## Preservação

`qa/content-integrity.mjs` conferiu 917 unidades de copy nas nove páginas principais, todas presentes no HTML final, além de 19 artefatos de rota e oito hashes preservados de backend, SEO e master copy. O contrato dos campos e do script do formulário corresponde à base preservada, com a frase de confirmação aprovada. `qa/preservation-links.mjs` conferiu 673 links internos, 40 anchors, nenhum ID duplicado e nenhum destino interno quebrado. A disponibilidade dos links externos não foi testada.

## Validação final

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` / Astro check | 86 arquivos, 0 erros, 0 avisos, 0 hints |
| `npm run lint` | aprovado, 0 avisos |
| `npm run test:unit` | 33 aprovados em 6 arquivos |
| `npm run test:e2e` | 100 aprovados, 10 ignorados pela configuração da suíte |
| `npm run build` | aprovado, rotas estáticas e função Vercel geradas |
| `node qa/responsive-audit.mjs` | 320 layouts: 20 rotas × 16 larguras (320 a 2560 px), 0 overflow, 0 falha de navegação, 0 grupos de erro de navegador |
| Axe nas rotas representativas | 10 execuções, 0 grupos de violação WCAG 2.2 A/AA detectados automaticamente |

As capturas foram geradas em 390×844, 768×1024, 1366×768, 1440×900 e 1920×1080, além das seções principais da home em 390 e 1440 px. A segunda revisão visual corrigiu a FAQ em telas de até 375 px e uma palavra que excedia o gráfico da página `/estrategia/marca/` em 320 px. Depois dessas correções, a matriz inteira foi repetida e passou.

## Publicação

O pacote contém o projeto fonte completo e as evidências de QA. Execute `npm ci` e `npm run validate` na pasta `site/` para reproduzir as verificações. Para envio real do formulário, configure as variáveis de `.env.example` no ambiente publicado e valide Turnstile, Upstash e Resend. Os testes E2E simulam sucesso e falha de envio; eles não comprovam entrega real de e-mail. Nenhuma publicação em produção foi feita nesta tarefa.

Na revisão para Vercel, seis redirecionamentos herdados foram removidos de `vercel.json` porque coincidiam com páginas próprias geradas pelo Astro (`/bescheiben`, `/metodo` e quatro páginas em `/estrategia/`). Os cabeçalhos de segurança foram preservados. A prévia deve ser verificada no domínio efetivo; se o formulário for testado nela, `PUBLIC_SITE_URL` e os hostnames do Turnstile precisam corresponder à URL da prévia.
