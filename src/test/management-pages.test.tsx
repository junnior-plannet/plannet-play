import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ clients: vi.fn(), devices: vi.fn(), plans: vi.fn(), establishments: vi.fn(), saveDevice: vi.fn(), error: vi.fn(), search: {} as { establishment?: string; client?: string } }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useSearch: () => mocks.search, useNavigate: () => vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ useMe: () => ({ data: { isAdmin: true } }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock("@/components/app/ClientForm", () => ({ ClientForm: () => null }));
vi.mock("@/lib/api", () => ({
  clientsQuery: { queryKey: ["clients"], queryFn: mocks.clients },
  devicesQuery: { queryKey: ["devices"], queryFn: mocks.devices },
  plansQuery: { queryKey: ["plans"], queryFn: mocks.plans },
  establishmentsQuery: { queryKey: ["establishments"], queryFn: mocks.establishments },
  orientationLabel: { horizontal: "Horizontal", vertical: "Vertical" },
  activationLabel: { ativa: "Ativa", pendente: "Pendente", inativa: "Inativa", bloqueada: "Bloqueada" },
  statusLabel: { ativo: "Ativo", inativo: "Inativo" },
  saveDevice: mocks.saveDevice, membersQuery: vi.fn(), addMemberByEmail: vi.fn(), removeMember: vi.fn(),
}));
import { Route as DashboardRoute } from "@/routes/_authenticated/index";
import { Route as DevicesRoute } from "@/routes/_authenticated/telas";
import { Route as ClientsRoute } from "@/routes/_authenticated/clientes";

const client = { id: "c1", name: "Cliente real", status: "ativo", plan_id: "p1", plans: { name: "Plano real" }, establishments: [{ id: "e1", devices: [{ count: 1 }] }], plannet_reserved_percent: 30 };
const device = { id: "tv1", name: "TV Entrada", device_code: "TV-REAL", establishment_id: "e1", orientation: "vertical", activation_status: "pendente", establishments: { client_id: "c1", clients: { name: "Cliente real" } } };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = {};
  mocks.clients.mockResolvedValue([client]); mocks.devices.mockResolvedValue([device]);
  mocks.plans.mockResolvedValue([{ id: "p1", name: "Plano real" }]); mocks.establishments.mockResolvedValue([{ id: "e1", client_id: "c1" }]);
  mocks.saveDevice.mockResolvedValue(device);
});
afterEach(cleanup);
function mount(component: ComponentType) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}>{createElement(component)}</QueryClientProvider>);
}

describe("Páginas gerenciais com dados isolados", () => {
  it("Dashboard não expõe cadastro de dispositivo e atualiza contadores pela consulta", async () => {
    mount(DashboardRoute.options.component as ComponentType);
    await screen.findByText("Plano real");
    expect(screen.queryByRole("button", { name: /Cadastrar Dispositivo/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Cadastrar Dispositivo/i })).toBeNull();
    expect(screen.getByText("TVs cadastradas").parentElement?.parentElement).toHaveTextContent("1");
    mocks.devices.mockResolvedValue([device, { ...device, id: "tv2", activation_status: "ativa" }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(screen.getByText("TVs cadastradas").parentElement?.parentElement).toHaveTextContent("2"));
    expect(mocks.devices).toHaveBeenCalledTimes(2);
    expect(screen.getByText("TVs ativas").parentElement?.parentElement).toHaveTextContent("1");
  });
  it("Dashboard apresenta um único gráfico principal multicolorido e o atualiza sem recarregar a página", async () => {
    mocks.establishments.mockResolvedValue([{ id: "e1", client_id: "c1", city: "Aracaju" }]);
    mount(DashboardRoute.options.component as ComponentType);
    await screen.findByRole("heading", { name: "Distribuição por município" });
    for (const title of ["TVs por status", "Clientes por plano", "Orientação das TVs", "TVs por cliente"]) {
      expect(screen.queryByRole("heading", { name: title })).toBeNull();
    }
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Aracaju 1 · 100%/ })).toBeInTheDocument();
    mocks.devices.mockResolvedValue([device, { ...device, id: "tv2", activation_status: "ativa", orientation: "horizontal" }]);
    mocks.establishments.mockResolvedValue([{ id: "e1", client_id: "c1", city: "São Cristóvão" }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await screen.findByRole("img", { name: /Distribuição por município: 2 TVs/ });
    for (const query of [mocks.clients, mocks.devices, mocks.plans, mocks.establishments]) {
      expect(query).toHaveBeenCalledTimes(2);
    }
    fireEvent.click(screen.getByRole("button", { name: "Ver todos os dados" }));
    expect(screen.getByText("São Cristóvão")).toBeInTheDocument();
    expect(screen.queryByText("Aracaju")).toBeNull();
  });
  it("Clientes consulta novamente a lista ao atualizar", async () => {
    mount(ClientsRoute.options.component as ComponentType);
    await screen.findAllByText("Cliente real");
    mocks.clients.mockResolvedValue([{ ...client, name: "Cliente atualizado" }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await screen.findAllByText("Cliente atualizado");
    expect(mocks.clients).toHaveBeenCalledTimes(2);
  });
  it("Dispositivos mostra Cliente e orientação e permite editar sem trocar vínculo", async () => {
    mount(DevicesRoute.options.component as ComponentType);
    await screen.findByText("TV-REAL");
    expect(screen.getByRole("columnheader", { name: "Cliente" })).toBeInTheDocument();
    expect(screen.getByText("Vertical (9:16)")).toBeInTheDocument();
    expect(screen.queryByText("Online", { exact: true })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nova TV" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Orientação")).toHaveValue("vertical");
    fireEvent.change(screen.getByLabelText("Orientação"), { target: { value: "horizontal" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar TV" }));
    await waitFor(() => expect(mocks.saveDevice).toHaveBeenCalledWith("tv1", expect.objectContaining({ establishment_id: "e1", name: "TV Entrada", orientation: "horizontal" })));
  });
  it("preserva filtros antigos por estabelecimento sem listar outras TVs do cliente", async () => {
    mocks.search = { establishment: "e1" };
    mocks.devices.mockResolvedValue([device, { ...device, id: "tv2", establishment_id: "e2", name: "TV de outro local", device_code: "OUTRO-LOCAL" }]);
    mount(DevicesRoute.options.component as ComponentType);
    await screen.findByText("TV-REAL");
    expect(screen.queryByText("OUTRO-LOCAL")).toBeNull();
  });
  it.each([
    ["Dashboard", DashboardRoute, mocks.plans],
    ["Clientes", ClientsRoute, mocks.clients],
  ] as const)("%s informa falha de atualização e permite nova tentativa", async (_name, route, query) => {
    mount(route.options.component as ComponentType);
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
    query.mockRejectedValueOnce(new Error("Consulta indisponível"));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0));
  });
  it("Dispositivos atualiza a lista e informa falha sem afirmar sucesso", async () => {
    mount(DevicesRoute.options.component as ComponentType);
    await screen.findByText("TV-REAL");
    mocks.devices.mockResolvedValue([{ ...device, name: "TV atualizada" }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await screen.findByText("TV atualizada");
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
    mocks.devices.mockRejectedValue(new Error("Consulta indisponível"));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});
