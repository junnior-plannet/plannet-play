import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tv, Pencil, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { activationLabel, devicesQuery, establishmentsQuery, orientationLabel, saveDevice, type Activation, type DeviceRow, type Orientation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, DataTable, FilterBar, Field, inputCls, selectCls } from "@/components/app/ui";
import { QueryState } from "@/components/app/QueryState";

export const Route = createFileRoute("/_authenticated/telas")({
  head: () => seo("Telas", "Cadastro de TVs com identificação do dispositivo, orientação e status de ativação."),
  component: Page,
});

const activationVariant: Record<Activation, "success" | "warning" | "danger" | "secondary"> = { ativa: "success", pendente: "warning", bloqueada: "danger", inativa: "secondary" };

function Page() {
  const q = useQuery(devicesQuery);
  const ests = useQuery(establishmentsQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [editing, setEditing] = useState<DeviceRow | "new" | null>(null);
  const canCreate = (ests.data?.length ?? 0) > 0;
  const rows = (q.data ?? []).filter((d) => `${d.name} ${d.device_code}`.toLowerCase().includes(search.toLowerCase()) && (status === "todos" || d.activation_status === status));

  return <>
    <PageHeader title="Telas" description="TVs cadastradas na rede · dados do banco (sem comunicação real com as TVs nesta etapa)" actions={canCreate && <Button onClick={() => setEditing("new")}><Plus />Nova TV</Button>} />
    <FilterBar>
      <input className={`${inputCls} max-w-xs`} placeholder="Pesquisar por nome ou código" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className={selectCls} aria-label="Status de ativação" value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos os status</option>{Object.entries(activationLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    </FilterBar>
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} emptyIcon={Tv}
      emptyTitle={q.data?.length ? "Nenhuma TV corresponde aos filtros" : "Nenhuma TV cadastrada"}
      emptyDescription={canCreate ? "Cadastre uma TV em um dos seus estabelecimentos." : "Cadastre um estabelecimento antes de adicionar TVs."}
      emptyAction={canCreate && !q.data?.length ? <Button onClick={() => setEditing("new")}><Plus />Nova TV</Button> : undefined}>
      <DataTable head={["TV", "Código do dispositivo", "Estabelecimento", "Cliente", "Orientação", "Ativação", ""]}>
        {rows.map((d) => <tr key={d.id}>
          <td className="font-medium">{d.name}<div className="text-xs text-muted-foreground">{[d.model, d.location_note].filter(Boolean).join(" · ")}</div></td>
          <td className="font-mono text-xs">{d.device_code}</td>
          <td>{d.establishments?.name}</td>
          <td>{d.establishments?.clients?.name}</td>
          <td><span className="inline-flex items-center gap-1.5"><MonitorSmartphone className={`size-3.5 ${d.orientation === "vertical" ? "" : "rotate-90"}`} />{orientationLabel[d.orientation]}</span></td>
          <td><Badge variant={activationVariant[d.activation_status]}>{activationLabel[d.activation_status]}</Badge></td>
          <td><Button variant="outline" size="sm" onClick={() => setEditing(d)}><Pencil />Editar</Button></td>
        </tr>)}
      </DataTable>
    </QueryState>
    {editing && <DeviceDialog device={editing === "new" ? null : editing} ests={ests.data ?? []} onClose={() => setEditing(null)} />}
  </>;
}

function DeviceDialog({ device, ests, onClose }: { device: DeviceRow | null; ests: { id: string; name: string; clients: { name: string } | null }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (f: FormData) => {
      const s = (k: string) => String(f.get(k) ?? "").trim() || null;
      const activation = String(f.get("activation_status")) as Activation;
      const code = s("device_code");
      return saveDevice(device?.id ?? null, {
        establishment_id: String(f.get("establishment_id")), name: String(f.get("name")).trim(),
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
          <Field label="Estabelecimento"><select name="establishment_id" required defaultValue={device?.establishment_id ?? ests[0]?.id} className={selectCls}>{ests.map((e) => <option key={e.id} value={e.id}>{e.name}{e.clients ? ` · ${e.clients.name}` : ""}</option>)}</select></Field>
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
