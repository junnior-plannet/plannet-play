import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientRow, DeviceRow, EstablishmentRow } from "@/lib/api";
import { serializeAddress, emptyAddress } from "@/lib/client-address";
import { bounds, contains, fetchSergipe, geocodePlace, geometryPath, makePlaces, normalize, scopeNetwork, type Geometry, type Municipality } from "@/lib/network-map";
import { navGroups } from "@/components/app/nav";

// Synthetic fixtures used only in tests; never inserted into Supabase.
const geometry: Geometry = { type: "Polygon", coordinates: [[[-38, -12], [-36, -12], [-36, -10], [-38, -10], [-38, -12]]] };
const municipality: Municipality = { id: "test", name: "Aracaju", geometry };
const clients = [{ id: "client-1", name: "Cliente teste", city: "Aracaju" }, { id: "client-2", name: "Outro cliente", city: "Outro município" }] as ClientRow[];
const establishments = [{ id: "place-1", client_id: "client-1", name: "Local teste", address: serializeAddress({ ...emptyAddress, street: "Rua teste", number: "10", city: "Aracaju", district: "Centro", state: "SE" }), city: "Aracaju", district: "Centro" }] as EstablishmentRow[];
const devices = [
  { id: "tv-1", establishment_id: "place-1", name: "TV 1", activation_status: "ativa", orientation: "horizontal" },
  { id: "tv-2", establishment_id: "place-1", name: "TV 2", activation_status: "pendente", orientation: "vertical" },
  { id: "tv-3", establishment_id: "place-1", name: "TV 3", activation_status: "bloqueada", orientation: "horizontal" },
  { id: "tv-4", establishment_id: "elsewhere", name: "TV 4", activation_status: "inativa", orientation: "horizontal" },
] as DeviceRow[];

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Mapa da Rede — dados e navegação", () => {
  it("mantém apenas Mapa da Rede no menu", () => {
    const items = navGroups.flatMap((group) => group.items);
    expect(items.some((item) => item.url === "/regioes")).toBe(false);
    expect(items.filter((item) => item.url === "/mapa")).toHaveLength(1);
  });
  it("normaliza acentos para comparar municípios sem inferir coordenadas", () => {
    expect(normalize("São Cristóvão")).toBe(normalize("Sao Cristovao"));
    const places = makePlaces(establishments, clients, devices);
    expect(places[0]?.clientName).toBe("Cliente teste");
    expect(places[0]?.tvs).toHaveLength(3);
    expect(places[0]).not.toHaveProperty("position");
  });
  it("usa todos os registros na visão geral e separa ativação de total", () => {
    const result = scopeNetwork(clients, makePlaces(establishments, clients, devices), devices);
    expect(result).toMatchObject({ clients: 2, tvs: 4, active: 1, pending: 1 });
    expect(result.places).toHaveLength(1);
  });
  it("filtra locais e TVs pelo município do endereço", () => {
    const result = scopeNetwork(clients, makePlaces(establishments, clients, devices), devices, municipality);
    expect(result).toMatchObject({ clients: 1, tvs: 3, active: 1, pending: 1 });
    const none = scopeNetwork(clients, makePlaces(establishments, clients, devices), devices, { ...municipality, name: "Barra dos Coqueiros" });
    expect(none).toMatchObject({ clients: 0, tvs: 0, active: 0, pending: 0 });
  });
  it("não trata uma UF diferente como Sergipe", () => {
    const elsewhere = [{ ...establishments[0]!, address: serializeAddress({ ...emptyAddress, city: "Aracaju", state: "BA" }) }];
    expect(scopeNetwork(clients, makePlaces(elsewhere, clients, devices), devices, municipality).places).toHaveLength(0);
  });
  it("valida polígonos, ilhas e buracos antes de aceitar posições", () => {
    expect(contains(geometry, [-37, -11])).toBe(true);
    expect(contains(geometry, [-39, -11])).toBe(false);
    const hole: Geometry = { type: "Polygon", coordinates: [...geometry.coordinates, [[-37.5, -11.5], [-36.5, -11.5], [-36.5, -10.5], [-37.5, -10.5], [-37.5, -11.5]]] };
    expect(contains(hole, [-37, -11])).toBe(false);
    expect(contains({ type: "MultiPolygon", coordinates: [geometry.coordinates] }, [-37, -11])).toBe(true);
    expect(geometryPath(geometry)).toMatch(/^M.+Z$/);
  });
  it("calcula limites finitos e rejeita malhas vazias", () => {
    expect(bounds([geometry]).every(Number.isFinite)).toBe(true);
    expect(() => bounds([])).toThrow("limites inválidos");
  });
  it("carrega municípios e contorno do IBGE sem usar pontos de demonstração", async () => {
    const names = Array.from({ length: 75 }, (_, index) => ({ id: 2800000 + index, nome: `Município teste ${index}` }));
    const fetch = vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("/localidades/") ? names : {
      type: "FeatureCollection", features: url.includes("intrarregiao") ? names.map((name) => ({ properties: { codarea: String(name.id) }, geometry })) : [{ properties: { codarea: "28" }, geometry }],
    } }));
    vi.stubGlobal("fetch", fetch);
    const mesh = await fetchSergipe();
    expect(mesh.municipalities).toHaveLength(75);
    expect(mesh.outline).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    const url = new URL(fetch.mock.calls[0]?.[0] as string);
    expect(url.searchParams.get("formato")).toBe("application/vnd.geo+json");
    expect(url.searchParams.get("intrarregiao")).toBe("municipio");
  });
  it("não aceita carregamento parcial da malha municipal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }));
    await expect(fetchSergipe()).rejects.toThrow("formato inesperado");
  });
  it("recusa endereço incompleto sem enviar consulta externa", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const incomplete = makePlaces([{ ...establishments[0]!, address: "Rua antiga, 10" }], clients, devices)[0]!;
    await expect(geocodePlace(incomplete, municipality)).rejects.toThrow("Endereço incompleto");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("só retorna resultados numerados e dentro dos limites municipais", async () => {
    vi.spyOn(Date, "now").mockReturnValue(100000);
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [
      { lon: "-37", lat: "-11", display_name: "Rua teste, 10", address: { house_number: "10" } },
      { lon: "-39", lat: "-11", address: { house_number: "10" } },
      { lon: "-37", lat: "-11", address: {} },
      { lon: "-37", lat: "-11", address: { house_number: "11" } },
    ] });
    vi.stubGlobal("fetch", fetch);
    const place = makePlaces(establishments, clients, devices)[0]!;
    await expect(geocodePlace(place, municipality)).resolves.toEqual([{ position: [-37, -11], label: "Rua teste, 10" }]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).not.toContain("Cliente");
    await expect(geocodePlace(place, municipality)).rejects.toThrow("Aguarde");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
