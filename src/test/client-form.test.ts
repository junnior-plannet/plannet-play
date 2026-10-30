import { describe, expect, it, vi } from "vitest";
import type { ClientRow, DeviceRow, EstablishmentRow } from "@/lib/api";
import { defaultEstablishment, persistClientForm, resizeTvs, type ClientFormInput, type ClientFormStore, type ClientSnapshot } from "@/lib/client-form";
vi.mock("@/lib/api", () => ({ saveClient: vi.fn(), saveEstablishment: vi.fn(), saveDevice: vi.fn() }));
const input = (): ClientFormInput => ({ id: "client-1", existing: false, values: { name: "Cliente", plan_id: "plan-1", city: "Aracaju", region: "SE" }, establishments: [{ id: "est-1", name: "Cliente", saved: false, tvs: [{ id: "tv-1", name: "Recepção", orientation: "horizontal", saved: false }] }] });
function setup(max: number | null = 3) {
  const snapshot: ClientSnapshot = { clients: [], establishments: [], devices: [], plans: [{ id: "plan-1", active: true, max_tvs: max }] };
  const store: ClientFormStore = {
    load: vi.fn(async () => snapshot),
    saveClient: vi.fn(async (_, values) => { const row = { ...values, establishments: [], plans: { name: "Plano" } } as ClientRow; snapshot.clients = [...snapshot.clients.filter((c) => c.id !== row.id), row]; return row; }),
    saveEstablishment: vi.fn(async (_, values) => { const row = { ...values, created_at: "2026-01-01" } as EstablishmentRow; snapshot.establishments = [...snapshot.establishments.filter((e) => e.id !== row.id), row]; return row; }),
    saveDevice: vi.fn(async (_, values) => { const row = values as DeviceRow; snapshot.devices = [...snapshot.devices.filter((d) => d.id !== row.id), row]; return row; }),
  };
  return { snapshot, store };
}
describe("Cadastro simplificado", () => {
  it("salva endereço no vínculo interno sem enviar colunas inexistentes ao cliente", async () => {
    const { snapshot, store } = setup(); const data = input();
    data.address = { cep: "49010000", street: "Rua A", number: "10", complement: "", district: "Centro", city: "Aracaju", state: "SE" };
    await persistClientForm(data, store);
    expect(snapshot.establishments[0]?.address).toContain('Estado: "SE"');
    expect(snapshot.establishments[0]?.district).toBe("Centro");
    expect(store.saveClient).toHaveBeenCalledWith(null, expect.not.objectContaining({ address: expect.anything() }));
  });
  it("salva com zero TVs e cria estabelecimento de mesmo nome", async () => {
    const { snapshot, store } = setup(); const data = input(); data.establishments = [{ id: "est-1", name: "", saved: false, tvs: [] }];
    await persistClientForm(data, store);
    expect(snapshot.clients).toHaveLength(1); expect(snapshot.establishments).toHaveLength(1); expect(snapshot.establishments[0]).toMatchObject({ name: "Cliente", client_id: "client-1", city: "Aracaju", region: "SE" }); expect(store.saveDevice).not.toHaveBeenCalled();
  });
  it("gera três TVs com nomes individuais e permite retornar a zero antes de salvar", () => {
    const est = { id: "est-1", name: "Cliente", saved: false, tvs: [] }; let n = 0;
    const resized = resizeTvs(est, 3, () => `tv-${++n}`);
    expect(resized.tvs.map((t) => t.name)).toEqual(["TV 1", "TV 2", "TV 3"]); expect(resizeTvs(resized, 0, () => "unused").tvs).toEqual([]);
  });
  it("preserva TVs salvas ao tentar reduzir quantidade", () => {
    const est = { id: "est-1", name: "Cliente", saved: true, tvs: [{ id: "tv-1", name: "Caixa", orientation: "vertical" as const, saved: true }] };
    expect(resizeTvs(est, 0, () => "unused")).toEqual(est);
  });
  it("respeita limite de 3 TVs antes de qualquer gravação", async () => {
    const { store } = setup(3); const data = input(); const est = data.establishments[0]; if (!est) throw Error("fixture"); data.establishments = [resizeTvs(est, 4, () => crypto.randomUUID())];
    await expect(persistClientForm(data, store)).rejects.toThrow("4 TVs"); expect(store.saveClient).not.toHaveBeenCalled();
  });
  it("retoma falha parcial sem duplicar estabelecimento e dispositivos", async () => {
    const { snapshot, store } = setup(); vi.mocked(store.saveDevice).mockRejectedValueOnce(Error("Falha"));
    await expect(persistClientForm(input(), store)).rejects.toThrow("Falha"); await persistClientForm(input(), store); await persistClientForm(input(), store);
    expect(snapshot.clients).toHaveLength(1); expect(snapshot.establishments).toHaveLength(1); expect(snapshot.devices).toHaveLength(1); expect(store.saveEstablishment).toHaveBeenCalledTimes(1); expect(store.saveDevice).toHaveBeenCalledTimes(2);
  });
  it("reutiliza estabelecimento já vinculado sem alterar sua situação", async () => {
    const { snapshot, store } = setup(); snapshot.establishments = [{ id: "existing-est", client_id: "client-1", name: "Antigo", status: "inativo", created_at: "2026-01-01" } as EstablishmentRow];
    await persistClientForm(input(), store);
    expect(snapshot.establishments).toHaveLength(1); expect(store.saveEstablishment).not.toHaveBeenCalled(); expect(snapshot.devices[0]?.establishment_id).toBe("existing-est"); expect(snapshot.establishments[0]?.status).toBe("inativo");
  });
  it("seleciona nome correspondente ou o estabelecimento mais antigo", () => {
    const rows = [{ id: "a", client_id: "c", name: "Antigo", created_at: "2020" }, { id: "b", client_id: "c", name: "Cliente", created_at: "2021" }] as EstablishmentRow[];
    expect(defaultEstablishment("c", "Cliente", rows)?.id).toBe("b"); expect(defaultEstablishment("c", "Outro", rows)?.id).toBe("a"); expect(defaultEstablishment("other", "Cliente", rows)).toBeUndefined();
  });
  it("conta TVs em outros estabelecimentos e não reduz plano abaixo do total", async () => {
    const { snapshot, store } = setup(1); snapshot.clients = [{ id: "client-1", plan_id: "plan-1", establishments: [{ id: "other", devices: [{ count: 2 }] }] } as ClientRow]; const data = input(); data.existing = true;
    await expect(persistClientForm(data, store)).rejects.toThrow("3 TVs"); expect(store.saveClient).not.toHaveBeenCalled();
  });
  it("preserva orientação e não envia ativação ou identidade na edição", async () => {
    const { snapshot, store } = setup(); await persistClientForm(input(), store); const data = input(); data.existing = true; data.establishments = [{ id: "est-1", name: "Cliente", saved: true, tvs: [{ id: "tv-1", name: "Caixa", orientation: "vertical", saved: true }] }];
    await persistClientForm(data, store); expect(store.saveDevice).toHaveBeenLastCalledWith("tv-1", { id: "tv-1", establishment_id: "est-1", name: "Caixa", orientation: "vertical" }); expect(snapshot.devices).toHaveLength(1);
  });
  it("persiste orientações individuais de novas TVs nos valores existentes do banco", async () => {
    const { snapshot, store } = setup(); const data = input();
    data.establishments[0]!.tvs.push({ id: "tv-2", name: "Entrada", orientation: "vertical", saved: false });
    await persistClientForm(data, store);
    expect(snapshot.devices.map((tv) => ({ name: tv.name, orientation: tv.orientation, establishment_id: tv.establishment_id }))).toEqual([
      { name: "Recepção", orientation: "horizontal", establishment_id: "est-1" },
      { name: "Entrada", orientation: "vertical", establishment_id: "est-1" },
    ]);
    expect(store.saveDevice).toHaveBeenCalledTimes(2);
  });
  it("rejeita orientação inválida antes de qualquer gravação", async () => {
    const { store } = setup(); const data = input();
    Object.assign(data.establishments[0]!.tvs[0]!, { orientation: "portrait" });
    await expect(persistClientForm(data, store)).rejects.toThrow("Selecione 16:9 ou 9:16");
    expect(store.saveClient).not.toHaveBeenCalled();
    expect(store.saveEstablishment).not.toHaveBeenCalled();
    expect(store.saveDevice).not.toHaveBeenCalled();
  });
  it("preserva outros vínculos, TVs, endereço e situação ao editar o cadastro principal", async () => {
    const { snapshot, store } = setup();
    await persistClientForm(input(), store);
    const other = { id: "other-est", client_id: "client-1", name: "Unidade histórica", address: "Endereço legado", status: "inativo", created_at: "2026-02-01" } as EstablishmentRow;
    const otherTv = { id: "other-tv", establishment_id: other.id, name: "TV histórica", orientation: "vertical", activation_status: "ativa" } as DeviceRow;
    snapshot.establishments.push(other); snapshot.devices.push(otherTv);
    vi.mocked(store.saveEstablishment).mockClear(); vi.mocked(store.saveDevice).mockClear();
    const data = input(); data.existing = true; data.values.name = "Novo nome do cliente";
    await persistClientForm(data, store);
    expect(snapshot.establishments).toHaveLength(2);
    expect(snapshot.establishments.find((e) => e.id === other.id)).toEqual(other);
    expect(snapshot.devices.find((d) => d.id === otherTv.id)).toEqual(otherTv);
    expect(store.saveEstablishment).not.toHaveBeenCalled();
    expect(store.saveDevice).not.toHaveBeenCalled();
  });
  it("recusa estabelecimento salvo que desapareceu em vez de trocar silenciosamente o vínculo", async () => {
    const { snapshot, store } = setup(); const data = input();
    data.establishments[0]!.saved = true;
    snapshot.establishments = [{ id: "other-est", client_id: "client-1", name: "Cliente", created_at: "2026-01-01" } as EstablishmentRow];
    await expect(persistClientForm(data, store)).rejects.toThrow("Vínculo do estabelecimento mudou");
    expect(store.saveClient).not.toHaveBeenCalled();
    expect(store.saveEstablishment).not.toHaveBeenCalled();
    expect(store.saveDevice).not.toHaveBeenCalled();
  });
  it("recusa IDs de estabelecimento ou TV de outro cliente antes de gravar", async () => {
    const { snapshot, store } = setup();
    snapshot.establishments = [{ id: "est-1", client_id: "other-client", name: "Outro", created_at: "2026-01-01" } as EstablishmentRow];
    await expect(persistClientForm(input(), store)).rejects.toThrow("Vínculo do estabelecimento mudou");
    snapshot.establishments = [];
    snapshot.devices = [{ id: "tv-1", establishment_id: "other-est" } as DeviceRow];
    await expect(persistClientForm(input(), store)).rejects.toThrow("Vínculo da TV mudou");
    expect(store.saveClient).not.toHaveBeenCalled();
  });
  it("recusa novas TVs em plano inativo", async () => { const { snapshot, store } = setup(); const plan = snapshot.plans[0]; if (plan) plan.active = false; await expect(persistClientForm(input(), store)).rejects.toThrow("plano ativo"); expect(store.saveClient).not.toHaveBeenCalled(); });
  it("não grava quando consulta falha", async () => { const { store } = setup(); vi.mocked(store.load).mockRejectedValueOnce(Error("Sem conexão")); await expect(persistClientForm(input(), store)).rejects.toThrow("Sem conexão"); expect(store.saveClient).not.toHaveBeenCalled(); });
});
