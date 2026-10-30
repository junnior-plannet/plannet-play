import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tv, Pencil, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { activationLabel, clientsQuery, devicesQuery, establishmentsQuery, orientationLabel, saveDevice, type Activation, type DeviceRow, type Orientation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, DataTable, FilterBar, Field, inputCls, selectCls } from "@/components/app/ui";
import { defaultEstablishment } from "@/lib/client-form";
import { QueryState } from "@/components/app/QueryState";

export const Route = createFileRoute("/_authenticated/telas")({
  head: () => seo("Dispositivos", "Gerenciamento das TVs dos clientes, identificação, orientação e situação de ativação."),
  validateSearch: (search: Record<string, unknown>): { establishment?: string | undefined; client?: string | undefined } => ({ establishment: typeof search["establishment"] === "string" ? search["establishment"] : undefined, client: typeof search["client"] === "string" ? search["client"] : undefined }),
  component: Page,
});

const activationVariant: Record<Activation, "success" | "warning" | "danger" | "secondary"> = { ativa: "success", pendente: "warning", bloqueada: "danger", inativa: "secondary" };

function Page() {
  const { establishment, client } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery(devicesQuery);
  const ests = useQuery(establishmentsQuery);
  const clients = useQuery(clientsQuery);
  const selectedClient = client ?? ests.data?.find((e) => e.id === establishment)?.client_id;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [editing, setEditing] = useState<DeviceRow | "new" | null>(null);
  const canCreate = !!clients.data?.some((c) => ests.data?.some((e) => e.client_id === c.id));
  const rows = (q.data ?? []).filter((d) => `${d.name} ${d.device_code}`.toLowerCase().includes(search.toLowerCase()) && (status === "todos" || d.activation_status === status) && (!selectedClient || d.establishments?.client_id === selectedClient));

  return <>
    <PageHeader title="Dispositivos" description="TVs e situação de ativação por cliente" actions={canCreate && <Button onClick={() => setEditing("new")}><Plus />Nova TV</Button>} />
    <FilterBar>
      <select aria-label="Filtrar cliente" className={selectCls} value={selectedClient ?? ""} onChange={(e) => void navigate({ search: { client: e.target.value || undefined } })}><option value="">Todos os clientes</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input className={`${inputCls} max-w-xs`} placeholder="Pesquisar por nome ou código" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className={selectCls} aria-label="Status de ativação" value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos os status</option>{Object.entries(activationLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    </FilterBar>
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} emptyIcon={Tv}
      emptyTitle={q.data?.length ? "Nenhuma TV corresponde aos filtros" : "Nenhuma TV cadastrada"}
      emptyDescription={canCreate ? "Cadastre uma TV vinculada ao cliente." : "Cadastre um cliente antes de adicionar TVs."}
      emptyAction={canCreate && !q.data?.length ? <Button onClick={() => setEditing("new")}><Plus />Nova TV</Button> : undefined}>
      <DataTable head={["TV", "Código do dispositivo", "Cliente", "Orientação", "Situação", ""]}>
        {rows.map((d) => <tr key={d.id}>
          <td className="font-medium">{d.name}<div className="text-xs text-muted-foreground">{[d.model, d.location_note].filter(Boolean).join(" · ")}</div></td>
          <td className="font-mono text-xs">{d.device_code}</td>
          <td>{d.establishments?.clients?.name}</td>
          <td><span className="inline-flex items-center gap-1.5"><MonitorSmartphone className={`size-3.5 ${d.orientation === "vertical" ? "" : "rotate-90"}`} />{orientationLabel[d.orientation]}</span></td>
          <td><Badge variant={activationVariant[d.activation_status]}>{activationLabel[d.activation_status]}</Badge></td>
          <td><Button variant="outline" size="sm" onClick={() => setEditing(d)}><Pencil />Editar</Button></td>
        </tr>)}
      </DataTable>
    </QueryState>
    {editing && <DeviceDialog device={editing === "new" ? null : editing} ests={ests.data ?? []} clients={clients.data ?? []} defaultClientId={selectedClient} onClose={() => setEditing(null)} />}
  </>;
}

function DeviceDialog({ device, ests, clients, defaultClientId, onClose }: { defaultClientId?: string | undefined; device: DeviceRow | null; ests: import("@/lib/api").EstablishmentRow[]; clients: { id: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState(device?.establishments?.client_id ?? defaultClientId ?? clients.find((c) => ests.some((e) => e.client_id === c.id))?.id ?? "");
  const save = useMutation({
    mutationFn: (f: FormData) => {
      const s = (k: string) => String(f.get(k) ?? "").trim() || null;
      const activation = String(f.get("activation_status")) as Activation;
      const code = s("device_code");
      const client = clients.find((c) => c.id === clientId);
      const target = client ? defaultEstablishment(clientId, client.name, ests) : undefined;
      const establishmentId = device?.establishment_id ?? target?.id;
      if (!establishmentId) throw new Error("Não foi possível confirmar o vínculo do cliente. Atualize o cadastro de Clientes.");
      return saveDevice(device?.id ?? null, {
        establishment_id: establishmentId, name: String(f.get("name")).trim(),
        ...(code ? { device_code: code.toUpperCase() } : {}),
        serial_number: s("serial_number"), model: s("model"), location_note: s("location_note"),
        orientation: String(f.get("orientation")) as Orientation, activation_status: activation,
        activated_at: activation === "ativa" ? (device?.activated_at ?? new Date().toISOString()) : device?.activated_at ?? null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["devices"] }); qc.invalidateQueries({ queryKey: ["establishments"] }); qc.invalidateQueries({ queryKey: ["clients"] }); toast.success(device ? "TV atualizada" : "TV cadastrada"); onClose(); },
    onError: (e) => toast.error(e.message.includes("device_code") ? "Este código de dispositivo já está em uso" : e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{device ? device.name : "Nova TV"}</DialogTitle><DialogDescription>Identificação, orientação e ativação do dispositivo</DialogDescription></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }}>
          <Field label="Cliente"><select aria-label="Cliente" required disabled={!!device} value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectCls}>{clients.filter((c) => ests.some((e) => e.client_id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Nome da TV"><input name="name" required placeholder="TV Balcão" defaultValue={device?.name} className={inputCls} /></Field>
          <Field label="Código do dispositivo"><input name="device_code" placeholder="Gerado automaticamente" defaultValue={device?.device_code ?? ""} className={`${inputCls} font-mono uppercase`} /></Field>
          <Field label="Número de série"><input name="serial_number" defaultValue={device?.serial_number ?? ""} className={inputCls} /></Field>
          <Field label="Modelo"><input name="model" defaultValue={device?.model ?? ""} className={inputCls} /></Field>
          <Field label="Local da instalação"><input name="location_note" placeholder="Parede do caixa" defaultValue={device?.location_note ?? ""} className={inputCls} /></Field>
          <Field label="Orientação"><select name="orientation" defaultValue={device?.orientation ?? "horizontal"} className={selectCls}><option value="horizontal">Horizontal (16:9)</option><option value="vertical">Vertical (9:16)</option></select></Field>
          <Field label="Status de ativação"><select name="activation_status" defaultValue={device?.activation_status ?? "pendente"} className={selectCls}>{Object.entries(activationLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar TV"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
