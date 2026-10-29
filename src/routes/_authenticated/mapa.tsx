import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusBadge } from "@/components/app/ui";
import { devices } from "@/lib/mock";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/_authenticated/mapa')({
  head: () => seo("Mapa da Rede", "Visualização geográfica das telas e seu status."),
  component: Page,
});

const pins = devices.map((d, i) => ({ ...d, x: [22, 58, 35, 70, 48, 80, 15][i], y: [30, 62, 55, 25, 78, 45, 70][i] }));

function Page() {
  const [sel, setSel] = useState(pins[0]!);
  return (
    <>
      <PageHeader title="Mapa da Rede" description="Mapa demonstrativo — integração com serviço de mapas prevista." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-card lg:col-span-2"
          style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
          {pins.map((p) => (
            <button key={p.id} onClick={() => setSel(p)} style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-label={p.name}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 transition-transform hover:scale-125",
                p.status === "Online" ? "bg-success ring-success/20" : p.status === "Offline" ? "bg-destructive ring-destructive/20" : "bg-primary ring-primary/20",
                sel.id === p.id ? "size-5 shadow-glow" : "size-3.5")} />
          ))}
          <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg border bg-background/80 px-3 py-2 text-xs backdrop-blur">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-success" />Online</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-destructive" />Offline</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Sincronizando</span>
          </div>
        </div>
        <Panel title="Dispositivo selecionado">
          <dl className="space-y-3 text-sm">
            {[["ID", sel.id], ["Tela", sel.name], ["Estabelecimento", sel.venue], ["Orientação", sel.orientation], ["Playlist", sel.playlist], ["Última sincronização", sel.sync]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={sel.status} /></dd></div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
