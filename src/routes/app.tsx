import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-diretriz-vertical.png";
import { LogOut, FilePlus2, History } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-muted-foreground">Carregando…</div></div>;
  }

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const navItem = (to: string, label: string, icon: React.ReactNode) => {
    const active = loc.pathname === to || (to === "/app" && loc.pathname === "/app");
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr]">
      <aside className="bg-sidebar text-sidebar-foreground flex flex-col p-5">
        <div className="flex flex-col items-center pb-6 border-b border-sidebar-border">
          <img src={logo} alt="Diretriz" className="h-20" />
          <p className="text-xs text-sidebar-foreground/60 mt-3">Conferência de Folha</p>
        </div>
        <nav className="flex flex-col gap-1 mt-6 flex-1">
          {navItem("/app", "Nova conferência", <FilePlus2 className="h-4 w-4" />)}
          {navItem("/app/historico", "Histórico", <History className="h-4 w-4" />)}
        </nav>
        <div className="border-t border-sidebar-border pt-4 space-y-3">
          <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="bg-background overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
