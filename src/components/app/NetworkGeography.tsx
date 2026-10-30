import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { bounds, geometryPath, project, activationColors, placeStatus, type Mesh, type NetworkPlace, type ConfirmedPosition, type Municipality } from "@/lib/network-map";

type Box = [number, number, number, number];
type Props = { mesh: Mesh; municipality?: Municipality; places: NetworkPlace[]; positions: Record<string, ConfirmedPosition>; selectedId: string | null; onMunicipality: (id: string) => void; onPlace: (id: string) => void };
export function NetworkGeography({ mesh, municipality, places, positions, selectedId, onMunicipality, onPlace }: Props) {
  const paths = useMemo(() => mesh.municipalities.map((item) => ({ ...item, path: geometryPath(item.geometry), box: bounds([item.geometry]) })), [mesh]);
  const outline = useMemo(() => mesh.outline.map(geometryPath).join(""), [mesh]);
  const target = useMemo(() => bounds(municipality ? [municipality.geometry] : mesh.outline), [mesh, municipality]);
  const [view, setView] = useState<Box>(target);
  const current = useRef<Box>(target);
  const animation = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; box: Box; moved: boolean; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const [hover, setHover] = useState<{ name: string; tvs: number } | null>(null);
  function update(box: Box) { current.current = box; setView(box); }
  useEffect(() => {
    cancelAnimationFrame(animation.current);
    const from = current.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { current.current = target; setView(target); return () => cancelAnimationFrame(animation.current); }
    const start = performance.now();
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / 550), ease = 1 - Math.pow(1 - progress, 3);
      const next = from.map((value, index) => value + (target[index]! - value) * ease) as Box;
      current.current = next; setView(next);
      if (progress < 1) animation.current = requestAnimationFrame(step);
    };
    animation.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animation.current);
  }, [target]);
  function zoom(factor: number) {
    cancelAnimationFrame(animation.current);
    const [x, y, width, height] = current.current;
    const newWidth = Math.max(1, Math.min(1800, width * factor)), ratio = newWidth / width;
    update([x + (width - newWidth) / 2, y + (height - height * ratio) / 2, newWidth, height * ratio]);
  }
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimationFrame(animation.current);
      const matrix = element.getScreenCTM();
      if (!matrix) return;
      const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const [x, y, width, height] = current.current;
      const nextWidth = Math.max(1, Math.min(1800, width * Math.exp(Math.max(-150, Math.min(150, event.deltaY)) * 0.002)));
      const factor = nextWidth / width;
      const box: Box = [cursor.x - (cursor.x - x) * factor, cursor.y - (cursor.y - y) * factor, nextWidth, height * factor];
      current.current = box; setView(box);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  return <div className="network-map relative min-w-0 overflow-hidden rounded-2xl border" aria-label="Mapa interativo de Sergipe">
    <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[65%]">
      <div className="network-eyebrow">PLANNET / REDE GEOGRÁFICA</div>
      <h2 className="mt-1 text-xl font-semibold">{municipality?.name ?? "Sergipe"}</h2>
      <p className="mt-1 text-xs opacity-70">{municipality ? "Visão municipal" : "75 municípios · selecione uma área"}</p>
    </div>
    <svg ref={svg} viewBox={view.join(" ")} className="h-[540px] w-full touch-none select-none sm:h-[640px]" role="group" aria-label="Municípios. Clique para aproximar; arraste para mover; use os controles para zoom."
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        cancelAnimationFrame(animation.current); suppressClick.current = false;
        drag.current = { x: event.clientX, y: event.clientY, box: [...current.current], moved: false, pointerId: event.pointerId };
      }}
      onPointerMove={(event) => {
        const state = drag.current, matrix = svg.current?.getScreenCTM();
        if (!state || !matrix) return;
        if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 4) {
          state.moved = true; suppressClick.current = true; setHover(null);
          if (!svg.current?.hasPointerCapture(event.pointerId)) svg.current?.setPointerCapture(event.pointerId);
        }
        if (!state.moved) return;
        const inverse = matrix.inverse();
        const dx = event.clientX - state.x, dy = event.clientY - state.y;
        update([state.box[0] - dx * inverse.a - dy * inverse.c, state.box[1] - dx * inverse.b - dy * inverse.d, state.box[2], state.box[3]]);
      }}
      onPointerUp={(event) => { if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId); drag.current = null; }}
      onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}>
      <title>Sergipe — malha municipal oficial do IBGE</title>
      {paths.map((item) => <path key={item.id} d={item.path} fillRule="evenodd" className={`network-municipality ${municipality?.id === item.id ? "is-selected" : ""} ${item.name === "Aracaju" ? "is-capital" : ""}`} vectorEffect="non-scaling-stroke"
        tabIndex={0} role="button" aria-label={`Explorar ${item.name}`} aria-pressed={municipality?.id === item.id}
        onClick={() => { if (!suppressClick.current) onMunicipality(item.id); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onMunicipality(item.id); } }}><title>{item.name}</title></path>)}
      <path d={outline} className="network-outline" fill="none" pointerEvents="none" vectorEffect="non-scaling-stroke" />
      {paths.filter((item) => municipality?.id === item.id || (!municipality && ["Aracaju", "Barra dos Coqueiros"].includes(item.name))).map((item) => <text key={item.id} x={item.box[0] + item.box[2] / 2} y={item.box[1] + item.box[3] / 2} className="network-map-label" style={{ fontSize: view[2] / 48 }} textAnchor="middle" pointerEvents="none">{item.name}</text>)}
      {places.filter((place) => place.tvs.length > 0 && positions[place.id]?.fingerprint === place.fingerprint).map((place) => {
        const confirmed = positions[place.id]!;
        const [x, y] = project(confirmed.position), status = placeStatus(place);
        const color = status === "mixed" ? "var(--network-cyan)" : activationColors[status];
        return <g key={place.id} role="button" tabIndex={0} aria-label={`${place.clientName}, ${place.name}, ${place.tvs.length} TVs`} className="network-pin" style={{ color }}
          onMouseEnter={() => setHover({ name: place.clientName, tvs: place.tvs.length })} onMouseLeave={() => setHover(null)} onFocus={() => setHover({ name: place.clientName, tvs: place.tvs.length })} onBlur={() => setHover(null)}
          onClick={(event) => { event.stopPropagation(); if (!suppressClick.current) onPlace(place.id); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPlace(place.id); } }}>
          <title>{place.clientName} · {place.name} · {place.tvs.length} TVs</title>
          <circle cx={x} cy={y} r={view[2] / 55} fill="transparent" />
          <circle cx={x} cy={y} r={view[2] / 100} fill="currentColor" opacity={selectedId === place.id ? 0.5 : 0.2} />
          <circle cx={x} cy={y} r={view[2] / 220} fill="currentColor" />
        </g>;
      })}
    </svg>
    <div className="absolute right-3 top-3 flex flex-col gap-2">
      <button className="network-control" aria-label="Aproximar mapa" onClick={() => zoom(0.7)}><Plus className="size-4" /></button>
      <button className="network-control" aria-label="Afastar mapa" onClick={() => zoom(1.4)}><Minus className="size-4" /></button>
      <button className="network-control" aria-label="Voltar à visão geral de Sergipe" onClick={() => { if (municipality) onMunicipality(""); else update(bounds(mesh.outline)); }}><RotateCcw className="size-4" /></button>
    </div>
    {hover && <div role="status" className="network-map-tooltip absolute bottom-20 left-4 rounded-xl border p-3 text-sm"><strong>{hover.name}</strong><div>{hover.tvs} TVs cadastradas</div></div>}
    <div className="pointer-events-none absolute bottom-12 left-4 right-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
      {([['ativa', 'Ativadas'], ['pendente', 'Pendentes'], ['inativa', 'Inativas'], ['bloqueada', 'Bloqueadas'], ['mixed', 'Status mistos']] as const).map(([status, label]) => <span key={status} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: status === 'mixed' ? 'var(--network-cyan)' : activationColors[status] }} />{label}</span>)}
    </div>
    <div className="absolute bottom-3 left-4 right-4 flex flex-wrap justify-between gap-1 text-[10px] opacity-70"><span>Ativação não indica conexão online.</span><span><a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" target="_blank" rel="noreferrer" className="underline">Malhas: IBGE</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">Geocodificação: © OpenStreetMap</a></span></div>
  </div>;
}
