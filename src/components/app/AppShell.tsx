import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Search, Orbit } from "lucide-react";
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
        <Link to="/" className="flex items-center gap-2.5 px-1 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Orbit className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-bold tracking-wide">PLANNET CONTROL</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Plannet Play</div>
          </div>
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
          <div className="flex items-center gap-2 rounded-lg p-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold">JP</div>
            <div className="text-xs group-data-[collapsible=icon]:hidden">
              <div className="font-medium">Junnior Plannet</div>
              <div className="text-muted-foreground">{demo.role === 'admin' ? 'Administrador' : 'Cliente (simulado)'}</div>
            </div>
          </div>
        </SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <DemoProvider><AppShellContent>{children}</AppShellContent></DemoProvider>;
}

function AppShellContent({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const path = useRouterState({ select: r => r.location.pathname });
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Buscar telas, campanhas, estabelecimentos..." className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[10px] text-warning">Demonstração V2</span>
              <button className="relative grid size-9 place-items-center rounded-lg border bg-card hover:bg-accent" aria-label="Notificações">
                <Bell className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
              </button>
            </div>
          </header>
          <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-2">
            <span className="text-[10px] text-muted-foreground">Perfil simulado</span>
            <select aria-label="Perfil simulado" value={demo.role} onChange={e=>demo.setRole(e.target.value === 'admin' ? 'admin' : 'client')} className="h-8 rounded-md border bg-background px-2 text-xs"><option value="admin">Administrador Plannet</option><option value="client">Cliente</option></select>
            <select aria-label="Cliente selecionado" value={demo.clientId} onChange={e=>demo.setClientId(e.target.value)} className="h-8 min-w-0 max-w-full rounded-md border bg-background px-2 text-xs">{demo.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{demo.role === 'client' && !clientPaths.includes(path) ? <div className="py-8"><h1 className="text-xl font-semibold">Área reservada ao administrador</h1><p className="my-3 text-sm text-muted-foreground">Perfil de cliente simulado · selecione uma página disponível no menu.</p><Button asChild><Link to="/playlists">Minhas playlists</Link></Button></div> : children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
