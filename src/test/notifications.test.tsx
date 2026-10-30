import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "@/components/app/NotificationCenter";
import { canUseNotifications, formatNotificationDate, notificationSource, selectNotifications, type AdminNotification, type NotificationSource } from "@/lib/notifications";
import type { Me } from "@/lib/auth";

const auth = vi.hoisted(() => ({ me: null as Me | null }));
vi.mock("@/lib/auth", () => ({ useMe: () => ({ data: auth.me }) }));
vi.mock("@/components/app/NotificationTarget", () => ({
  NotificationTarget: ({ item, onBack }: { item: AdminNotification; onBack: () => void }) => <div>Registro: {item.clientName}<button onClick={onBack}>Voltar às notificações</button></div>,
}));

// Test-only fixtures. The application never seeds, persists or displays these events.
const old: AdminNotification = { id: "test-old", kind: "client", title: "Cadastro de teste", description: "Evento restrito ao teste", clientId: "test-client", clientName: "Cliente de teste", deviceId: null, deviceName: null, createdAt: "2026-01-01T10:00:00Z", readAt: "2026-01-01T11:00:00Z" };
const recent: AdminNotification = { ...old, id: "test-new", kind: "device", title: "TV de teste ativada", deviceId: "test-device", deviceName: "TV de teste", createdAt: "2026-01-02T10:00:00Z", readAt: null };
const admin: Me = { userId: "test-admin", email: "test@example.test", fullName: "Teste", isAdmin: true, clientIds: [] };
const clients: QueryClient[] = [];
beforeEach(() => { auth.me = admin; });
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.clearAllMocks(); });

function mount(source: NotificationSource | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(qc);
  return render(<QueryClientProvider client={qc}><NotificationCenter source={source} /></QueryClientProvider>);
}

function makeSource() {
  let items = [old, recent];
  let onChange = () => {};
  const unsubscribe = vi.fn();
  const source: NotificationSource = {
    key: "test-only",
    list: vi.fn(async () => ({ items, unreadCount: items.filter((item) => !item.readAt).length })),
    markRead: vi.fn(async (id: string) => { items = items.map((item) => item.id === id ? { ...item, readAt: "2026-01-03T00:00:00Z" } : item); }),
    markAllRead: vi.fn(async () => { items = items.map((item) => ({ ...item, readAt: "2026-01-03T00:00:00Z" })); }),
    subscribe: vi.fn((callback: () => void) => { onChange = callback; return unsubscribe; }),
  };
  return { source, unsubscribe, arrive: () => { items = [{ ...recent, id: "test-arrival", title: "Novo evento de teste" }, ...items]; onChange(); } };
}

describe("Central de Notificações", () => {
  it("permanece desconectada em produção e nega acesso sem papel administrativo real", () => {
    expect(notificationSource).toBeNull();
    expect(canUseNotifications(null)).toBe(false);
    expect(canUseNotifications({ isAdmin: false })).toBe(false);
    expect(canUseNotifications({ isAdmin: true })).toBe(true);
    const { source } = makeSource();
    auth.me = { ...admin, isAdmin: false, clientIds: ["test-client"] };
    mount(source);
    expect(screen.queryByRole("button", { name: /Notificações/ })).toBeNull();
    expect(source.list).not.toHaveBeenCalled();
    expect(source.subscribe).not.toHaveBeenCalled();
  });

  it("ordena por data sem alterar a fonte, filtra não lidas e trata data inválida", () => {
    const items = [old, recent];
    expect(selectNotifications(items, false).map((item) => item.id)).toEqual([recent.id, old.id]);
    expect(selectNotifications(items, true)).toEqual([recent]);
    expect(items).toEqual([old, recent]);
    expect(formatNotificationDate("inválida")).toBe("Data indisponível");
  });

  it("abre o painel com pendência explícita, sem contador inventado ou ações de leitura", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Integração pendente de autorização" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar todas como lidas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
    expect(screen.queryByText("0 não lidas")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Não lidas" }));
    expect(screen.getByRole("button", { name: "Não lidas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("conecta lista, filtros, leitura individual e leitura em lote ao adaptador", async () => {
    const { source } = makeSource();
    mount(source);
    fireEvent.click(await screen.findByRole("button", { name: "Notificações: 1 não lidas" }));
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(recent.title);
    fireEvent.click(screen.getByRole("button", { name: "Não lidas" }));
    expect(screen.queryByText(old.title)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como lida" }));
    await waitFor(() => expect(source.markRead).toHaveBeenCalledWith(recent.id));
    await screen.findByText("Nenhuma notificação não lida");
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText(old.title)).toBeInTheDocument();
  });

  it("atualiza por assinatura, anima somente novas chegadas e libera a assinatura", async () => {
    const { source, arrive, unsubscribe } = makeSource();
    const view = mount(source);
    const trigger = await screen.findByRole("button", { name: "Notificações: 1 não lidas" });
    expect(trigger.querySelector(".notification-arrival")).toBeNull();
    arrive();
    await screen.findByRole("button", { name: "Notificações: 2 não lidas" });
    await waitFor(() => expect(trigger.querySelector(".notification-arrival")).not.toBeNull());
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Marcar todas como lidas" }));
    await waitFor(() => expect(source.markAllRead).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Marcar todas como lidas" })).toBeDisabled());
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("abre o registro vinculado e não transforma falha de leitura em sucesso", async () => {
    const { source } = makeSource();
    source.markRead = vi.fn().mockRejectedValue(new Error("Falha de teste"));
    mount(source);
    fireEvent.click(await screen.findByRole("button", { name: "Notificações: 1 não lidas" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir TV" }));
    expect(await screen.findByText("Registro: Cliente de teste")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar a leitura");
    expect(screen.getByTitle("Central de Notificações")).toHaveAttribute("aria-label", "Notificações: 1 não lidas");
  });

  it("remove o sino e encerra assinatura quando o acesso administrativo é revogado", async () => {
    const { source, unsubscribe } = makeSource();
    const qc = new QueryClient();
    clients.push(qc);
    const content = () => <QueryClientProvider client={qc}><NotificationCenter source={source} /></QueryClientProvider>;
    const view = render(content());
    await screen.findByRole("button", { name: "Notificações: 1 não lidas" });
    auth.me = { ...admin, isAdmin: false };
    view.rerender(content());
    expect(screen.queryByTitle("Central de Notificações")).toBeNull();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("não consulta a fonte sem sessão", () => {
    const { source } = makeSource();
    auth.me = null;
    mount(source);
    expect(source.list).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
