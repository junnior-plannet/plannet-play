import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { ClientStructureFields } from "@/components/app/ClientGuide";
import { hasStructureChanges, makeEstablishmentDrafts, resizeTvs, type EstablishmentDraft } from "@/lib/client-form";
import type { DeviceRow, EstablishmentRow } from "@/lib/api";

vi.mock("@/lib/api", () => ({ saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
beforeEach(() => { vi.stubGlobal("crypto", { randomUUID }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const plan = { name: "Plano teste", max_tvs: 3, active: true };
const saved: EstablishmentDraft = { id: "est-1", name: "Unidade A", saved: true, tvs: [{ id: "tv-1", name: "Recepção", orientation: "horizontal", saved: true }] };
function mount(initial: EstablishmentDraft[] = [], max = 3) {
  function Form() {
    const [drafts, setDrafts] = useState(initial);
    return <ClientStructureFields drafts={drafts} onChange={setDrafts} disabled={false} plan={{ ...plan, max_tvs: max }} />;
  }
  return render(<Form />);
}

describe("Seções do formulário único de Clientes", () => {
  it("mostra estabelecimentos e TVs juntos, sem navegação por etapas nem Resumo", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Estabelecimentos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "TVs por estabelecimento" })).toBeTruthy();
    expect(screen.queryByText("Resumo")).toBeNull();
    expect(screen.queryByText(/Etapa [1-4]/)).toBeNull();
  });
  it("adiciona estabelecimento, quantidade e orientação individual na mesma tela", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar estabelecimento" }));
    fireEvent.change(screen.getByLabelText("Nome do estabelecimento 1"), { target: { value: "Unidade nova" } });
    fireEvent.change(screen.getByLabelText("Quantidade de TVs · estabelecimento 1"), { target: { value: "2" } });
    expect(screen.getByLabelText("Nome da TV 1 · estabelecimento 1")).toHaveProperty("value", "TV 1");
    fireEvent.change(screen.getByLabelText("Nome da TV 2 · estabelecimento 1"), { target: { value: "Caixa" } });
    fireEvent.change(screen.getByLabelText("Orientação da TV 2 · estabelecimento 1"), { target: { value: "vertical" } });
    expect(screen.getByLabelText("Nome da TV 2 · estabelecimento 1")).toHaveProperty("value", "Caixa");
    expect(screen.getByLabelText("Orientação da TV 2 · estabelecimento 1")).toHaveProperty("value", "vertical");
    expect(screen.getAllByRole("option", { name: "Horizontal (16:9)" })).toHaveLength(2);
  });
  it("não deixa exceder o plano nem remover TVs e estabelecimentos já salvos", () => {
    mount([saved], 1);
    const count = screen.getByLabelText("Quantidade de TVs · estabelecimento 1");
    fireEvent.change(count, { target: { value: "2" } });
    expect(count).toHaveProperty("value", "1");
    fireEvent.change(count, { target: { value: "0" } });
    expect(count).toHaveProperty("value", "1");
    expect(screen.queryByRole("button", { name: /Remover novo estabelecimento/ })).toBeNull();
  });
  it("desabilita estrutura durante consulta e mostra excesso do plano", () => {
    render(<ClientStructureFields drafts={[saved]} onChange={vi.fn()} disabled plan={{ ...plan, max_tvs: 0 }} />);
    expect(screen.getByRole("alert").textContent).toContain("excede o limite");
    expect(screen.getByLabelText("Nome do estabelecimento 1")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Adicionar estabelecimento" })).toHaveProperty("disabled", true);
  });
  it("sem plano, não adiciona TVs, mas permite configurar as já salvas", () => {
    function Form() {
      const [drafts, setDrafts] = useState([saved]);
      return <ClientStructureFields drafts={drafts} onChange={setDrafts} disabled={false} plan={undefined} />;
    }
    render(<Form />);
    const count = screen.getByLabelText("Quantidade de TVs · estabelecimento 1");
    fireEvent.change(count, { target: { value: "2" } });
    expect(count).toHaveProperty("value", "1");
    expect(screen.getByLabelText("Nome da TV 1 · estabelecimento 1")).toHaveProperty("disabled", false);
  });
});

describe("Rascunhos e retomada", () => {
  it("carrega apenas vínculos do cliente e preserva IDs e orientação", () => {
    const establishments = [{ id: "est-1", client_id: "client-1", name: "A" }, { id: "est-2", client_id: "client-2", name: "B" }] as EstablishmentRow[];
    const devices = [{ id: "tv-1", establishment_id: "est-1", name: "Vertical", orientation: "vertical" }, { id: "tv-2", establishment_id: "est-2", name: "Outra", orientation: "horizontal" }] as DeviceRow[];
    expect(makeEstablishmentDrafts("client-1", establishments, devices)).toEqual([{ id: "est-1", name: "A", saved: true, tvs: [{ id: "tv-1", name: "Vertical", orientation: "vertical", saved: true }] }]);
  });
  it("reduz apenas TVs não salvas e mantém os IDs das restantes", () => {
    let next = 0;
    const draft = resizeTvs(saved, 3, () => `new-${++next}`);
    expect(resizeTvs(draft, 2, () => "unused").tvs.map((tv) => tv.id)).toEqual(["tv-1", "new-1"]);
    expect(resizeTvs(draft, 0, () => "unused")).toBe(draft);
    expect(resizeTvs(draft, 1.5, () => "unused")).toBe(draft);
  });
  it("identifica alterações de estabelecimentos ou TVs para pedir confirmação", () => {
    expect(hasStructureChanges([saved], [saved])).toBe(false);
    expect(hasStructureChanges([{ ...saved, name: "Outro nome" }], [saved])).toBe(true);
    expect(hasStructureChanges([{ ...saved, tvs: [{ ...saved.tvs[0]!, orientation: "vertical" }] }], [saved])).toBe(true);
    expect(hasStructureChanges([{ id: "new", name: "", saved: false, tvs: [] }], [])).toBe(true);
  });
});
