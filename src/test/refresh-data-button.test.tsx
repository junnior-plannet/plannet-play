import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RefreshDataButton } from "@/components/app/RefreshDataButton";
const errors = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: errors } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("Atualização de dados", () => {
 it("aguarda a consulta e impede duplicação de solicitações", async () => {
  let resolve: () => void = () => {}; const pending = new Promise<void>((r) => { resolve = r; }); const refresh = vi.fn(() => pending);
  render(<RefreshDataButton refresh={refresh} />); const button = screen.getByRole("button"); fireEvent.click(button); fireEvent.click(button);
  expect(refresh).toHaveBeenCalledTimes(1); expect(button).toHaveProperty("disabled", true); await act(async () => { resolve(); await pending; }); await waitFor(() => expect(button).toHaveProperty("disabled", false)); await act(async () => { fireEvent.click(button); }); expect(refresh).toHaveBeenCalledTimes(2);
 });
 it("não consulta novamente enquanto consulta inicial está em andamento", () => { const refresh = vi.fn(); render(<RefreshDataButton refresh={refresh} fetching />); fireEvent.click(screen.getByRole("button")); expect(refresh).not.toHaveBeenCalled(); });
 it("avisa sobre falha e permite tentar novamente", async () => { const refresh = vi.fn().mockRejectedValue(Error("Sem conexão")); render(<RefreshDataButton refresh={refresh} />); fireEvent.click(screen.getByRole("button")); await waitFor(() => expect(errors).toHaveBeenCalledWith("Sem conexão")); expect(screen.getByRole("button")).toHaveProperty("disabled", false); });
});
