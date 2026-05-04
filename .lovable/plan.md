# Dashboard por Colaborador com Comparativo Mensal

## O que muda na experiência

Hoje a tela principal foca em "OK / Divergente". A nova proposta inverte o foco: depois de subir os arquivos, o usuário vê **um dashboard rico por colaborador**, com abas e comparação automática com o mês anterior (puxado do histórico salvo).

A tela de conferência (PDF × Planilha × eSocial) continua existindo, mas como **aba secundária**, para quem quiser ver divergências.

## Nova navegação

Dentro de `/app`:

```text
[ Visão Geral ] [ Empréstimos ] [ Comissões ] [ Benefícios ] [ Conferência ]
```

Topo da tela (sempre visível):
- Seletor de competência (ex: 03/2026)
- Empresa / CNPJ
- Indicador "Comparando com: 02/2026" (auto-detectado pelo histórico)
- Botão "Trocar competência anterior" (caso queira escolher outro mês base)

### Aba 1 — Visão Geral
KPIs do mês com variação (▲/▼ %) vs mês anterior:
- Total de funcionários
- Total de empréstimos consignados (qtd contratos)
- Soma das parcelas de empréstimos
- Total comissão (37)
- Total gratificação (20 + NPS 286)
- Total prêmio (219)
- Total benefícios (VT, VR, plano de saúde)
- Total Base INSS / FGTS

Ex.: "Empréstimos: **52** ▲ +2 vs 02/2026 (50)"

Embaixo, **lista de colaboradores** com busca, mostrando colunas resumidas (nome, setor, qtd empréstimos, comissão, Δ vs mês anterior). Clicar abre o **detalhe do colaborador** em painel lateral / página dedicada.

### Aba 2 — Empréstimos
Tabela por colaborador:
- Nome / Matrícula / CPF
- Qtd contratos (mês atual) | Qtd mês anterior | Δ
- Bancos (lista)
- Soma parcelas mês | mês anterior | Δ R$
- Detalhe expansível: cada contrato (banco, nº contrato, parcela, parcelas restantes — o que vier do eSocial)

### Aba 3 — Comissões
Tabela por colaborador:
- Comissão 37 | mês anterior | Δ R$ / Δ %
- Gratificação 20 | anterior | Δ
- NPS 286 | anterior | Δ
- Prêmio 219 | anterior | Δ
- Adiant. Prêmio 241 | anterior | Δ
- Total variável | anterior | Δ

### Aba 4 — Benefícios
Tabela por colaborador:
- VT, VR, plano de saúde, outros descontos identificados no PDF
- Coluna "mês anterior" e Δ para cada benefício
- Base INSS, Base FGTS, Salário-base com variação

### Aba 5 — Conferência (existente)
Mantém a tela atual com tabela OK/Divergente, painel de avisos e exportação PDF/Excel.

### Detalhe do colaborador (drawer)
Acessível clicando em qualquer linha em qualquer aba. Mostra tudo do colaborador num único painel:
- Cabeçalho: nome, matrícula, CPF, setor, status conferência
- Card Empréstimos | Card Comissões | Card Benefícios | Card Bases
- Cada card com valor atual, valor mês anterior e variação
- Mini-gráfico (sparkline) se houver 3+ meses no histórico

## Como funciona o comparativo (técnico)

Você escolheu **"usar histórico salvo no banco"**. Fluxo:

1. Usuário sobe PDF + planilhas → sistema processa e salva em `conferencias` + `conferencia_itens` (já existe).
2. Ao abrir o dashboard de uma competência (ex: 03/2026), o sistema busca automaticamente a conferência anterior do mesmo CNPJ (ex: 02/2026) via server function.
3. Faz o "merge" colaborador a colaborador (chave: CPF → matrícula → nome) e calcula deltas em memória.
4. Se não houver mês anterior salvo, o dashboard mostra apenas o mês atual com aviso "Sem histórico para comparar".

## O que precisa mudar no código

### Banco
Para suportar empréstimos e benefícios detalhados, precisamos guardar mais campos por item:
- Adicionar colunas em `conferencia_itens`: `gratificacao_nps_pdf`, `gratificacao_nps_planilha`, `adiant_premio_pdf`, `adiant_premio_planilha`, `premio_pdf` (já existe), `salario_base`, `vale_transporte`, `vale_refeicao`, `plano_saude`, `outros_beneficios` (jsonb)
- Nova tabela `conferencia_emprestimos` (1-N): `id`, `item_id`, `banco`, `numero_contrato`, `parcela`, `parcelas_restantes`, `origem` (pdf/esocial)

(RLS já cascateia via `conferencia_id`.)

### Parsers
- `parsePdf.ts`: extrair também VT, VR, plano de saúde, salário-base e parcelas individuais de empréstimos consignados (já lê o total — separar por contrato).
- `parseXls.ts`: nada novo.

### Server functions (novas em `src/server/dashboard.functions.ts`)
- `getDashboard({ conferenciaId })` → retorna dados da competência + dados da competência anterior (mesmo CNPJ) já mergeados por colaborador, com deltas calculados.
- `getColaboradorDetalhe({ conferenciaId, cpf })` → detalhe completo de 1 colaborador com histórico dos últimos N meses (para sparkline).

### Rotas
- `src/routes/app.dashboard.$conferenciaId.tsx` → nova rota com as abas
- `src/routes/app.index.tsx` → vira a tela de upload + lista de conferências recentes; após processar, redireciona para `/app/dashboard/:id`
- `src/routes/app.historico.tsx` → mantém

### Componentes novos
- `DashboardTabs.tsx` (wrapper das abas)
- `KpiCard.tsx` (valor + delta + ícone tendência)
- `ColaboradorRow.tsx` (linha com delta inline)
- `ColaboradorDrawer.tsx` (detalhe lateral)
- `EmprestimosTable.tsx`, `ComissoesTable.tsx`, `BeneficiosTable.tsx`

## Fora do escopo desta etapa
- Sparkline com 3+ meses (vai aparecer só quando houver histórico suficiente)
- Edição manual de valores no dashboard
- Exportação PDF do dashboard (a exportação atual da conferência continua)

Confirma que posso seguir com essa estrutura?