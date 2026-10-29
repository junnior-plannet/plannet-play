import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Store, Pencil } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { useMe } from "@/lib/auth";
import { clientsQuery, establishmentsQuery, saveEstablishment, statusLabel, type EstablishmentRow, type RecordStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, DataTable, FilterBar, Field, inputCls, selectCls, StatusBadge } from "@/components/app/ui";
import { QueryState } from "@/components/app/QueryState";

export const Route = createFileRoute("/_authenticated/estabelecimentos")({
  head: () => seo("Estabelecimentos", "Cadastro de estabelecimentos dos clientes, com endereço, região e TVs instaladas."),
  component: Page,
});

function Page() {
  const { data: me } = useMe();
  const q = useQuery(establishmentsQuery);
  const clients = useQuery(clientsQuery);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("todos");
  const [editing, setEditing] = useState<EstablishmentRow | "new" | null>(null);
  const canCreate = !!me?.isAdmin || (clients.data?.length ?? 0) > 0;
  const rows = (q.data ?? []).filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) && (clientId === "todos" || e.client_id === clientId));

  return <>
    <PageHeader title="Estabelecimentos" description="Pontos com TVs instaladas · dados do banco" actions={canCreate && <Button onClick={() => setEditing("new")}><Plus />Novo Estabelecimento</Button>} />
    <FilterBar>
      <input className={`${inputCls} max-w-xs`} placeholder="Pesquisar estabelecimento" value={search} onChange={(e) => setSearch(e.target.value)} />
      {(clients.data?.length ?? 0) > 1 && <select className={selectCls} aria-label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="todos">Todos os clientes</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
    </FilterBar>
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} emptyIcon={Store}
      emptyTitle={q.data?.length ? "Nenhum estabelecimento corresponde aos filtros" : "Nenhum estabelecimento cadastrado"}
      emptyDescription={canCreate ? "Cadastre um estabelecimento para vincular TVs." : "Sua conta ainda não está vinculada a um cliente."}
      emptyAction={canCreate && !q.data?.length ? <Button onClick={() => setEditing("new")}><Plus />Novo Estabelecimento</Button> : undefined}>
      <DataTable head={["Estabelecimento", "Cliente", "Tipo", "Bairro / Cidade", "Região", "TVs", "Status", ""]}>
        {rows.map((e) => <tr key={e.id}>
          <td className="font-medium">{e.name}<div className="text-xs text-muted-foreground">{e.address}</div></td>
          <td>{e.clients?.name}</td>
          <td>{e.type ?? "—"}</td>
          <td>{[e.district, e.city].filter(Boolean).join(" / ") || "—"}</td>
          <td>{e.region ?? "—"}</td>
          <td>{e.devices[0]?.count ?? 0}</td>
          <td><StatusBadge status={statusLabel[e.status]} /></td>
          <td><Button variant="outline" size="sm" onClick={() => setEditing(e)}><Pencil />Editar</Button></td>
        </tr>)}
      </DataTable>
    </QueryState>
    {editing && <EstDialog est={editing === "new" ? null : editing} clients={clients.data ?? []} onClose={() => setEditing(null)} />}
  </>;
}

function EstDialog({ est, clients, onClose }: { est: EstablishmentRow | null; clients: { id: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (f: FormData) => {
      const s = (k: string) => String(f.get(k) ?? "").trim() || null;
      return saveEstablishment(est?.id ?? null, { client_id: String(f.get("client_id")), name: String(f.get("name")).trim(), type: s("type"), address: s("address"), district: s("district"), city: s("city"), region: s("region"), status: String(f.get("status")) as RecordStatus });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["establishments"] }); qc.invalidateQueries({ queryKey: ["clients"] }); toast.success(est ? "Estabelecimento atualizado" : "Estabelecimento cadastrado"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{est ? est.name : "Novo Estabelecimento"}</DialogTitle><DialogDescription>Vinculado a um cliente</DialogDescription></DialogHeader>
        {!clients.length ? <p className="text-sm text-muted-foreground">Cadastre um cliente antes de criar estabelecimentos.</p> :
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <Field label="Cliente"><select name="client_id" required defaultValue={est?.client_id ?? clients[0]?.id} className={selectCls}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Nome"><input name="name" required defaultValue={est?.name} className={inputCls} /></Field>
          <Field label="Tipo"><input name="type" placeholder="Restaurante, academia…" defaultValue={est?.type ?? ""} className={inputCls} /></Field>
          <Field label="Endereço"><input name="address" defaultValue={est?.address ?? ""} className={inputCls} /></Field>
          <Field label="Bairro"><input name="district" defaultValue={est?.district ?? ""} className={inputCls} /></Field>
          <Field label="Cidade"><input name="city" defaultValue={est?.city ?? ""} className={inputCls} /></Field>
          <Field label="Região"><input name="region" defaultValue={est?.region ?? ""} className={inputCls} /></Field>
          <Field label="Status"><select name="status" defaultValue={est?.status ?? "ativo"} className={selectCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
