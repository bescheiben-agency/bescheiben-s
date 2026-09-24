# Design QA — Bescheiben

## Referências e implementação

- Referências visuais aprovadas pelo cliente: hero orbital escuro, capacidades em composição editorial, FAQ orbital claro e índice roxo.
- Copy aprovada: `src/content/master/Bescheiben_Copy_Master_Final_SEO_AEO_GEO.md`.
- Narrativas de rolagem: `MethodStory.astro`, `SymptomStory.astro` e `MasterSection.astro`.
- Movimento complementar: `HeroVisual.astro`, `ThreeOrbitField.astro`, `StrategicMarquee.astro` e `ReactiveLines.astro`.

## Verificações da revisão atual

| Critério | Estado |
| --- | --- |
| Astro/TypeScript, ESLint, testes unitários e build | Aprovados em 23/09/2026 |
| Preservação estática da copy e links | Aprovada: 907 trechos da copy, 706 links internos, 41 âncoras e 169 seções no build de 23/09/2026 |
| Inspeção visual desktop da versão publicada | Hero, método, capacidades, sistema, FAQ e diagnóstico conferidos em 24/09/2026, largura 1292 px |
| Interação do FAQ | Troca da resposta ativa conferida na versão publicada |
| Inspeção visual mobile | Pendente: o navegador de inspeção não disponibilizou controle de viewport |
| Movimento contínuo | Pendente: o navegador de inspeção informou `prefers-reduced-motion: reduce` |
| Envio real do formulário | Pendente de credenciais Turnstile, Resend e Upstash no ambiente de produção |

As capturas em `qa/responsive/` foram produzidas antes desta revisão visual e não demonstram o estado atual. Elas não devem ser usadas como aprovação da interface nova em telas pequenas ou com movimento ativo.
