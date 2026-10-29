import { createFileRoute } from "@tanstack/react-router";
import { CloudSun, Clock, Newspaper, QrCode, TrendingUp, Quote } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/ui";
import { Switch } from "@/components/ui/switch";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/widgets')({
  head: () => seo("Widgets", "Elementos automáticos sobrepostos à programação das telas."),
  component: Page,
});

const widgets = [
  { icon: Clock, name: "Relógio", desc: "Hora e data local no canto da tela", on: true, preview: "18:31 · Qua, 28 out" },
  { icon: CloudSun, name: "Previsão do tempo", desc: "Temperatura atual e próximos dias", on: true, preview: "São Paulo 24° · Parcialmente nublado" },
  { icon: Newspaper, name: "Faixa de notícias", desc: "Letreiro com manchetes dos feeds RSS", on: true, preview: "Economia: Ibovespa fecha em alta…" },
  { icon: TrendingUp, name: "Cotações", desc: "Dólar, euro e bitcoin", on: false, preview: "USD R$ 5,12 · EUR R$ 5,54" },
  { icon: QrCode, name: "QR Code", desc: "Link para promoção ou cardápio", on: false, preview: "plannet.play/promo" },
  { icon: Quote, name: "Frase do dia", desc: "Mensagens motivacionais", on: false, preview: "“Grandes coisas começam pequenas.”" },
];

function Page() {
  return (
    <>
      <PageHeader title="Widgets" description="Ative elementos que aparecem junto à programação." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {widgets.map((w) => (
          <div key={w.name} className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><w.icon className="size-5" /></span>
              <div className="flex-1"><div className="font-medium">{w.name}</div><div className="text-xs text-muted-foreground">{w.desc}</div></div>
              <Switch defaultChecked={w.on} onCheckedChange={(v) => toast(v ? `${w.name} ativado` : `${w.name} desativado`)} />
            </div>
            <div className="mt-4 rounded-lg border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">{w.preview}</div>
          </div>
        ))}
      </div>
    </>
  );
}
