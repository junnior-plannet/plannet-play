import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientRow } from "@/lib/api";
import { serializeAddress } from "@/lib/client-address";
import { ClientForm } from "@/components/app/ClientForm";
const mocks = vi.hoisted(() => ({ persist: vi.fn(), success: vi.fn(), error: vi.fn(), establishments: [] as unknown[], devices: [] as unknown[] }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/client-form", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/client-form")>(), persistClientForm: mocks.persist }));
vi.mock("@/lib/api", () => ({ canEditReserve: (admin: boolean) => admin, clampReserve: (n: number) => n,
 clientsQuery: { queryKey: ["clients"], queryFn: async () => [] }, establishmentsQuery: { queryKey: ["establishments"], queryFn: async () => mocks.establishments }, devicesQuery: { queryKey: ["devices"], queryFn: async () => mocks.devices }, plansQuery: { queryKey: ["plans"], queryFn: async () => [{ id: "plan-1", name: "Plano teste", max_tvs: 3, default_reserved_percent: 30, active: true }] }, saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); mocks.establishments = []; mocks.devices = []; mocks.persist.mockResolvedValue(undefined); }); afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function mount() { const close = vi.fn(); const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<QueryClientProvider client={qc}><ClientForm client={null} isAdmin onClose={close} /></QueryClientProvider>); fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Novo cliente" } }); await screen.findByRole("option", { name: "Plano teste" }); return { close }; }
describe("Envio do formulário", () => {
 it("carrega endereço e TV vertical ao editar preservando IDs", async () => {
  const address = { cep: "49010000", street: "Rua A", number: "10", complement: "Sala 2", district: "Centro", city: "Aracaju", state: "SE" };
  mocks.establishments = [{ id: "est-real", client_id: "client-real", name: "Cliente existente", created_at: "2026-01-01", city: "Aracaju", district: "Centro", address: serializeAddress(address) }];
  mocks.devices = [{ id: "tv-real", establishment_id: "est-real", name: "Recepção", orientation: "vertical" }];
  const client = { id: "client-real", name: "Cliente existente", plan_id: "plan-1", city: "Aracaju", status: "ativo", plannet_reserved_percent: 30 } as ClientRow;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><ClientForm client={client} isAdmin onClose={vi.fn()} /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByLabelText("Orientação da TV 1")).toHaveProperty("value", "vertical"));
  expect(screen.getByLabelText("Número")).toHaveProperty("value", "10"); expect(screen.getByLabelText("Quantidade de TVs")).toHaveProperty("value", "1");
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
  expect(mocks.persist.mock.calls[0]?.[0]).toMatchObject({ id: "client-real", address, establishments: [{ id: "est-real", tvs: [{ id: "tv-real", orientation: "vertical", saved: true }] }] });
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
 it("envia nomes de três TVs e percentual do plano selecionado", async () => { await mount(); fireEvent.change(screen.getByLabelText("Plano contratado"), { target: { value: "plan-1" } }); fireEvent.change(screen.getByLabelText("Quantidade de TVs"), { target: { value: "3" } }); fireEvent.change(screen.getByLabelText("Nome da TV 3"), { target: { value: "Caixa" } }); fireEvent.change(screen.getByLabelText("Orientação da TV 3"), { target: { value: "vertical" } }); fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1)); expect(mocks.persist.mock.calls[0]?.[0].establishments[0].tvs.map((t: { name: string }) => t.name)).toEqual(["TV 1", "TV 2", "Caixa"]); expect(mocks.persist.mock.calls[0]?.[0].values.plannet_reserved_percent).toBe(30); expect(mocks.persist.mock.calls[0]?.[0].establishments[0].tvs[2].orientation).toBe("vertical"); });
 it("retoma erro com os mesmos IDs sem fechar", async () => { const { close } = await mount(); mocks.persist.mockRejectedValueOnce(Error("Sem conexão")); fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.error).toHaveBeenCalled()); const first = mocks.persist.mock.calls[0]?.[0]; fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" })); await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(2)); expect(mocks.persist.mock.calls[1]?.[0].id).toBe(first.id); expect(mocks.persist.mock.calls[1]?.[0].establishments[0].id).toBe(first.establishments[0].id); await waitFor(() => expect(close).toHaveBeenCalledTimes(1)); });
});
