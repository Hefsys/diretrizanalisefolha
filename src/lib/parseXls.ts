import * as XLSX from "xlsx";
import { normalizeCpf, normalizeName, parseBR } from "./normalize";

export interface PlanilhaFuncionario {
  setor: string;
  matricula: string;
  nome: string;
  comissao: number;
  gratificacao: number;
  premio: number;
  adiantPremio: number;
}

export interface PlanilhaParseResult {
  setor: string;
  empresa?: string;
  cnpj?: string;
  competencia?: string;
  funcionarios: PlanilhaFuncionario[];
}

// Mapeia rótulo de coluna → campo
const COL_MAP: Array<{ rx: RegExp; key: keyof Omit<PlanilhaFuncionario, "setor" | "matricula" | "nome"> }> = [
  { rx: /COMISS/i, key: "comissao" },
  { rx: /^GRATIFICA[CÇ][AÃ]O\s*NPS/i, key: "gratificacao" }, // NPS soma em gratificação
  { rx: /^GRATIFICA/i, key: "gratificacao" },
  { rx: /ADIANTAMENTO\s*PREMIO/i, key: "adiantPremio" },
  { rx: /^PREMIO/i, key: "premio" },
];

function detectColumns(headerRow: any[]): Record<number, keyof Omit<PlanilhaFuncionario, "setor" | "matricula" | "nome">> {
  const out: Record<number, keyof Omit<PlanilhaFuncionario, "setor" | "matricula" | "nome">> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const v = String(headerRow[i] ?? "").trim();
    if (!v) continue;
    for (const m of COL_MAP) {
      if (m.rx.test(v)) {
        out[i] = m.key;
        break;
      }
    }
  }
  return out;
}

// Lê uma sheet "RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO"
function parseSheet(wb: XLSX.WorkBook, sheetName: string, fallbackSetor: string): PlanilhaParseResult | null {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  if (rows.length < 5) return null;

  // Verifica se é uma planilha de folha
  const firstCells = rows.slice(0, 3).map((r) => String(r[0] ?? "")).join(" ").toUpperCase();
  if (!firstCells.includes("RELAÇÃO DE VALORES") && !firstCells.includes("RELACAO DE VALORES")) {
    return null;
  }

  let empresa: string | undefined;
  let cnpj: string | undefined;
  let competencia: string | undefined;
  let headerRowIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i].map((c) => String(c ?? "").trim());
    const joined = row.join("|").toUpperCase();
    if (joined.includes("RAZÃO SOCIAL") || joined.includes("RAZAO SOCIAL")) {
      empresa = row[2] || row[1] || empresa;
    }
    if (joined.includes("CNPJ")) {
      const v = row[2] || row[1];
      if (v) cnpj = String(v).replace(/\D/g, "");
    }
    if (joined.includes("COMPETENCIA") || joined.includes("COMPETÊNCIA")) {
      const raw = rows[i][2] ?? rows[i][1];
      if (typeof raw === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(raw);
        if (d) competencia = `${String(d.m).padStart(2, "0")}/${d.y}`;
      } else if (raw) {
        competencia = String(raw);
      }
    }
    // Header é a linha que tem "COMISS" ou "GRATIFICA"
    const upper = joined;
    if (upper.includes("COMISS") || upper.includes("GRATIFICA")) {
      headerRowIdx = i;
    }
  }

  if (headerRowIdx === -1) return null;

  const colMap = detectColumns(rows[headerRowIdx]);
  if (Object.keys(colMap).length === 0) return null;

  // Coluna do código (matrícula) e nome — em geral col 1 e 2
  // Mas detecta pelos rótulos da linha do header também
  let colCodigo = 1;
  let colNome = 2;
  const headerStr = rows[headerRowIdx].map((c) => String(c ?? "").toUpperCase());
  headerStr.forEach((h, idx) => {
    if (/COD|FOLHA/.test(h) && idx <= 2) colCodigo = idx;
    if (/NOME|COLABORADOR/.test(h) && idx <= 3) colNome = idx;
  });

  const funcionarios: PlanilhaFuncionario[] = [];
  for (let i = headerRowIdx + 2; i < rows.length; i++) {
    const r = rows[i];
    const codigo = r[colCodigo];
    const nome = r[colNome];
    if (!nome || String(nome).trim() === "") continue;
    const f: PlanilhaFuncionario = {
      setor: fallbackSetor,
      matricula: codigo !== "" && codigo !== null && codigo !== undefined ? String(Math.trunc(Number(codigo) || 0) || codigo).trim() : "",
      nome: normalizeName(String(nome)),
      comissao: 0,
      gratificacao: 0,
      premio: 0,
      adiantPremio: 0,
    };
    for (const [colIdxStr, key] of Object.entries(colMap)) {
      const colIdx = Number(colIdxStr);
      const v = r[colIdx];
      const n = parseBR(v as any);
      // Soma (porque NPS e GRATIFICAÇÃO ambos caem em gratificacao)
      f[key] = (f[key] as number) + n;
    }
    if (!f.nome) continue;
    funcionarios.push(f);
  }
  return { setor: fallbackSetor, empresa, cnpj, competencia, funcionarios };
}

export async function parseFolhaXls(file: File): Promise<PlanilhaParseResult[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const setorBase = file.name
    .replace(/\.xlsx?$/i, "")
    .replace(/^PLANILHA[_\s]+DE[_\s]+FOLHA[_\s]*-?\s*/i, "")
    .replace(/^REF\.[^-]+-\s*PLANILHA[_\s]+DE[_\s]+FOLHA[_\s]*-?\s*/i, "")
    .replace(/_/g, " ")
    .trim();

  const results: PlanilhaParseResult[] = [];
  for (const sn of wb.SheetNames) {
    const r = parseSheet(wb, sn, `${setorBase} / ${sn}`.trim());
    if (r && r.funcionarios.length > 0) results.push(r);
  }
  if (results.length === 0) {
    // Tenta primeira sheet sem detecção de cabeçalho
    const r = parseSheet(wb, wb.SheetNames[0], setorBase);
    if (r) results.push(r);
  }
  return results;
}

// === Excel do gov (eSocial) — empréstimos consignados ===
export interface EsocialContrato {
  cpf: string;
  matricula: string;
  nome: string;
  banco: string;
  contrato: string;
  cnpjEmpregador: string;
}

export async function parseEsocialXlsx(file: File): Promise<EsocialContrato[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (rows.length < 2) return [];
  const header = rows[0].map((c) => String(c ?? "").toLowerCase());
  const idx = (key: string) => header.findIndex((h) => h.includes(key));
  const iCpf = idx("cpf");
  const iMat = idx("matricula");
  const iNome = idx("nometrabalhador");
  const iBanco = idx("ifconcessora.descricao");
  const iContrato = idx("contrato");
  const iCnpjEmp = idx("numeroinscricaoempregador");

  const out: EsocialContrato[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => c === "" || c === null || c === undefined)) continue;
    out.push({
      cpf: normalizeCpf(r[iCpf]),
      matricula: r[iMat] !== undefined ? String(r[iMat]).trim() : "",
      nome: normalizeName(String(r[iNome] ?? "")),
      banco: String(r[iBanco] ?? "").trim(),
      contrato: String(r[iContrato] ?? "").trim(),
      cnpjEmpregador: String(r[iCnpjEmp] ?? "").trim(),
    });
  }
  return out;
}
