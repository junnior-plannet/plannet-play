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
const EMPTY_HOURS = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}h` }));
const HOUR_TICKS = ["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h"];

export function DashboardArea({ rows = [] }: { rows?: DashboardActivityPoint[] }) {
  const gradientId = `activity-${useId().replace(/:/g, "")}`;
  const hasActivity = rows.length >= 2;
  return <Panel title="Atividade por horário" description="Telas ativas e exibições ao longo do dia" className="dashboard-chart h-full min-w-0">
    <div className="relative">
      <ChartCanvas label="Atividade das TVs por horário" height={330}>
        {(width, animate) => <AreaChart width={width} height={330} data={hasActivity ? rows : EMPTY_HOURS} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dashboard-area-fill)" />
            <stop offset="100%" stopColor="var(--dashboard-area-fade)" />
          </linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="hour" ticks={hasActivity ? undefined : HOUR_TICKS} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={24} />
          <YAxis allowDecimals={false} domain={hasActivity ? undefined : [0, 600]} ticks={hasActivity ? undefined : [0, 150, 300, 450, 600]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={38} />
          {hasActivity && <Tooltip cursor={{ stroke: "var(--primary)", strokeDasharray: "4 4" }} content={({ active, payload, label }) => active && payload?.length ?
            <div className="dashboard-tooltip rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
              <p className="mb-1 font-medium">{label}</p><p>{formatCount(Number(payload[0]?.value ?? 0))} registros de atividade</p>
            </div> : null} />}
          {hasActivity && <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill={`url(#${gradientId})`} className="dashboard-area-line" isAnimationActive={animate} animationDuration={750} animationEasing="ease-out" activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }} />}
        </AreaChart>}
      </ChartCanvas>
      {!hasActivity && <div role="status" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <Activity className="size-6 text-primary/60" aria-hidden="true" />
        <p className="text-sm font-medium">Sem dados de atividade por horário</p>
        <p className="max-w-xs text-xs text-muted-foreground">Aguardando telemetria real das TVs. Nenhum valor é simulado.</p>
      </div>}
    </div>
  </Panel>;
}

export function DashboardDonut({ title, description, rows, unit }: { title: string; description: string; rows: DashboardDatum[]; unit: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const segments = useMemo(() => rows.filter((row) => row.value > 0), [rows]);
  return <Panel title={title} description={description} className="dashboard-chart h-full min-w-0">
    <div className="mx-auto max-w-72">
      {total > 0 ? <ChartCanvas label={`${title}: ${formatCount(total)} ${unit}`} height={230}>
        {(width, animate) => <PieChart width={width} height={230}>
          <Pie data={segments} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={100} paddingAngle={segments.length > 1 ? 2 : 0} stroke="var(--card)" strokeWidth={2}
            isAnimationActive={animate} animationDuration={650} animationBegin={0} onMouseEnter={(_, index) => setHover(segments[index]?.id ?? null)} onMouseLeave={() => setHover(null)}>
            {segments.map((row) => <Cell key={row.id} fill={row.color} className="dashboard-segment" style={{ color: row.color, opacity: hover && hover !== row.id ? 0.4 : 1 }} />)}
          </Pie>
          <Tooltip content={<ValueTooltip total={total} unit={unit} />} />
        </PieChart>}
      </ChartCanvas> : <div className="flex h-[230px] items-center justify-center text-sm text-muted-foreground">Sem dados para exibir</div>}
    </div>
    <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5" aria-label={`Legenda · ${title}`}>
      {rows.map((row) => <li key={row.id} onMouseEnter={() => setHover(row.id)} onMouseLeave={() => setHover(null)}
        className="flex min-w-0 items-center gap-2 text-xs transition-opacity" style={{ opacity: hover && hover !== row.id ? 0.5 : 1 }}>
        <span className="size-2 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium" title={row.name}>{row.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{formatCount(row.value)}</span>
      </li>)}
    </ul>
  </Panel>;
}

/** @deprecated kept for compatibility; not rendered on the Dashboard. */
export { DataDetails };
