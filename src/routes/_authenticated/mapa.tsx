import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, Building2, CheckCircle2, Clock3, MapPin, Monitor, PowerOff, Users } from "lucide-react";
import { PageHeader, Stat, selectCls } from "@/components/app/ui";
import { QueryState } from "@/components/app/QueryState";
import { RefreshButton } from "@/components/app/RefreshButton";
import { NetworkGeography } from "@/components/app/NetworkGeography";
import { NetworkPlaceDetails } from "@/components/app/NetworkPlaceDetails";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { clientsQuery, establishmentsQuery, devicesQuery } from "@/lib/api";
import { fetchSergipe, makePlaces, scopeNetwork, inMunicipality, fullAddress, verifiedPosition, type ConfirmedPosition } from "@/lib/network-map";
import { seo } from "@/lib/seo";

export const Route = createFileRoute('/_authenticated/mapa')({
  head: () => seo("Mapa da Rede", "Central geográfica da rede em Sergipe: municípios, locais e ativação das TVs."),
  component: Page,
});

function Page() {
  const clients = useQuery(clientsQuery);
  const establishments = useQuery(establishmentsQuery);
  const devices = useQuery(devicesQuery);
  const geography = useQuery({ queryKey: ["sergipe-mesh"], queryFn: ({ signal }) => fetchSergipe(signal), staleTime: 86400000, retry: 1 });
  const [municipalityId, setMunicipalityId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, ConfirmedPosition>>({});
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const sync = () => setDesktop(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const places = useMemo(() => makePlaces(establishments.data ?? [], clients.data ?? [], devices.data ?? []), [establishments.data, clients.data, devices.data]);
  const municipality = geography.data?.municipalities.find((item) => item.id === municipalityId);
  const scope = useMemo(() => scopeNetwork(clients.data ?? [], places, devices.data ?? [], municipality), [clients.data, places, devices.data, municipality]);
  const loading = clients.isPending || establishments.isPending || devices.isPending;
  const error = clients.error ?? establishments.error ?? devices.error;
  const ready = !loading && !error;
  const confirmed = scope.places.filter((place) => geography.data && verifiedPosition(place, positions[place.id], geography.data));
  const confirmedIds = new Set(confirmed.map((place) => place.id));
  const unlocated = scope.places.filter((place) => !confirmedIds.has(place.id));
  const selected = ready ? scope.places.find((place) => place.id === selectedId) : undefined;
  const municipalities = useMemo(() => [...(geography.data?.municipalities ?? [])].sort((a, b) => {
    const priority = (name: string) => name === "Aracaju" ? 0 : name === "Barra dos Coqueiros" ? 1 : 2;
    return priority(a.name) - priority(b.name) || a.name.localeCompare(b.name, "pt-BR");
  }), [geography.data]);
  const changeMunicipality = (id: string) => { setMunicipalityId(id); setSelectedId(null); };
  const retryData = () => { void clients.refetch(); void establishments.refetch(); void devices.refetch(); };
  const details = selected ? <NetworkPlaceDetails key={`${selected.id}:${selected.fingerprint}`} place={selected} {...(geography.data ? { mesh: geography.data } : {})} {...(positions[selected.id] ? { confirmed: positions[selected.id] } : {})} onClose={() => setSelectedId(null)} onConfirm={(position) => {
    setPositions((previous) => { const next = { ...previous }; if (position) next[selected.id] = position; else delete next[selected.id]; return next; });
    if (position) {
      const city = geography.data?.municipalities.find((item) => inMunicipality(selected, item));
      if (city) setMunicipalityId(city.id);
    }
  }} /> : null;
  return <>
    <PageHeader title="Mapa da Rede" description="Uma visão geográfica da sua rede. Explore os municípios de Sergipe e os locais cadastrados." actions={<RefreshButton queryKeys={["clients", "establishments", "devices"]} />} />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      <Stat label="Total de clientes" value={ready ? String(scope.clients) : "—"} icon={Users} />
      <Stat label="Total de locais" value={ready ? String(scope.places.length) : "—"} icon={Building2} />
      <Stat label="Total de TVs" value={ready ? String(scope.tvs) : "—"} icon={Monitor} />
      <Stat label="TVs ativas" value={ready ? String(scope.active) : "—"} icon={CheckCircle2} tone="success" />
      <Stat label="TVs pendentes" value={ready ? String(scope.pending) : "—"} icon={Clock3} tone="warning" />
      <Stat label="TVs inativas" value={ready ? String(scope.inactive) : "—"} icon={PowerOff} />
      {ready && scope.blocked > 0 && <Stat label="TVs bloqueadas" value={String(scope.blocked)} icon={Ban} tone="destructive" />}
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="network-municipality">Município</label><select id="network-municipality" className={`${selectCls} max-w-full`} value={municipalityId} onChange={(event) => changeMunicipality(event.target.value)} disabled={!geography.data}><option value="">Visão geral · Sergipe</option>{municipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {municipalityId && <Button variant="outline" size="sm" onClick={() => changeMunicipality("")}>Voltar para Sergipe</Button>}
        {!municipalityId && geography.data && <Button variant="outline" size="sm" onClick={() => changeMunicipality(municipalities.find((item) => item.name === "Aracaju")?.id ?? "")}>Explorar Aracaju</Button>}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">{municipality ? `Indicadores de ${municipality.name}` : "Indicadores de todos os cadastros acessíveis"}</p>
    </div>
    <div className={`grid items-start gap-4 ${selected && desktop ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
      <div className="min-w-0 space-y-4">
        <QueryState isLoading={geography.isPending} error={geography.error} isEmpty={false} emptyTitle="Malha indisponível" onRetry={() => void geography.refetch()}>
          {geography.data && <NetworkGeography mesh={geography.data} {...(municipality ? { municipality } : {})} places={ready ? scope.places : []} positions={positions} selectedId={selectedId} onMunicipality={changeMunicipality} onPlace={setSelectedId} />}
        </QueryState>
        <div className="rounded-xl border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <p>{municipality ? "O filtro usa o município do endereço cadastrado, não o ponto no mapa." : "A visão geral contabiliza todos os registros permitidos pelo seu acesso, inclusive endereços fora de Sergipe ou sem município. O mapa exibe apenas Sergipe."} TVs inativas e bloqueadas entram no total, mas não nas ativadas ou pendentes.</p>
          <p className="mt-1">Nenhuma posição é inventada. Consulte um endereço individual nos detalhes e confirme o resultado. Sem coordenadas persistidas, as confirmações valem somente enquanto esta página estiver aberta.</p>
        </div>
        <QueryState isLoading={loading} error={error} isEmpty={ready && scope.places.length === 0} emptyIcon={MapPin} emptyTitle="Nenhum local nesta área" emptyDescription="Não há estabelecimentos acessíveis cadastrados para o município selecionado." onRetry={retryData}>
          <section className="overflow-hidden rounded-xl border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><div><h2 className="text-sm font-semibold">Endereços não localizados</h2><p className="mt-1 text-xs text-muted-foreground">{unlocated.length} locais · abra os detalhes para conferir o endereço e as TVs</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{confirmed.length} pontos confirmados nesta sessão</span></header>
            <ul className="max-h-80 divide-y overflow-y-auto">{unlocated.map((place) => <li key={place.id}><button type="button" onClick={() => setSelectedId(place.id)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><MapPin className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{place.clientName} <span className="font-normal text-muted-foreground">/ {place.name}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{fullAddress(place)}</span></span><span className="shrink-0 text-xs text-muted-foreground">{place.tvs.length} TVs</span></button></li>)}</ul>
            {unlocated.length === 0 && <p className="p-5 text-sm text-muted-foreground">Todos os locais com TVs desta área têm posição confirmada nesta sessão.</p>}
          </section>
          {confirmed.length > 0 && <section className="rounded-xl border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Locais posicionados</h2><div className="flex flex-wrap gap-2">{confirmed.map((place) => <Button key={place.id} variant="outline" size="sm" className="max-w-full" onClick={() => setSelectedId(place.id)}><MapPin className="size-3 shrink-0" /><span className="truncate">{place.name} · {place.tvs.length} TVs</span></Button>)}</div></section>}
        </QueryState>
      </div>
      {desktop && selected && <aside aria-label="Detalhes do local selecionado" className="sticky top-4 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border bg-card p-5">{details}</aside>}
    </div>
    {!desktop && <Sheet modal={false} open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}><SheetContent side="right" className="h-full w-[85vw] overflow-y-auto sm:max-w-md"><SheetTitle className="sr-only">Detalhes do local selecionado</SheetTitle><SheetDescription className="sr-only">Endereço, localização e TVs cadastradas no Supabase. O mapa permanece visível ao lado.</SheetDescription>{details}</SheetContent></Sheet>}
  </>;
}
