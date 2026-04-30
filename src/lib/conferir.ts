import { approxEqual } from "./normalize";
import type { PdfFuncionario, PdfParseResult } from "./parsePdf";
import type { PlanilhaParseResult, EsocialContrato } from "./parseXls";

export type Status = "ok" | "divergente" | "so_pdf" | "so_planilha";

export interface ConferenciaItem {
  cpf: string;
  matricula: string;
  nome: string;
  setor: string;
  // PDF (apurado pela folha)
  comissaoPdf: number;
  gratificacaoPdf: number;
  premioPdf: number;
  adiantPremioPdf: number;
  baseInss: number;
  valorFgts: number;
  emprestimosPdf: number;
  // Planilhas .xls (mandado calcular)
  comissaoPlan: number;
  gratificacaoPlan: number;
  premioPlan: number;
  adiantPremioPlan: number;
  // eSocial gov
  emprestimosEsocialQtd: number;
  bancosEsocial: string[];
  // Apuração
  status: Status;
  divergencias: string[];
}

export interface ConferenciaResult {
  empresa?: string;
  cnpj?: string;
  competencia?: string;
  itens: ConferenciaItem[];
  totais: {
    funcionarios: number;
    divergentes: number;
    comissaoPdf: number;
    comissaoPlan: number;
    gratificacaoPdf: number;
    gratificacaoPlan: number;
  };
}

// Tolerância para divergência (em R$)
const TOL = 0.05;

function key(cpf: string, mat: string, nome: string): string {
  if (cpf && cpf !== "00000000000") return `cpf:${cpf}`;
  if (mat) return `mat:${mat}`;
  return `nome:${nome}`;
}

export function conferir(
  pdf: PdfParseResult,
  planilhas: PlanilhaParseResult[],
  esocial: EsocialContrato[],
): ConferenciaResult {
  // Index por chave em cascata: tenta CPF, depois matrícula, depois nome
  const planMap = new Map<string, { entry: PlanilhaParseResult["funcionarios"][number]; setor: string }>();
  const planByMat = new Map<string, { entry: PlanilhaParseResult["funcionarios"][number]; setor: string }>();
  const planByName = new Map<string, { entry: PlanilhaParseResult["funcionarios"][number]; setor: string }>();
  for (const p of planilhas) {
    for (const f of p.funcionarios) {
      // Planilhas só têm matrícula e nome — sem CPF
      if (f.matricula) planByMat.set(`mat:${f.matricula}`, { entry: f, setor: p.setor });
      planByName.set(`nome:${f.nome}`, { entry: f, setor: p.setor });
    }
  }

  const esocialByCpf = new Map<string, EsocialContrato[]>();
  for (const e of esocial) {
    const k = e.cpf;
    if (!k) continue;
    if (!esocialByCpf.has(k)) esocialByCpf.set(k, []);
    esocialByCpf.get(k)!.push(e);
  }

  const usedPlan = new Set<string>();
  const itens: ConferenciaItem[] = [];

  // Para cada funcionário do PDF, casa com planilha
  for (const f of pdf.funcionarios) {
    const matchPlan =
      (f.matricula && planByMat.get(`mat:${f.matricula}`)) ||
      planByName.get(`nome:${f.nome}`);
    const planEntry = matchPlan?.entry;
    if (matchPlan) {
      const k = `mat:${matchPlan.entry.matricula}|${matchPlan.entry.nome}`;
      usedPlan.add(k);
    }
    const esContratos = esocialByCpf.get(f.cpf) ?? [];

    const item: ConferenciaItem = {
      cpf: f.cpf,
      matricula: f.matricula,
      nome: f.nome,
      setor: matchPlan?.setor ?? "",
      comissaoPdf: f.comissao,
      gratificacaoPdf: f.gratificacao,
      premioPdf: f.premio,
      adiantPremioPdf: f.adiantPremio,
      baseInss: f.baseInss,
      valorFgts: f.valorFgts,
      emprestimosPdf: f.emprestimos,
      comissaoPlan: planEntry?.comissao ?? 0,
      gratificacaoPlan: planEntry?.gratificacao ?? 0,
      premioPlan: planEntry?.premio ?? 0,
      adiantPremioPlan: planEntry?.adiantPremio ?? 0,
      emprestimosEsocialQtd: esContratos.length,
      bancosEsocial: esContratos.map((c) => c.banco),
      status: "ok",
      divergencias: [],
    };

    if (!planEntry) {
      item.status = "so_pdf";
      item.divergencias.push("Funcionário não encontrado nas planilhas de comissão/gratificação");
    } else {
      if (!approxEqual(item.comissaoPdf, item.comissaoPlan, TOL)) {
        item.divergencias.push(
          `Comissão diverge: PDF R$ ${item.comissaoPdf.toFixed(2)} × Planilha R$ ${item.comissaoPlan.toFixed(2)}`
        );
      }
      if (!approxEqual(item.gratificacaoPdf, item.gratificacaoPlan, TOL)) {
        item.divergencias.push(
          `Gratificação diverge: PDF R$ ${item.gratificacaoPdf.toFixed(2)} × Planilha R$ ${item.gratificacaoPlan.toFixed(2)}`
        );
      }
      if (!approxEqual(item.premioPdf, item.premioPlan, TOL)) {
        item.divergencias.push(
          `Prêmio diverge: PDF R$ ${item.premioPdf.toFixed(2)} × Planilha R$ ${item.premioPlan.toFixed(2)}`
        );
      }
      if (!approxEqual(item.adiantPremioPdf, item.adiantPremioPlan, TOL)) {
        item.divergencias.push(
          `Adiant. Prêmio diverge: PDF R$ ${item.adiantPremioPdf.toFixed(2)} × Planilha R$ ${item.adiantPremioPlan.toFixed(2)}`
        );
      }
    }

    if (item.divergencias.length > 0 && item.status === "ok") item.status = "divergente";
    itens.push(item);
  }

  // Funcionários SÓ na planilha
  for (const p of planilhas) {
    for (const f of p.funcionarios) {
      const k = `mat:${f.matricula}|${f.nome}`;
      if (usedPlan.has(k)) continue;
      itens.push({
        cpf: "",
        matricula: f.matricula,
        nome: f.nome,
        setor: p.setor,
        comissaoPdf: 0, gratificacaoPdf: 0, premioPdf: 0, adiantPremioPdf: 0,
        baseInss: 0, valorFgts: 0, emprestimosPdf: 0,
        comissaoPlan: f.comissao,
        gratificacaoPlan: f.gratificacao,
        premioPlan: f.premio,
        adiantPremioPlan: f.adiantPremio,
        emprestimosEsocialQtd: 0,
        bancosEsocial: [],
        status: "so_planilha",
        divergencias: ["Funcionário existe na planilha de comissão mas NÃO está no PDF da folha"],
      });
    }
  }

  const totais = itens.reduce(
    (acc, i) => {
      acc.funcionarios += 1;
      if (i.status !== "ok") acc.divergentes += 1;
      acc.comissaoPdf += i.comissaoPdf;
      acc.comissaoPlan += i.comissaoPlan;
      acc.gratificacaoPdf += i.gratificacaoPdf;
      acc.gratificacaoPlan += i.gratificacaoPlan;
      return acc;
    },
    { funcionarios: 0, divergentes: 0, comissaoPdf: 0, comissaoPlan: 0, gratificacaoPdf: 0, gratificacaoPlan: 0 }
  );

  return {
    empresa: pdf.empresa,
    cnpj: pdf.cnpj,
    competencia: pdf.competencia,
    itens,
    totais,
  };
}
