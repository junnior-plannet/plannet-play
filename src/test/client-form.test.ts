import { describe, expect, it, vi } from "vitest";
import type { ClientRow, DeviceRow, EstablishmentRow } from "@/lib/api";
import { persistClientForm, type ClientFormInput, type ClientFormStore, type ClientSnapshot } from "@/lib/client-form";

vi.mock("@/lib/api", () => ({ saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
const input = (): ClientFormInput => ({
  id: "client-1", existing: false, mode: "all", values: { name: "Cliente", plan_id: "plan-1" },
  establishments: [{ id: "est-1", name: "Unidade", saved: false, tvs: [{ id: "tv-1", name: "Recepção", orientation: "horizontal", saved: false }] }],
});
function setup(max: number | null = 3) {
  const snapshot: ClientSnapshot = { clients: [], establishments: [], devices: [], plans: [{ id: "plan-1", active: true, max_tvs: max }] };
  const store: ClientFormStore = {
    load: vi.fn(async () => snapshot),
    saveClient: vi.fn(async (_, values) => {
      const row = { ...values, id: values.id!, establishments: [], plans: { name: "Plano" } } as ClientRow;
      snapshot.clients = [...snapshot.clients.filter((c) => c.id !== row.id), row];
      return row;
    }),
    saveEstablishment: vi.fn(async (_, values) => {
      const row = values as EstablishmentRow;
      snapshot.establishments = [...snapshot.establishments.filter((e) => e.id !== row.id), row];
      return row;
    }),
    saveDevice: vi.fn(async (_, values) => {
      const row = values as DeviceRow;
      snapshot.devices = [...snapshot.devices.filter((d) => d.id !== row.id), row];
      return row;
    }),
  };
  return { store, snapshot };
}

describe("Persistência do formulário único", () => {
  it("salva somente o cliente sem validar ou gravar rascunhos da estrutura", async () => {
    const { store } = setup();
    const data = input();
    data.mode = "client";
    data.establishments[0]!.name = "";
    await persistClientForm(data, store);
    expect(store.saveClient).toHaveBeenCalledWith(null, { name: "Cliente", plan_id: "plan-1", id: "client-1" });
    expect(store.saveEstablishment).not.toHaveBeenCalled();
    expect(store.saveDevice).not.toHaveBeenCalled();
  });
  it("salva cliente, estabelecimento e TV em ordem com IDs estáveis", async () => {
    const { store, snapshot } = setup();
    await persistClientForm(input(), store);
    expect(store.saveEstablishment).toHaveBeenCalledWith(null, { id: "est-1", client_id: "client-1", name: "Unidade" });
    expect(store.saveDevice).toHaveBeenCalledWith(null, { id: "tv-1", establishment_id: "est-1", name: "Recepção", orientation: "horizontal" });
    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.establishments).toHaveLength(1);
    expect(snapshot.devices).toHaveLength(1);
  });
  it("retoma após falha parcial, sem reinserir cliente e estabelecimento", async () => {
    const { store, snapshot } = setup();
    vi.mocked(store.saveDevice).mockRejectedValueOnce(new Error("Falha temporária"));
    await expect(persistClientForm(input(), store)).rejects.toThrow("Falha temporária");
    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.establishments).toHaveLength(1);
    expect(snapshot.devices).toHaveLength(0);
    await persistClientForm(input(), store);
    expect(store.saveClient).toHaveBeenLastCalledWith("client-1", expect.objectContaining({ id: "client-1" }));
    expect(store.saveEstablishment).toHaveBeenCalledTimes(1);
    expect(snapshot.clients).toHaveLength(1);
    expect(snapshot.establishments).toHaveLength(1);
    expect(snapshot.devices).toHaveLength(1);
  });
  it("salvar novamente não insere TVs duplicadas nem regrava estrutura inalterada", async () => {
    const { store, snapshot } = setup(1);
    await persistClientForm(input(), store);
    await persistClientForm(input(), store);
    expect(store.saveEstablishment).toHaveBeenCalledTimes(1);
    expect(store.saveDevice).toHaveBeenCalledTimes(1);
    expect(snapshot.devices.map((d) => d.id)).toEqual(["tv-1"]);
  });
  it("rejeita excesso do plano e cadastro incompleto antes da primeira gravação", async () => {
    const { store } = setup(0);
    await expect(persistClientForm(input(), store)).rejects.toThrow("acima do limite");
    expect(store.saveClient).not.toHaveBeenCalled();
    const other = setup();
    const data = input();
    data.establishments[0]!.tvs[0]!.name = " ";
    await expect(persistClientForm(data, other.store)).rejects.toThrow("nome de cada TV");
    expect(other.store.saveClient).not.toHaveBeenCalled();
  });
  it("conta também TVs salvas fora do rascunho e impede reduzir o plano", async () => {
    const { store, snapshot } = setup(1);
    snapshot.clients = [{ id: "client-1", plan_id: "plan-1", establishments: [{ id: "est-1", devices: [{ count: 2 }] }] } as ClientRow];
    const data = input();
    data.mode = "client";
    data.existing = true;
    await expect(persistClientForm(data, store)).rejects.toThrow("2 TVs");
    expect(store.saveClient).not.toHaveBeenCalled();
  });
  it("atualiza nomes e orientação sem enviar campos adicionais ou trocar IDs", async () => {
    const { store, snapshot } = setup();
    await persistClientForm(input(), store);
    const data = input();
    data.existing = true;
    data.establishments[0]!.saved = true;
    data.establishments[0]!.name = "Unidade atualizada";
    data.establishments[0]!.tvs[0] = { id: "tv-1", name: "Caixa", orientation: "vertical", saved: true };
    await persistClientForm(data, store);
    expect(store.saveEstablishment).toHaveBeenLastCalledWith("est-1", { id: "est-1", client_id: "client-1", name: "Unidade atualizada" });
    expect(store.saveDevice).toHaveBeenLastCalledWith("tv-1", { id: "tv-1", establishment_id: "est-1", name: "Caixa", orientation: "vertical" });
    expect(snapshot.devices).toHaveLength(1);
  });
  it("não grava se consulta falha ou se um vínculo salvo mudou", async () => {
    const { store } = setup();
    vi.mocked(store.load).mockRejectedValueOnce(new Error("Sem conexão"));
    await expect(persistClientForm(input(), store)).rejects.toThrow("Sem conexão");
    expect(store.saveClient).not.toHaveBeenCalled();
    const data = input();
    data.establishments[0]!.saved = true;
    await expect(persistClientForm(data, store)).rejects.toThrow("Vínculo do estabelecimento mudou");
    expect(store.saveClient).not.toHaveBeenCalled();
  });
  it("exige plano ativo para novas TVs, mas aceita plano sem limite definido", async () => {
    const { store, snapshot } = setup();
    snapshot.plans[0]!.active = false;
    await expect(persistClientForm(input(), store)).rejects.toThrow("plano ativo");
    const noPlan = input();
    noPlan.values.plan_id = null;
    await expect(persistClientForm(noPlan, store)).rejects.toThrow("plano ativo");
    const unlimited = setup(null);
    await expect(persistClientForm(input(), unlimited.store)).resolves.toBeUndefined();
  });
});
