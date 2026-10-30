import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { ClientGuideNav, ClientGuidePanels } from "@/components/app/ClientGuide";
import type { ClientRow } from "@/lib/api";

const queries = vi.hoisted(() => ({
  establishments: vi.fn(), devices: vi.fn(), plans: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  establishmentsQuery: { queryKey: ["establishments"], queryFn: () => queries.establishments() },
  devicesQuery: { queryKey: ["devices"], queryFn: () => queries.devices() },
  plansQuery: { queryKey: ["plans"], queryFn: () => queries.plans() },
  orientationLabel: { horizontal: "Horizontal", vertical: "Vertical" },
  activationLabel: { pendente: "Pendente", ativa: "Ativa" },
}));

function mount(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{children}</QueryClientProvider>);
}
const client = { id: "client-1", name: "Cliente do teste" } as ClientRow;

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Estrutura visual do cadastro guiado", () => {
  it("permite navegar pelas quatro etapas e identifica a etapa atual", () => {
    function Navigation() {
      const [step, setStep] = useState(0);
      return <ClientGuideNav step={step} onStep={setStep} />;
    }
    mount(<Navigation />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /Etapa 3 TVs/ }));
    expect(screen.getByRole("button", { name: /Etapa 3 TVs/ }).getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: /Etapa 1 Dados do cliente/ }));
    expect(screen.getByRole("button", { name: /Etapa 1 Dados do cliente/ }).getAttribute("aria-current")).toBe("step");
  });

  it("não consulta vínculos de um cliente ainda não salvo e bloqueia novas TVs", async () => {
    queries.plans.mockResolvedValue([]);
    mount(<ClientGuidePanels step={2} client={null} name="" planId="" />);
    expect(await screen.findByText("Sem plano selecionado · 0 TV(s) cadastrada(s)")).toBeTruthy();
    expect(queries.establishments).not.toHaveBeenCalled();
    expect(queries.devices).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Adicionar \/ configurar nova TV/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Limite não confirmado/)).toBeTruthy();
  });

  it("mostra somente as TVs do cliente e alerta quando excedem o plano", async () => {
    queries.plans.mockResolvedValue([{ id: "plan-1", name: "Plano do teste", max_tvs: 1 }]);
    queries.establishments.mockResolvedValue([{ id: "est-1", client_id: "client-1", name: "Unidade do teste", status: "ativo" }]);
    queries.devices.mockResolvedValue([
      { id: "tv-1", name: "Tela A", establishment_id: "est-1", establishments: { client_id: "client-1" }, device_code: "A", orientation: "horizontal", activation_status: "pendente" },
      { id: "tv-2", name: "Tela B", establishment_id: "est-1", establishments: { client_id: "client-1" }, device_code: "B", orientation: "vertical", activation_status: "ativa" },
      { id: "tv-3", name: "Tela de outro cliente", establishment_id: "est-2", establishments: { client_id: "client-2" } },
    ]);
    mount(<ClientGuidePanels step={2} client={client} name={client.name} planId="plan-1" />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("excede o limite"));
    expect(screen.getByText("Tela A")).toBeTruthy();
    expect(screen.getByText("Tela B")).toBeTruthy();
    expect(screen.queryByText("Tela de outro cliente")).toBeNull();
    expect((screen.getByLabelText("Quantidade de TVs cadastradas") as HTMLInputElement).value).toBe("2");
  });

  it("não apresenta erro de consulta como ausência de vínculos", async () => {
    queries.plans.mockResolvedValue([]);
    queries.establishments.mockRejectedValue(new Error("Falha de consulta"));
    queries.devices.mockResolvedValue([]);
    mount(<ClientGuidePanels step={1} client={client} name={client.name} planId="" />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Não foi possível consultar"));
    expect(screen.queryByText("Nenhum estabelecimento vinculado.")).toBeNull();
  });
});
