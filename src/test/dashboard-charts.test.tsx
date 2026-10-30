import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardBars, DashboardDonut } from "@/components/app/DashboardCharts";
import type { DashboardDatum } from "@/lib/dashboard";

const rows: DashboardDatum[] = [
  { id: "ativa", name: "Ativas", value: 3, color: "var(--success)" },
  { id: "pendente", name: "Pendentes", value: 1, color: "var(--warning)" },
  { id: "bloqueada", name: "Bloqueadas", value: 0, color: "var(--destructive)" },
];
afterEach(cleanup);

describe("Gráficos acessíveis do Dashboard", () => {
  it("permite destacar e desmarcar uma categoria pela legenda sem alterar os totais", () => {
    render(<DashboardDonut title="TVs por status" description="Ativação" rows={rows} unit="TVs" />);
    const active = screen.getByRole("button", { name: /Ativas 3 · 75%/ });
    expect(active).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(active);
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Ativas: 3 TVs (75%).")).toBeInTheDocument();
    fireEvent.click(active);
    expect(active).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("img")).toHaveAccessibleName(/4 TVs/);
    expect(screen.getByRole("button", { name: /Bloqueadas 0 · 0%/ })).toBeInTheDocument();
  });
  it("oferece tabela completa com quantidades e percentuais sem depender do mouse", () => {
    render(<DashboardDonut title="TVs por status" description="Ativação" rows={rows} unit="TVs" />);
    const toggle = screen.getByRole("button", { name: "Ver todos os dados" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    const table = screen.getByRole("table", { name: "Dados completos · TVs" });
    expect(within(table).getByRole("row", { name: "Ativas 3 75%" })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: "Pendentes 1 25%" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar dados" }));
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("mantém todas as categorias na tabela mesmo ao compactar as barras", () => {
    const ranking = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Cliente ${i + 1}`, value: 12 - i, color: "var(--chart-1)" }));
    render(<DashboardBars title="TVs por cliente" description="Clientes cadastrados" rows={ranking} />);
    expect(screen.getByText(/7 maiores categorias/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/78 TVs/);
    fireEvent.click(screen.getByRole("button", { name: "Ver todos os dados" }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(13);
    expect(within(table).getByRole("row", { name: "Cliente 12 1 1,3%" })).toBeInTheDocument();
  });
  it("informa ausência de registros sem desenhar uma distribuição fictícia", () => {
    render(<DashboardDonut title="Orientação" description="TVs" rows={rows.map((row) => ({ ...row, value: 0 }))} unit="TVs" />);
    expect(screen.getByText("Sem dados para exibir")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("button", { name: /Ativas 0 · 0%/ })).toBeInTheDocument();
  });
});
