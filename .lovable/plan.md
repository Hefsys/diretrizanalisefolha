## Problema

Na conferência os valores de **gratificação/comissão/etc. estão dobrados** em relação à planilha (ex.: ANA — planilha 400,00, dashboard 800,00; JOYCE 500→1.000; LEONARDO 800→1.600; MARGARETH 430,35→860,70; SEVERINA 4.430,35 que aparece duas vezes em colaboradoras diferentes — Margareth e Severina mostram o mesmo 437,63 de empréstimo também, sintoma do mesmo problema).

## Causa

Em `src/lib/parsePdf.ts`, a função `tryExtractValueByCode` percorre **todas** as ocorrências do código de verba dentro do bloco do funcionário (loop `while ((m = startRe.exec(block)) !== null)`) e soma o valor de cada uma.

Os PDFs da Domínio repetem os mesmos códigos em mais de uma seção do bloco do funcionário (tabela de Eventos + bloco de Acumulados / Totais por verba na quebra de página). Resultado: cada verba é contada **2x**.

O mesmo padrão atinge `emprestimos` (regex global no bloco soma todas as ocorrências de `DESC. EMP. CRED. TRAB`, contando linhas repetidas em outra página).

## Plano de correção

Arquivo único: `src/lib/parsePdf.ts`.

1. **`tryExtractValueByCode`**: usar **apenas a primeira ocorrência** do código por verba dentro do bloco do funcionário (não somar múltiplas instâncias). Trocar o `while` que acumula em `total` por um `match` que pega o primeiro segmento e extrai dele o último valor seguido de `P`. Isso preserva a correção anterior (evita confundir Referência × Valor) e elimina a duplicação por seções repetidas.

2. **Empréstimos (`DESC. EMP. CRED. TRAB`)**: deduplicar por linha. Em vez de somar todas as matches no bloco concatenado, iterar `aggregateLines`, filtrar as que casam o padrão e usar uma chave de deduplicação (linha normalizada — sem espaços extras) para somar cada parcela uma única vez. `emprestimosCount` e `emprestimosLista` passam a refletir essa lista deduplicada.

3. **Salário base (código `1`)**: aplicar a mesma estratégia "primeira ocorrência apenas".

## Verificação

Após o ajuste o usuário precisa **reenviar o PDF + planilhas** (a análise é processada no upload). Conferir na aba Visão Geral:
- ANA → 400,00
- LEONARDO → 800,00
- MARGARETH → 430,35 e empréstimo aparecendo só nela (não em SEVERINA)

## Detalhes técnicos

```ts
// tryExtractValueByCode — somente a primeira ocorrência
function tryExtractValueByCode(block: string, codes: string[]): number {
  let total = 0;
  for (const c of codes) {
    const startRe = new RegExp(`(?:^|\\s)${c}\\s*(?=[A-ZÀ-Úa-zà-ú])`);
    const m = startRe.exec(block);
    if (!m) continue;
    const startIdx = m.index + m[0].length;
    const rest = block.slice(startIdx);
    const nextCodeMatch = rest.match(/\s\d{1,4}\s*(?=[A-ZÀ-Úa-zà-ú])/);
    const segment = nextCodeMatch ? rest.slice(0, nextCodeMatch.index) : rest;
    const valMatches = [...segment.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*P\b/g)];
    if (valMatches.length > 0) total += parseBR(valMatches[valMatches.length - 1][1]);
  }
  return total;
}

// empréstimos — dedup por linha normalizada
const seen = new Set<string>();
const empLinhas = aggregateLines.filter((ln) => /DESC\.?\s*EMP\.?\s*CRED\.?\s*TRAB/i.test(ln))
  .filter((ln) => {
    const k = ln.replace(/\s+/g, " ").trim();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
```
