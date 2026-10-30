import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardDonut } from "@/components/app/DashboardCharts";
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
  it("informa ausência de registros sem desenhar uma distribuição fictícia", () => {
    render(<DashboardDonut title="Orientação" description="TVs" rows={rows.map((row) => ({ ...row, value: 0 }))} unit="TVs" />);
    expect(screen.getByText("Sem dados para exibir")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("button", { name: /Ativas 0 · 0%/ })).toBeInTheDocument();
  });
});
