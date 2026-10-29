import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History } from "lucide-react";
import { DataTable, EmptyState, FilterBar, PageHeader, selectCls } from "@/components/app/ui";
import { devices, media } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/historico')({
  head: () => seo("Histórico de Exibições", "Registro de cada conteúdo exibido por tela e horário."),
  component: Page,
});

const rows = Array.from({ length: 14 }, (_, i) => ({
  time: `28/10 ${String(18 - Math.floor(i / 3)).padStart(2, "0")}:${String(59 - ((i * 7) % 60)).padStart(2, "0")}`,
  device: devices[i % devices.length]!, media: media[i % media.length]!,
}));

function Page() {
  const [dev, setDev] = useState("");
  const list = rows.filter((r) => !dev || r.device.id === dev);
  return (
    <>
      <PageHeader title="Histórico de Exibições" description="Registros demonstrativos de reprodução." />
      <FilterBar>
        <input type="date" className={selectCls} defaultValue="2026-10-28" />
        <select value={dev} onChange={(e) => setDev(e.target.value)} className={selectCls}><option value="">Todas as telas</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}</select>
      </FilterBar>
      {list.length ? (
        <DataTable head={["Data/hora", "Tela", "Estabelecimento", "Conteúdo", "Categoria", "Duração"]}>
          {list.map((r, i) => (
            <tr key={i}><td className="font-mono text-xs">{r.time}</td><td>{r.device.id}</td><td>{r.device.venue}</td><td>{r.media.name}</td><td className="text-muted-foreground">{r.media.tag}</td><td>{r.media.duration}</td></tr>
          ))}
        </DataTable>
      ) : <EmptyState icon={History} title="Sem registros" description="Nenhuma exibição registrada para este filtro." />}
    </>
  );
}
