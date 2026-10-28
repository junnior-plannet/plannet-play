import { createFileRoute } from "@tanstack/react-router";
import { Cpu, HardDrive, Thermometer, Wifi } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Stat, StatusBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { alerts, devices } from "@/lib/mock";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/monitoramento")({
  head: () => seo("Monitoramento", "Saúde dos dispositivos e alertas da rede em tempo real."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Monitoramento" description="Saúde dos dispositivos (valores demonstrativos)." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Latência média" value="48 ms" icon={Wifi} tone="success" />
        <Stat label="Uso médio de CPU" value="32%" icon={Cpu} />
        <Stat label="Armazenamento médio" value="61%" icon={HardDrive} tone="warning" />
        <Stat label="Temperatura média" value="47 °C" icon={Thermometer} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Alertas ativos">
          <ul className="space-y-3">{alerts.map((a) => (
            <li key={a.device} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between"><span className="font-mono text-xs">{a.device}</span><StatusBadge status={a.level} /></div>
              <div className="mt-1 font-medium">{a.issue}</div><div className="text-xs text-muted-foreground">{a.venue}</div>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => toast.success("Alerta reconhecido")}>Reconhecer</Button>
            </li>
          ))}</ul>
        </Panel>
        <Panel title="Dispositivos" className="lg:col-span-2">
          <ul className="divide-y">{devices.map((d, i) => {
            const cpu = [28, 0, 41, 22, 35, 30, 0][i], disk = [55, 72, 91, 40, 63, 48, 80][i];
            return (
              <li key={d.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div><div className="font-medium">{d.name}</div><div className="text-xs text-muted-foreground">{d.id} · {d.venue}</div></div>
                <div className="hidden sm:block"><div className="text-[11px] text-muted-foreground">CPU {cpu}%</div><Progress value={cpu} className="h-1.5" /></div>
                <div className="hidden sm:block"><div className="text-[11px] text-muted-foreground">Disco {disk}%</div><Progress value={disk} className="h-1.5" /></div>
                <StatusBadge status={d.status} />
              </li>
            );
          })}</ul>
        </Panel>
      </div>
    </>
  );
}
