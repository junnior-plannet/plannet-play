import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor, Wifi, WifiOff, Gauge, Megaphone, PlayCircle, Clock, AlertTriangle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { PageHeader, Panel, Stat, StatusBadge, chartTooltip } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { activity, alerts, hourlyActivity, regions, fmt } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Dashboard", "Visão geral da rede de telas, disponibilidade, campanhas e alertas."),
  component: Dashboard,
});

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

function Dashboard() {
  const total = regions.reduce((a, r) => a + r.screens, 0);
  const online = regions.reduce((a, r) => a + r.online, 0);
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da rede PLANNET PLAY em tempo real (dados demonstrativos)."
        actions={<Button asChild><Link to="/telas">Cadastrar dispositivo</Link></Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="TVs cadastradas" value={fmt(total)} hint="+12 este mês" icon={Monitor} />
        <Stat label="TVs online" value={fmt(online)} hint="Conectadas agora" icon={Wifi} tone="success" />
        <Stat label="TVs offline" value={fmt(total - online)} hint="Requerem atenção" icon={WifiOff} tone="destructive" />
        <Stat label="Disponibilidade da rede" value={`${((online / total) * 100).toFixed(1)}%`} hint="Últimas 24 horas" icon={Gauge} tone="success" />
        <Stat label="Campanhas ativas" value="18" hint="4 agendadas" icon={Megaphone} />
        <Stat label="Exibições registradas" value="1.284.930" hint="Últimos 30 dias" icon={PlayCircle} />
        <Stat label="Horas de funcionamento" value="142.380 h" hint="Soma de todas as telas" icon={Clock} tone="warning" />
        <Stat label="Alertas abertos" value={String(alerts.length)} hint="2 críticos" icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Atividade por horário" description="Telas ativas e exibições ao longo do dia" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyActivity}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hora" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Area dataKey="telas" name="Telas ativas" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Distribuição por região" description="Telas cadastradas">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={regions} dataKey="screens" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                  {regions.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                </Pie>
                <Tooltip {...chartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {regions.map((r, i) => (
              <li key={r.name} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: colors[i] }} />{r.name}<span className="ml-auto text-muted-foreground">{r.screens}</span></li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Dispositivos com alertas" action={<Link to="/monitoramento" className="text-xs text-primary">Ver todos</Link>}>
          <ul className="divide-y">
            {alerts.map((a) => (
              <li key={a.device} className="flex items-center gap-3 py-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{a.device}</span>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{a.venue}</div><div className="text-xs text-muted-foreground">{a.issue}</div></div>
                <StatusBadge status={a.level} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Últimas atividades">
          <ol className="relative space-y-4 border-l pl-5">
            {activity.map((a, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary shadow-glow" />
                <span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span>
                <div className="text-xs text-muted-foreground">{a.when}</div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
