import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, Film, Image as ImageIcon, ListVideo, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { media, playlists } from "@/lib/mock";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playlists")({
  head: () => seo("Playlists", "Crie playlists e organize a sequência de conteúdos."),
  component: Page,
});

function Page() {
  const [active, setActive] = useState(playlists[0]!.name);
  const [items, setItems] = useState(media.slice(0, 5));
  const move = (i: number, d: number) => { const n = [...items]; [n[i], n[i + d]] = [n[i + d]!, n[i]!]; setItems(n); };
  const secs = items.reduce((a, m) => { const [mm, ss] = m.duration.split(":").map(Number); return a + (mm ?? 0) * 60 + (ss ?? 0); }, 0);
  return (
    <>
      <PageHeader title="Playlists" description="Monte sequências de conteúdo para suas telas."
        actions={<Button onClick={() => toast.success("Playlist criada (demonstração)")}><Plus /> Nova playlist</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Minhas playlists">
          <ul className="space-y-2">
            {playlists.map((p) => (
              <li key={p.name}><button onClick={() => setActive(p.name)} className={cn("w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/40", active === p.name && "border-primary bg-primary/10")}>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.items} itens · {p.duration} · {p.screens} telas · atualizada {p.updated}</div>
              </button></li>
            ))}
          </ul>
        </Panel>
        <Panel title={`Sequência · ${active}`} description={`${items.length} itens · duração total ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`} className="lg:col-span-2"
          action={<Button size="sm" onClick={() => toast.success("Sequência salva")}>Salvar</Button>}>
          {items.length ? (
            <ol className="space-y-2">
              {items.map((m, i) => (
                <li key={m.name + i} className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
                  <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                  {m.type === "Vídeo" ? <Film className="size-4 text-primary" /> : <ImageIcon className="size-4 text-primary" />}
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.duration}</span>
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp /></Button>
                  <Button size="icon" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remover"><Trash2 /></Button>
                </li>
              ))}
            </ol>
          ) : <EmptyState icon={ListVideo} title="Playlist vazia" description="Adicione mídias da biblioteca abaixo." />}
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Adicionar da biblioteca</div>
            <div className="flex flex-wrap gap-2">
              {media.map((m) => <Button key={m.name} size="sm" variant="outline" onClick={() => setItems([...items, m])}><Plus />{m.name}</Button>)}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
