import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Pencil, Trash2, Search, Building2, Tv } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { useMe } from "@/lib/auth";
import { addMemberByEmail, canEditReserve, clampReserve, clientsQuery, membersQuery, plansQuery, removeMember, saveClient, statusLabel, type RecordStatus, type ClientRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, DataTable, Field, inputCls, selectCls, StatusBadge } from "@/components/app/ui";
import { QueryState } from "@/components/app/QueryState";

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
        <div className="hidden min-w-0 lg:block [&_th:nth-child(7)]:max-w-48 [&_th:nth-child(7)]:whitespace-normal [&_td:nth-child(7)]:font-medium [&_td:nth-child(7)]:tabular-nums [&_td:nth-child(7)]:text-primary">
          <DataTable head={["Cliente", "Cidade / Região", "Estabelecimentos", "TVs", "Plano", "Status", "Espaço Publicitário Plannet (%)", ""]}>
            {rows.map((c) => <tr key={c.id}>
              <td className="font-medium">{c.name}<div className="text-xs text-muted-foreground">{c.contact_email}</div></td>
              <td>{[c.city, c.region].filter(Boolean).join(" / ") || "—"}</td>
              <td>{c.establishments.length}</td>
              <td>{c.establishments.reduce((n, e) => n + (e.devices[0]?.count ?? 0), 0)}</td>
              <td>{c.plans?.name ?? "—"}</td>
              <td><StatusBadge status={statusLabel[c.status]} /></td>
              <td>{c.plannet_reserved_percent}%</td>
              <td><Button variant="outline" size="sm" onClick={() => setEditing(c)}><Pencil />Editar</Button></td>
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
              <div className="col-span-2 min-w-0"><dt className="text-xs text-muted-foreground">Cidade / Região</dt><dd className="mt-1 break-words">{[c.city, c.region].filter(Boolean).join(" / ") || "—"}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="size-3.5" aria-hidden="true" />Estabelecimentos</dt><dd className="mt-1 font-medium tabular-nums">{c.establishments.length}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Tv className="size-3.5" aria-hidden="true" />TVs</dt><dd className="mt-1 font-medium tabular-nums">{c.establishments.reduce((n, e) => n + (e.devices[0]?.count ?? 0), 0)}</dd></div>
              <div className="col-span-2 min-w-0"><dt className="text-xs text-muted-foreground">Plano</dt><dd className="mt-1 break-words">{c.plans?.name ?? "—"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Espaço Publicitário Plannet (%)</dt><dd className="mt-1 font-semibold tabular-nums text-primary">{c.plannet_reserved_percent}%</dd></div>
            </dl>
            <Button className="w-full" variant="outline" size="sm" onClick={() => setEditing(c)}><Pencil />Editar</Button>
          </article>)}
        </div>
      </QueryState>
    </section>
    {editing && <ClientDialog client={editing === "new" ? null : editing} isAdmin={isAdmin} onClose={() => setEditing(null)} />}
  </div>;
}

function ClientDialog({ client, isAdmin, onClose }: { client: ClientRow | null; isAdmin: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const plans = useQuery(plansQuery);
  const [reserve, setReserve] = useState(client?.plannet_reserved_percent ?? 20);
  const save = useMutation({
    mutationFn: (f: FormData) => {
      const s = (k: string) => String(f.get(k) ?? "").trim() || null;
      const base = { name: String(f.get("name")).trim(), document: s("document"), contact_name: s("contact_name"), contact_email: s("contact_email"), phone: s("phone"), city: s("city"), region: s("region") };
      const adminFields = isAdmin ? { status: String(f.get("status")) as RecordStatus, plan_id: s("plan_id"), plannet_reserved_percent: clampReserve(reserve) } : {};
      return saveClient(client?.id ?? null, { ...base, ...adminFields });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success(client ? "Cliente atualizado" : "Cliente cadastrado"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const reserveEditable = canEditReserve(isAdmin);
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl gap-0 overflow-y-auto rounded-xl p-0">
        <DialogHeader className="min-w-0 border-b bg-card p-4 pr-10 text-left sm:p-6 sm:pr-12">
          <DialogTitle className="break-words leading-snug">{client ? client.name : "Novo Cliente"}</DialogTitle>
          <DialogDescription>{isAdmin ? "Dados cadastrais, plano e espaço publicitário Plannet" : "Plano, status e espaço publicitário Plannet são definidos pela Plannet"}</DialogDescription>
        </DialogHeader>
        <form className="min-w-0 space-y-6 p-4 sm:p-6 [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:w-full [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-60 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-60" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <fieldset className="min-w-0 space-y-3">
            <legend className="mb-1 text-sm font-semibold">Dados cadastrais</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do cliente"><input required name="name" defaultValue={client?.name} className={inputCls} /></Field>
              <Field label="CNPJ / CPF"><input name="document" defaultValue={client?.document ?? ""} className={inputCls} /></Field>
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-3 border-t pt-4">
            <legend className="pr-2 text-sm font-semibold">Contato</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Responsável"><input name="contact_name" defaultValue={client?.contact_name ?? ""} className={inputCls} /></Field>
              <Field label="E-mail de contato"><input type="email" name="contact_email" defaultValue={client?.contact_email ?? ""} className={inputCls} /></Field>
              <Field label="Telefone"><input name="phone" defaultValue={client?.phone ?? ""} className={inputCls} /></Field>
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-3 border-t pt-4">
            <legend className="pr-2 text-sm font-semibold">Localização</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cidade"><input name="city" defaultValue={client?.city ?? ""} className={inputCls} /></Field>
              <Field label="Região"><input name="region" defaultValue={client?.region ?? ""} className={inputCls} /></Field>
            </div>
          </fieldset>
          <fieldset className="min-w-0 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <legend className="px-2 text-sm font-semibold">Plano e espaço publicitário</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status"><select name="status" disabled={!isAdmin} defaultValue={client?.status ?? "ativo"} className={selectCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
              <Field label="Plano contratado"><select name="plan_id" disabled={!isAdmin} defaultValue={client?.plan_id ?? ""} className={selectCls}><option value="">Sem plano</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <div className="sm:col-span-2"><Field label="Espaço Publicitário Plannet (%)"><input type="number" min={0} max={100} value={reserve} disabled={!reserveEditable} onChange={(e) => setReserve(clampReserve(Number(e.target.value)))} className={inputCls} /></Field></div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{100 - reserve}% da programação para o cliente · {reserve}% reservado à Plannet{!reserveEditable && " · somente o administrador altera"}</p>
          </fieldset>
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar cliente"}</Button></div>
        </form>
        {client && isAdmin && <Members clientId={client.id} />}
      </DialogContent>
    </Dialog>
  );
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
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <div className="min-w-0 flex-1"><Field label="Vincular usuário por e-mail"><input type="email" required placeholder="E-mail de uma conta já criada" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field></div>
        <Button type="submit" disabled={add.isPending}>Vincular</Button>
      </form>
    </section>
  );
}
