import type { EstablishmentRow } from "@/lib/api";

export type ClientAddress = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };
export const emptyAddress: ClientAddress = { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" };
const labels: Record<keyof ClientAddress, string> = { cep: "CEP", street: "Logradouro", number: "Número", complement: "Complemento", district: "Bairro", city: "Cidade", state: "Estado" };
const prefix = "Endereço Plannet (v1)";

/** Reversible, human-readable text in establishments.address; no schema changes. */
export function serializeAddress(address: ClientAddress): string {
  return [prefix, ...Object.entries(labels).map(([key, label]) => `${label}: ${JSON.stringify(address[key as keyof ClientAddress].trim())}`)].join("\n");
}
export function readAddress(row?: Pick<EstablishmentRow, "address" | "district" | "city">, city = ""): ClientAddress {
  const value = { ...emptyAddress, district: row?.district ?? "", city: row?.city ?? city };
  const text = row?.address ?? "";
  if (!text.startsWith(`${prefix}\n`)) return { ...value, street: text };
  for (const [key, label] of Object.entries(labels)) {
    const line = text.split("\n").find((l) => l.startsWith(`${label}: `));
    if (!line) continue;
    try { const parsed: unknown = JSON.parse(line.slice(label.length + 2)); if (typeof parsed === "string") value[key as keyof ClientAddress] = parsed; } catch { /* Preserve other recoverable fields. */ }
  }
  return value;
}
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<Partial<ClientAddress>> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) throw new Error("Informe um CEP com 8 dígitos.");
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: signal ?? null });
  if (!response.ok) throw new Error("Consulta de CEP indisponível. Preencha o endereço manualmente.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("logradouro" in data) || ("erro" in data && data.erro)) throw new Error("CEP não encontrado. Preencha o endereço manualmente.");
  const text = (key: string) => { const v = (data as Record<string, unknown>)[key]; return typeof v === "string" ? v : ""; };
  return { street: text("logradouro"), district: text("bairro"), city: text("localidade"), state: text("uf") };
}