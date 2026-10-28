import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Field, PageHeader, Panel, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { campaigns } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/relatorios")({
  head: () => seo("Relatórios", "Gere relatórios de exibição, disponibilidade e campanhas."),
  component: Page,
});

const types = [
  { name: "Comprovante de exibição", desc: "Por campanha, com total de inserções por tela" },
  { name: "Disponibilidade da rede", desc: "Tempo online por tela e estabelecimento" },
  { name: "Horas de funcionamento", desc: "Ranking e totais por período" },
  { name: "Desempenho por região", desc: "Comparativo entre regiões" },
];
const recent = [
  { name: "Comprovante – Black Friday Bom Preço", date: "27/10/2026", fmt: "PDF" },
  { name: "Disponibilidade – Outubro (parcial)", date: "25/10/2026", fmt: "XLSX" },
  { name: "Horas de funcionamento – Setembro", date: "01/10/2026", fmt: "PDF" },
];

function Page() {
  return (
    <>
      <PageHeader title="Relatórios" description="Geração demonstrativa — arquivos reais virão com a integração." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {types.map((t) => (
            <button key={t.name} onClick={() => toast.success(`Relatório "${t.name}" em geração`)} className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40">
              <FileBarChart className="size-5 text-primary" /><div className="mt-3 font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
        <Panel title="Gerar personalizado">
          <div className="grid gap-3">
            <Field label="Campanha"><select className={selectCls}><option>Todas</option>{campaigns.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
            <Field label="Período"><select className={selectCls}><option>Últimos 7 dias</option><option>Últimos 30 dias</option><option>Este mês</option></select></Field>
            <Field label="Formato"><select className={selectCls}><option>PDF</option><option>XLSX</option><option>CSV</option></select></Field>
            <Button onClick={() => toast.success("Relatório na fila de geração")}><Download /> Gerar</Button>
          </div>
        </Panel>
        <Panel title="Gerados recentemente" className="lg:col-span-3">
          <ul className="divide-y">{recent.map((r) => (
            <li key={r.name} className="flex items-center gap-3 py-3 text-sm"><FileSpreadsheet className="size-4 text-muted-foreground" /><span className="flex-1">{r.name}</span><span className="text-xs text-muted-foreground">{r.date} · {r.fmt}</span>
              <Button size="sm" variant="outline" onClick={() => toast("Download disponível após integração")}><Download /></Button></li>
          ))}</ul>
        </Panel>
      </div>
    </>
  );
}
