import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientForm } from "@/components/app/ClientForm";
const mocks = vi.hoisted(() => ({ persist: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/client-form", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/client-form")>(), persistClientForm: mocks.persist }));
vi.mock("@/lib/api", () => ({ canEditReserve: (admin: boolean) => admin, clampReserve: (n: number) => n,
 clientsQuery: { queryKey: ["clients"], queryFn: async () => [] }, establishmentsQuery: { queryKey: ["establishments"], queryFn: async () => [] }, devicesQuery: { queryKey: ["devices"], queryFn: async () => [] }, plansQuery: { queryKey: ["plans"], queryFn: async () => [{ id: "plan-1", name: "Plano teste", max_tvs: 3, default_reserved_percent: 30, active: true }] }, saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); mocks.persist.mockResolvedValue(undefined); }); afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function mount() { const close = vi.fn(); const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<QueryClientProvider client={qc}><ClientForm client={null} isAdmin onClose={close} /></QueryClientProvider>); fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Novo cliente" } }); await screen.findByRole("option", { name: "Plano teste" }); return { close }; }
describe("Envio do formulário", () => {
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
