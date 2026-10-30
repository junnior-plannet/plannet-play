import type { ClientInsert, ClientRow, DeviceRow, EstablishmentRow, Orientation } from "@/lib/api";
import { serializeAddress, type ClientAddress } from "@/lib/client-address";
import { saveClient, saveDevice, saveEstablishment } from "@/lib/api";

export type TvDraft = { id: string; name: string; orientation: Orientation; saved: boolean };
export type EstablishmentDraft = { id: string; name: string; saved: boolean; tvs: TvDraft[] };
export type ClientSnapshot = {
  clients: ClientRow[];
  establishments: EstablishmentRow[];
  devices: DeviceRow[];
  plans: { id: string; max_tvs: number | null; active: boolean }[];
};
export type ClientFormStore = {
  load: () => Promise<ClientSnapshot>;
  saveClient: typeof saveClient;
  saveEstablishment: typeof saveEstablishment;
  saveDevice: typeof saveDevice;
};
export type ClientFormInput = {
  id: string;
  existing: boolean;
  values: ClientInsert;
  address?: ClientAddress;
  establishments: EstablishmentDraft[];
};

export function makeEstablishmentDrafts(id: string, establishments: EstablishmentRow[], devices: DeviceRow[]): EstablishmentDraft[] {
  return establishments.filter((e) => e.client_id === id).map((e) => ({
    id: e.id, name: e.name, saved: true,
    tvs: devices.filter((d) => d.establishment_id === e.id).map((d) => ({ id: d.id, name: d.name, orientation: d.orientation, saved: true })),
  }));
}

/** Without a default marker in the schema, reuse a matching name or the oldest linked record. */
export function defaultEstablishment(id: string, name: string, rows: EstablishmentRow[]): EstablishmentRow | undefined {
  const linked = rows.filter((e) => e.client_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return linked.find((e) => e.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR")) ?? linked[0];
}

export function hasStructureChanges(drafts: EstablishmentDraft[], original: EstablishmentDraft[]): boolean {
  return JSON.stringify(drafts) !== JSON.stringify(original);
}

/** Only unsaved TVs can be removed here. Existing records are never deleted. */
export function resizeTvs(est: EstablishmentDraft, count: number, uuid: () => string): EstablishmentDraft {
  const savedCount = est.tvs.filter((tv) => tv.saved).length;
  if (!Number.isInteger(count) || count < savedCount || count < 0 || count > 1000) return est;
  const tvs = [...est.tvs];
  while (tvs.length > count) {
    let index = tvs.length - 1;
    while (index >= 0 && tvs[index]?.saved) index--;
    if (index < 0) break;
    tvs.splice(index, 1);
  }
  while (tvs.length < count) tvs.push({ id: uuid(), name: `TV ${tvs.length + 1}`, orientation: "horizontal", saved: false });
  return { ...est, tvs };
}

/** Sequential writes are not a transaction. Fixed UUIDs + fresh reads make retries resumable. */
export async function persistClientForm(input: ClientFormInput, store: ClientFormStore): Promise<void> {
  const snapshot = await store.load();
  const existingClient = snapshot.clients.find((c) => c.id === input.id);
  if (input.existing && !existingClient) throw new Error("Cliente não encontrado. Feche e atualize a lista antes de continuar.");
  if (!input.values.name.trim()) throw new Error("Informe o nome do cliente.");
  if (input.establishments.length !== 1) throw new Error("Não foi possível confirmar o estabelecimento padrão.");
  const draft = input.establishments[0];
  if (!draft) throw new Error("Estabelecimento não encontrado.");
  const reused = snapshot.establishments.find((e) => e.id === draft.id) ?? defaultEstablishment(input.id, existingClient?.name ?? input.values.name, snapshot.establishments);
  const establishments = [{ ...draft, id: reused?.id ?? draft.id, saved: !!reused || draft.saved, name: reused?.name ?? input.values.name.trim() }];
  const planId = input.values.plan_id === undefined ? existingClient?.plan_id : input.values.plan_id;
  const plan = snapshot.plans.find((p) => p.id === planId);
  const linkedIds = new Set(snapshot.establishments.filter((e) => e.client_id === input.id).map((e) => e.id));
  const savedDevices = snapshot.devices.filter((d) => linkedIds.has(d.establishment_id));
  const countFromClient = existingClient?.establishments.reduce((n, e) => n + (e.devices[0]?.count ?? 0), 0) ?? 0;
  const savedCount = Math.max(savedDevices.length, countFromClient);
  const newTvs = establishments.flatMap((e) => e.tvs).filter((tv) => !snapshot.devices.some((d) => d.id === tv.id));
  const total = savedCount + newTvs.length;
  if (planId && !plan) throw new Error("Não foi possível confirmar o plano. Atualize a consulta antes de salvar.");
  if (plan?.max_tvs != null && total > plan.max_tvs) throw new Error(`O cadastro terá ${total} TVs, acima do limite de ${plan.max_tvs} deste plano. Revise o plano ou a quantidade.`);
  if (newTvs.length && (!plan || !plan.active)) throw new Error("Selecione um plano ativo com limite confirmado antes de adicionar TVs.");
  {
    const ids = new Set<string>();
    for (const est of establishments) {
      if (ids.has(est.id)) throw new Error("Estabelecimento repetido no formulário.");
      ids.add(est.id);
      const saved = snapshot.establishments.find((e) => e.id === est.id);
      if ((saved && saved.client_id !== input.id) || (est.saved && !saved)) throw new Error("Vínculo do estabelecimento mudou. Reabra o cadastro.");
      if (!est.name.trim()) throw new Error("Informe o nome de cada estabelecimento ou remova o novo campo vazio.");
      for (const tv of est.tvs) {
        if (ids.has(tv.id)) throw new Error("TV repetida no formulário.");
        ids.add(tv.id);
        const savedTv = snapshot.devices.find((d) => d.id === tv.id);
        if ((savedTv && savedTv.establishment_id !== est.id) || (tv.saved && !savedTv)) throw new Error("Vínculo da TV mudou. Reabra o cadastro.");
        if (!tv.name.trim()) throw new Error("Informe o nome de cada TV.");
        if (tv.orientation !== "horizontal" && tv.orientation !== "vertical") throw new Error("Selecione 16:9 ou 9:16 para cada TV.");
      }
    }
  }
  await store.saveClient(existingClient ? input.id : null, { ...input.values, id: input.id });
  for (const est of establishments) {
    const savedEst = snapshot.establishments.find((e) => e.id === est.id);
    const addressValues = input.address ? { address: serializeAddress(input.address), district: input.address.district.trim() || null, city: input.address.city.trim() || null } : {};
    const addressChanged = input.address && (savedEst?.address !== addressValues.address || savedEst?.district !== addressValues.district || savedEst?.city !== addressValues.city);
    if (!savedEst || savedEst.name !== est.name.trim() || addressChanged) await store.saveEstablishment(savedEst ? est.id : null, { id: est.id, client_id: input.id, name: est.name.trim(), ...(savedEst ? {} : { city: input.values.city, region: input.values.region }), ...addressValues });
    for (const tv of est.tvs) {
      const savedTv = snapshot.devices.find((d) => d.id === tv.id);
      if (!savedTv || savedTv.name !== tv.name.trim() || savedTv.orientation !== tv.orientation) await store.saveDevice(savedTv ? tv.id : null, { id: tv.id, establishment_id: est.id, name: tv.name.trim(), orientation: tv.orientation });
    }
  }
}
