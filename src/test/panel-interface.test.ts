import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { navGroups } from "@/components/app/nav";

const readSrc = (path: string) => readFileSync(resolve(process.cwd(), "src", path), "utf8");
const shell = readSrc("components/app/AppShell.tsx");
const establishmentsRoute = readSrc("routes/_authenticated/estabelecimentos.tsx");
const clientsPage = readSrc("routes/_authenticated/clientes.tsx");

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
    const notificationConfig = readSrc("lib/notifications.ts");
    expect(notificationConfig).toContain("notificationSource: NotificationSource | null = null");
  });

  it("mantém a área de acessos apenas na edição administrativa", () => {
    expect(clientsPage).toContain('editing !== "new" && isAdmin && <Members');
    expect(clientsPage).toContain("addMemberByEmail(clientId, email)");
    expect(clientsPage).toContain("mutationFn: removeMember");
  });
});
