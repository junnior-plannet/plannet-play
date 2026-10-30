import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientRow, DeviceRow, EstablishmentRow } from "@/lib/api";
import { activationDistribution, makePlaces, placeStatus, scopeNetwork, verifiedPosition, type Geometry, type Municipality } from "@/lib/network-map";
import { fetchMunicipalGeometry, fetchMunicipalRoads, parseRoads } from "@/lib/network-roads";
import { emptyAddress, serializeAddress } from "@/lib/client-address";

// Synthetic geometry and addresses are test-only; no Supabase client is called.
const geometry: Geometry = { type: "Polygon", coordinates: [[[-38, -12], [-36, -12], [-36, -10], [-38, -10], [-38, -12]]] };
const municipality: Municipality = { id: "2800308", name: "Aracaju", geometry };
const clients = [{ id: "c1", name: "Cliente de teste" }] as ClientRow[];
const establishments = [{ id: "e1", client_id: "c1", name: "Local de teste", city: "Aracaju", district: "Centro", address: serializeAddress({ ...emptyAddress, street: "Rua de teste", number: "10", city: "Aracaju", state: "SE" }) }] as EstablishmentRow[];
const devices = (["ativa", "pendente", "inativa", "bloqueada"] as const).map((activation_status, index) => ({ id: `tv${index}`, establishment_id: "e1", activation_status, name: `TV ${index}`, orientation: "horizontal" })) as DeviceRow[];
const place = makePlaces(establishments, clients, devices)[0]!;
const mesh = { municipalities: [municipality], outline: [geometry] };
const way = { type: "way", id: 1, tags: { highway: "primary", name: "Via de teste" }, geometry: [{ lon: -37.1, lat: -11 }, { lon: -37, lat: -11.1 }] };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Mapa atualizado — integridade geográfica e ativação", () => {
  it("conta os quatro status reais sem inferir conexão", () => {
    expect(scopeNetwork(clients, [place], devices, municipality)).toMatchObject({ clients: 1, tvs: 4, active: 1, pending: 1, inactive: 1, blocked: 1 });
    expect(scopeNetwork(clients, [place], devices, { ...municipality, name: "Outro município" })).toMatchObject({ clients: 0, tvs: 0, inactive: 0, blocked: 0 });
    expect(placeStatus(place)).toBe("mixed");
    expect(activationDistribution(place).map((item) => item.count)).toEqual([1, 1, 1, 1]);
  });
  it("só aceita confirmações atuais dentro do município e do estado", () => {
    const confirmed = { position: [-37, -11] as [number, number], label: "Endereço confirmado", fingerprint: place.fingerprint };
    expect(verifiedPosition(place, confirmed, mesh)).toBe(confirmed);
    expect(verifiedPosition(place, { ...confirmed, fingerprint: "antigo" }, mesh)).toBeUndefined();
    expect(verifiedPosition(place, { ...confirmed, position: [-40, -11] }, mesh)).toBeUndefined();
    expect(verifiedPosition(place, { ...confirmed, position: [NaN, -11] }, mesh)).toBeUndefined();
    expect(verifiedPosition(place, confirmed, { ...mesh, municipalities: [] })).toBeUndefined();
    expect(verifiedPosition(place, undefined, mesh)).toBeUndefined();
  });
  it("preserva as coordenadas reais e recusa vias inválidas ou externas", () => {
    const result = parseRoads({ elements: [way,
      { ...way, id: 2, tags: { ...way.tags, highway: "footway" } },
      { ...way, id: 3, geometry: [{ lon: -40, lat: -15 }, { lon: -40.1, lat: -15 }] },
      { ...way, id: 4, geometry: [{ lon: -37, lat: -11 }, { lon: null, lat: -11 }] },
    ] }, geometry);
    expect(result).toEqual([{ id: 1, name: "Via de teste", points: [[-37.1, -11], [-37, -11.1]] }]);
    expect(parseRoads({ elements: [] }, geometry)).toEqual([]);
    expect(() => parseRoads({ elements: [], remark: "timeout" }, geometry)).toThrow();
  });
  it("consulta somente a área administrativa selecionada no OSM", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ elements: [way] }) });
    vi.stubGlobal("fetch", fetch);
    await expect(fetchMunicipalRoads(municipality)).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("data")).toContain('["ref:IBGE"="2800308"]');
    expect(body.get("data")).toContain("out geom");
    expect(body.get("data")).not.toContain("Cliente");
  });
  it("recupera falhas externas sem gerar ruas substitutas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchMunicipalRoads(municipality)).rejects.toThrow("indisponíveis");
    await expect(fetchMunicipalGeometry(municipality)).rejects.toThrow("indisponível");
  });
  it("solicita contorno municipal detalhado do IBGE sob demanda", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [{ geometry }] }) });
    vi.stubGlobal("fetch", fetch);
    await expect(fetchMunicipalGeometry(municipality)).resolves.toEqual(geometry);
    expect(fetch.mock.calls[0]?.[0]).toContain("/municipios/2800308?");
    expect(fetch.mock.calls[0]?.[0]).toContain("qualidade=intermediaria");
    await expect(fetchMunicipalGeometry({ ...municipality, id: "invalid" })).rejects.toThrow("Código municipal inválido");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
