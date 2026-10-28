import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, action, children, className }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: string; hint?: string; icon: LucideIcon; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const tones = { primary: "bg-primary/10 text-primary", success: "bg-success/10 text-success", warning: "bg-warning/10 text-warning", destructive: "bg-destructive/10 text-destructive" };
  return (
    <div className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}><Icon className="size-4" /></span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
    Online: "success", Ativa: "success", Ativo: "success", Concluída: "neutral", "Ao vivo": "danger",
    Offline: "danger", Pausada: "warning", Alerta: "warning", Agendada: "info", Rascunho: "neutral", Inativo: "neutral", Sincronizando: "info",
  };
  return <Badge variant={map[status] ?? "neutral"}>{status}</Badge>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted"><Icon className="size-5 text-muted-foreground" /></div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y [&_td]:whitespace-nowrap [&_td]:px-4 [&_td]:py-3 [&_tr:hover]:bg-accent/30">{children}</tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

export const selectCls = "h-9 rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary";
export const inputCls = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary";

export const chartTooltip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
  cursor: { fill: "var(--accent)", opacity: 0.4 },
};
