import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo-diretriz.png";
import { FileCheck2, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-muted-foreground">Carregando…</div></div>;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding */}
      <div className="bg-gradient-brand text-white relative overflow-hidden hidden lg:flex flex-col justify-between p-12">
        <div>
          <img src={logo} alt="Diretriz" className="h-12 brightness-0 invert" />
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Confronte a folha do Domínio com as planilhas de comissão em segundos.
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Suba o PDF da folha mensal, as planilhas de comissão por setor e o arquivo do eSocial. A plataforma cruza tudo e mostra exatamente onde está a divergência.
          </p>
          <div className="space-y-3 pt-4">
            <Feature icon={<FileCheck2 className="h-5 w-5" />} text="Comissão, gratificação, prêmio e adiantamento por funcionário" />
            <Feature icon={<ShieldCheck className="h-5 w-5" />} text="Base INSS, FGTS e empréstimos consignados (eSocial)" />
            <Feature icon={<Sparkles className="h-5 w-5" />} text="Exporte relatório PDF e planilha de divergências em Excel" />
          </div>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} Diretriz Contabilidade</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <AuthForm />
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-white/10 p-2">{icon}</div>
      <p className="text-white/90 pt-1.5">{text}</p>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro de autenticação";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 space-y-6 border-border/60">
      <div className="space-y-2 text-center lg:hidden">
        <img src={logo} alt="Diretriz" className="h-10 mx-auto" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === "login" ? "Entrar na plataforma" : "Criar nova conta"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? "Use seu e-mail corporativo." : "Cadastre-se com seu e-mail corporativo."}
        </p>
      </div>

      <form onSubmit={handle} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
      >
        {mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tenho conta — entrar"}
      </button>
    </Card>
  );
}
