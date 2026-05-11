## Causa raiz da duplicação

Reproduzi o bug rodando o parser sobre `Folha_Mensal_-_ADM.pdf` e o resultado foi:

```
ANA PATRICIA            → grat= 400
DEIZE DIAS DA SILVA     → grat= 750
JOYCE MENDES            → grat= 500
LEONARDO BARBOSA        → grat= 800
LUANNY VICTORIA         → grat= 200   ← OK (último antes da quebra)
MARGARETH FIRMINA       → grat= 430,35
MAYRLLA GABRIELA        → grat= 750
RENATA NOGUEIRA         → grat= 600
SEVERINA NUNES          → grat= 4.430,35  ← BUG (deveria ser 0)
```

A última funcionária (Severina) **não tem gratificação** na folha. O valor `4.430,35` que aparece é o **TOTAL geral** da rubrica 20, que vem na página 3 dentro da seção **"Resumo por Rubrica"** (`20 GRATIFICACOES 4.430,35 4.430,35 P`).

Como o parser só fecha o bloco do funcionário quando encontra o próximo `Empr.:` ou no final, todas as linhas das páginas seguintes (incluindo "Total Geral Proventos…" e a tabela "Resumo por Rubrica") são anexadas ao bloco do **último** funcionário processado. Por isso ele acaba absorvendo o somatório de todas as rubricas — não só de gratificação, mas também comissão, prêmios, salário-base e benefícios totais ficariam errados na última pessoa da folha.

Isso explica por que a usuária disse "todas as gratificações estão duplicadas exceto a última de 200": na análise anterior (parser antigo, que somava todas as ocorrências) a presença do bloco de resumo em **toda** a página final fazia o totalizador entrar em vários funcionários. Hoje, com a correção do "primeira ocorrência", a contaminação ficou restrita ao último funcionário, mas continua existindo.

## Correção

Em `src/lib/parsePdf.ts`, dentro do laço principal `for (const line of lines)`:

1. Detectar marcadores de fim da listagem de funcionários e **encerrar** o bloco corrente, zerando `current` para que as linhas subsequentes sejam ignoradas até o próximo `Empr.:`. Marcadores:
   - `/Total Geral Proventos/i`
   - `/Resumo por Rubrica/i`
   - `/L[íi]quido Geral:/i`

   Pseudocódigo:
   ```ts
   if (/Total Geral Proventos|Resumo por Rubrica|L[íi]quido Geral:/i.test(line)) {
     flushCurrent();
     current = null;
     continue;
   }
   ```

2. Esse bloco deve vir **antes** de `aggregateLines.push(line)` para que a linha do resumo nunca seja adicionada ao funcionário.

3. Nenhuma outra mudança é necessária — a lógica de "primeira ocorrência" e dedup de empréstimos continua válida.

## Verificação

Após a alteração, rodar novamente o parser sobre o PDF enviado deve produzir:
- Severina: `gratificacao = 0`
- Demais funcionários: valores idênticos ao PDF (Ana 400, Deize 750, Joyce 500, Leonardo 800, Luanny 200, Margareth 430,35, Mayrlla 750, Renata 600).

A usuária deve **excluir a análise antiga do histórico e reenviar** os arquivos para gerar uma nova com o parser corrigido (registros já salvos no banco mantêm os valores antigos).

## Observação sobre compartilhamento

A migração de RLS para "todos autenticados" já foi aplicada no turno anterior, então qualquer usuário logado já vê e edita as conferências de todos. Esta correção é só do parser.
