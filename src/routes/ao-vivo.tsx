import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Radio, Plus } from "lucide-react";
import { toast } from "sonner";
import { Field, PageHeader, Panel, StatusBadge, inputCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { devices } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/ao-vivo")({
  head: () => seo("Transmissões ao Vivo", "Cadastre e agende transmissões ao vivo para telas selecionadas."),
  component: Page,
});

function Page() {
  const [list, setList] = useState([
    { name: "Jogo do Brasil – Eliminatórias", when: "28/10 · 21:45", screens: 42, status: "Ao vivo" },
    { name: "Lançamento Plano Fit", when: "02/11 · 19:00", screens: 12, status: "Agendada" },
    { name: "Missa de Domingo", when: "26/10 · 08:00", screens: 6, status: "Concluída" },
  ]);
  const [sel, setSel] = useState<string[]>([]);
  return (
    <>
      <PageHeader title="Transmissões ao Vivo" description="Estado demonstrativo — streaming real será integrado depois." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl border bg-gradient-to-br from-accent to-background">
            <Radio className="size-12 text-primary" />
            <span className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground"><span className="dot-live size-1.5 rounded-full bg-destructive-foreground" />AO VIVO</span>
            <span className="absolute bottom-4 left-4 text-sm font-medium">{list[0]?.name} · {list[0]?.screens} telas</span>
          </div>
          <Panel title="Transmissões">
            <ul className="divide-y">
              {list.map((t) => (
                <li key={t.name} className="flex items-center gap-3 py-3 text-sm">
                  <div className="flex-1"><div className="font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.when} · {t.screens} telas</div></div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Nova transmissão">
          <form className="grid gap-4" onSubmit={(e) => {
            e.preventDefault(); const f = new FormData(e.currentTarget);
            if (!sel.length) { toast.error("Selecione ao menos uma TV"); return; }
            setList([...list, { name: String(f.get("name")), when: String(f.get("when")).replace("T", " · "), screens: sel.length, status: "Agendada" }]);
            setSel([]); e.currentTarget.reset(); toast.success("Transmissão agendada");
          }}>
            <Field label="Título"><input name="name" required className={inputCls} placeholder="Ex.: Final do campeonato" /></Field>
            <Field label="URL do stream"><input className={inputCls} placeholder="rtmp:// ou https://...m3u8" /></Field>
            <Field label="Início"><input name="when" type="datetime-local" required className={inputCls} /></Field>
            <Field label="TVs">
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                {devices.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sel.includes(d.id)} onCheckedChange={(c) => setSel(c ? [...sel, d.id] : sel.filter((x) => x !== d.id))} />
                    {d.id} · {d.name}
                  </label>
                ))}
              </div>
            </Field>
            <Button type="submit"><Plus /> Agendar</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
