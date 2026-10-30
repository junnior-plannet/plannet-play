import { bounds, contains, isGeometry, normalize, type Geometry, type Municipality, type Position } from "@/lib/network-map";

export type Road = { id: number; name: string; points: Position[] };
const highwayTypes = new Set(["trunk", "primary", "secondary", "tertiary"]);

/** Municipality detail is fetched only after selection, never for all 75 cities. */
export async function fetchMunicipalGeometry(municipality: Municipality, signal?: AbortSignal): Promise<Geometry> {
  if (!/^28\d{5}$/.test(municipality.id)) throw new Error("Código municipal inválido.");
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipality.id}?formato=application%2Fvnd.geo%2Bjson&qualidade=intermediaria`, { signal: signal ?? null });
  if (!response.ok) throw new Error("O contorno detalhado do IBGE está indisponível. A malha geral permanece visível.");
  const data: unknown = await response.json();
  const features = (data as { features?: { geometry?: unknown }[] } | null)?.features;
  const geometry = features?.length === 1 ? features[0]?.geometry : undefined;
  if (!isGeometry(geometry)) throw new Error("O IBGE não retornou um contorno municipal válido.");
  bounds([geometry]);
  return geometry;
}

/** Uses OSM's actual municipal administrative area, not a fabricated street grid. */
export async function fetchMunicipalRoads(municipality: Municipality, signal?: AbortSignal): Promise<Road[]> {
  if (!/^28\d{5}$/.test(municipality.id)) throw new Error("Código municipal inválido.");
  const query = `[out:json][timeout:20][maxsize:8388608];area["boundary"="administrative"]["admin_level"="8"]["ref:IBGE"="${municipality.id}"]->.city;way(area.city)["highway"~"^(trunk|primary|secondary|tertiary)$"]["name"];out geom;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }), signal: signal ?? null,
  });
  if (!response.ok) throw new Error("Vias do OpenStreetMap indisponíveis. O contorno e os locais continuam acessíveis.");
  return parseRoads(await response.json(), municipality.geometry);
}

export function parseRoads(data: unknown, geometry: Geometry): Road[] {
  const elements = (data as { elements?: unknown[]; remark?: string } | null)?.elements;
  if (!Array.isArray(elements) || (data as { remark?: string }).remark) throw new Error("Não foi possível obter as vias completas deste município.");
  const roads: Road[] = [];
  for (const element of elements) {
    if (!element || typeof element !== "object") continue;
    const way = element as { type?: string; id?: number; tags?: { name?: string; highway?: string }; geometry?: { lon?: number; lat?: number }[] };
    if (way.type !== "way" || !Number.isSafeInteger(way.id) || !way.tags?.name || !highwayTypes.has(way.tags.highway ?? "") || !Array.isArray(way.geometry)) continue;
    const points: Position[] = [];
    for (const point of way.geometry) {
      if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat) || Math.abs(point.lon!) > 180 || Math.abs(point.lat!) > 90) break;
      points.push([point.lon!, point.lat!]);
    }
    // Never join across a missing coordinate or use a street outside the selected city.
    if (points.length !== way.geometry.length || points.length < 2 || !points.some((point) => contains(geometry, point))) continue;
    roads.push({ id: way.id!, name: way.tags.name, points });
  }
  return roads.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
}
