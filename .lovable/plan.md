## Diagnóstico

Confirmei no banco que ABNER e AIRTON estão com `comissao_pdf=0` e `gratificacao_pdf=0`, mesmo com os valores presentes no PDF (visto na sua captura: `37 COMISSOES 5.896,90 5.896,90 P` e `20 GRATIFICACOES 100,00 100,00 P`).

A causa está em `src/lib/parsePdf.ts`, função `tryExtractValueByCode`. A regex atual é:

```
(?:^|\s)<COD>([A-ZÀ-Úa-zà-ú\.\/\-0-9 ]*?)\s+(\d...,\d{2})\s*P\b
```

A **classe de caracteres do meio NÃO inclui vírgula `,`**. Em linhas com duas colunas numéricas (Referência + Valor) — padrão do Domínio para verbas como COMISSÕES e GRATIFICAÇÕES — o regex precisa "pular" o primeiro número (`5.896,90`) para chegar no segundo (`5.896,90 P`). Como `,` não está na classe, o regex trava no primeiro `,` e não consegue avançar, falhando o match e retornando `0`.

Verbas que aparecem com **um único número** (ex.: `805 MEDIA VALOR FERIAS 4.754,57 P`) funcionam por acaso — não há referência intermediária. Por isso só algumas verbas falharam.

## Correção

Reescrever `tryExtractValueByCode` em `src/lib/parsePdf.ts` para usar uma estratégia mais robusta, sem depender de classe de caracteres frágil:

1. Procurar o início da verba com `(?:^|\s)<COD>\s*[A-ZÀ-Úa-zà-ú]` (código + descrição alfabética inicia).
2. A partir daí, capturar o "tail" da linha até encontrar `(\d{1,3}(?:\.\d{3})*,\d{2})\s*P\b` — pegando o **último** número-com-P do segmento que pertence a esta verba (parando antes do próximo código de verba ou fim da linha).
3. Retornar a soma de todos os matches (continua suportando múltiplas ocorrências do mesmo código).

Implementação prática: dividir o bloco em "tokens de verba" — para cada match de `(?:^|\s)(\d{1,3})\s+([A-ZÀ-Ú])`, capturar o trecho até o próximo código, e dentro dele extrair o último valor seguido de `P` (provento) ou `D` (desconto, conforme o caso). Isso elimina a fragilidade da classe de caracteres.

## Verificação

Após o ajuste, basta o usuário **reenviar a mesma análise** (novo upload do PDF + planilhas) — não há reparser dos dados antigos no banco. O resultado esperado para AIRTON:
- `comissao_pdf = 5.896,90` (= planilha → status `ok`)
- `gratificacao_pdf = 100,00` (= planilha → status `ok`)

E para ABNER, conferir se `gratificacao_pdf` bate com `200,00` da planilha.

## Arquivos a alterar

- `src/lib/parsePdf.ts` — reescrever `tryExtractValueByCode` (e ajustar lógica análoga de extração de salário-base verba `1`, que tem o mesmo problema potencial).
