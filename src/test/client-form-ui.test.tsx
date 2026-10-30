import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientForm } from "@/components/app/ClientForm";
import type { ClientRow } from "@/lib/api";
const mocks = vi.hoisted(() => ({ persist: vi.fn(), success: vi.fn(), error: vi.fn(), establishments: vi.fn(), devices: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/client-form", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/client-form")>(), persistClientForm: mocks.persist }));
vi.mock("@/lib/api", () => ({ canEditReserve: (admin: boolean) => admin, clampReserve: (n: number) => n,
 clientsQuery: { queryKey: ["clients"], queryFn: async () => [] }, establishmentsQuery: { queryKey: ["establishments"], queryFn: mocks.establishments }, devicesQuery: { queryKey: ["devices"], queryFn: mocks.devices }, plansQuery: { queryKey: ["plans"], queryFn: async () => [{ id: "plan-1", name: "Plano teste", max_tvs: 3, default_reserved_percent: 30, active: true }] }, saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); mocks.persist.mockResolvedValue(undefined); mocks.establishments.mockResolvedValue([]); mocks.devices.mockResolvedValue([]); }); afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function mount() { const close = vi.fn(); const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<QueryClientProvider client={qc}><ClientForm client={null} isAdmin onClose={close} /></QueryClientProvider>); fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Novo cliente" } }); await screen.findByRole("option", { name: "Plano teste" }); return { close }; }
