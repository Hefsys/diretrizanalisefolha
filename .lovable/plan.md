## Contexto

Confirmei lendo o PDF que você acabou de enviar (`Folha_Mensal_-_Validada-2.pdf`, competência 03/2026, COBARSA MOTOS): as verbas **aparecem sim no PDF**, sem acentuação, exatamente como o parser já espera:

- `37 COMISSOES … 2.037,00 P`
- `20 GRATIFICACOES … 100,00 P`
- `286 GRATIFICACAO NPS … 200,00 P`
- (e os códigos `219 PREMIO` / `241 ADIANT.PREMIO` quando existem)

O `parsePdf.ts` já extrai esses cinco códigos corretamente (linhas 79–83 e 163–167). O problema atual é que, na rodada anterior, o `conferir.ts` foi alterado para **não comparar mais** essas verbas (porque você havia dito que não vinham no PDF). Agora que confirmamos que vêm, é só restaurar a comparação.

A regra dos empréstimos (eSocial) **continua igual**: não tem no PDF, é dado para adicionar ao colaborador na próxima folha.

## O que vai mudar

### 1. `src/lib/conferir.ts` — voltar a comparar PDF × Planilha

Para cada funcionário com correspondência PDF + planilha, comparar (com tolerância `TOL = 0,05`) e gerar divergências:

| Campo | Origem PDF | Origem Planilha |
|---|---|---|
| Comissão (37) | `comissaoPdf` | `comissaoPlan` |
| Gratificação (20) | `gratificacaoPdf` | `gratificacaoPlan` |
| Gratificação NPS (286) | `gratificacaoNpsPdf` | `gratificacaoNpsPlan` |
| Prêmio (219) | `premioPdf` | `premioPlan` |
| Adiant. Prêmio (241) | `adiantPremioPdf` | `adiantPremioPlan` |

Quando `|pdf − planilha| > 0,05`, adicionar mensagem em `divergencias[]` no formato:
`"Comissão: PDF 2.037,00 × Planilha 1.900,00 (dif 137,00)"` e marcar `status = "divergente"`.

Se a verba existe **só na planilha** (PDF = 0): também é divergência ("falta lançar no PDF: …").
Se existe **só no PDF** (planilha = 0): divergência ("não consta na planilha de variáveis: …").

**Empréstimos (eSocial)**: continua como hoje — apenas listados como dado a adicionar, sem alarme/divergência. Sem mudanças aqui.

**Casos `so_planilha` / `so_pdf`** (funcionário sem match): permanecem como estão hoje.

### 2. Nada muda em `parsePdf.ts`, `parseXls.ts`, no schema do banco ou no dashboard

Os campos já existem em `conferencia_itens` (`comissao_pdf`, `comissao_planilha`, `gratificacao_pdf/planilha`, `gratificacao_nps_pdf/planilha`, `premio_pdf/planilha`, `adiant_premio_pdf/planilha`) e o dashboard já mostra essas comparações na aba "Conferência" via `divergencias[]`. Como `conferir.ts` é executado no momento do upload, conferências **já salvas** continuarão sem essas divergências; conferências **novas** (re-upload do PDF + planilhas) aparecerão com a comparação correta.

## Como validar depois

1. Re-enviar o PDF + planilhas de uma competência conhecida.
2. Abrir o dashboard → aba "Conferência" → conferir que linhas com diferença real entre PDF e planilha ficam marcadas como "divergente" com a mensagem descritiva.
3. Conferir que empréstimos do eSocial continuam aparecendo apenas como dado a adicionar (sem virar divergência).
