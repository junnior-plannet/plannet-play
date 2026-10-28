import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, RectangleHorizontal, RectangleVertical, KeyRound, MonitorX } from "lucide-react";
import { toast } from "sonner";
import { DataTable, EmptyState, Field, FilterBar, PageHeader, StatusBadge, inputCls, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { devices as initial, playlists, venues } from "@/lib/mock";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/telas")({
  head: () => seo("Telas e Dispositivos", "Cadastre TVs, vincule a estabelecimentos e acompanhe status e sincronização."),
  component: Page,
});

const code = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

function Page() {
  const [list, setList] = useState(initial);
  const [filter, setFilter] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [orientation, setOrientation] = useState("16:9");
  const [activation, setActivation] = useState("PX7K2M");
  const shown = list.filter((d) => filter === "Todos" || d.status === filter);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setList([{ id: `TV-0${400 + list.length}`, name: String(f.get("name") || "Nova tela"), venue: String(f.get("venue")), orientation, status: "Sincronizando", sync: "agora", playlist: String(f.get("playlist")), hours: 0 }, ...list]);
    setOpen(false);
    toast.success("Dispositivo cadastrado", { description: `Código de ativação: ${activation}` });
  }

  return (
    <>
      <PageHeader title="Telas e Dispositivos" description="Gerencie as TVs da rede e seus vínculos."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setActivation(code()); }}>
            <DialogTrigger asChild><Button><Plus /> Cadastrar dispositivo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo dispositivo</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid gap-4">
                <Field label="Nome da tela"><input name="name" required placeholder="Ex.: Recepção" className={inputCls} /></Field>
                <Field label="Estabelecimento"><select name="venue" className={cn(selectCls, "bg-background")}>{venues.map((v) => <option key={v.id}>{v.name}</option>)}</select></Field>
                <Field label="Playlist atribuída"><select name="playlist" className={cn(selectCls, "bg-background")}>{playlists.map((p) => <option key={p.name}>{p.name}</option>)}</select></Field>
                <Field label="Orientação">
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: "16:9", l: "Horizontal 16:9", I: RectangleHorizontal }, { v: "9:16", l: "Vertical 9:16", I: RectangleVertical }].map(({ v, l, I }) => (
                      <button type="button" key={v} onClick={() => setOrientation(v)} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", orientation === v && "border-primary bg-primary/10 text-primary")}><I className="size-4" />{l}</button>
                    ))}
                  </div>
                </Field>
                <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
                  <KeyRound className="size-5 text-primary" />
                  <div><div className="text-xs text-muted-foreground">Código de ativação (demonstrativo)</div><div className="font-mono text-xl font-bold tracking-[0.3em]">{activation}</div></div>
                </div>
                <DialogFooter><Button type="submit">Salvar dispositivo</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />
      <FilterBar>
        {["Todos", "Online", "Offline", "Sincronizando"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s}</Button>
        ))}
      </FilterBar>
      {shown.length ? (
        <DataTable head={["ID", "Tela", "Estabelecimento", "Orientação", "Status", "Última sincronização", "Playlist"]}>
          {shown.map((d) => (
            <tr key={d.id}>
              <td className="font-mono text-xs text-muted-foreground">{d.id}</td>
              <td className="font-medium">{d.name}</td>
              <td>{d.venue}</td>
              <td><span className="inline-flex items-center gap-1.5 text-muted-foreground">{d.orientation === "16:9" ? <RectangleHorizontal className="size-4" /> : <RectangleVertical className="size-4" />}{d.orientation}</span></td>
              <td><StatusBadge status={d.status} /></td>
              <td className="text-muted-foreground">{d.sync}</td>
              <td>{d.playlist}</td>
            </tr>
          ))}
        </DataTable>
      ) : <EmptyState icon={MonitorX} title="Nenhuma tela encontrada" description="Não há dispositivos com esse status no momento." />}
    </>
  );
}
