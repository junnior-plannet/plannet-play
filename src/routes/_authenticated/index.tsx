import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Users, CheckCircle2, Clock } from "lucide-react";
import { PageHeader, Stat } from "@/components/app/ui";
import { RefreshButton } from "@/components/app/RefreshButton";
import { QueryState } from "@/components/app/QueryState";
import { DashboardDonut } from "@/components/app/DashboardCharts";
import { clientsQuery, devicesQuery, establishmentsQuery, plansQuery } from "@/lib/api";
import { buildDashboardData, formatCount } from "@/lib/dashboard";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/')({
  head: () => seo("Dashboard", "Visão gerencial dos clientes, planos e TVs cadastradas."),
  component: Dashboard,
});

function Dashboard() {
  const clients = useQuery(clientsQuery);
  const devices = useQuery(devicesQuery);
  const plans = useQuery(plansQuery);
  const establishments = useQuery(establishmentsQuery);
  const queries = [clients, devices, plans, establishments];
  const error = queries.find((query) => query.error)?.error;
  const isLoading = queries.some((query) => query.isLoading);
  const fetching = queries.some((query) => query.isFetching);
  const charts = useMemo(() => buildDashboardData(
    clients.data ?? [], devices.data ?? [], establishments.data ?? [], plans.data ?? [],
  ), [clients.data, devices.data, establishments.data, plans.data]);
  const retry = () => {
    if (fetching) return;
    void Promise.all(queries.map((query) => query.refetch()));
  };
  const active = charts.status.find((row) => row.id === "ativa")?.value ?? 0;
  const pending = charts.status.find((row) => row.id === "pendente")?.value ?? 0;
  return <>
    <PageHeader title="Dashboard" description="Visão gerencial · dados do Supabase conforme suas permissões de acesso."
      actions={<RefreshButton queryKeys={["clients", "devices", "plans", "establishments"]} />} />
    <QueryState isLoading={isLoading} error={error} isEmpty={false} emptyTitle="Nenhum cadastro" onRetry={retry}>
      <div className="dashboard-overview space-y-4" aria-busy={fetching}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total de clientes" value={formatCount(clients.data?.length ?? 0)} hint="Cadastros acessíveis à sua conta" icon={Users} />
          <Stat label="TVs cadastradas" value={formatCount(devices.data?.length ?? 0)} hint="Dispositivos vinculados aos clientes" icon={Monitor} />
          <Stat label="TVs ativas" value={formatCount(active)} hint="Status de ativação, não de conexão" icon={CheckCircle2} tone="success" />
          <Stat label="TVs pendentes" value={formatCount(pending)} hint="Aguardando ativação" icon={Clock} tone="warning" />
        </div>
        <DashboardDonut title="Distribuição por município" description="TVs cadastradas por município do estabelecimento vinculado" rows={charts.byCity} unit="TVs" />
        <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
          <p>Todos os indicadores e gráficos usam os mesmos cadastros consultados no Supabase. O botão Atualizar consulta clientes, TVs, planos e locais sem recarregar a página.</p>
          <p className="mt-2">Não há telemetria de conexão integrada a este painel. Por isso, não exibimos indicadores online/offline, disponibilidade ou exibições. Vínculos não disponíveis para consulta e municípios não informados aparecem identificados, sem estimativas.</p>
          <p className="mt-2">Cadastre TVs em Clientes → Novo Cliente ou Editar cadastro.</p>
        </div>
      </div>
    </QueryState>
  </>;
}