describe("Envio do formulário", () => {
 it("separa o gerenciamento de acessos do formulário e o mantém recolhido na edição", async () => {
  const client = { id: "client-1", name: "Cliente salvo", plan_id: "plan-1", status: "ativo", plannet_reserved_percent: 30 } as ClientRow;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const link = vi.fn();
  render(<QueryClientProvider client={qc}><ClientForm client={client} isAdmin onClose={vi.fn()}><form aria-label="Gerenciar usuários" onSubmit={(e) => { e.preventDefault(); link(); }}><input aria-label="E-mail de acesso" type="email" required /><button type="submit">Vincular usuário</button></form></ClientForm></QueryClientProvider>);
  await screen.findByRole("option", { name: "Plano teste" });
  const summary = screen.getByText("Gerenciar acessos do cliente");
  const details = summary.closest("details");
  expect(details).not.toHaveAttribute("open");
  expect(summary.closest("form")).toBeNull();
  fireEvent.click(summary);
  const accessForm = screen.getByRole("form", { name: "Gerenciar usuários" });
  expect(accessForm.parentElement?.closest("form")).toBeNull();
  expect(screen.getByRole("button", { name: "Salvar cadastro" }).closest("form")).not.toContainElement(accessForm);
  fireEvent.change(screen.getByLabelText("E-mail de acesso"), { target: { value: "conta@example.com" } });
  fireEvent.submit(accessForm);
  expect(link).toHaveBeenCalledTimes(1);
  expect(mocks.persist).not.toHaveBeenCalled();
 });
 it("não expõe acessos no novo cadastro nem pede nome do estabelecimento", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><ClientForm client={null} isAdmin onClose={vi.fn()}><p>Área de usuários</p></ClientForm></QueryClientProvider>);
  await screen.findByLabelText("Quantidade de TVs");
  expect(screen.getByLabelText("Quantidade de TVs")).toHaveValue(0);
  expect(screen.queryByText("Área de usuários")).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/nome do estabelecimento/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/região/i)).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Dados do cliente" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Endereço" })).toBeInTheDocument();
  expect(screen.queryByRole("tab")).not.toBeInTheDocument();
 });
 it("consulta TVs salvas na edição e envia a orientação alterada sem mudar o vínculo", async () => {
  mocks.establishments.mockResolvedValue([{ id: "est-1", client_id: "client-1", name: "Cliente salvo", created_at: "2026-01-01" }]);
  mocks.devices.mockResolvedValue([{ id: "tv-1", establishment_id: "est-1", name: "Entrada", orientation: "vertical" }]);
  const client = { id: "client-1", name: "Cliente salvo", plan_id: "plan-1", status: "ativo", plannet_reserved_percent: 30, establishments: [{ id: "est-1", devices: [{ count: 1 }] }] } as ClientRow;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><ClientForm client={client} isAdmin onClose={vi.fn()} /></QueryClientProvider>);
  const orientation = await screen.findByLabelText("Orientação da TV 1");
  expect(screen.getByLabelText("Nome da TV 1")).toHaveValue("Entrada");
  expect(orientation).toHaveValue("vertical");
  fireEvent.change(orientation, { target: { value: "horizontal" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
  expect(mocks.persist.mock.calls[0]?.[0]).toMatchObject({ existing: true, establishments: [{ id: "est-1", saved: true, tvs: [{ id: "tv-1", name: "Entrada", orientation: "horizontal", saved: true }] }] });
 });
 it("envia orientação individual com Horizontal como padrão", async () => {
  await mount();
  fireEvent.change(screen.getByLabelText("Plano contratado"), { target: { value: "plan-1" } });
  fireEvent.change(screen.getByLabelText("Quantidade de TVs"), { target: { value: "2" } });
  expect(screen.getByLabelText("Orientação da TV 1")).toHaveValue("horizontal");
  expect(screen.getByLabelText("Orientação da TV 2")).toHaveValue("horizontal");
  fireEvent.change(screen.getByLabelText("Orientação da TV 2"), { target: { value: "vertical" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
  expect(mocks.persist.mock.calls[0]?.[0].establishments[0].tvs.map((tv: { orientation: string }) => tv.orientation)).toEqual(["horizontal", "vertical"]);
 });
 it("preenche CEP, permite corrigir cidade e envia endereço completo sem Região", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: "Rua A", bairro: "Centro", localidade: "Aracaju", uf: "SE" }) }));
  await mount();
  fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "49010000" } }); fireEvent.blur(screen.getByLabelText("CEP"));
  await waitFor(() => expect(screen.getByLabelText("Cidade")).toHaveProperty("value", "Aracaju"));
  fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "São Cristóvão" } }); fireEvent.change(screen.getByLabelText("Número"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
  const sent = mocks.persist.mock.calls[0]?.[0];
  expect(sent.address).toEqual({ cep: "49010000", street: "Rua A", number: "10", complement: "", district: "Centro", city: "São Cristóvão", state: "SE" });
  expect(sent.values).not.toHaveProperty("region");
 });
 it("salva zero TVs com estabelecimento de mesmo nome", async () => { await mount(); fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1)); expect(mocks.persist.mock.calls[0]?.[0]).toMatchObject({ values: { name: "Novo cliente" }, establishments: [{ name: "Novo cliente", tvs: [] }] }); });
 it("envia nomes de três TVs e percentual do plano selecionado", async () => { await mount(); fireEvent.change(screen.getByLabelText("Plano contratado"), { target: { value: "plan-1" } }); fireEvent.change(screen.getByLabelText("Quantidade de TVs"), { target: { value: "3" } }); fireEvent.change(screen.getByLabelText("Nome da TV 3"), { target: { value: "Caixa" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1)); expect(mocks.persist.mock.calls[0]?.[0].establishments[0].tvs.map((t: { name: string }) => t.name)).toEqual(["TV 1", "TV 2", "Caixa"]); expect(mocks.persist.mock.calls[0]?.[0].values.plannet_reserved_percent).toBe(30); });
 it("retoma erro com os mesmos IDs sem fechar", async () => { const { close } = await mount(); mocks.persist.mockRejectedValueOnce(Error("Sem conexão")); fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.error).toHaveBeenCalled()); const first = mocks.persist.mock.calls[0]?.[0]; fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(2)); expect(mocks.persist.mock.calls[1]?.[0].id).toBe(first.id); expect(mocks.persist.mock.calls[1]?.[0].establishments[0].id).toBe(first.establishments[0].id); await waitFor(() => expect(close).toHaveBeenCalledTimes(1)); });
});
