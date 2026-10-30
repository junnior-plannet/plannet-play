import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RefreshButton } from "@/components/app/RefreshButton";

const mocks = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mocks }));
afterEach(() => { cleanup(); onlineManager.setOnline(true); vi.clearAllMocks(); });

function deferred() {
  let resolve!: (value: number) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<number>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const clients = vi.fn().mockResolvedValue(1);
  const devices = vi.fn().mockResolvedValue(2);
  await qc.fetchQuery({ queryKey: ["clients"], queryFn: clients });
  await qc.fetchQuery({ queryKey: ["devices"], queryFn: devices });
  clients.mockClear(); devices.mockClear();
  render(<QueryClientProvider client={qc}><RefreshButton queryKeys={["clients", "devices"]} /></QueryClientProvider>);
  return { qc, clients, devices };
}

describe("Atualizar dados sem recarregar o navegador", () => {
  it("consulta novamente cada lista e atualiza os valores em cache", async () => {
    const { qc, clients, devices } = await mount();
    clients.mockResolvedValue(5); devices.mockResolvedValue(8);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(qc.getQueryData(["devices"])).toBe(8));
    expect(qc.getQueryData(["clients"])).toBe(5);
    expect(clients).toHaveBeenCalledTimes(1);
    expect(devices).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("bloqueia cliques duplicados e aguarda todas as consultas mesmo após falha", async () => {
    const { clients, devices } = await mount();
    const first = deferred(); const second = deferred();
    clients.mockReturnValue(first.promise); devices.mockReturnValue(second.promise);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    const button = screen.getByRole("button", { name: "Atualizando…" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(clients).toHaveBeenCalledTimes(1); expect(devices).toHaveBeenCalledTimes(1);
    first.reject(new Error("Sem conexão"));
    await waitFor(() => expect(button).toBeDisabled());
    expect(mocks.error).not.toHaveBeenCalled();
    second.resolve(10);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível atualizar");
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
  });

  it("informa falta de conexão sem iniciar consultas ou apresentar sucesso", async () => {
    const { clients, devices } = await mount();
    onlineManager.setOnline(false);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão");
    expect(clients).not.toHaveBeenCalled();
    expect(devices).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
  });

  it("permite tentar novamente depois de um erro", async () => {
    const { qc, clients } = await mount();
    clients.mockRejectedValueOnce(new Error("Falha"));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
    clients.mockResolvedValue(12);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(qc.getQueryData(["clients"])).toBe(12));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
