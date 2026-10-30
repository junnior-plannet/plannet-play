import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Monitor, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activationLabel } from "@/lib/api";
import { activationColors, activationDistribution, fullAddress, geocodePlace, inMunicipality, verifiedPosition, type Candidate, type ConfirmedPosition, type Mesh, type NetworkPlace } from "@/lib/network-map";

type Props = { place: NetworkPlace; mesh?: Mesh | undefined; confirmed?: ConfirmedPosition | undefined; onConfirm: (position: ConfirmedPosition | null) => void; onClose: () => void };
export function NetworkPlaceDetails({ place, mesh, confirmed, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => () => request.current?.abort(), []);
  const municipality = mesh?.municipalities.find((item) => inMunicipality(place, item));
  const verified = mesh ? verifiedPosition(place, confirmed, mesh) : undefined;
  const complete = !!(place.addressData.street.trim() && place.addressData.number.trim() && place.addressData.city.trim());
  async function search() {
    if (!municipality || locked.current) return;
    locked.current = true; setLoading(true); setError(""); setCandidates([]);
    request.current = new AbortController();
    const timeout = setTimeout(() => request.current?.abort(), 15000);
    try {
      const results = await geocodePlace(place, municipality, request.current.signal);
      setCandidates(results);
      if (!results.length) setError("Nenhum endereço com número correspondente dentro deste município foi encontrado. O local continua sem posição confirmada; não será usado o centro da cidade ou do CEP.");
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Consulta interrompida ou tempo esgotado. Tente novamente.");
    } finally { clearTimeout(timeout); locked.current = false; setLoading(false); }
  }
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Detalhes do local</p><h2 className="mt-1 text-lg font-semibold">{place.clientName}</h2><p className="text-sm text-muted-foreground">{place.name}</p></div>
      <Button variant="ghost" size="icon" className="mr-5 shrink-0 xl:mr-0" onClick={onClose} aria-label="Fechar detalhes do local"><X className="size-4" /></Button>
    </div>
    <section className="rounded-xl border bg-background/60 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><MapPin className="size-4 text-primary" />Endereço cadastrado</h3>
      <p className="break-words text-sm leading-relaxed">{fullAddress(place)}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted-foreground">Município</dt><dd className="mt-1">{place.addressData.city || "Não informado"}</dd></div><div><dt className="text-muted-foreground">Bairro</dt><dd className="mt-1">{place.addressData.district || "Não informado"}</dd></div></dl>
    </section>
    <section className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold">{verified ? "Posição confirmada nesta sessão" : "Local sem posição confirmada"}</h3>
      {verified ? <><p className="text-xs text-muted-foreground">{verified.label}</p><p className="font-mono text-xs">{verified.position[1].toFixed(6)}, {verified.position[0].toFixed(6)}</p><Button variant="outline" size="sm" onClick={() => { onConfirm(null); setCandidates([]); }}>Remover confirmação</Button></> : <>
        <p className="text-xs leading-relaxed text-muted-foreground">A consulta individual envia logradouro, número, CEP disponível e município ao Nominatim / OpenStreetMap. Não há consulta automática, em massa ou armazenamento no banco. Confira o resultado antes de confirmar.</p>
        {!complete && <p className="text-xs text-warning">Endereço incompleto. Logradouro, número e município são necessários. O cadastro não será alterado aqui.</p>}
        {!municipality && <p className="text-xs text-muted-foreground">{mesh ? "Município não identificado em Sergipe. Verifique o município e a UF cadastrados." : "Aguarde a malha do IBGE para validar o município e seus limites."}</p>}
        <Button variant="outline" size="sm" className="h-auto whitespace-normal py-2 text-left" disabled={loading || !complete || !municipality || place.tvs.length === 0} onClick={() => void search()}>{loading ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <MapPin className="size-4 shrink-0" />}{loading ? "Consultando endereço…" : "Consultar este endereço no OpenStreetMap"}</Button>
        {place.tvs.length === 0 && <p className="text-xs text-muted-foreground">Pontos são exibidos apenas para locais com TVs cadastradas.</p>}
        {error && <p role="alert" className="text-xs text-warning">{error}</p>}
        {candidates.map((candidate, index) => <div key={`${candidate.position.join()}:${index}`} className="space-y-2 rounded-lg border bg-card p-3"><p className="text-xs leading-relaxed">{candidate.label}</p><p className="font-mono text-[10px] text-muted-foreground">{candidate.position[1].toFixed(6)}, {candidate.position[0].toFixed(6)} · dentro do município</p><Button size="sm" onClick={() => { onConfirm({ ...candidate, fingerprint: place.fingerprint }); setCandidates([]); }}><Check className="size-4" />Confirmar este local</Button></div>)}
      </>}
      <p className="text-[11px] text-muted-foreground">As confirmações são temporárias e se perdem ao sair desta página. A precisão depende do endereço e da cobertura do serviço.</p>
    </section>
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Monitor className="size-4 text-primary" />TVs do local <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{place.tvs.length}</span></h3>
      <dl className="mb-4 grid grid-cols-2 gap-2" aria-label="Distribuição dos status de ativação">{activationDistribution(place).map(({ status, count }) => <div key={status} className="rounded-lg border bg-background/60 p-2.5"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className="size-2 rounded-full" style={{ background: activationColors[status] }} />{activationLabel[status]}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{count}</dd></div>)}</dl>
      <div className="space-y-3">{place.tvs.map((tv) => <article key={tv.id} className="rounded-xl border bg-background/60 p-4">
        <h4 className="break-words text-sm font-semibold">{tv.name}</h4>
        <dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Orientação</dt><dd>{tv.orientation === "vertical" ? "Vertical (9:16)" : "Horizontal (16:9)"}</dd></div><div><dt className="text-muted-foreground">Código do dispositivo</dt><dd className="mt-1 break-all rounded-md bg-muted px-2 py-1.5 font-mono">{tv.device_code}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Ativação</dt><dd className="flex items-center gap-1.5"><i className="size-1.5 rounded-full" style={{ background: activationColors[tv.activation_status] }} />{activationLabel[tv.activation_status]}</dd></div></dl>
      </article>)}{place.tvs.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nenhuma TV cadastrada neste local.</p>}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Status de ativação do Supabase. Não há monitoramento real de conexão disponível; online/offline não é informado.</p>
    </section>
  </div>;
}
