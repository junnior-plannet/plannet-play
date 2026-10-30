import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Pencil, Trash2, Search, Tv } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { useMe } from "@/lib/auth";
import { addMemberByEmail, clientsQuery, membersQuery, removeMember, statusLabel, type ClientRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader, DataTable, Field, inputCls, selectCls, StatusBadge } from "@/components/app/ui";
import { QueryState } from "@/components/app/QueryState";
import { ClientForm } from "@/components/app/ClientForm";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => seo("Clientes", "Cadastro de clientes, planos contratados e reserva de programação Plannet."),
  component: Page,
});

function Page() {
  const { data: me } = useMe();
  const isAdmin = !!me?.isAdmin;
  const q = useQuery(clientsQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [editing, setEditing] = useState<ClientRow | "new" | null>(null);
  const rows = (q.data ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) && (status === "todos" || c.status === status));

  return <div className="min-w-0 space-y-6">
    <div className="border-b border-primary/20 pb-1 [&_button]:w-full sm:[&_button]:w-auto">
      <PageHeader title="Clientes" description={isAdmin ? "Contas, planos e espaço publicitário Plannet · dados do banco" : "Sua conta Plannet Play"} actions={isAdmin && <Button onClick={() => setEditing("new")}><Plus />Novo Cliente</Button>} />
    </div>
    <section aria-labelledby="client-list-title" className="min-w-0 space-y-4">
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="size-4" aria-hidden="true" /></span>
          <div><h2 id="client-list-title" className="text-sm font-semibold">Clientes cadastrados</h2><p className="mt-0.5 text-xs text-muted-foreground">Consulte os cadastros por nome e status.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Buscar cliente">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" /><input aria-label="Buscar cliente" className={`${inputCls} pl-9`} placeholder="Pesquisar cliente" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </Field>
          <Field label="Status do cliente"><select className={`${selectCls} w-full`} aria-label="Status do cliente" value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
        </div>
      </div>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} emptyIcon={Users}
        emptyTitle={q.data?.length ? "Nenhum cliente corresponde aos filtros" : "Nenhum cliente cadastrado"}
        emptyDescription={isAdmin ? "Cadastre o primeiro cliente para começar." : "Sua conta ainda não foi vinculada a um cliente. Fale com a equipe Plannet."}
        emptyAction={isAdmin && !q.data?.length ? <Button onClick={() => setEditing("new")}><Plus />Novo Cliente</Button> : undefined}>
        <div className="hidden min-w-0 lg:block [&_th:nth-child(6)]:max-w-48 [&_th:nth-child(6)]:whitespace-normal [&_td:nth-child(6)]:font-medium [&_td:nth-child(6)]:tabular-nums [&_td:nth-child(6)]:text-primary">
          <DataTable head={["Cliente", "Cidade", "TVs", "Plano", "Status", "Espaço Publicitário Plannet (%)", ""]}>
            {rows.map((c) => <tr key={c.id}>
              <td className="font-medium">{c.name}<div className="text-xs text-muted-foreground">{c.contact_email}</div></td>
              <td>{[c.city, null].filter(Boolean).join(" / ") || "—"}</td>
                            <td>{c.establishments.reduce((n, e) => n + (e.devices[0]?.count ?? 0), 0)}</td>
              <td>{c.plans?.name ?? "—"}</td>
              <td><StatusBadge status={statusLabel[c.status]} /></td>
              <td>{c.plannet_reserved_percent}%</td>
              <td><Button variant="outline" size="sm" onClick={() => setEditing(c)}><Pencil />Editar cadastro</Button></td>
            </tr>)}
          </DataTable>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:hidden">
          {rows.map((c) => <article key={c.id} className="min-w-0 space-y-4 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{c.name}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{c.contact_email}</p></div>
              <span className="shrink-0"><StatusBadge status={statusLabel[c.status]} /></span>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-y py-3 text-sm">
              <div className="col-span-2 min-w-0"><dt className="text-xs text-muted-foreground">Cidade</dt><dd className="mt-1 break-words">{[c.city, null].filter(Boolean).join(" / ") || "—"}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Tv className="size-3.5" aria-hidden="true" />TVs</dt><dd className="mt-1 font-medium tabular-nums">{c.establishments.reduce((n, e) => n + (e.devices[0]?.count ?? 0), 0)}</dd></div>
              <div className="col-span-2 min-w-0"><dt className="text-xs text-muted-foreground">Plano</dt><dd className="mt-1 break-words">{c.plans?.name ?? "—"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Espaço Publicitário Plannet (%)</dt><dd className="mt-1 font-semibold tabular-nums text-primary">{c.plannet_reserved_percent}%</dd></div>
            </dl>
            <Button className="w-full" variant="outline" size="sm" onClick={() => setEditing(c)}><Pencil />Editar cadastro</Button>
          </article>)}
        </div>
      </QueryState>
    </section>
    {editing && <ClientForm client={editing === "new" ? null : editing} isAdmin={isAdmin} onClose={() => setEditing(null)}>{editing !== "new" && isAdmin && <Members clientId={editing.id} />}</ClientForm>}
  </div>;
}

function Members({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const q = useQuery(membersQuery(clientId));
  const [email, setEmail] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["client_members", clientId] });
  const add = useMutation({ mutationFn: () => addMemberByEmail(clientId, email), onSuccess: () => { setEmail(""); refresh(); toast.success("Usuário vinculado"); }, onError: (e) => toast.error(e.message.includes("duplicate") ? "Usuário já vinculado" : e.message) });
  const del = useMutation({ mutationFn: removeMember, onSuccess: refresh, onError: (e) => toast.error(e.message) });
  return (
    <section aria-labelledby="client-members-title" className="min-w-0 space-y-3 border-t bg-card p-4 sm:p-6">
      <h3 id="client-members-title" className="text-sm font-semibold">Usuários com acesso a este cliente</h3>
      {q.isLoading ? <p className="text-xs text-muted-foreground">Carregando…</p> : q.error ? <p className="break-words text-xs text-destructive">{q.error.message}</p> : !q.data?.length ? <p className="text-xs text-muted-foreground">Nenhum usuário vinculado.</p> :
        q.data.map((m) => <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm"><span className="min-w-0 break-words">{m.profile?.full_name} <span className="block text-xs text-muted-foreground">{m.profile?.email}</span></span><Button className="shrink-0" size="sm" variant="ghost" aria-label="Remover acesso" onClick={() => del.mutate(m.id)}><Trash2 /></Button></div>)}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1"><Field label="Vincular usuário por e-mail"><input type="email" placeholder="E-mail de uma conta já criada" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (email.trim()) add.mutate(); } }} className={inputCls} /></Field></div>
        <Button type="button" disabled={add.isPending || !email.trim()} onClick={() => add.mutate()}>Vincular</Button>
      </div>
    </section>
  );
}
