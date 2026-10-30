import type { ClientRow, DeviceRow, EstablishmentRow } from "@/lib/api";
import { readAddress } from "@/lib/client-address";

export type Position = [number, number];
export type Geometry = { type: "Polygon"; coordinates: Position[][] } | { type: "MultiPolygon"; coordinates: Position[][][] };
export type Municipality = { id: string; name: string; geometry: Geometry };
export type Mesh = { municipalities: Municipality[]; outline: Geometry[] };
export type NetworkPlace = EstablishmentRow & { clientName: string; addressData: ReturnType<typeof readAddress>; tvs: DeviceRow[]; fingerprint: string };
export type ConfirmedPosition = { position: Position; fingerprint: string; label: string };
export type Candidate = { position: Position; label: string };
let geocodingBusy = false;
let lastGeocodingAt = 0;
/** Only called by an explicit, individual user action. No bulk requests or persistence. */
export async function geocodePlace(place: NetworkPlace, municipality: Municipality, signal?: AbortSignal): Promise<Candidate[]> {
  const address = place.addressData;
  if (!address.street.trim() || !address.number.trim() || !address.city.trim() || /^s\/?n$/i.test(address.number.trim())) throw new Error("Endereço incompleto: é necessário logradouro, número e município para consultar uma posição individual.");
  if (geocodingBusy || Date.now() - lastGeocodingAt < 1200) throw new Error("Aguarde alguns segundos antes de realizar outra consulta.");
  geocodingBusy = true;
  lastGeocodingAt = Date.now();
  try {
    const params = new URLSearchParams({ format: "jsonv2", addressdetails: "1", limit: "5", countrycodes: "br", street: `${address.number} ${address.street}`, city: municipality.name, state: "Sergipe", country: "Brasil" });
    if (address.cep.replace(/\D/g, "").length === 8) params.set("postalcode", address.cep.replace(/\D/g, ""));
    const results: unknown = await getJson(`https://nominatim.openstreetmap.org/search?${params}`, signal);
    if (!Array.isArray(results)) throw new Error("O serviço de localização retornou uma resposta inesperada.");
    return results.flatMap((result) => {
      if (!result || typeof result !== "object") return [];
      const row = result as { lon?: string; lat?: string; display_name?: string; address?: { house_number?: string } };
      const position: Position = [Number(row.lon), Number(row.lat)];
      if (!position.every(Number.isFinite) || !row.address?.house_number || normalize(row.address.house_number) !== normalize(address.number) || !contains(municipality.geometry, position)) return [];
      return [{ position, label: row.display_name ?? fullAddress(place) }];
    });
  } finally { geocodingBusy = false; }
}
export const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const IBGE_MESH = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/28?formato=application%2Fvnd.geo%2Bjson&qualidade=minima";

