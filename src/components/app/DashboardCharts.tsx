import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/ui";
import { formatCount, formatPercent, type DashboardDatum } from "@/lib/dashboard";

/** Measure after mount: safe for SSR, mobile layouts and environments without ResizeObserver. */
function ChartCanvas({ label, height, children }: { label: string; height: number; children: (width: number, animate: boolean) => ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setWidth(Math.max(0, Math.floor(element.getBoundingClientRect().width)));
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setAnimate(!motion.matches);
    updateMotion(); measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener("resize", measure);
    motion.addEventListener("change", updateMotion);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); motion.removeEventListener("change", updateMotion); };
  }, []);
  return <div ref={container} role="img" aria-label={label} className="min-w-0" style={{ height }}>
    {width > 0 && children(width, animate)}
  </div>;
}

function ValueTooltip({ active, payload, total, unit }: {
  active?: boolean; payload?: readonly { payload?: DashboardDatum }[]; total: number; unit: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div className="dashboard-tooltip max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
    <p className="mb-1 font-medium break-words">{row.name}</p>
    <p>{formatCount(row.value)} {unit} · {formatPercent(row.value, total)} do total</p>
  </div>;
}

function DataDetails({ rows, unit }: { rows: DashboardDatum[]; unit: string }) {
  const [open, setOpen] = useState(false);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <div className="mt-4 border-t pt-3">
    <Button variant="ghost" size="sm" type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-xs text-muted-foreground hover:text-foreground">
      {open ? "Ocultar dados" : "Ver todos os dados"}
    </Button>
    {open && <div className="mt-3 max-h-72 overflow-auto rounded-lg border">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Dados completos · {unit}</caption>
        <thead className="bg-muted"><tr><th className="p-2">Categoria</th><th className="p-2 text-right">{unit}</th><th className="p-2 text-right">%</th></tr></thead>
        <tbody className="divide-y">{rows.map((row) => <tr key={row.id}><th scope="row" className="p-2 font-normal break-words">{row.name}</th><td className="p-2 text-right tabular-nums">{formatCount(row.value)}</td><td className="p-2 text-right tabular-nums">{formatPercent(row.value, total)}</td></tr>)}</tbody>
      </table>
    </div>}
  </div>;
}

export type DashboardActivityPoint = { hour: string; value: number };

/** Only measured activity belongs here; registration/activation dates are not telemetry. */
export function DashboardArea({ rows = [] }: { rows?: DashboardActivityPoint[] }) {
  const gradientId = `activity-${useId().replace(/:/g, "")}`;
  const hasActivity = rows.length >= 2;
  return <Panel title="Atividade por horário" description="Atividade registrada nas TVs" className="dashboard-chart min-w-0">
    {hasActivity ? <ChartCanvas label="Atividade das TVs por horário" height={300}>
      {(width, animate) => <AreaChart width={width} height={300} data={rows} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--dashboard-area-fill)" />
          <stop offset="100%" stopColor="var(--dashboard-area-fade)" />
        </linearGradient></defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={24} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={38} />
        <Tooltip cursor={{ stroke: "var(--primary)", strokeDasharray: "4 4" }} content={({ active, payload, label }) => active && payload?.length ?
          <div className="dashboard-tooltip rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
            <p className="mb-1 font-medium">{label}</p><p>{formatCount(Number(payload[0]?.value ?? 0))} registros de atividade</p>
          </div> : null} />
        <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill={`url(#${gradientId})`} className="dashboard-area-line" isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }} />
      </AreaChart>}
    </ChartCanvas> : <div role="status" className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-4 text-center">
      <Activity className="size-8 text-primary/60" aria-hidden="true" />
      <p className="text-sm font-medium">Sem dados de atividade por horário</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">Ainda não há registros de telemetria suficientes para exibir a atividade das TVs.</p>
    </div>}
  </Panel>;
}

export function DashboardDonut({ title, description, rows, unit }: { title: string; description: string; rows: DashboardDatum[]; unit: string }) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const selected = hover ?? highlight;
  const active = rows.some((row) => row.id === selected) ? selected : null;
  const segments = useMemo(() => rows.filter((row) => row.value > 0), [rows]);
  const activeRow = rows.find((row) => row.id === active);
  return <Panel title={title} description={description} className="dashboard-chart min-w-0">
    <div className="relative mx-auto max-w-80">
      {total > 0 ? <ChartCanvas label={`${title}: ${formatCount(total)} ${unit}. Valores na legenda e em Ver todos os dados.`} height={230}>
        {(width, animate) => <PieChart width={width} height={230}>
          <Pie data={segments} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={76} outerRadius={96} paddingAngle={segments.length > 1 ? 4 : 0} stroke="var(--card)" strokeWidth={2}
            isAnimationActive={animate} animationDuration={650} animationBegin={0} onMouseEnter={(_, index) => setHover(segments[index]?.id ?? null)} onMouseLeave={() => setHover(null)}>
            {segments.map((row) => <Cell key={row.id} fill={row.color} className="dashboard-segment" style={{ color: row.color, opacity: active && active !== row.id ? 0.3 : 1, filter: active === row.id ? "drop-shadow(0 0 7px currentColor)" : undefined }} />)}
          </Pie>
          <Tooltip content={<ValueTooltip total={total} unit={unit} />} />
        </PieChart>}
      </ChartCanvas> : <div className="flex h-[230px] items-center justify-center text-sm text-muted-foreground">Sem dados para exibir</div>}
      {total > 0 && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-3xl font-semibold tabular-nums">{formatCount(total)}</span><span className="text-xs text-muted-foreground">{unit}</span>
      </div>}
    </div>
    <div className="grid gap-1.5" aria-label={`Legenda interativa · ${title}`}>
      {rows.map((row) => <Button variant="ghost" key={row.id} type="button" aria-pressed={highlight === row.id}
        onClick={() => setHighlight(highlight === row.id ? null : row.id)} onMouseEnter={() => setHover(row.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(row.id)} onBlur={() => setHover(null)}
        className="flex h-auto min-h-9 items-center gap-2 whitespace-normal rounded-lg border border-transparent px-2 py-1 text-left text-xs font-normal transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary/40 aria-pressed:bg-primary/10">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words">{row.name}</span><span className="shrink-0 tabular-nums">{formatCount(row.value)} <span className="text-muted-foreground">· {formatPercent(row.value, total)}</span></span>
      </Button>)}
    </div>
    <p className="mt-2 min-h-8 text-xs text-muted-foreground" aria-live="polite">{activeRow ? `${activeRow.name}: ${formatCount(activeRow.value)} ${unit} (${formatPercent(activeRow.value, total)}).` : null}</p>
    <DataDetails rows={rows} unit={unit} />
  </Panel>;
}
