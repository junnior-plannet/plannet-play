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
  it("recusa novas TVs em plano inativo", async () => { const { snapshot, store } = setup(); const plan = snapshot.plans[0]; if (plan) plan.active = false; await expect(persistClientForm(input(), store)).rejects.toThrow("plano ativo"); expect(store.saveClient).not.toHaveBeenCalled(); });
  it("não grava quando consulta falha", async () => { const { store } = setup(); vi.mocked(store.load).mockRejectedValueOnce(Error("Sem conexão")); await expect(persistClientForm(input(), store)).rejects.toThrow("Sem conexão"); expect(store.saveClient).not.toHaveBeenCalled(); });
});
