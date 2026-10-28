import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Field, PageHeader, Panel, inputCls, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/configuracoes")({
  head: () => seo("Configurações", "Preferências da organização, usuários e notificações."),
  component: Page,
});

const users = [
  { name: "Junnior Plannet", email: "junnior@plannetplay.com", role: "Administrador" },
  { name: "Marina Lopes", email: "marina@plannetplay.com", role: "Comercial" },
  { name: "Rafael Souza", email: "rafael@plannetplay.com", role: "Conteúdo" },
];

function Page() {
  return (
    <>
      <PageHeader title="Configurações" />
      <Tabs defaultValue="geral">
        <TabsList><TabsTrigger value="geral">Geral</TabsTrigger><TabsTrigger value="usuarios">Usuários</TabsTrigger><TabsTrigger value="notificacoes">Notificações</TabsTrigger></TabsList>
        <TabsContent value="geral" className="mt-4">
          <Panel title="Organização" className="max-w-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome"><input className={inputCls} defaultValue="PLANNET PLAY" /></Field>
              <Field label="Fuso horário"><select className={selectCls}><option>America/Sao_Paulo (UTC-3)</option></select></Field>
              <Field label="Idioma"><select className={selectCls}><option>Português (Brasil)</option></select></Field>
              <Field label="Horário padrão das telas"><input className={inputCls} defaultValue="06:00 – 23:00" /></Field>
            </div>
            <Button className="mt-4" onClick={() => toast.success("Configurações salvas")}>Salvar</Button>
          </Panel>
        </TabsContent>
        <TabsContent value="usuarios" className="mt-4">
          <Panel title="Usuários" className="max-w-2xl" action={<Button size="sm" onClick={() => toast("Convite enviado (demonstração)")}>Convidar</Button>}>
            <ul className="divide-y">{users.map((u) => (
              <li key={u.email} className="flex items-center gap-3 py-3 text-sm"><div className="grid size-8 place-items-center rounded-full bg-accent text-xs">{u.name.split(" ").map((p) => p[0]).join("")}</div>
                <div className="flex-1"><div className="font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div><span className="text-xs text-muted-foreground">{u.role}</span></li>
            ))}</ul>
          </Panel>
        </TabsContent>
        <TabsContent value="notificacoes" className="mt-4">
          <Panel title="Notificações" className="max-w-2xl">
            {["Tela offline por mais de 30 minutos", "Campanha iniciada ou encerrada", "Armazenamento acima de 90%", "Resumo diário por e-mail"].map((n, i) => (
              <div key={n} className="flex items-center justify-between border-b py-3 text-sm last:border-0">{n}<Switch defaultChecked={i < 3} /></div>
            ))}
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
