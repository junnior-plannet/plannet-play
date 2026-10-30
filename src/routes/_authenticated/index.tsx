import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Users, CheckCircle2, Clock } from "lucide-react";
import { PageHeader, Panel, Stat, DataTable } from "@/components/app/ui";
import { RefreshButton } from "@/components/app/RefreshButton";
import { QueryState } from "@/components/app/QueryState";
import { clientsQuery, devicesQuery, plansQuery } from "@/lib/api";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/')({
  head: () => seo("Dashboard", "Visão gerencial dos clientes, planos e TVs cadastradas."),
  component: Dashboard,
});

function Dashboard() {
  const clients = useQuery(clientsQuery);
  const devices = useQuery(devicesQuery);
  const plans = useQuery(plansQuery);
  const error = clients.error ?? devices.error ?? plans.error;
  const isLoading = clients.isLoading || devices.isLoading || plans.isLoading;
  const tvs = devices.data ?? [];
  const accounts = clients.data ?? [];
  const distribution = (plans.data ?? []).map((plan) => ({
    id: plan.id, name: plan.name, count: accounts.filter((client) => client.plan_id === plan.id).length,
  }));
  const knownPlans = new Set((plans.data ?? []).map((plan) => plan.id));
  const noPlan = accounts.filter((client) => !client.plan_id).length;
  const unknownPlan = accounts.filter((client) => client.plan_id && !knownPlans.has(client.plan_id)).length;
  const retry = () => {
    if (clients.isFetching || devices.isFetching || plans.isFetching) return;
    void clients.refetch(); void devices.refetch(); void plans.refetch();
  };
  const format = (value: number) => value.toLocaleString("pt-BR");
  return <>
    <PageHeader title="Dashboard" description="Visão gerencial · dados do Supabase conforme suas permissões de acesso."
      actions={<RefreshButton queryKeys={["clients", "devices", "plans", "establishments"]} />} />
    <QueryState isLoading={isLoading} error={error} isEmpty={false} emptyTitle="Nenhum cadastro" onRetry={retry}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total de clientes" value={format(accounts.length)} hint="Cadastros acessíveis à sua conta" icon={Users} />
        <Stat label="TVs cadastradas" value={format(tvs.length)} hint="Dispositivos vinculados aos clientes" icon={Monitor} />
        <Stat label="TVs ativas" value={format(tvs.filter((tv) => tv.activation_status === "ativa").length)} hint="Status de ativação, não de conexão" icon={CheckCircle2} tone="success" />
        <Stat label="TVs pendentes" value={format(tvs.filter((tv) => tv.activation_status === "pendente").length)} hint="Aguardando ativação" icon={Clock} tone="warning" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Clientes por plano" description="Distribuição dos cadastros consultados no banco">
          <DataTable head={["Plano", "Clientes"]}>
            {distribution.map((plan) => <tr key={plan.id}><td>{plan.name}</td><td>{format(plan.count)}</td></tr>)}
            <tr><td>Sem plano</td><td>{format(noPlan)}</td></tr>
            {unknownPlan > 0 && <tr><td>Plano não disponível para consulta</td><td>{format(unknownPlan)}</td></tr>}
          </DataTable>
        </Panel>
        <Panel title="Situação dos dispositivos" description="Ativação registrada, independente de conexão">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt>Inativas</dt><dd className="font-medium tabular-nums">{format(tvs.filter((tv) => tv.activation_status === "inativa").length)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Bloqueadas</dt><dd className="font-medium tabular-nums">{format(tvs.filter((tv) => tv.activation_status === "bloqueada").length)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Não há telemetria de conexão integrada a este painel. Por isso, não exibimos indicadores online/offline, disponibilidade ou exibições.</p>
          <p className="mt-2 text-xs text-muted-foreground">Cadastre TVs em Clientes → Novo Cliente ou Editar cadastro.</p>
        </Panel>
      </div>
    </QueryState>
  </>;
}
