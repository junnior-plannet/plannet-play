import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { DataTable, EmptyState, FilterBar, PageHeader, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { venues } from "@/lib/mock";
import { seo } from "@/lib/seo";
import { useDemo } from "@/components/v2/DemoProvider";

export const Route = createFileRoute("/estabelecimentos")({
  head: () => seo("Estabelecimentos", "Pontos da rede com telas instaladas, por cidade, bairro e região."),
  component: Page,
});

function Page() {
  const demo = useDemo();
  const venues = demo.venues.filter(v=>demo.role==='admin'||demo.clientFor(v.name)?.id===demo.clientId);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const list = venues.filter((v) => v.name.toLowerCase().includes(q.toLowerCase()) && (!region || v.region === region));
  return (
    <>
      <PageHeader title="Estabelecimentos" description={`${venues.length} pontos cadastrados na rede.`}
        actions={<Button onClick={() => toast.info("Formulário de cadastro disponível na próxima etapa")}><Plus /> Novo estabelecimento</Button>} />
      <FilterBar>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className={`${selectCls} pl-9`} /></div>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectCls}>
          <option value="">Todas as regiões</option>{[...new Set(venues.map((v) => v.region))].map((r) => <option key={r}>{r}</option>)}
        </select>
      </FilterBar>
      {list.length ? (
        <DataTable head={["Código", "Nome", "Segmento", "Cidade", "Bairro", "Região", "Telas", "Disponibilidade"]}>
          {list.map((v) => (
            <tr key={v.id}>
              <td className="font-mono text-xs text-muted-foreground">{v.id}</td><td className="font-medium">{v.name}</td><td>{v.type}</td>
              <td>{v.city}</td><td>{v.district}</td><td>{v.region}</td><td>{demo.devices.filter(tv=>tv.venue===v.name).length}</td>
              <td className={v.uptime > 97 ? "text-success" : v.uptime > 93 ? "text-warning" : "text-destructive"}>{v.uptime}%</td>
            </tr>
          ))}
        </DataTable>
      ) : <EmptyState icon={Store} title="Nenhum estabelecimento encontrado" description="Ajuste a busca ou os filtros." />}
    </>
  );
}
