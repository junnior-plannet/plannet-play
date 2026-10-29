import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { useMe } from "@/lib/auth";
import { addMemberByEmail, canEditReserve, clampReserve, clientsQuery, membersQuery, plansQuery, removeMember, saveClient, statusLabel, type RecordStatus, type ClientRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, DataTable, FilterBar, Field, inputCls, selectCls, StatusBadge } from "@/components/app/ui";
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

  return <>
    <PageHeader title="Clientes" description={isAdmin ? "Contas, planos e reserva Plannet · dados do banco" : "Sua conta Plannet Play"} actions={isAdmin && <Button onClick={() => setEditing("new")}><Plus />Novo Cliente</Button>} />
    <FilterBar>
      <input className={`${inputCls} max-w-xs`} placeholder="Pesquisar cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className={selectCls} aria-label="Status do cliente" value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select>
    </FilterBar>
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} emptyIcon={Users}
      emptyTitle={q.data?.length ? "Nenhum cliente corresponde aos filtros" : "Nenhum cliente cadastrado"}
      emptyDescription={isAdmin ? "Cadastre o primeiro cliente para começar." : "Sua conta ainda não foi vinculada a um cliente. Fale com a equipe Plannet."}
      emptyAction={isAdmin && !q.data?.length ? <Button onClick={() => setEditing("new")}><Plus />Novo Cliente</Button> : undefined}>
      <DataTable head={["Cliente", "Cidade / Região", "Estabelecimentos", "TVs", "Plano", "Status", "Reserva Plannet", ""]}>
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
    </QueryState>
    {editing && <ClientDialog client={editing === "new" ? null : editing} isAdmin={isAdmin} onClose={() => setEditing(null)} />}
  </>;
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
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{client ? client.name : "Novo Cliente"}</DialogTitle><DialogDescription>{isAdmin ? "Dados cadastrais, plano e reserva Plannet" : "Plano, status e reserva Plannet são definidos pela Plannet"}</DialogDescription></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <Field label="Nome do cliente"><input required name="name" defaultValue={client?.name} className={inputCls} /></Field>
          <Field label="CNPJ / CPF"><input name="document" defaultValue={client?.document ?? ""} className={inputCls} /></Field>
          <Field label="Responsável"><input name="contact_name" defaultValue={client?.contact_name ?? ""} className={inputCls} /></Field>
          <Field label="E-mail de contato"><input type="email" name="contact_email" defaultValue={client?.contact_email ?? ""} className={inputCls} /></Field>
          <Field label="Telefone"><input name="phone" defaultValue={client?.phone ?? ""} className={inputCls} /></Field>
          <Field label="Cidade"><input name="city" defaultValue={client?.city ?? ""} className={inputCls} /></Field>
          <Field label="Região"><input name="region" defaultValue={client?.region ?? ""} className={inputCls} /></Field>
          <Field label="Status"><select name="status" disabled={!isAdmin} defaultValue={client?.status ?? "ativo"} className={selectCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
          <Field label="Plano contratado"><select name="plan_id" disabled={!isAdmin} defaultValue={client?.plan_id ?? ""} className={selectCls}><option value="">Sem plano</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Reserva Plannet (%)"><input type="number" min={0} max={100} value={reserve} disabled={!reserveEditable} onChange={(e) => setReserve(clampReserve(Number(e.target.value)))} className={inputCls} /></Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">{100 - reserve}% da programação para o cliente · {reserve}% reservado à Plannet{!reserveEditable && " · somente o administrador altera"}</p>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar cliente"}</Button></div>
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
    <div className="mt-2 space-y-3 border-t pt-4">
      <div className="text-sm font-medium">Usuários com acesso a este cliente</div>
      {q.isLoading ? <p className="text-xs text-muted-foreground">Carregando…</p> : q.error ? <p className="text-xs text-destructive">{q.error.message}</p> : !q.data?.length ? <p className="text-xs text-muted-foreground">Nenhum usuário vinculado.</p> :
        q.data.map((m) => <div key={m.id} className="flex items-center justify-between text-sm"><span>{m.profile?.full_name} <span className="text-xs text-muted-foreground">{m.profile?.email}</span></span><Button size="sm" variant="ghost" aria-label="Remover acesso" onClick={() => del.mutate(m.id)}><Trash2 /></Button></div>)}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <input type="email" required placeholder="E-mail de uma conta já criada" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <Button type="submit" disabled={add.isPending}>Vincular</Button>
      </form>
    </div>
  );
}
