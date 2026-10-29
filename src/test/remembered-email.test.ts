import { describe, expect, it } from "vitest";
import { readRememberedEmail, rememberEmail, REMEMBERED_EMAIL_KEY } from "@/lib/remembered-email";

describe("Lembrar meu usuário", () => {
  it("armazena somente o e-mail quando selecionado", () => {
    const data = new Map<string, string>();
    const storage = { setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k), getItem: (k: string) => data.get(k) ?? null };
    rememberEmail(storage, " cliente@example.com ", true);
    expect([...data.entries()]).toEqual([[REMEMBERED_EMAIL_KEY, "cliente@example.com"]]);
    expect(readRememberedEmail(storage)).toBe("cliente@example.com");
  });
  it("remove o e-mail ao desmarcar a opção", () => {
    const data = new Map([[REMEMBERED_EMAIL_KEY, "cliente@example.com"]]);
    rememberEmail({ setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }, "cliente@example.com", false);
    expect(data.has(REMEMBERED_EMAIL_KEY)).toBe(false);
  });
});