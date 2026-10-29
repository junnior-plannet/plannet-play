import type { ReactNode } from "react";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./ui";

export function QueryState({ isLoading, error, isEmpty, emptyIcon, emptyTitle, emptyDescription, emptyAction, onRetry, children }: {
  isLoading: boolean; error: unknown; isEmpty: boolean; emptyIcon?: LucideIcon; emptyTitle: string; emptyDescription?: string; emptyAction?: ReactNode; onRetry: () => void; children: ReactNode;
}) {
  if (isLoading) return <div className="flex items-center justify-center gap-2 rounded-xl border bg-card py-16 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Carregando…</div>;
  if (error) return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-card py-12 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <div className="text-sm font-medium">Não foi possível carregar os dados</div>
      <div className="max-w-md text-xs text-muted-foreground">{error instanceof Error ? error.message : String(error)}</div>
      <Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return <>{children}</>;
}
