import { createFileRoute } from "@tanstack/react-router";
import { MapPinned, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { regions } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/regioes')({
  head: () => seo("Regiões", "Agrupamento geográfico das telas para programação e campanhas."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Regiões" description="Agrupe estabelecimentos para segmentar programação e campanhas."
        actions={<Button onClick={() => toast.success("Região criada (demonstração)")}><Plus /> Nova região</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {regions.map((r) => {
          const pct = (r.online / r.screens) * 100;
          return (
            <div key={r.name} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><MapPinned className="size-5" /></span>
                <div><div className="font-semibold">{r.name}</div><div className="text-xs text-muted-foreground">{r.city}</div></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-semibold">{r.venues}</div><div className="text-[11px] text-muted-foreground">Locais</div></div>
                <div><div className="text-lg font-semibold">{r.screens}</div><div className="text-[11px] text-muted-foreground">Telas</div></div>
                <div><div className="text-lg font-semibold text-success">{r.online}</div><div className="text-[11px] text-muted-foreground">Online</div></div>
              </div>
              <div className="mt-4 flex justify-between text-xs"><span className="text-muted-foreground">Disponibilidade</span><span>{pct.toFixed(1)}%</span></div>
              <Progress value={pct} className="mt-1.5 h-1.5" />
            </div>
          );
        })}
      </div>
    </>
  );
}
