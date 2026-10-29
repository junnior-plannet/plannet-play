import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Rss, Trash2, CloudSun, Clock } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Field, PageHeader, Panel, StatusBadge, inputCls, selectCls } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/noticias')({
  head: () => seo("Notícias e RSS", "Configure fontes RSS, categorias, previsão do tempo e relógio."),
  component: Page,
});

function Page() {
  const [feeds, setFeeds] = useState([
    { name: "G1 Brasil", url: "https://g1.globo.com/rss/g1/", cat: "Geral" },
    { name: "ge Esportes", url: "https://ge.globo.com/rss/ge/", cat: "Esportes" },
    { name: "Tecmundo", url: "https://rss.tecmundo.com.br/feed", cat: "Tecnologia" },
  ]);
  const [url, setUrl] = useState("");
  return (
    <>
      <PageHeader title="Notícias e RSS" description="Conteúdo automático para complementar a programação." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Fontes RSS" className="lg:col-span-2">
          <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!url) return; setFeeds([...feeds, { name: new URL(url.startsWith("http") ? url : `https://${url}`).hostname, url, cat: "Geral" }]); setUrl(""); toast.success("Fonte adicionada"); }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com/feed.xml" className={inputCls} />
            <Button type="submit"><Plus /> Adicionar</Button>
          </form>
          {feeds.length ? (
            <ul className="divide-y">
              {feeds.map((f, i) => (
                <li key={f.url} className="flex items-center gap-3 py-3 text-sm">
                  <Rss className="size-4 text-warning" />
                  <div className="min-w-0 flex-1"><div className="font-medium">{f.name}</div><div className="truncate text-xs text-muted-foreground">{f.url}</div></div>
                  <span className="text-xs text-muted-foreground">{f.cat}</span><StatusBadge status="Ativo" />
                  <Button size="icon" variant="ghost" onClick={() => setFeeds(feeds.filter((_, j) => j !== i))} aria-label="Remover"><Trash2 /></Button>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={Rss} title="Nenhuma fonte RSS" description="Adicione um endereço de feed acima." />}
        </Panel>
        <Panel title="Preferências">
          <div className="grid gap-4">
            <Field label="Categorias">
              <div className="flex flex-wrap gap-1.5">{["Geral", "Esportes", "Economia", "Tecnologia", "Saúde", "Entretenimento"].map((c, i) => <span key={c} className={`rounded-md border px-2 py-1 text-xs ${i < 4 ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"}`}>{c}</span>)}</div>
            </Field>
            <Field label="Frequência de atualização"><select className={selectCls} defaultValue="30"><option value="15">A cada 15 minutos</option><option value="30">A cada 30 minutos</option><option value="60">A cada hora</option></select></Field>
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm"><span className="flex items-center gap-2"><CloudSun className="size-4 text-warning" />Previsão do tempo</span><Switch defaultChecked /></div>
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm"><span className="flex items-center gap-2"><Clock className="size-4 text-primary" />Relógio e data</span><Switch defaultChecked /></div>
            <Field label="Cidade da previsão"><input className={inputCls} defaultValue="São Paulo, SP" /></Field>
            <Button onClick={() => toast.success("Preferências salvas")}>Salvar</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
