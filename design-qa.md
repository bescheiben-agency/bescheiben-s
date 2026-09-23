# Design QA — Bescheiben

## Referências visuais

- `src/assets/artwork/home-desktop.png` e `home-mobile.png`
- `src/assets/artwork/institutional-desktop.png` e `institutional-mobile.png`
- `src/assets/artwork/diagnostic-desktop.png` e `diagnostic-mobile.png`
- Identidade oficial em `public/brand/`
- Copy aprovada em `../docs/content/Bescheiben_Copy_Master_Final_SEO_AEO_GEO.md`

## Viewports verificados

| Contexto | Viewport | Estado |
| --- | --- | --- |
| Home desktop | 1440 × 900 | Hero e primeira dobra |
| Home mobile | 390 × 844 | Hero e primeira dobra |
| Navegação mobile | 390 × 844 | Menu aberto, foco e bloqueio de scroll |
| Diagnóstico mobile | 390 × 844 | Hero, campos e ação principal |
| Suíte responsiva | 1440 × 900 e 390 × 844 | Todas as rotas públicas |

## Comparação e critérios

As artes de referência e as capturas do frontend foram avaliadas lado a lado no mesmo contexto visual. A implementação preserva a área de respiro prevista para conteúdo, mantém os focos geométricos fora da leitura principal e usa fontes responsivas AVIF/WebP com PNG de fallback.

- Hierarquia tipográfica, pesos, entrelinhas e largura de leitura: aprovada.
- Recortes das seis artes em desktop e mobile: aprovados.
- Contraste WCAG 2.2 A/AA detectável automaticamente: aprovado.
- Navegação, links, FAQ, menu mobile, CTAs e formulário: aprovados.
- Overflow horizontal entre os viewports testados: não detectado.
- Estados de foco, teclado e movimento reduzido: aprovados.

## Registro de severidade

- P0: nenhum aberto.
- P1: nenhum aberto.
- P2: nenhum aberto.

Resultado final: aprovado para build de produção. A publicação depende da configuração das variáveis de ambiente e da revisão jurídica indicada no README.
