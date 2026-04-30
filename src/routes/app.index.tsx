import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { parseDominioPdf } from "@/lib/parsePdf";
import { parseFolhaXls, parseEsocialXlsx } from "@/lib/parseXls";
import { conferir, type ConferenciaResult } from "@/lib/conferir";
import { exportarPdf, exportarExcelDivergencias } from "@/lib/exporters";
import { fmtBR } from "@/lib/normalize";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FileText, FileSpreadsheet, Database, Play, Download, FileDown, AlertTriangle, CheckCircle2, X, Info } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { parseFolhaXls as parseFolhaXlsLib, type PlanilhaParseResult } from "@/lib/parseXls";

export const Route = createFileRoute("/app/")({
  component: NovaConferencia,
});

function NovaConferencia() {
  const { user } = useAuth();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [esocialFile, setEsocialFile] = useState<File | null>(null);
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConferenciaResult | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "divergente" | "ok">("todos");
  const [busca, setBusca] = useState("");

  const [filiaisPendentes, setFiliaisPendentes] = useState<PlanilhaParseResult[]>([]);
  const [filialContext, setFilialContext] = useState<{
    pdfData: Awaited<ReturnType<typeof parseDominioPdf>>;
    todasPlan: PlanilhaParseResult[];
    cnpjPdf: string;
  } | null>(null);

  const pode = pdfFile && planFiles.length > 0;

  const finalizarConferencia = async (
    pdfData: Awaited<ReturnType<typeof parseDominioPdf>>,
    planResults: PlanilhaParseResult[],
  ) => {
    const esocial = esocialFile ? await parseEsocialXlsx(esocialFile) : [];
    if (esocialFile) toast.message(`eSocial: ${esocial.length} contratos.`);
    const r = conferir(pdfData, planResults, esocial);
    if (!empresa && r.empresa) setEmpresa(r.empresa);
    if (!cnpj && r.cnpj) setCnpj(r.cnpj);
    if (!competencia && r.competencia) setCompetencia(r.competencia);
    setResult(r);
    toast.success(`Conferência concluída — ${r.totais.divergentes} divergências de ${r.totais.funcionarios} funcionários.`);
  };

  const handleConferir = async () => {
    if (!pdfFile || planFiles.length === 0) {
      toast.error("Envie o PDF do Domínio e ao menos uma planilha de comissão.");
      return;
    }
    setBusy(true);
    try {
      toast.message("Lendo PDF do Domínio…");
      const pdfBuf = await pdfFile.arrayBuffer();
      const pdfData = await parseDominioPdf(pdfBuf);
      toast.message(`PDF lido: ${pdfData.funcionarios.length} funcionários.`);

      const planResults: PlanilhaParseResult[] = [];
      for (const f of planFiles) {
        const r = await parseFolhaXlsLib(f);
        planResults.push(...r);
      }
      toast.message(`Planilhas lidas: ${planResults.reduce((a, p) => a + p.funcionarios.length, 0)} linhas.`);

      // Detecta filiais (CNPJ diferente do PDF)
      const cnpjPdf = pdfData.cnpj?.replace(/\D/g, "") ?? "";
      const filiais = cnpjPdf
        ? planResults.filter((p) => p.cnpj && p.cnpj !== cnpjPdf)
        : [];

      if (filiais.length > 0) {
        // Pergunta ao usuário antes de incluir filiais
        setFilialContext({ pdfData, todasPlan: planResults, cnpjPdf });
        setFiliaisPendentes(filiais);
        setBusy(false);
        return;
      }

      await finalizarConferencia(pdfData, planResults);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao processar arquivos");
    } finally {
      setBusy(false);
    }
  };

  const responderFiliais = async (incluir: boolean) => {
    if (!filialContext) return;
    setBusy(true);
    try {
      const { pdfData, todasPlan, cnpjPdf } = filialContext;
      const planFinais = incluir
        ? todasPlan
        : todasPlan.filter((p) => !p.cnpj || p.cnpj === cnpjPdf);
      await finalizarConferencia(pdfData, planFinais);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar");
    } finally {
      setFiliaisPendentes([]);
      setFilialContext(null);
      setBusy(false);
    }
  };

  const handleSalvar = async () => {
    if (!result || !user) return;
    try {
      const { data: conf, error } = await supabase
        .from("conferencias")
        .insert({
          user_id: user.id,
          competencia: competencia || result.competencia || "—",
          empresa: empresa || result.empresa || null,
          cnpj: cnpj || result.cnpj || null,
          pdf_nome: pdfFile?.name ?? null,
          planilhas_nomes: planFiles.map((f) => f.name),
          esocial_nome: esocialFile?.name ?? null,
          total_funcionarios: result.totais.funcionarios,
          total_divergencias: result.totais.divergentes,
          total_comissao_pdf: result.totais.comissaoPdf,
          total_comissao_planilha: result.totais.comissaoPlan,
          total_gratificacao_pdf: result.totais.gratificacaoPdf,
          total_gratificacao_planilha: result.totais.gratificacaoPlan,
        })
        .select()
        .single();
      if (error) throw error;

      const itens = result.itens.map((i) => ({
        conferencia_id: conf.id,
        cpf: i.cpf || null,
        matricula: i.matricula || null,
        nome: i.nome,
        setor: i.setor || null,
        comissao_pdf: i.comissaoPdf,
        comissao_planilha: i.comissaoPlan,
        gratificacao_pdf: i.gratificacaoPdf,
        gratificacao_planilha: i.gratificacaoPlan,
        premio_pdf: i.premioPdf,
        premio_planilha: i.premioPlan,
        base_inss: i.baseInss,
        valor_fgts: i.valorFgts,
        emprestimos_pdf: i.emprestimosPdf,
        emprestimos_esocial_qtd: i.emprestimosEsocialQtd,
        status: i.status,
        divergencias: i.divergencias,
      }));
      // Insert em batches de 500
      for (let i = 0; i < itens.length; i += 500) {
        const slice = itens.slice(i, i + 500);
        const { error: e2 } = await supabase.from("conferencia_itens").insert(slice);
        if (e2) throw e2;
      }
      toast.success("Conferência salva no histórico.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const itensFiltrados = useMemo(() => {
    if (!result) return [];
    return result.itens.filter((i) => {
      if (filtro === "divergente" && i.status === "ok") return false;
      if (filtro === "ok" && i.status !== "ok") return false;
      if (busca) {
        const q = busca.toLowerCase();
        return i.nome.toLowerCase().includes(q) || i.matricula.includes(q) || i.cpf.includes(q);
      }
      return true;
    });
  }, [result, filtro, busca]);

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Nova conferência</h1>
        <p className="text-muted-foreground mt-1">PDF do Domínio × planilhas de comissão × eSocial</p>
      </header>

      <Card className="p-6 space-y-5">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Auto-preenche pelo PDF" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="Auto-preenche pelo PDF" />
          </div>
          <div className="space-y-2">
            <Label>Competência</Label>
            <Input value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="MM/AAAA" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <UploadBox
            icon={<FileText className="h-5 w-5" />}
            title="PDF Domínio"
            hint="Folha mensal validada (.pdf)"
            accept=".pdf"
            files={pdfFile ? [pdfFile] : []}
            onFiles={(fs) => setPdfFile(fs[0] ?? null)}
            onRemove={() => setPdfFile(null)}
          />
          <UploadBox
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title="Planilhas de comissão"
            hint="Uma ou mais .xls/.xlsx por setor"
            accept=".xls,.xlsx"
            multiple
            files={planFiles}
            onFiles={(fs) => setPlanFiles((cur) => [...cur, ...fs])}
            onRemove={(idx) => setPlanFiles((cur) => cur.filter((_, i) => i !== idx))}
          />
          <UploadBox
            icon={<Database className="h-5 w-5" />}
            title="Excel eSocial (opcional)"
            hint="Empréstimos consignados"
            accept=".xlsx"
            files={esocialFile ? [esocialFile] : []}
            onFiles={(fs) => setEsocialFile(fs[0] ?? null)}
            onRemove={() => setEsocialFile(null)}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleConferir} disabled={!pode || busy} size="lg">
            <Play className="h-4 w-4 mr-2" />
            {busy ? "Processando…" : "Conferir"}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-6 space-y-5">
          <div className="grid md:grid-cols-4 gap-4">
            <Stat label="Funcionários" value={String(result.totais.funcionarios)} />
            <Stat label="Divergências" value={String(result.totais.divergentes)} variant={result.totais.divergentes > 0 ? "warn" : "ok"} />
            <Stat label="Δ Comissão (PDF − Planilha)" value={`R$ ${fmtBR(result.totais.comissaoPdf - result.totais.comissaoPlan)}`} />
            <Stat label="Δ Gratificação (PDF − Planilha)" value={`R$ ${fmtBR(result.totais.gratificacaoPdf - result.totais.gratificacaoPlan)}`} />
          </div>

          <div className="flex flex-wrap gap-3 items-end justify-between">
            <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <TabsList>
                <TabsTrigger value="todos">Todos ({result.itens.length})</TabsTrigger>
                <TabsTrigger value="divergente">Divergentes ({result.totais.divergentes})</TabsTrigger>
                <TabsTrigger value="ok">OK ({result.itens.length - result.totais.divergentes})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2 flex-1 max-w-md">
              <Input placeholder="Buscar nome, matrícula ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportarExcelDivergencias(result)}><FileDown className="h-4 w-4 mr-2" />Excel</Button>
              <Button variant="outline" onClick={() => exportarPdf(result)}><Download className="h-4 w-4 mr-2" />PDF</Button>
              <Button onClick={handleSalvar}>Salvar no histórico</Button>
            </div>
          </div>

          <div className="overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="p-2">Status</th>
                  <th className="p-2">Mat.</th>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Setor</th>
                  <th className="p-2 text-right">Comissão PDF</th>
                  <th className="p-2 text-right">Comissão Plan.</th>
                  <th className="p-2 text-right">Δ</th>
                  <th className="p-2 text-right">Gratif. PDF</th>
                  <th className="p-2 text-right">Gratif. Plan.</th>
                  <th className="p-2 text-right">Δ</th>
                  <th className="p-2 text-right">Base INSS</th>
                  <th className="p-2 text-right">FGTS</th>
                  <th className="p-2 text-center">Emp. eSocial</th>
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.map((i, idx) => {
                  const dC = i.comissaoPdf - i.comissaoPlan;
                  const dG = i.gratificacaoPdf - i.gratificacaoPlan;
                  return (
                    <tr key={idx} className="border-t hover:bg-muted/40">
                      <td className="p-2">
                        {i.status === "ok"
                          ? <Badge variant="outline" className="border-success/40 text-success bg-success/5"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
                          : <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5"><AlertTriangle className="h-3 w-3 mr-1" />{i.status === "divergente" ? "Divergente" : i.status === "so_pdf" ? "Só no PDF" : "Só na planilha"}</Badge>}
                      </td>
                      <td className="p-2">{i.matricula || "—"}</td>
                      <td className="p-2 font-medium">{i.nome}</td>
                      <td className="p-2 text-muted-foreground text-xs">{i.setor || "—"}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(i.comissaoPdf)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(i.comissaoPlan)}</td>
                      <td className={`p-2 text-right tabular-nums font-semibold ${Math.abs(dC) > 0.05 ? "text-destructive" : "text-muted-foreground"}`}>{fmtBR(dC)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(i.gratificacaoPdf)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(i.gratificacaoPlan)}</td>
                      <td className={`p-2 text-right tabular-nums font-semibold ${Math.abs(dG) > 0.05 ? "text-destructive" : "text-muted-foreground"}`}>{fmtBR(dG)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(i.baseInss)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBR(i.valorFgts)}</td>
                      <td className="p-2 text-center">{i.emprestimosEsocialQtd > 0 ? <Badge variant="secondary">{i.emprestimosEsocialQtd}</Badge> : "—"}</td>
                    </tr>
                  );
                })}
                {itensFiltrados.length === 0 && (
                  <tr><td colSpan={13} className="text-center text-muted-foreground p-6">Nenhum item para o filtro atual.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, variant }: { label: string; value: string; variant?: "ok" | "warn" }) {
  const color = variant === "warn" ? "text-destructive" : variant === "ok" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function UploadBox({
  icon, title, hint, accept, multiple, files, onFiles, onRemove,
}: {
  icon: React.ReactNode; title: string; hint: string; accept: string; multiple?: boolean;
  files: File[]; onFiles: (fs: File[]) => void; onRemove: (idx: number) => void;
}) {
  const id = `up-${title.replace(/\s/g, "")}`;
  return (
    <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}{title}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input id={id} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length > 0) onFiles(fs);
          e.target.value = "";
        }} />
      <label htmlFor={id}>
        <Button asChild variant="outline" size="sm" className="w-full cursor-pointer">
          <span>Selecionar arquivo{multiple ? "s" : ""}</span>
        </Button>
      </label>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, idx) => (
            <li key={idx} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1.5">
              <span className="truncate" title={f.name}>{f.name}</span>
              <button type="button" onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-destructive ml-2"><X className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
