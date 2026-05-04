## Contexto

Hoje o sistema lê comissão (37), gratificação (20), gratificação NPS (286), prêmio (219) e adiantamento de prêmio (241) tanto do PDF da folha quanto das planilhas dos setores, e marca como **divergente** quando não batem. Na prática esses valores **nunca aparecem no PDF** — eles só existem nas planilhas e devem ser **adicionados ao colaborador** na próxima folha.

## O que muda

### 1. `src/lib/conferir.ts` — parar de comparar
- Remover os 5 blocos de `approxEqual` que geram divergências de Comissão/Gratificação/NPS/Prêmio/Adiant. Prêmio.
- Manter os campos `*Pdf` e `*Plan` no `ConferenciaItem` (continuam sendo gravados no banco, zerados no PDF), apenas sem gerar `divergencias`.
- Funcionários que existem só na planilha continuam com status `so_planilha`, mas **não contam mais como alarme** — passam a ser tratados como "a lançar".
- Atualizar o cálculo de `totais.divergentes` para considerar apenas status `divergente` (e não mais `so_planilha` nem `so_pdf` quando a única diferença for esses 5 campos).

### 2. `src/routes/app.dashboard.$id.tsx` — nova aba "A Lançar"
- Adicionar aba **"A Lançar"** (ao lado de Visão Geral / Empréstimos / Comissões / Benefícios).
- Lista todos os colaboradores com qualquer valor > 0 em `comissao_planilha`, `gratificacao_planilha`, `gratificacao_nps_planilha`, `premio_planilha`, `adiant_premio_planilha`.
- Colunas: Nome, Setor, Comissão, Gratif. 20, Gratif. NPS 286, Prêmio, Adiant. Prêmio, **Total a lançar**.
- Linha de total no rodapé somando cada coluna.
- Botão "Exportar CSV" para entregar à folha.
- Na aba **Comissões** existente: trocar o título "PDF vs Planilha" por "Valores a lançar (planilha)" e mostrar só a coluna da planilha.

### 3. `src/routes/app.index.tsx` — aba Conferência
- No card de resumo, separar os contadores: **Divergências reais** vs **A lançar (só planilha)**.
- Itens com status `so_planilha` recebem badge neutra "A lançar" (azul) em vez de vermelha.
- Tirar do contador principal de divergências exibido no topo.

### 4. `src/routes/app.historico.tsx`
- Renomear coluna "Divergências" para refletir a nova lógica e adicionar coluna "A lançar" (derivada de `total_funcionarios - itens_ok` ou recalculada).
- Não precisa migration: o número de divergências salvo passa a ser apenas as reais.

## O que NÃO muda

- Schema do banco: continua salvando `*_pdf` (zerado) e `*_planilha` (valor real). Útil pra histórico e caso um dia comecem a vir no PDF.
- Conferência de **empréstimos** (PDF × eSocial) — continua igual, isso aí faz sentido comparar.
- Conferência de **base INSS / FGTS / benefícios** — continua igual (esses vêm do PDF mesmo).

## Resultado esperado

- Nenhum colaborador é mais marcado como divergente só por ter comissão/gratificação/prêmio na planilha.
- Nova aba "A Lançar" no dashboard mostra exatamente quem precisa receber o quê na próxima folha, com total geral e exportação CSV.
- Contador de divergências passa a refletir apenas problemas reais (empréstimos no eSocial não batendo com PDF, valores divergentes, etc.).
