import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { navGroups } from "@/components/app/nav";

const shell = readFileSync(new URL("../components/app/AppShell.tsx", import.meta.url), "utf8");
const establishmentsRoute = readFileSync(new URL("../routes/_authenticated/estabelecimentos.tsx", import.meta.url), "utf8");
const clientsPage = readFileSync(new URL("../routes/_authenticated/clientes.tsx", import.meta.url), "utf8");

// Structural regression checks only: these do not assert browser behavior or real permissions.
describe("Interface do painel — contratos estruturais", () => {
  it("não expõe cadastro manual de estabelecimentos ou módulo demonstrativo no menu", () => {
    const items = navGroups.flatMap((group) => group.items);
    expect(items.some((item) => item.url === "/estabelecimentos")).toBe(false);
    expect(items.some((item) => /demonstra|\bdemo\b/i.test(`${item.title} ${item.url}`))).toBe(false);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: "/clientes" }),
      expect.objectContaining({ url: "/telas" }),
      expect.objectContaining({ url: "/playlists" }),
      expect.objectContaining({ url: "/monitoramento" }),
    ]));
  });

  it("mantém a rota antiga como redirecionamento sem formulário manual", () => {
    expect(establishmentsRoute).toContain('redirect({ to: "/telas" })');
    expect(establishmentsRoute).not.toContain("saveEstablishment");
  });

  it("preserva navegação, perfil e saída sem busca ou notificações fictícias", () => {
    expect(shell).toContain("<header");
    expect(shell).toContain("<SidebarTrigger />");
    expect(shell).toContain("<AppSidebar />");
    expect(shell).toContain("<UserFooter />");
    expect(shell).toContain('aria-label="Sair"');
    expect(shell).not.toContain("Buscar clientes, dispositivos, campanhas...");
    expect(shell).toContain("<NotificationCenter />");
    const notificationConfig = readFileSync(new URL("../lib/notifications.ts", import.meta.url), "utf8");
    expect(notificationConfig).toContain("notificationSource: NotificationSource | null = null");
  });

  it("mantém a área de acessos apenas na edição administrativa", () => {
    expect(clientsPage).toContain('editing !== "new" && isAdmin && <Members');
    expect(clientsPage).toContain("addMemberByEmail(clientId, email)");
    expect(clientsPage).toContain("mutationFn: removeMember");
  });
});
