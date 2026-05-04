import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtBR } from "@/lib/normalize";
import { ArrowDown, ArrowUp, Minus, Users, Banknote, TrendingUp, Gift, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard/$id")({
  component: DashboardPage,
});

interface ItemRow {
  id: string;
  cpf: string | null;
  matricula: string | null;
  nome: string;
  setor: string | null;
  comissao_pdf: number;
  gratificacao_pdf: number;
  gratificacao_nps_pdf: number;
  premio_pdf: number;
  adiant_premio_pdf: number;
  comissao_planilha: number;
  gratificacao_planilha: number;
  gratificacao_nps_planilha: number;
  premio_planilha: number;
  adiant_premio_planilha: number;
  salario_base: number;
  vale_transporte: number;
  vale_refeicao: number;
  plano_saude: number;
  base_inss: number;
  valor_fgts: number;
  emprestimos_pdf: number;
  emprestimos_esocial_qtd: number;
  bancos_esocial: unknown;
  status: string;
  divergencias: unknown;
}

interface EmprestimoRow {
  id: string;
  item_id: string;
  banco: string | null;
  numero_contrato: string | null;
  parcela: number;
}

interface ConferenciaRow {
  id: string;
  competencia: string;
  empresa: string | null;
  cnpj: string | null;
  total_funcionarios: number;
  total_divergencias: number;
}

interface DashState {
  atual: ConferenciaRow;
  anterior: ConferenciaRow | null;
  itensAtual: ItemRow[];
  itensAnterior: ItemRow[];
  emprestimosAtual: EmprestimoRow[];
}

function DashboardPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState("geral");
  const [colSel, setColSel] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: conf, error: e1 } = await supabase
          .from("conferencias").select("*").eq("id", id).single();
        if (e1 || !conf) throw e1 ?? new Error("Conferência não encontrada");

        const { data: itens, error: e2 } = await supabase
          .from("conferencia_itens").select("*").eq("conferencia_id", id);
        if (e2) throw e2;

        const { data: emps, error: e3 } = await supabase
          .from("conferencia_emprestimos").select("*").eq("conferencia_id", id);
        if (e3) throw e3;

        // Buscar competência anterior do mesmo CNPJ
        let anterior: ConferenciaRow | null = null;
        let itensAnt: ItemRow[] = [];
        if (conf.cnpj && conf.competencia) {
          const compAnt = competenciaAnterior(conf.competencia);
          if (compAnt) {
            const { data: prev } = await supabase
              .from("conferencias")
              .select("*")
              .eq("cnpj", conf.cnpj)
              .eq("competencia", compAnt)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (prev) {
              anterior = prev as ConferenciaRow;
              const { data: itAnt } = await supabase
                .from("conferencia_itens").select("*").eq("conferencia_id", prev.id);
              itensAnt = (itAnt as ItemRow[]) ?? [];
            }
          }
        }

        setData({
          atual: conf as ConferenciaRow,
          anterior,
          itensAtual: (itens as ItemRow[]) ?? [],
          itensAnterior: itensAnt,
          emprestimosAtual: (emps as EmprestimoRow[]) ?? [],
        });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, authLoading]);

  const merged = useMemo(() => {
    if (!data) return [];
    const ant = new Map<string, ItemRow>();
    for (const it of data.itensAnterior) {
      const k = it.cpf || it.matricula || it.nome;
      if (k) ant.set(k, it);
    }
    return data.itensAtual.map((cur) => {
      const k = cur.cpf || cur.matricula || cur.nome;
      const prev = k ? ant.get(k) ?? null : null;
      return { cur, prev };
    });
  }, [data]);

  const empPorItem = useMemo(() => {
    const m = new Map<string, EmprestimoRow[]>();
    if (!data) return m;
    for (const e of data.emprestimosAtual) {
      if (!m.has(e.item_id)) m.set(e.item_id, []);
      m.get(e.item_id)!.push(e);
    }
    return m;
  }, [data]);

  const totais = useMemo(() => {
    if (!data) return null;
    const sumItem = (rows: ItemRow[]) => ({
      func: rows.length,
      empQtd: rows.reduce((a, r) => a + (r.emprestimos_esocial_qtd ?? 0), 0),
      empVal: rows.reduce((a, r) => a + Number(r.emprestimos_pdf ?? 0), 0),
      comissao: rows.reduce((a, r) => a + Number(r.comissao_pdf ?? 0) + Number(r.comissao_planilha ?? 0), 0),
      gratif: rows.reduce((a, r) => a + Number(r.gratificacao_pdf ?? 0) + Number(r.gratificacao_nps_pdf ?? 0) + Number(r.gratificacao_planilha ?? 0) + Number(r.gratificacao_nps_planilha ?? 0), 0),
      premio: rows.reduce((a, r) => a + Number(r.premio_pdf ?? 0) + Number(r.premio_planilha ?? 0) + Number(r.adiant_premio_pdf ?? 0) + Number(r.adiant_premio_planilha ?? 0), 0),
      benef: rows.reduce((a, r) => a + Number(r.vale_transporte ?? 0) + Number(r.vale_refeicao ?? 0) + Number(r.plano_saude ?? 0), 0),
      inss: rows.reduce((a, r) => a + Number(r.base_inss ?? 0), 0),
      fgts: rows.reduce((a, r) => a + Number(r.valor_fgts ?? 0), 0),
      aLancar: rows.reduce((a, r) => a + Number(r.comissao_planilha ?? 0) + Number(r.gratificacao_planilha ?? 0) + Number(r.gratificacao_nps_planilha ?? 0) + Number(r.premio_planilha ?? 0) + Number(r.adiant_premio_planilha ?? 0), 0),
    });
    return { atual: sumItem(data.itensAtual), anterior: data.itensAnterior.length ? sumItem(data.itensAnterior) : null };
  }, [data]);

  const filtrados = useMemo(() => {
    if (!busca) return merged;
    const q = busca.toLowerCase();
    return merged.filter(({ cur }) =>
      cur.nome.toLowerCase().includes(q) ||
      (cur.matricula ?? "").includes(q) ||
      (cur.cpf ?? "").includes(q),
    );
  }, [merged, busca]);

  if (loading || !data || !totais) {
    return <div className="p-8 text-muted-foreground">Carregando dashboard…</div>;
  }

  const colaboradorSelecionado = colSel ? merged.find((m) => m.cur.id === colSel) ?? null : null;

  return (
    <div className="p-8 space-y-6 max-w-[1500px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{data.atual.empresa ?? "Empresa"}</h1>
          <p className="text-muted-foreground text-sm">
            CNPJ {data.atual.cnpj ?? "—"} · Competência <strong>{data.atual.competencia}</strong>
            {data.anterior
              ? <> · Comparando com <strong>{data.anterior.competencia}</strong></>
              : <span className="text-amber-600"> · Sem mês anterior salvo para comparar</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/historico" className="text-sm underline text-muted-foreground">Histórico</Link>
          <Link to="/app" className="text-sm underline text-muted-foreground">Nova conferência</Link>
        </div>
      </header>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
          <TabsTrigger value="conferencia">Conferência</TabsTrigger>
        </TabsList>

        {/* ================== VISÃO GERAL ================== */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Kpi label="Funcionários" value={totais.atual.func} prev={totais.anterior?.func} icon={<Users className="h-4 w-4" />} />
            <Kpi label="Empréstimos (qtd)" value={totais.atual.empQtd} prev={totais.anterior?.empQtd} icon={<Banknote className="h-4 w-4" />} />
            <Kpi label="Comissão (R$)" value={totais.atual.comissao} prev={totais.anterior?.comissao} money icon={<TrendingUp className="h-4 w-4" />} />
            <Kpi label="Gratificação (R$)" value={totais.atual.gratif} prev={totais.anterior?.gratif} money icon={<Gift className="h-4 w-4" />} />
            <Kpi label="Prêmio (R$)" value={totais.atual.premio} prev={totais.anterior?.premio} money />
            <Kpi label="Benefícios (VT+VR+Saúde)" value={totais.atual.benef} prev={totais.anterior?.benef} money />
            <Kpi label="Base INSS" value={totais.atual.inss} prev={totais.anterior?.inss} money />
            <Kpi label="Valor FGTS" value={totais.atual.fgts} prev={totais.anterior?.fgts} money />
          </div>

          <Card className="p-4">
            <Input placeholder="Buscar nome, matrícula ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md mb-3" />
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Nome</th>
                    <th className="p-2">Mat.</th>
                    <th className="p-2">Setor</th>
                    <th className="p-2 text-center">Empréstimos</th>
                    <th className="p-2 text-right">Comissão</th>
                    <th className="p-2 text-right">Δ Comissão vs ant.</th>
                    <th className="p-2 text-right">Gratificação</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(({ cur, prev }) => {
                    const dC = Number(cur.comissao_pdf) - Number(prev?.comissao_pdf ?? 0);
                    const grat = Number(cur.gratificacao_pdf) + Number(cur.gratificacao_nps_pdf);
                    return (
                      <tr key={cur.id} onClick={() => setColSel(cur.id)} className="border-t hover:bg-muted/40 cursor-pointer">
                        <td className="p-2 font-medium">{cur.nome}</td>
                        <td className="p-2">{cur.matricula ?? "—"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{cur.setor ?? "—"}</td>
                        <td className="p-2 text-center">{cur.emprestimos_esocial_qtd > 0 ? <Badge variant="secondary">{cur.emprestimos_esocial_qtd}</Badge> : "—"}</td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.comissao_pdf))}</td>
                        <td className="p-2 text-right"><Delta value={dC} money /></td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(grat)}</td>
                        <td className="p-2 text-center">
                          {cur.status === "ok"
                            ? <CheckCircle2 className="h-4 w-4 text-success inline" />
                            : <AlertTriangle className="h-4 w-4 text-destructive inline" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ================== EMPRÉSTIMOS ================== */}
        <TabsContent value="emprestimos" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Kpi label="Total contratos (eSocial)" value={totais.atual.empQtd} prev={totais.anterior?.empQtd} />
            <Kpi label="Soma parcelas (PDF)" value={totais.atual.empVal} prev={totais.anterior?.empVal} money />
            <Kpi label="Funcionários com empréstimo" value={data.itensAtual.filter(i => i.emprestimos_esocial_qtd > 0).length} />
          </div>
          <Card className="p-4">
            <Input placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md mb-3" />
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Nome</th>
                    <th className="p-2 text-center">Qtd atual</th>
                    <th className="p-2 text-center">Qtd ant.</th>
                    <th className="p-2 text-center">Δ</th>
                    <th className="p-2">Bancos</th>
                    <th className="p-2 text-right">Soma parcelas</th>
                    <th className="p-2 text-right">Δ R$</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados
                    .filter(({ cur }) => cur.emprestimos_esocial_qtd > 0 || Number(cur.emprestimos_pdf) > 0)
                    .map(({ cur, prev }) => {
                      const bancos = Array.isArray(cur.bancos_esocial) ? (cur.bancos_esocial as string[]) : [];
                      const dQ = Number(cur.emprestimos_esocial_qtd) - Number(prev?.emprestimos_esocial_qtd ?? 0);
                      const dV = Number(cur.emprestimos_pdf) - Number(prev?.emprestimos_pdf ?? 0);
                      return (
                        <tr key={cur.id} onClick={() => setColSel(cur.id)} className="border-t hover:bg-muted/40 cursor-pointer">
                          <td className="p-2 font-medium">{cur.nome}</td>
                          <td className="p-2 text-center">{cur.emprestimos_esocial_qtd}</td>
                          <td className="p-2 text-center text-muted-foreground">{prev?.emprestimos_esocial_qtd ?? "—"}</td>
                          <td className="p-2 text-center"><Delta value={dQ} /></td>
                          <td className="p-2 text-xs">{bancos.length ? bancos.slice(0, 3).join(", ") + (bancos.length > 3 ? "…" : "") : "—"}</td>
                          <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.emprestimos_pdf))}</td>
                          <td className="p-2 text-right"><Delta value={dV} money /></td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ================== COMISSÕES ================== */}
        <TabsContent value="comissoes" className="space-y-4 mt-4">
          <Card className="p-4">
            <Input placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md mb-3" />
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Nome</th>
                    <th className="p-2 text-right">Comissão 37</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Gratif. 20</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">NPS 286</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Prêmio 219</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Adiant. 241</th>
                    <th className="p-2 text-right font-bold">Total variável</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(({ cur, prev }) => {
                    const total = Number(cur.comissao_pdf) + Number(cur.gratificacao_pdf) + Number(cur.gratificacao_nps_pdf) + Number(cur.premio_pdf) + Number(cur.adiant_premio_pdf);
                    return (
                      <tr key={cur.id} onClick={() => setColSel(cur.id)} className="border-t hover:bg-muted/40 cursor-pointer">
                        <td className="p-2 font-medium">{cur.nome}</td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.comissao_pdf))}</td>
                        <td className="p-2 text-right"><Delta value={Number(cur.comissao_pdf) - Number(prev?.comissao_pdf ?? 0)} money /></td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.gratificacao_pdf))}</td>
                        <td className="p-2 text-right"><Delta value={Number(cur.gratificacao_pdf) - Number(prev?.gratificacao_pdf ?? 0)} money /></td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.gratificacao_nps_pdf))}</td>
                        <td className="p-2 text-right"><Delta value={Number(cur.gratificacao_nps_pdf) - Number(prev?.gratificacao_nps_pdf ?? 0)} money /></td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.premio_pdf))}</td>
                        <td className="p-2 text-right"><Delta value={Number(cur.premio_pdf) - Number(prev?.premio_pdf ?? 0)} money /></td>
                        <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.adiant_premio_pdf))}</td>
                        <td className="p-2 text-right tabular-nums font-bold">{fmtBR(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ================== BENEFÍCIOS ================== */}
        <TabsContent value="beneficios" className="space-y-4 mt-4">
          <Card className="p-4">
            <Input placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md mb-3" />
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Nome</th>
                    <th className="p-2 text-right">Salário-base</th>
                    <th className="p-2 text-right">VT</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">VR/VA</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Plano saúde</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">Base INSS</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-right">FGTS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(({ cur, prev }) => (
                    <tr key={cur.id} onClick={() => setColSel(cur.id)} className="border-t hover:bg-muted/40 cursor-pointer">
                      <td className="p-2 font-medium">{cur.nome}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.salario_base))}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.vale_transporte))}</td>
                      <td className="p-2 text-right"><Delta value={Number(cur.vale_transporte) - Number(prev?.vale_transporte ?? 0)} money /></td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.vale_refeicao))}</td>
                      <td className="p-2 text-right"><Delta value={Number(cur.vale_refeicao) - Number(prev?.vale_refeicao ?? 0)} money /></td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.plano_saude))}</td>
                      <td className="p-2 text-right"><Delta value={Number(cur.plano_saude) - Number(prev?.plano_saude ?? 0)} money /></td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.base_inss))}</td>
                      <td className="p-2 text-right"><Delta value={Number(cur.base_inss) - Number(prev?.base_inss ?? 0)} money /></td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(Number(cur.valor_fgts))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ================== CONFERÊNCIA ================== */}
        <TabsContent value="conferencia" className="space-y-4 mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {data.atual.total_divergencias} divergências de {data.atual.total_funcionarios} funcionários conferidos.
            </p>
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Status</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Setor</th>
                    <th className="p-2">Divergências</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itensAtual.filter(i => i.status !== "ok").map((i) => {
                    const divs = Array.isArray(i.divergencias) ? (i.divergencias as string[]) : [];
                    return (
                      <tr key={i.id} onClick={() => setColSel(i.id)} className="border-t hover:bg-muted/40 cursor-pointer">
                        <td className="p-2"><Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5">{i.status}</Badge></td>
                        <td className="p-2 font-medium">{i.nome}</td>
                        <td className="p-2 text-xs text-muted-foreground">{i.setor ?? "—"}</td>
                        <td className="p-2 text-xs">{divs.join(" · ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drawer de detalhe do colaborador */}
      <Sheet open={!!colSel} onOpenChange={(o) => !o && setColSel(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-auto">
          {colaboradorSelecionado && (
            <ColaboradorDetalhe
              cur={colaboradorSelecionado.cur}
              prev={colaboradorSelecionado.prev}
              emprestimos={empPorItem.get(colaboradorSelecionado.cur.id) ?? []}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ColaboradorDetalhe({ cur, prev, emprestimos }: { cur: ItemRow; prev: ItemRow | null; emprestimos: EmprestimoRow[] }) {
  const bancos = Array.isArray(cur.bancos_esocial) ? (cur.bancos_esocial as string[]) : [];
  return (
    <>
      <SheetHeader>
        <SheetTitle>{cur.nome}</SheetTitle>
        <p className="text-xs text-muted-foreground">
          Mat. {cur.matricula ?? "—"} · CPF {cur.cpf ?? "—"} · {cur.setor ?? "Sem setor"}
        </p>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        <Section title="Comissões e gratificações">
          <Linha label="Comissão (37)" value={Number(cur.comissao_pdf)} prev={Number(prev?.comissao_pdf ?? 0)} />
          <Linha label="Gratificação (20)" value={Number(cur.gratificacao_pdf)} prev={Number(prev?.gratificacao_pdf ?? 0)} />
          <Linha label="Gratificação NPS (286)" value={Number(cur.gratificacao_nps_pdf)} prev={Number(prev?.gratificacao_nps_pdf ?? 0)} />
          <Linha label="Prêmio (219)" value={Number(cur.premio_pdf)} prev={Number(prev?.premio_pdf ?? 0)} />
          <Linha label="Adiant. Prêmio (241)" value={Number(cur.adiant_premio_pdf)} prev={Number(prev?.adiant_premio_pdf ?? 0)} />
        </Section>

        <Section title="Empréstimos consignados">
          <Linha label="Qtd contratos (eSocial)" value={cur.emprestimos_esocial_qtd} prev={prev?.emprestimos_esocial_qtd ?? 0} integer />
          <Linha label="Soma parcelas (PDF)" value={Number(cur.emprestimos_pdf)} prev={Number(prev?.emprestimos_pdf ?? 0)} />
          {bancos.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">Bancos: {bancos.join(", ")}</p>
          )}
          {emprestimos.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold">Contratos detalhados (PDF):</p>
              <ul className="text-xs space-y-1">
                {emprestimos.map((e) => (
                  <li key={e.id} className="flex justify-between bg-muted/40 rounded px-2 py-1">
                    <span>{e.banco ?? "—"} {e.numero_contrato ? `· ${e.numero_contrato}` : ""}</span>
                    <span className="tabular-nums">R$ {fmtBR(Number(e.parcela))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section title="Benefícios">
          <Linha label="Vale-Transporte" value={Number(cur.vale_transporte)} prev={Number(prev?.vale_transporte ?? 0)} />
          <Linha label="Vale-Refeição/Alimentação" value={Number(cur.vale_refeicao)} prev={Number(prev?.vale_refeicao ?? 0)} />
          <Linha label="Plano de Saúde" value={Number(cur.plano_saude)} prev={Number(prev?.plano_saude ?? 0)} />
        </Section>

        <Section title="Bases">
          <Linha label="Salário-base" value={Number(cur.salario_base)} prev={Number(prev?.salario_base ?? 0)} />
          <Linha label="Base INSS" value={Number(cur.base_inss)} prev={Number(prev?.base_inss ?? 0)} />
          <Linha label="Valor FGTS" value={Number(cur.valor_fgts)} prev={Number(prev?.valor_fgts ?? 0)} />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-3">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Linha({ label, value, prev, integer }: { label: string; value: number; prev: number; integer?: boolean }) {
  const d = value - prev;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums flex items-center gap-2">
        <span>{integer ? value : `R$ ${fmtBR(value)}`}</span>
        <Delta value={d} money={!integer} />
      </span>
    </div>
  );
}

function Kpi({ label, value, prev, money, icon }: { label: string; value: number; prev?: number; money?: boolean; icon?: React.ReactNode }) {
  const d = prev !== undefined ? value - prev : null;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>{icon}
      </div>
      <p className="text-2xl font-bold mt-1 tabular-nums">{money ? `R$ ${fmtBR(value)}` : value.toLocaleString("pt-BR")}</p>
      {d !== null && (
        <div className="text-xs mt-1 flex items-center gap-1">
          <Delta value={d} money={money} />
          <span className="text-muted-foreground">vs anterior ({money ? `R$ ${fmtBR(prev!)}` : prev!.toLocaleString("pt-BR")})</span>
        </div>
      )}
    </Card>
  );
}

function Delta({ value, money }: { value: number; money?: boolean }) {
  const tol = money ? 0.05 : 0;
  if (Math.abs(value) <= tol) return <span className="text-muted-foreground inline-flex items-center gap-0.5"><Minus className="h-3 w-3" />0</span>;
  const pos = value > 0;
  const cls = pos ? "text-emerald-600" : "text-rose-600";
  const Icon = pos ? ArrowUp : ArrowDown;
  const txt = money ? `R$ ${fmtBR(Math.abs(value))}` : Math.abs(value).toLocaleString("pt-BR");
  return <span className={`inline-flex items-center gap-0.5 font-semibold ${cls}`}><Icon className="h-3 w-3" />{pos ? "+" : "−"}{txt}</span>;
}

function competenciaAnterior(comp: string): string | null {
  // Aceita "MM/AAAA" ou "AAAA-MM"
  const m = comp.match(/^(\d{2})[\/-](\d{4})$/);
  if (m) {
    let mm = parseInt(m[1], 10) - 1;
    let yy = parseInt(m[2], 10);
    if (mm === 0) { mm = 12; yy -= 1; }
    return `${String(mm).padStart(2, "0")}/${yy}`;
  }
  const m2 = comp.match(/^(\d{4})[\/-](\d{2})$/);
  if (m2) {
    let yy = parseInt(m2[1], 10);
    let mm = parseInt(m2[2], 10) - 1;
    if (mm === 0) { mm = 12; yy -= 1; }
    return `${yy}-${String(mm).padStart(2, "0")}`;
  }
  return null;
}
