import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Film, Image as ImageIcon, Upload, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, FilterBar, PageHeader } from "@/components/app/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { media, contentLibrary } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/midias')({
  head: () => seo("Biblioteca de Mídias", "Vídeos e imagens disponíveis para playlists e campanhas."),
  component: Page,
});

import { useDemo } from '@/components/v2/DemoProvider';

function Page() {
  const demo=useDemo();
  const available=media.filter((_,i)=>demo.role==='admin'||contentLibrary[i]?.owner===demo.clientId);
  const [type, setType] = useState("Todos");
  const list = available.filter((m) => type === "Todos" || m.type === type);
  return (
    <>
      <PageHeader title="Biblioteca de Mídias" description={`${available.length} arquivos · 87,1 MB utilizados de 50 GB`}
        actions={<Button onClick={() => toast.success("Envio simulado concluído")}><Upload /> Enviar mídia</Button>} />
      <FilterBar>
        {["Todos", "Vídeo", "Imagem"].map((t) => <Button key={t} size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>{t}</Button>)}
      </FilterBar>
      <div className="mb-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        <Upload className="mx-auto mb-2 size-5" /> Arraste arquivos MP4, JPG ou PNG aqui
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((m) => (
            <div key={m.name} className="group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40">
              <div className="grid aspect-video place-items-center bg-gradient-to-br from-accent to-muted">
                {m.type === "Vídeo" ? <Film className="size-8 text-primary" /> : <ImageIcon className="size-8 text-primary" />}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{m.duration} · {m.size} · {m.format}</span></div>
                <Badge variant="info" className="mt-2">{m.tag}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={FolderOpen} title="Nenhuma mídia" />}
    </>
  );
}
