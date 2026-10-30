import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { bounds, geometryPath, project, activationColors, activationDistribution, placeStatus, verifiedPosition, type Mesh, type NetworkPlace, type ConfirmedPosition, type Municipality } from "@/lib/network-map";
import { fetchMunicipalGeometry, fetchMunicipalRoads } from "@/lib/network-roads";

type Box = [number, number, number, number];
type Props = { mesh: Mesh; municipality?: Municipality; places: NetworkPlace[]; positions: Record<string, ConfirmedPosition>; selectedId: string | null; onMunicipality: (id: string) => void; onPlace: (id: string) => void };
export function NetworkGeography({ mesh, municipality, places, positions, selectedId, onMunicipality, onPlace }: Props) {
  const clipId = `network-${useId().replace(/:/g, "")}`;
  const detail = useQuery({ queryKey: ["municipal-mesh", municipality?.id], queryFn: ({ signal }) => fetchMunicipalGeometry(municipality!, signal), enabled: !!municipality, staleTime: 86400000, retry: 1 });
  const city = useMemo(() => municipality ? { ...municipality, geometry: detail.data ?? municipality.geometry } : undefined, [municipality, detail.data]);
  const roads = useQuery({ queryKey: ["municipal-roads", city?.id], queryFn: ({ signal }) => fetchMunicipalRoads(city!, signal), enabled: !!city && !detail.isPending, staleTime: 86400000, gcTime: 3600000, retry: false });
  const paths = useMemo(() => mesh.municipalities.map((item) => ({ ...item, path: geometryPath(item.geometry), box: bounds([item.geometry]) })), [mesh]);
  const outline = useMemo(() => mesh.outline.map(geometryPath).join(""), [mesh]);
  const cityPath = useMemo(() => city ? geometryPath(city.geometry) : "", [city]);
  const target = useMemo(() => bounds(city ? [city.geometry] : mesh.outline), [mesh, city]);
  const [view, setView] = useState<Box>(target);
  const current = useRef<Box>(target);
  const [hover, setHover] = useState<{ name: string; tvs: number } | null>(null);
  useEffect(() => {
    setHover(null);
    const from = current.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { current.current = target; setView(target); return; }
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / 550), ease = 1 - Math.pow(1 - progress, 3);
      const next = from.map((value, index) => value + (target[index]! - value) * ease) as Box;
      current.current = next; setView(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const pins = places.filter((place) => verifiedPosition(place, positions[place.id], mesh));
  const roadPaths = useMemo(() => (roads.data ?? []).map((road) => ({ ...road, path: road.points.map((point, index) => `${index ? "L" : "M"}${project(point).join(",")}`).join("") })), [roads.data]);
  return <div className="network-map relative min-w-0 overflow-hidden rounded-2xl border" aria-label="Mapa interativo de Sergipe">
    <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[60%]">
      <div className="network-eyebrow">PLANNET / REDE GEOGRÁFICA</div>
      <h2 className="mt-1 text-xl font-semibold">{municipality?.name ?? "Sergipe"}</h2>
      <p className="mt-1 text-xs opacity-70">{municipality ? "Contorno municipal · vias principais reais" : "75 municípios · visão fixa · selecione uma área"}</p>
    </div>
    <svg viewBox={view.join(" ")} preserveAspectRatio="xMidYMid meet" className="h-[600px] w-full select-none pb-40 pt-32 sm:h-[640px] sm:pb-28 sm:pt-20" role="group" aria-label={municipality ? `Mapa de ${municipality.name}, locais e vias principais` : "Municípios de Sergipe. Selecione para abrir a visão municipal. Sem zoom ou movimentação livre."}>
      <title>{municipality?.name ?? "Sergipe"} — contorno geográfico oficial do IBGE</title>
      <defs><clipPath id={clipId}><path d={city ? cityPath : outline} clipRule="evenodd" /></clipPath></defs>
      {!city && <g clipPath={`url(#${clipId})`}>{paths.map((item) => <path key={item.id} d={item.path} fillRule="evenodd" className={`network-municipality ${item.name === "Aracaju" ? "is-capital" : ""}`} vectorEffect="non-scaling-stroke"
        tabIndex={0} role="button" aria-label={`Explorar ${item.name}`}
        onClick={() => onMunicipality(item.id)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onMunicipality(item.id); } }}><title>{item.name}</title></path>)}</g>}
      {city && <path d={cityPath} fillRule="evenodd" className="network-city-land" />}
      {city && <g className="network-roads" clipPath={`url(#${clipId})`}>{roadPaths.map((road) => <path key={road.id} d={road.path} className="network-road" vectorEffect="non-scaling-stroke"><title>{road.name} · OpenStreetMap</title></path>)}</g>}
      <path d={city ? cityPath : outline} className="network-outline network-outline-halo" fill="none" pointerEvents="none" vectorEffect="non-scaling-stroke" />
      <path d={city ? cityPath : outline} className="network-outline" fill="none" pointerEvents="none" vectorEffect="non-scaling-stroke" />
      {!city && paths.filter((item) => item.name === "Aracaju").map((item) => <text key={item.id} x={item.box[0] + item.box[2] / 2} y={item.box[1] + item.box[3] / 2} className="network-map-label" style={{ fontSize: view[2] / 48 }} textAnchor="middle" pointerEvents="none">{item.name}</text>)}
      {pins.map((place) => {
        const [x, y] = project(positions[place.id]!.position), status = placeStatus(place);
        const color = status === "mixed" ? "var(--network-cyan)" : activationColors[status];
        const distribution = activationDistribution(place).filter((item) => item.count > 0);
        let offset = 0;
        return <g key={place.id} role="button" tabIndex={0} aria-label={`${place.clientName}, ${place.name}, ${place.tvs.length} TVs`} aria-pressed={selectedId === place.id} className={`network-pin ${selectedId === place.id ? "is-selected" : ""}`} style={{ color }}
          onMouseEnter={() => setHover({ name: place.clientName, tvs: place.tvs.length })} onMouseLeave={() => setHover(null)} onFocus={() => setHover({ name: place.clientName, tvs: place.tvs.length })} onBlur={() => setHover(null)}
          onClick={(event) => { event.stopPropagation(); onPlace(place.id); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPlace(place.id); } }}>
          <title>{place.clientName} · {place.name} · {place.tvs.length} TVs</title>
          <circle cx={x} cy={y} r={view[2] / 45} fill="transparent" />
          <circle cx={x} cy={y} r={view[2] / 90} fill="currentColor" opacity="0.16" />
          <circle cx={x} cy={y} r={view[2] / 180} fill="currentColor" />
          {status === "mixed" && distribution.map((item) => {
            const length = item.count / place.tvs.length * 100, start = offset; offset += length;
            return <circle key={item.status} cx={x} cy={y} r={view[2] / 125} fill="none" stroke={activationColors[item.status]} strokeWidth="2.5" vectorEffect="non-scaling-stroke" pathLength="100" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform={`rotate(-90 ${x} ${y})`} />;
          })}
        </g>;
      })}
    </svg>
    {municipality && <button type="button" className="network-back absolute right-3 top-4 z-10 flex items-center gap-1.5 rounded-lg border px-2 py-2 text-xs sm:right-4" onClick={() => onMunicipality("")}><ArrowLeft className="size-3.5" /><span>Voltar para Sergipe</span></button>}
    {hover && <div className="network-map-tooltip absolute bottom-28 left-4 z-20 max-w-[85%] rounded-lg border px-3 py-2 text-xs" role="status"><b className="block truncate">{hover.name}</b><span>{hover.tvs} TVs cadastradas</span></div>}
    <div className="network-map-footer absolute inset-x-0 bottom-0 space-y-2 border-t px-4 py-3 text-[10px]">
      {municipality && <div aria-live="polite" className="flex flex-wrap items-center gap-2 opacity-80">
        {(detail.isFetching || roads.isFetching) && <Loader2 className="size-3 animate-spin" />}
        <span>{detail.isFetching ? "Carregando contorno municipal detalhado…" : detail.error ? "Contorno detalhado indisponível; exibindo a malha geral do IBGE." : "Contorno municipal IBGE"}</span>
        <span>· {roads.isFetching ? "Carregando vias reais sob demanda…" : roads.error ? "Vias indisponíveis; nenhum traçado substituto é desenhado." : roads.data?.length ? `${new Set(roads.data.map((road) => road.name)).size} vias principais · OSM` : "Sem vias principais disponíveis nesta consulta."}</span>
        {(detail.isError || roads.isError) && <button type="button" className="underline underline-offset-2" onClick={() => { if (detail.isError) void detail.refetch(); if (roads.isError) void roads.refetch(); }}>Tentar novamente</button>}
      </div>}
      <div className="flex flex-wrap gap-x-3 gap-y-1">{Object.entries(activationColors).map(([key, color]) => <span key={key} className="flex items-center gap-1.5"><i className="size-1.5 rounded-full" style={{ background: color }} />{({ ativa: "Ativa", pendente: "Pendente", inativa: "Inativa", bloqueada: "Bloqueada" })[key as keyof typeof activationColors]}</span>)}<span>Anel multicolorido: status agrupados</span></div>
      <p className="opacity-60">Contornos: <a className="underline" href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html" target="_blank" rel="noreferrer">IBGE</a> · Vias e geocodificação: © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · {pins.length} locais verificados nesta sessão</p>
    </div>
  </div>;
}
