import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type ClientInsert = T["clients"]["Insert"];
export type EstablishmentInsert = T["establishments"]["Insert"];
export type DeviceInsert = T["devices"]["Insert"];
export type Orientation = Database["public"]["Enums"]["tv_orientation"];
export type Activation = Database["public"]["Enums"]["tv_activation_status"];
export type RecordStatus = Database["public"]["Enums"]["record_status"];

function unwrap<D>(r: { data: D | null; error: { message: string } | null }): D {
  if (r.error) throw new Error(r.error.message);
  return r.data as D;
}

export const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => unwrap(await supabase.from("plans").select("*").order("name")),
});

export const clientsQuery = queryOptions({
  queryKey: ["clients"],
  queryFn: async () => unwrap(await supabase.from("clients").select("*, plans(name), establishments(id, devices(count))").order("name")),
});

export const establishmentsQuery = queryOptions({
  queryKey: ["establishments"],
  queryFn: async () => unwrap(await supabase.from("establishments").select("*, clients(name), devices(count)").order("name")),
});

export const devicesQuery = queryOptions({
  queryKey: ["devices"],
  queryFn: async () => unwrap(await supabase.from("devices").select("*, establishments(name, client_id, clients(name))").order("name")),
});

export const membersQuery = (clientId: string) => queryOptions({
  queryKey: ["client_members", clientId],
  queryFn: async () => {
    const m = unwrap(await supabase.from("client_members").select("id, user_id").eq("client_id", clientId));
    if (!m.length) return [];
    const p = unwrap(await supabase.from("profiles").select("id, email, full_name").in("id", m.map((x) => x.user_id)));
    return m.map((x) => ({ ...x, profile: p.find((y) => y.id === x.user_id) }));
  },
});

export async function saveClient(id: string | null, values: ClientInsert) {
  return id
    ? unwrap(await supabase.from("clients").update(values).eq("id", id).select().single())
    : unwrap(await supabase.from("clients").insert(values).select().single());
}
export async function saveEstablishment(id: string | null, values: EstablishmentInsert) {
  return id
    ? unwrap(await supabase.from("establishments").update(values).eq("id", id).select().single())
    : unwrap(await supabase.from("establishments").insert(values).select().single());
}
export async function saveDevice(id: string | null, values: DeviceInsert) {
  return id
    ? unwrap(await supabase.from("devices").update(values).eq("id", id).select().single())
    : unwrap(await supabase.from("devices").insert(values).select().single());
}

/** Admin only (RLS): link an existing account to a client by e-mail. */
export async function addMemberByEmail(clientId: string, email: string) {
  const p = unwrap(await supabase.from("profiles").select("id").ilike("email", email.trim()).maybeSingle());
  if (!p) throw new Error("Nenhuma conta encontrada com este e-mail. Peça para a pessoa criar a conta primeiro.");
  unwrap(await supabase.from("client_members").insert({ client_id: clientId, user_id: p.id }));
}
export async function removeMember(id: string) {
  unwrap(await supabase.from("client_members").delete().eq("id", id));
}

export const orientationLabel: Record<Orientation, string> = { horizontal: "Horizontal", vertical: "Vertical" };
export const activationLabel: Record<Activation, string> = { pendente: "Pendente", ativa: "Ativa", inativa: "Inativa", bloqueada: "Bloqueada" };
export const statusLabel: Record<RecordStatus, string> = { ativo: "Ativo", inativo: "Inativo" };

/** Frontend mirror of the database rule; the database trigger is the real guard. */
export function canEditReserve(isAdmin: boolean) { return isAdmin; }
export function clampReserve(n: number) { return Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))); }
