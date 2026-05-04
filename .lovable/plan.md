## Mudanças na aba "Visão Geral" do dashboard

Arquivo: `src/routes/app.dashboard.$id.tsx`

1. **Novo KPI** "Empréstimos (R$)" ao lado de "Empréstimos (qtd)", usando `totais.atual.empVal` com comparação vs. mês anterior.
2. **Tabela**: trocar a coluna única "Empréstimos" (apenas qtd) por duas colunas:
   - **Empréstimos (qtd)** — badge com `cur.emprestimos_esocial_qtd`
   - **Empréstimos (R$)** — soma das parcelas (`cur.emprestimos_pdf`), formatado em BRL, alinhado à direita
