import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { FilterBar, PageHeader, Panel, chartTooltip, selectCls } from "@/components/app/ui";
import { Progress } from "@/components/ui/progress";
import { campaigns, devices, hourlyActivity, regions, venues } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/inteligencia')({
  head: () => seo("Central de Inteligência", "Análises de desempenho por região, telas, horários e campanhas."),
  component: Page,
});

const axis = { tick: { fill: "var(--muted-foreground)", fontSize: 11 }, axisLine: false, tickLine: false };

function Page() {
  const regionData = regions.map((r) => ({ name: r.name, disponibilidade: +((r.online / r.screens) * 100).toFixed(1), telas: r.screens }));
  const campData = campaigns.filter((c) => c.plays).map((c) => ({ name: c.name.split(" ").slice(0, 2).join(" "), Sul: Math.round(c.plays * 0.38), Centro: Math.round(c.plays * 0.27), Oeste: Math.round(c.plays * 0.2), Outras: Math.round(c.plays * 0.15) }));
  const ranking = [...devices].sort((a, b) => b.hours - a.hours);
  return (
    <>
      <PageHeader title="Central de Inteligência" description="Desempenho operacional da rede e distribuição de exibições." />
      <FilterBar>
        <input type="date" className={selectCls} defaultValue="2026-10-01" />
        <input type="date" className={selectCls} defaultValue="2026-10-28" />
        <select className={selectCls}><option>Todas as cidades</option><option>São Paulo</option><option>Campinas</option></select>
        <select className={selectCls}><option>Todos os bairros</option>{venues.map((v) => <option key={v.id}>{v.district}</option>)}</select>
        <select className={selectCls}><option>Todos os estabelecimentos</option>{venues.map((v) => <option key={v.id}>{v.name}</option>)}</select>
      </FilterBar>
      <div className="mb-4 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p><strong>Atividade das telas ≠ audiência real.</strong> <span className="text-muted-foreground">Os números abaixo indicam quando as telas estavam ligadas e exibindo conteúdo. A medição de audiência (pessoas impactadas) exige sensores ou câmeras e será integrada em etapa futura.</span></p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Desempenho por região" description="Disponibilidade (%)">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionData}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[80, 100]} {...axis} />
            <Tooltip {...chartTooltip} /><Bar dataKey="disponibilidade" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Horários de maior atividade" description="Telas ativas · atividade operacional">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourlyActivity}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="hora" interval={3} {...axis} /><YAxis {...axis} />
            <Tooltip {...chartTooltip} /><Bar dataKey="telas" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Ranking de telas por horas de funcionamento">
          <ol className="space-y-3">
            {ranking.map((d, i) => (
              <li key={d.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between"><span className="truncate">{d.name} · <span className="text-muted-foreground">{d.venue}</span></span><span className="font-medium">{d.hours} h</span></div>
                  <Progress value={(d.hours / 360) * 100} className="mt-1.5 h-1.5" />
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Disponibilidade por estabelecimento">
          <ul className="space-y-3">
            {venues.map((v) => (
              <li key={v.id} className="text-sm">
                <div className="flex justify-between"><span>{v.name}</span><span className={v.uptime > 97 ? "text-success" : v.uptime > 93 ? "text-warning" : "text-destructive"}>{v.uptime}%</span></div>
                <Progress value={v.uptime} className="mt-1.5 h-1.5" />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Exibições por campanha e região" className="lg:col-span-2">
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={campData}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} />
            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Sul" stackId="a" fill="var(--chart-1)" /><Bar dataKey="Centro" stackId="a" fill="var(--chart-2)" />
            <Bar dataKey="Oeste" stackId="a" fill="var(--chart-3)" /><Bar dataKey="Outras" stackId="a" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
      </div>
    </>
  );
}
