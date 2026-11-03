import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardArea, DashboardDonut } from "@/components/app/DashboardCharts";
import type { DashboardDatum } from "@/lib/dashboard";

const rows: DashboardDatum[] = [
  { id: "ativa", name: "Ativas", value: 3, color: "var(--success)" },
  { id: "pendente", name: "Pendentes", value: 1, color: "var(--warning)" },
  { id: "bloqueada", name: "Bloqueadas", value: 0, color: "var(--destructive)" },
];
afterEach(cleanup);

describe("Gráficos do Dashboard", () => {
  it("não inventa atividade na ausência de telemetria ou com um único registro", () => {
    const { rerender } = render(<DashboardArea />);
    expect(screen.getByRole("status")).toHaveTextContent("Sem dados de atividade por horário");
    rerender(<DashboardArea rows={[{ hour: "10:00", value: 2 }]} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<DashboardArea rows={[{ hour: "10:00", value: 2 }, { hour: "11:00", value: 3 }]} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("mostra a legenda com nome e quantidade real de cada categoria", () => {
    render(<DashboardDonut title="Distribuição por região" description="Telas cadastradas" rows={rows} unit="TVs" />);
    const legend = screen.getByRole("list", { name: "Legenda · Distribuição por região" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(3);
    expect(within(legend).getByText("Ativas").parentElement).toHaveTextContent("3");
    expect(screen.getByRole("img")).toHaveAccessibleName(/4 TVs/);
  });
  it("informa ausência de registros sem desenhar uma distribuição fictícia", () => {
    render(<DashboardDonut title="Orientação" description="TVs" rows={rows.map((row) => ({ ...row, value: 0 }))} unit="TVs" />);
    expect(screen.getByText("Sem dados para exibir")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
