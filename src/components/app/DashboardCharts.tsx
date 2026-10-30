import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
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
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      {open ? "Ocultar dados" : "Ver todos os dados"}
    </button>
    {open && <div className="mt-3 max-h-72 overflow-auto rounded-lg border">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Dados completos · {unit}</caption>
        <thead className="bg-muted"><tr><th className="p-2">Categoria</th><th className="p-2 text-right">{unit}</th><th className="p-2 text-right">%</th></tr></thead>
        <tbody className="divide-y">{rows.map((row) => <tr key={row.id}><th scope="row" className="p-2 font-normal break-words">{row.name}</th><td className="p-2 text-right tabular-nums">{formatCount(row.value)}</td><td className="p-2 text-right tabular-nums">{formatPercent(row.value, total)}</td></tr>)}</tbody>
      </table>
    </div>}
  </div>;
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
      {rows.map((row) => <button key={row.id} type="button" aria-pressed={highlight === row.id}
        onClick={() => setHighlight(highlight === row.id ? null : row.id)} onMouseEnter={() => setHover(row.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(row.id)} onBlur={() => setHover(null)}
        className="flex min-h-9 items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-xs transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary/40 aria-pressed:bg-primary/10">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words">{row.name}</span><span className="shrink-0 tabular-nums">{formatCount(row.value)} <span className="text-muted-foreground">· {formatPercent(row.value, total)}</span></span>
      </button>)}
    </div>
    <p className="mt-2 min-h-8 text-xs text-muted-foreground" aria-live="polite">{activeRow ? `${activeRow.name}: ${formatCount(activeRow.value)} ${unit} (${formatPercent(activeRow.value, total)}).` : "Passe o mouse ou selecione uma categoria para destacar."}</p>
    <DataDetails rows={rows} unit={unit} />
  </Panel>;
}
