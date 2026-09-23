# Auditoria de movimento e interação

Data: 21 de setembro de 2026. Escopo: componentes da reconstrução em `site/src/components`. Esta revisão complementa a validação de build, E2E e screenshots do projeto; não substitui os resultados dessas verificações.

## Correções aplicadas

- `HeroVisual.astro`: o deslocamento por ponteiro agora volta ao estado neutro quando o ponteiro sai/é cancelado, quando a aba fica oculta e quando a preferência de movimento muda. O callback de `requestAnimationFrame` revalida visibilidade e reduced motion antes de escrever estilos. Isso evita inclinação residual depois de ativar a preferência de acessibilidade.
- `MethodStory.astro`: a animação de entrada do painel é cancelada ao ocultar a aba ou alterar a preferência de movimento; novas entradas não animam com o documento oculto. O cancelamento restaura imediatamente o estilo de repouso do painel.
- `interactive/FAQOrbit.tsx`: uma transição Flip é concluída e limpa antes da captura da próxima disposição. Seleções rápidas deixam de reutilizar transformações intermediárias. A transição também termina ao sair da viewport, ocultar a aba ou ativar reduced motion. O efeito desmonta seu observer e remove os listeners registrados; a timeline é encerrada também no cleanup do efeito de layout.
- `OrbitalSystem.astro`: as órbitas pausam enquanto existe foco de teclado no sistema. Quando foco e ponteiro saem do sistema, a seleção contextual retorna à primeira disciplina, consistente com a saída de hover. A navegação por setas continua mantendo o foco no botão selecionado.

## Comportamentos conferidos no código

- `MotionController.astro` controla todos os elementos `data-ambient` com IntersectionObserver, `document.hidden` e `prefers-reduced-motion`. As animações CSS começam pausadas; somente elementos visíveis e com movimento autorizado recebem o estado ativo. Existe margem de antecipação de 40 px na viewport.
- Hero, marquee e diagrama orbital usam esse controlador. Os SVGs decorativos têm `aria-hidden`. O texto da marquee é anunciado uma única vez; as cópias usadas no loop são ocultas para leitores de tela. Em reduced motion, uma única sequência permanece visível e quebra linhas.
- `CapabilityBento.astro` possui controle equivalente, com margem de 60 px, e resets de tilt para saída/cancelamento do ponteiro e mudança de preferência. `CapabilityVisual.astro` interrompe suas animações em reduced motion; visuais em páginas internas recebem o controle `data-ambient`.
- `SymptomStory.astro` usa `gsap.matchMedia` exclusivamente para `no-preference`; a reversão restaura os elementos quando a preferência muda e no `pagehide`. As transições são finitas, sem loop contínuo.
- `MethodStory.astro` mantém um único painel exposto após a inicialização, tablist com roving tabindex, `aria-selected`, `aria-controls` e navegação por setas/Home/End. Sem JavaScript, todas as etapas continuam disponíveis.
- O FAQ mantém uma única resposta visível, relaciona cada botão à resposta por IDs, preserva foco na seleção por setas e usa a mesma estrutura no desktop e mobile. As respostas inativas usam o atributo `hidden`, sem duplicar cópias visíveis ou anunciáveis.
- `Header.astro` restaura foco ao fechar com Escape, bloqueia main/footer por `inert` durante o menu mobile, contém a tabulação e fecha o menu ao cruzar o breakpoint desktop. As animações do menu são desativadas em reduced motion.
- Não existe `ClientRouter`/View Transitions no projeto. Os scripts Astro vivem durante o documento e são descartados na navegação tradicional; não há inicialização repetida entre rotas dentro de uma mesma página. Se uma navegação de cliente for acrescentada, será necessário adaptar a inicialização/desmontagem dos scripts Astro ao ciclo desse roteador.

## Validação desta revisão

- ESLint dos componentes alterados executado com `--max-warnings 0`: aprovado, sem diagnósticos.
- A suíte existente já cobre hero fora/dentro da viewport, reduced motion no hero/FAQ, seleção e foco no FAQ, disciplinas orbitais, hover/restauração, menu mobile e marquee estática. A execução integrada será registrada pelo processo final de QA; nenhum resultado de E2E anterior foi tratado como validação destas correções.
- Na hora desta revisão, não havia preview escutando em 4321, 4322 ou 4323. A verificação de navegador da versão recompilada fica identificada separadamente no relatório final; este documento não afirma teste manual com leitores de tela ou dispositivos físicos.

## Recursos sem uso nas rotas atuais

Na limpeza final foram removidos os recursos sem uso nas rotas e nos testes:

- `ui/skiper-ui/skiper40.tsx`, `styles/skiper.css` e `lib/utils.ts`: demonstração e infraestrutura sem uso, removidas junto com `clsx`, `tailwind-merge`, Tailwind e Lucide.
- `BackgroundArtwork.astro`, `EditorialSection.astro`, `CapabilityIndex.astro`, `QuoteStatement.astro` e `FAQ.astro`: não importados pelas rotas reconstruídas, mas continuam sendo exercitados por testes unitários existentes. Removê-los requer revisar esse escopo de regressão.
- `InsightCard.astro` e `StrategicField.astro`: sem importações nas páginas ou testes, removidos.
- `MethodDiagram.astro` e `SectionHeading.astro` continuam utilizados nas páginas de apoio; não são candidatos de remoção.
- GSAP é usado por SymptomStory e FAQ Flip; React é usado pela ilha de FAQ. Esses recursos novos não são dependências ociosas.
