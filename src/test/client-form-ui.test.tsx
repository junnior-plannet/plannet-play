import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { ClientForm } from "@/components/app/ClientForm";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/client-form", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/client-form")>(), persistClientForm: mocks.persist,
}));
vi.mock("@/lib/api", () => ({
  canEditReserve: (admin: boolean) => admin,
  clampReserve: (n: number) => Math.min(100, Math.max(0, Math.round(n))),
  clientsQuery: { queryKey: ["clients"], queryFn: async () => [] },
  establishmentsQuery: { queryKey: ["establishments"], queryFn: async () => [] },
  devicesQuery: { queryKey: ["devices"], queryFn: async () => [] },
  plansQuery: { queryKey: ["plans"], queryFn: async () => [{ id: "plan-1", name: "Plano teste", max_tvs: 3, active: true }] },
  saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", { randomUUID });
  mocks.persist.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mount() {
  const close = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><ClientForm client={null} isAdmin onClose={close} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Novo cliente" } });
  return { close };
}

describe("Ações do formulário de Clientes", () => {
  it("exibe as três seções sem etapas ou Resumo", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Dados do cliente" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Estabelecimentos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "TVs por estabelecimento" })).toBeTruthy();
    expect(screen.queryByText("Resumo")).toBeNull();
  });
  it("salva somente cliente sem confirmação quando não há rascunho de estrutura", async () => {
    const { close } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Salvar somente cliente" }));
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
    expect(mocks.persist.mock.calls[0]?.[0]).toMatchObject({ mode: "client", values: { name: "Novo cliente" } });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });
  it("avisa sobre dados não salvos, permite cancelar e só grava após confirmar", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar estabelecimento" }));
    fireEvent.change(screen.getByLabelText("Nome do estabelecimento 1"), { target: { value: "Unidade" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar somente cliente" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("não serão salvos");
    expect(mocks.persist).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao formulário" }));
    expect(screen.getByLabelText("Nome do estabelecimento 1")).toHaveProperty("value", "Unidade");
    expect(mocks.persist).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar somente cliente" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar: salvar somente cliente" }));
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
    expect(mocks.persist.mock.calls[0]?.[0].mode).toBe("client");
  });
  it("envia Salvar tudo com quantidade, nomes e orientação individuais", async () => {
    mount();
    await screen.findByRole("option", { name: "Plano teste" });
    fireEvent.change(screen.getByLabelText("Plano contratado"), { target: { value: "plan-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar estabelecimento" }));
    fireEvent.change(screen.getByLabelText("Nome do estabelecimento 1"), { target: { value: "Unidade" } });
    fireEvent.change(screen.getByLabelText("Quantidade de TVs · estabelecimento 1"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Nome da TV 1 · estabelecimento 1"), { target: { value: "Caixa" } });
    fireEvent.change(screen.getByLabelText("Orientação da TV 1 · estabelecimento 1"), { target: { value: "vertical" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar tudo" }));
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(1));
    expect(mocks.persist.mock.calls[0]?.[0]).toMatchObject({ mode: "all", establishments: [{ name: "Unidade", tvs: [{ name: "Caixa", orientation: "vertical" }] }] });
  });
  it("não fecha em caso de falha e permite nova tentativa com o mesmo ID", async () => {
    const { close } = mount();
    mocks.persist.mockRejectedValueOnce(new Error("Sem conexão"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar tudo" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(close).not.toHaveBeenCalled();
    const id = mocks.persist.mock.calls[0]?.[0].id;
    fireEvent.click(screen.getByRole("button", { name: "Salvar tudo" }));
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(2));
    expect(mocks.persist.mock.calls[1]?.[0].id).toBe(id);
  });
});
