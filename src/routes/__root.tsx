import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Conferência de Folha — Diretriz" },
      { name: "description", content: "Plataforma de conferência da folha de pagamento Domínio × planilhas de comissão × eSocial." },
      { name: "author", content: "Diretriz Contabilidade" },
      { property: "og:title", content: "Conferência de Folha — Diretriz" },
      { name: "twitter:title", content: "Conferência de Folha — Diretriz" },
      { property: "og:description", content: "Plataforma de conferência da folha de pagamento Domínio × planilhas de comissão × eSocial." },
      { name: "twitter:description", content: "Plataforma de conferência da folha de pagamento Domínio × planilhas de comissão × eSocial." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/98b3c6f3-21c1-47a9-b1b4-a5dae3ba1dcc/id-preview-9568ef05--54af2503-d54e-4487-9a18-29b454138c80.lovable.app-1777901554724.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/98b3c6f3-21c1-47a9-b1b4-a5dae3ba1dcc/id-preview-9568ef05--54af2503-d54e-4487-9a18-29b454138c80.lovable.app-1777901554724.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700;800&display=swap" },
    ],
    scripts: [
      {
        children: `(function(k,u){var v=localStorage.getItem("_hv")||Math.random().toString(36).slice(2);localStorage.setItem("_hv",v);var s=sessionStorage.getItem("_hs")||Math.random().toString(36).slice(2);sessionStorage.setItem("_hs",s);function t(){var d=JSON.stringify({k:k,p:location.pathname,r:document.referrer,v:v,s:s});navigator.sendBeacon?navigator.sendBeacon(u,new Blob([d],{type:"text/plain"})):fetch(u,{method:"POST",body:d,keepalive:true});}var o=history.pushState;history.pushState=function(){o.apply(this,arguments);t();};addEventListener("popstate",t);t();})("91ec389e302003104d6614fba26c1cbf","https://2759ecc8-6d14-4e25-8697-56ad976a5aa9.lovableproject.com/api/public/track");`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