type FeatureCollection = { type: string; features: { properties: { codarea?: string }; geometry: Geometry }[] };
export function isGeometry(value: unknown): value is Geometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: string; coordinates?: unknown };
  const ring = (value: unknown) => Array.isArray(value) && value.length >= 4 && value.every((point: unknown) => Array.isArray(point) && point.length >= 2 && point.every((coordinate: unknown) => typeof coordinate === "number" && Number.isFinite(coordinate)));
  const polygon = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every(ring);
  return geometry.type === "Polygon" ? polygon(geometry.coordinates) : geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 && geometry.coordinates.every(polygon);
}
async function getJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal: signal ?? null });
  if (!response.ok) throw new Error("O serviço geográfico está indisponível. Tente novamente.");
  return response.json();
}
export async function fetchSergipe(signal?: AbortSignal): Promise<Mesh> {
  const [municipal, state, names] = await Promise.all([
    getJson(`${IBGE_MESH}&intrarregiao=municipio`, signal) as Promise<FeatureCollection>,
    getJson(IBGE_MESH, signal) as Promise<FeatureCollection>,
    getJson("https://servicodados.ibge.gov.br/api/v1/localidades/estados/28/municipios", signal) as Promise<{ id: number; nome: string }[]>,
  ]);
  if (!Array.isArray(municipal?.features) || !Array.isArray(state?.features) || !Array.isArray(names)) throw new Error("Malha do IBGE em formato inesperado.");
  const municipalities = municipal.features.flatMap((feature) => {
    const id = String(feature?.properties?.codarea ?? "");
    const name = names.find((name) => String(name.id) === id)?.nome;
    return id.startsWith("28") && name && isGeometry(feature?.geometry) ? [{ id, name, geometry: feature.geometry }] : [];
  });
  const outline = state.features.map((feature) => feature?.geometry).filter(isGeometry);
  if (new Set(municipalities.map((item) => item.id)).size !== 75 || municipalities.length !== 75 || outline.length === 0) throw new Error("A malha municipal de Sergipe não foi carregada por completo.");
  // Validate bounds here so malformed service data becomes a recoverable query error.
  bounds(outline);
  municipalities.forEach((item) => bounds([item.geometry]));
  return { municipalities, outline };
}
export function makePlaces(establishments: EstablishmentRow[], clients: ClientRow[], devices: DeviceRow[]): NetworkPlace[] {
  const byClient = new Map(clients.map((client) => [client.id, client.name]));
  const byPlace = new Map<string, DeviceRow[]>();
  for (const device of devices) {
    const existing = byPlace.get(device.establishment_id);
    if (existing) existing.push(device);
    else byPlace.set(device.establishment_id, [device]);
  }
  return establishments.map((row) => {
    const addressData = readAddress(row);
    return { ...row, clientName: byClient.get(row.client_id) ?? row.clients?.name ?? "Cliente não disponível", addressData, tvs: byPlace.get(row.id) ?? [], fingerprint: JSON.stringify(addressData) };
  });
}
export function inMunicipality(place: NetworkPlace, municipality: Municipality) {
  return (!place.addressData.state || ["se", "sergipe"].includes(normalize(place.addressData.state))) && normalize(place.addressData.city) === normalize(municipality.name);
}
export function scopeNetwork(clients: ClientRow[], places: NetworkPlace[], devices: DeviceRow[], municipality?: Municipality) {
  const local = municipality ? places.filter((place) => inMunicipality(place, municipality)) : places;
  const ids = new Set(local.map((place) => place.id));
  const clientIds = new Set(local.map((place) => place.client_id));
  const linkedClients = new Set(places.map((place) => place.client_id));
  const tvs = municipality ? devices.filter((device) => ids.has(device.establishment_id)) : devices;
  return { places: local, clients: municipality ? clients.filter((client) => clientIds.has(client.id) || (!linkedClients.has(client.id) && normalize(client.city ?? "") === normalize(municipality.name))).length : clients.length,
    tvs: tvs.length, active: tvs.filter((tv) => tv.activation_status === "ativa").length, pending: tvs.filter((tv) => tv.activation_status === "pendente").length,
    inactive: tvs.filter((tv) => tv.activation_status === "inativa").length, blocked: tvs.filter((tv) => tv.activation_status === "bloqueada").length };
}
export function fullAddress(place: NetworkPlace) {
  const address = place.addressData;
  return [address.street, address.number, address.complement, address.district, address.city, address.state, address.cep ? `CEP ${address.cep}` : ""].filter(Boolean).join(", ") || "Endereço não informado";
}
export const activationColors = { ativa: "var(--success)", pendente: "var(--warning)", inativa: "var(--muted-foreground)", bloqueada: "var(--destructive)" };
export function activationDistribution(place: NetworkPlace) {
  return (Object.keys(activationColors) as (keyof typeof activationColors)[]).map((status) => ({
    status, count: place.tvs.filter((tv) => tv.activation_status === status).length,
  }));
}
/** A matching address alone is not a geographic verification. Reject stale/out-of-area points. */
export function verifiedPosition(place: NetworkPlace, confirmed: ConfirmedPosition | undefined, mesh: Mesh): ConfirmedPosition | undefined {
  if (!confirmed || confirmed.fingerprint !== place.fingerprint || !confirmed.position.every(Number.isFinite)) return undefined;
  const municipality = mesh.municipalities.find((item) => inMunicipality(place, item));
  return municipality && contains(municipality.geometry, confirmed.position) && mesh.outline.some((geometry) => contains(geometry, confirmed.position)) ? confirmed : undefined;
}
export function placeStatus(place: NetworkPlace): keyof typeof activationColors | "mixed" {
  const states = new Set(place.tvs.map((tv) => tv.activation_status));
  return states.size === 1 ? place.tvs[0]!.activation_status : "mixed";
}
export function project([longitude, latitude]: Position): Position {
  return [(longitude + 39) * 270, (Math.log(Math.tan(Math.PI / 4 + -9 * Math.PI / 360)) - Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))) * 270 * 180 / Math.PI];
}
export function rings(geometry: Geometry): Position[][] { return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat(); }
export function geometryPath(geometry: Geometry) { return rings(geometry).map((ring) => ring.map((point, index) => `${index ? "L" : "M"}${project(point).map((n) => n.toFixed(2)).join(",")}`).join("") + "Z").join(""); }
export function bounds(geometries: Geometry[]): [number, number, number, number] {
  let x = Infinity, y = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const geometry of geometries) for (const ring of rings(geometry)) for (const point of ring) {
    const [px, py] = project(point);
    x = Math.min(x, px); y = Math.min(y, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
  }
  const width = maxX - x, height = maxY - y;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("A malha geográfica contém limites inválidos.");
  const padding = Math.max(width, height) * 0.12;
  return [x - padding, y - padding, width + padding * 2, height + padding * 2];
}
function ringContains(point: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function contains(geometry: Geometry, point: Position) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => !!polygon[0] && ringContains(point, polygon[0]) && !polygon.slice(1).some((hole) => ringContains(point, hole)));
}
