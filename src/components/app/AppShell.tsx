import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Search, LogOut } from "lucide-react";
import logoAsset from "@/assets/plannet-play-logo.png.asset.json";
import symbolAsset from "@/assets/plannet-play-symbol.png.asset.json";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import type { ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarFooter,
} from "@/components/ui/sidebar";
import { navGroups } from "./nav";
import { DemoProvider, useDemo } from "@/components/v2/DemoProvider";
import { Button } from "@/components/ui/button";

const clientPaths = ["/clientes", "/estabelecimentos", "/telas", "/midias", "/playlists", "/programacao", "/monitoramento", "/audio-ambiente"];

function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const demo = useDemo();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" aria-label="Plannet Play — início" className="flex items-center justify-center px-1 py-2 group-data-[collapsible=icon]:px-0">
          <img src={logoAsset.url} alt="Plannet Play — Mídia Inteligente" width={1920} height={640} className="h-auto w-full object-contain group-data-[collapsible=icon]:hidden" />
          <img src={symbolAsset.url} alt="Plannet Play" width={1254} height={1254} className="hidden size-8 shrink-0 object-contain group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((g) => (
          <SidebarGroup key={g.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em]">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.filter(it => demo.role === 'admin' || clientPaths.includes(it.url)).map((it) => {
                  const active = path === it.url;
                   if (it.comingSoon) return <SidebarMenuItem key={it.url}><SidebarMenuButton disabled tooltip={it.title}><it.icon /><span>{it.title}</span></SidebarMenuButton></SidebarMenuItem>;
                  return (
                    <SidebarMenuButton key={it.url} asChild isActive={active} tooltip={it.title}
                      className="data-[active=true]:text-primary data-[active=true]:font-medium">
                      <Link to={it.url}><it.icon /><span>{it.title}</span></Link>
                    </SidebarMenuButton>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu><SidebarMenuItem>
          <UserFooter />
        </SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function UserFooter() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = me?.fullName ?? "…";
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex items-center gap-2 rounded-lg p-2">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold">{initials}</div>
      <div className="min-w-0 flex-1 text-xs group-data-[collapsible=icon]:hidden">
        <div className="truncate font-medium">{name}</div>
        <div className="text-muted-foreground">{me?.isAdmin ? "Administrador Plannet" : "Cliente"}</div>
      </div>
      <button onClick={signOut} aria-label="Sair" title="Sair" className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-accent group-data-[collapsible=icon]:hidden"><LogOut className="size-4" /></button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <DemoProvider><AppShellContent>{children}</AppShellContent></DemoProvider>;
}

function AppShellContent({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const path = useRouterState({ select: r => r.location.pathname });
  const { data: me } = useMe();
  const { setRole } = demo;
  useEffect(() => { if (me) setRole(me.isAdmin ? 'admin' : 'client'); }, [me, setRole]);
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Buscar clientes, dispositivos, campanhas..." className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button className="relative grid size-9 place-items-center rounded-lg border bg-card hover:bg-accent" aria-label="Notificações">
                <Bell className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
              </button>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{demo.role === 'client' && !clientPaths.includes(path) ? <div className="py-8"><h1 className="text-xl font-semibold">Área reservada ao administrador</h1><p className="my-3 text-sm text-muted-foreground">Perfil de cliente · selecione uma página disponível no menu.</p><Button asChild><Link to="/playlists">Minhas playlists</Link></Button></div> : children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
