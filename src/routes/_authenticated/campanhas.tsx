import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Field, FilterBar, PageHeader, StatusBadge, inputCls, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { advertisers, campaigns as initial, media, regions, fmt } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/campanhas')({
  head: () => seo("Campanhas", "Crie e acompanhe campanhas por região e dispositivo."),
  component: Page,
});

function Page() {
  const [list, setList] = useState(initial);
  const [status, setStatus] = useState("Todas");
  const [open, setOpen] = useState(false);
  const shown = list.filter((c) => status === "Todas" || c.status === status);
  return (
    <>
      <PageHeader title="Campanhas" description="Acompanhe a veiculação de cada campanha."
        actions={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button><Plus /> Nova campanha</Button></SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader><SheetTitle>Nova campanha</SheetTitle></SheetHeader>
              <form className="grid gap-4 p-4" onSubmit={(e) => {
                e.preventDefault(); const f = new FormData(e.currentTarget);
                setList([{ name: String(f.get("name")), advertiser: String(f.get("adv")), status: "Agendada", period: "a definir", screens: 0, plays: 0, progress: 0 }, ...list]);
                setOpen(false); toast.success("Campanha criada");
              }}>
                <Field label="Nome"><input name="name" required className={inputCls} /></Field>
                <Field label="Anunciante"><select name="adv" className={selectCls}>{advertisers.map((a) => <option key={a.name}>{a.name}</option>)}</select></Field>
                <div className="grid grid-cols-2 gap-2"><Field label="Início"><input type="date" className={inputCls} /></Field><Field label="Fim"><input type="date" className={inputCls} /></Field></div>
                <Field label="Mídias"><div className="space-y-2 rounded-lg border p-3">{media.filter((m) => m.tag === "Publicidade").map((m) => <label key={m.name} className="flex items-center gap-2 text-sm"><Checkbox />{m.name}</label>)}</div></Field>
                <Field label="Regiões"><div className="space-y-2 rounded-lg border p-3">{regions.map((r) => <label key={r.name} className="flex items-center gap-2 text-sm"><Checkbox />{r.name} <span className="text-xs text-muted-foreground">({r.screens} telas)</span></label>)}</div></Field>
                <Button type="submit">Criar campanha</Button>
              </form>
            </SheetContent>
          </Sheet>
        } />
      <FilterBar>{["Todas", "Ativa", "Agendada", "Pausada", "Concluída"].map((s) => <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>)}</FilterBar>
      {shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <div key={c.name} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-2"><div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">{c.advertiser}</div></div><StatusBadge status={c.status} /></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-[11px] text-muted-foreground">Período</div>{c.period}</div>
                <div><div className="text-[11px] text-muted-foreground">Telas</div>{c.screens}</div>
                <div><div className="text-[11px] text-muted-foreground">Exibições</div>{fmt(c.plays)}</div>
              </div>
              <div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span>{c.progress}%</span></div>
              <Progress value={c.progress} className="mt-1.5 h-1.5" />
            </div>
          ))}
        </div>
      ) : <EmptyState icon={Megaphone} title="Nenhuma campanha com este status" />}
    </>
  );
}
