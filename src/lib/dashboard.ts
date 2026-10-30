import type { ClientRow, DeviceRow, EstablishmentRow } from "@/lib/api";

export type DashboardDatum = { id: string; name: string; value: number; color: string };
const cyan = "var(--dashboard-cyan)";
const palette = [cyan, "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)"];
export const formatCount = (value: number) => value.toLocaleString("pt-BR");
export const formatPercent = (value: number, total: number) =>
  `${(total ? value * 100 / total : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Only joins records visible to the current Supabase session. Never infers missing relationships. */
export function buildDashboardData(
  clients: Pick<ClientRow, "id" | "name" | "plan_id">[],
  devices: Pick<DeviceRow, "establishment_id" | "activation_status" | "orientation">[],
  establishments: Pick<EstablishmentRow, "id" | "client_id" | "city">[],
  plans: { id: string; name: string }[],
) {
  const locations = new Map(establishments.map((place) => [place.id, place]));
  const clientCounts = new Map(clients.map((client) => [client.id, { id: client.id, name: client.name, value: 0, color: cyan }]));
  const cities = new Map<string, DashboardDatum>();
  let unlinked = 0;
  for (const device of devices) {
    const place = locations.get(device.establishment_id);
    const client = place ? clientCounts.get(place.client_id) : undefined;
    if (client) client.value += 1;
    else unlinked += 1;
    const name = place?.city?.trim().replace(/\s+/g, " ") || "Município não informado/disponível";
    const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const row = cities.get(key) ?? { id: key, name, value: 0, color: cyan };
    row.value += 1;
    cities.set(key, row);
  }
  const byClient = [...clientCounts.values()];
  if (unlinked) byClient.push({ id: "unavailable-client", name: "Cliente não disponível para consulta", value: unlinked, color: cyan });
  const rank = (rows: DashboardDatum[]) => rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
  const status = [
    { id: "ativa", name: "Ativas", color: "var(--success)" },
    { id: "pendente", name: "Pendentes", color: "var(--warning)" },
    { id: "inativa", name: "Inativas", color: "var(--muted-foreground)" },
    { id: "bloqueada", name: "Bloqueadas", color: "var(--destructive)" },
  ].map((row) => ({ ...row, value: devices.filter((device) => device.activation_status === row.id).length }));
  const orientation = [
    { id: "horizontal", name: "Horizontal", color: cyan },
    { id: "vertical", name: "Vertical", color: "var(--chart-1)" },
  ].map((row) => ({ ...row, value: devices.filter((device) => device.orientation === row.id).length }));
  const byPlan = plans.map((plan, index) => ({
    id: plan.id, name: plan.name, color: palette[index % palette.length],
    value: clients.filter((client) => client.plan_id === plan.id).length,
  }));
  byPlan.push({ id: "no-plan", name: "Sem plano", value: clients.filter((client) => !client.plan_id).length, color: "var(--muted-foreground)" });
  const knownPlans = new Set(plans.map((plan) => plan.id));
  const unknown = clients.filter((client) => client.plan_id && !knownPlans.has(client.plan_id)).length;
  if (unknown) byPlan.push({ id: "unavailable-plan", name: "Plano não disponível para consulta", value: unknown, color: "var(--warning)" });
  const byCity = rank([...cities.values()]).map((row, index) => ({ ...row, color: palette[index % palette.length]! }));
  return { status, orientation, byClient: rank(byClient), byCity, byPlan };
}
