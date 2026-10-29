import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, PageHeader, Panel, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { seo } from "@/lib/seo";
import { useDemo } from "@/components/v2/DemoProvider";
import { DistributionDialog } from "@/components/v2/DistributionDialog";

export const Route = createFileRoute('/_authenticated/programacao')({
  head: () => seo("Programação Inteligente", "Distribua conteúdos por região, dispositivo e categoria."),
  component: Page,
});

const cats = [
  { key: "Publicidade", color: "bg-primary" },
  { key: "Notícias", color: "bg-success" },
  { key: "Entretenimento", color: "bg-warning" },
  { key: "Informações úteis", color: "bg-chart-4" },
];
const slots = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

function Page() {
  const demo = useDemo();
  const devices = demo.visibleDevices;
  const playlists = demo.visiblePlaylists;
  const regions = [...new Set(devices.map(tv=>demo.clientFor(tv.venue)?.region))].map(name=>({name}));
  const [playlistId, setPlaylistId] = useState('');
  const [publish, setPublish] = useState(false);
  const selected = playlists.find(p=>p.id===playlistId) ?? playlists[0];
  const [mix, setMix] = useState<Record<string, number>>({ Publicidade: 40, "Notícias": 25, Entretenimento: 20, "Informações úteis": 15 });
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader title="Programação Inteligente" description="Defina o que cada região e dispositivo exibe ao longo do dia."
        actions={<Button disabled={total !== 100 || !selected?.items.length} onClick={() => setPublish(true)}>Publicar programação</Button>} />
      <div className="mb-4"><Field label="Playlist do editor visual"><select aria-label="Playlist da programação" className={selectCls} value={selected?.id??''} onChange={e=>setPlaylistId(e.target.value)}>{playlists.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Segmentação">
          <div className="grid gap-4">
            <Field label="Região"><select className={selectCls}><option>Todas as regiões</option>{regions.map((r) => <option key={r.name}>{r.name}</option>)}</select></Field>
            <Field label="Dispositivos"><select className={selectCls}><option>Todos da região</option>{devices.map((d) => <option key={d.id}>{d.id} · {d.name}</option>)}</select></Field>
            <Field label="Dias"><div className="flex flex-wrap gap-1.5">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <span key={d} className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary">{d}</span>)}</div></Field>
          </div>
        </Panel>
        <Panel title="Distribuição de conteúdo" description={total === 100 ? "Total: 100%" : `Total: ${total}% — ajuste para 100%`} className="lg:col-span-2">
          <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-muted">
            {cats.map((c) => <div key={c.key} className={c.color} style={{ width: `${((mix[c.key] ?? 0) / Math.max(total, 100)) * 100}%` }} />)}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {cats.map((c) => (
              <div key={c.key}>
                <div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2"><i className={`size-2 rounded-full ${c.color}`} />{c.key}</span><span className="font-medium">{mix[c.key]}%</span></div>
                <Slider value={[mix[c.key] ?? 0]} max={100} step={5} onValueChange={([v]) => setMix({ ...mix, [c.key]: v ?? 0 })} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Pré-visualização da grade" className="lg:col-span-3">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {slots.map((s, i) => (
              <div key={s} className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">{s}</div>
                <div className="mt-1 text-sm font-medium">{playlists[i % Math.max(1,playlists.length)]?.name ?? 'Sem playlist'}</div>
                <div className="mt-2 h-1 rounded-full bg-gradient-primary" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {selected && <DistributionDialog key={selected.id} playlist={selected} open={publish} onOpenChange={setPublish} />}
    </>
  );
}
