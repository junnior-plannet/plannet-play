import { describe, expect, it } from "vitest";
import { buildDashboardData, formatPercent } from "@/lib/dashboard";

const clients = [
  { id: "c1", name: "Mesmo nome", plan_id: "p1" },
  { id: "c2", name: "Mesmo nome", plan_id: null },
  { id: "c3", name: "Sem TV", plan_id: "unavailable" },
];
const establishments = [
  { id: "e1", client_id: "c1", city: " Aracaju " },
  { id: "e2", client_id: "c2", city: "ARACAJU" },
  { id: "e3", client_id: "c1", city: null },
];
const devices = [
  { establishment_id: "e1", activation_status: "ativa" as const, orientation: "horizontal" as const },
  { establishment_id: "e2", activation_status: "pendente" as const, orientation: "vertical" as const },
  { establishment_id: "e3", activation_status: "inativa" as const, orientation: "horizontal" as const },
  { establishment_id: "not-visible", activation_status: "bloqueada" as const, orientation: "vertical" as const },
];
const plans = [{ id: "p1", name: "Plano cadastrado" }];
const sum = (rows: { value: number }[]) => rows.reduce((total, row) => total + row.value, 0);

describe("Agregações reais do Dashboard", () => {
  it("usa ativação e orientação, sem inferir conexão online", () => {
    const result = buildDashboardData(clients, devices, establishments, plans);
    expect(result.status.map((row) => [row.id, row.value])).toEqual([
      ["ativa", 1], ["pendente", 1], ["inativa", 1], ["bloqueada", 1],
    ]);
    expect(result.orientation.map((row) => row.value)).toEqual([2, 2]);
    expect(result.status.some((row) => /online/i.test(row.name))).toBe(false);
  });
  it("mantém clientes homônimos separados e identifica vínculos indisponíveis", () => {
    const result = buildDashboardData(clients, devices, establishments, plans);
    expect(result.byClient.find((row) => row.id === "c1")?.value).toBe(2);
    expect(result.byClient.find((row) => row.id === "c2")?.value).toBe(1);
    expect(result.byClient.find((row) => row.id === "c3")?.value).toBe(0);
    expect(result.byClient.find((row) => row.id === "unavailable-client")?.value).toBe(1);
    expect(sum(result.byClient)).toBe(devices.length);
  });
  it("agrupa municípios sem diferenciar caixa ou espaços e não inventa cidade", () => {
    const result = buildDashboardData(clients, devices, establishments, plans);
    expect(result.byCity.find((row) => row.id === "aracaju")?.value).toBe(2);
    expect(result.byCity.find((row) => /não informado/.test(row.name))?.value).toBe(2);
    expect(sum(result.byCity)).toBe(devices.length);
  });
  it("atribui cores distintas às categorias do gráfico principal", () => {
    const result = buildDashboardData(clients, devices, establishments, plans);
    const colors = result.byCity.map((row) => row.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.every((color) => color.startsWith("var("))).toBe(true);
  });
  it("conta clientes por plano, incluindo ausentes e planos não acessíveis", () => {
    const result = buildDashboardData(clients, devices, establishments, plans);
    expect(result.byPlan.map((row) => row.value)).toEqual([1, 1, 1]);
    expect(sum(result.byPlan)).toBe(clients.length);
    expect(sum(result.orientation)).toBe(devices.length);
    expect(sum(result.status)).toBe(devices.length);
  });
  it("não fabrica valores quando não existem registros", () => {
    const result = buildDashboardData([], [], [], []);
    expect(sum(result.status)).toBe(0);
    expect(result.byClient).toEqual([]);
    expect(result.byCity).toEqual([]);
    expect(sum(result.byPlan)).toBe(0);
    expect(formatPercent(0, 0)).toBe("0%");
    expect(formatPercent(1, 4)).toBe("25%");
  });
});
