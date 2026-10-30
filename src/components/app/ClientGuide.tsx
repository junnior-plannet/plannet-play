import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Info, Tv, Users, ClipboardList } from "lucide-react";
import { activationLabel, devicesQuery, establishmentsQuery, orientationLabel, plansQuery, type ClientRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, inputCls, selectCls } from "@/components/app/ui";

export const clientGuideSteps = ["Dados do cliente", "Estabelecimentos", "TVs", "Resumo"] as const;
const icons = [Users, Building2, Tv, ClipboardList];

export function ClientGuideNav({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  return <nav aria-label="Etapas do cadastro" className="border-b bg-card p-4 sm:px-6">
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {clientGuideSteps.map((label, index) => {
        const Icon = icons[index];
        return <li key={label}><button type="button" aria-current={step === index ? "step" : undefined} onClick={() => onStep(index)} className={`flex h-full w-full items-center gap-2 rounded-lg border p-3 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${step === index ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
          <Icon className="size-4 shrink-0" aria-hidden="true" /><span><span className="block text-[10px] uppercase tracking-wider">Etapa {index + 1}</span>{label}</span>
        </button></li>;
      })}
    </ol>
  </nav>;
}

type Props = { step: number; client: ClientRow | null; name: string; planId: string };

export function ClientGuidePanels({ step, client, name, planId }: Props) {
  const establishments = useQuery({ ...establishmentsQuery, enabled: !!client && step > 0 });
  const devices = useQuery({ ...devicesQuery, enabled: !!client && step > 0 });
  const plans = useQuery(plansQuery);
  const [selectedEstablishment, setSelectedEstablishment] = useState("");
  const linked = client ? (establishments.data ?? []).filter((e) => e.client_id === client.id) : [];
  const clientDevices = client ? (devices.data ?? []).filter((d) => d.establishments?.client_id === client.id) : [];
  const selected = linked.find((e) => e.id === selectedEstablishment) ?? linked[0];
  const visibleDevices = clientDevices.filter((d) => d.establishment_id === selected?.id);
  const plan = plans.data?.find((p) => p.id === planId);
  const loading = !!client && (establishments.isPending || devices.isPending || establishments.isFetching || devices.isFetching);
  const error = establishments.error || devices.error;
  const total = client ? clientDevices.length : 0;
  const knownLimit = !!planId && !!plan && !plans.error;
  const overLimit = knownLimit && plan.max_tvs !== null && total > plan.max_tvs;
  if (step === 0) return null;

  return <section aria-labelledby="guide-step-title" className="min-w-0 space-y-4">
    <div><h2 id="guide-step-title" className="text-base font-semibold">{clientGuideSteps[step]}</h2><p className="mt-1 text-xs text-muted-foreground">{step === 1 ? "Estabelecimentos vinculados a este cliente." : step === 2 ? "Quantidade e configuração individual das TVs já cadastradas." : "Confira os dados e o que ainda precisa ser feito."}</p></div>
    <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p>Estrutura visual do cadastro guiado. Novos estabelecimentos e TVs não são salvos por este assistente nesta etapa. As páginas Estabelecimentos e Telas continuam disponíveis separadamente.</p></div>
    {!client && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Salve os dados do cliente para continuar depois pelo botão “Abrir cadastro guiado” na lista de Clientes. Nenhum estabelecimento ou TV será criado automaticamente.</p>}
    {client && loading && <p role="status" className="text-sm text-muted-foreground">Consultando estabelecimentos e TVs…</p>}
    {client && error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm"><p>Não foi possível consultar todos os vínculos. Os totais e o resumo não estão disponíveis.</p><Button type="button" size="sm" variant="outline" onClick={() => { void establishments.refetch(); void devices.refetch(); }}>Tentar novamente</Button></div>}
    {(!client || (!loading && !error)) && <>
      <div className={`rounded-xl border p-4 ${overLimit ? "border-destructive/50 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
        <p className="text-xs text-muted-foreground">Plano e capacidade de TVs</p><p className="mt-1 text-sm font-semibold">{planId ? (plan?.name ?? "Plano não disponível") : "Sem plano selecionado"} · {total} TV(s) cadastrada(s)</p>
        <p className="mt-1 text-xs text-muted-foreground">{plans.isPending ? "Consultando limite…" : knownLimit ? (plan.max_tvs === null ? "Plano sem limite de TVs definido." : `Limite: ${plan.max_tvs} TV(s) · Disponíveis: ${Math.max(0, plan.max_tvs - total)}`) : "Limite não confirmado. Não é possível autorizar novas TVs neste assistente."}</p>
        {overLimit && <p role="alert" className="mt-2 text-xs font-medium text-destructive">Atenção: o cadastro existente excede o limite do plano selecionado. Revise o plano antes de adicionar TVs.</p>}
      </div>
      {step === 1 && <>
        {!linked.length ? <p className="text-sm text-muted-foreground">Nenhum estabelecimento vinculado.</p> : linked.map((e) => <article key={e.id} className="flex items-start gap-3 rounded-xl border bg-card p-4"><Building2 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><h3 className="break-words text-sm font-medium">{e.name}</h3><p className="mt-1 text-xs text-muted-foreground">{[e.city, e.region].filter(Boolean).join(" / ") || "Localização não informada"} · {clientDevices.filter((d) => d.establishment_id === e.id).length} TV(s)</p><p className="mt-1 text-xs text-muted-foreground">{e.status === "ativo" ? "Ativo" : "Inativo"} · já salvo</p></div></article>)}
        <Button type="button" variant="outline" disabled>Adicionar estabelecimento · em breve</Button>
      </>}
      {step === 2 && <>
        {!!linked.length && <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]"><Field label="Estabelecimento"><select aria-label="Estabelecimento das TVs" className={selectCls} value={selected?.id ?? ""} onChange={(e) => setSelectedEstablishment(e.target.value)}>{linked.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field><Field label="TVs cadastradas"><input aria-label="Quantidade de TVs cadastradas" type="number" className={inputCls} value={visibleDevices.length} readOnly /></Field></div>}
        {!visibleDevices.length && <p className="text-sm text-muted-foreground">{linked.length ? "Nenhuma TV cadastrada neste estabelecimento." : "Vincule um estabelecimento antes de configurar TVs."}</p>}
        {visibleDevices.map((d) => <article key={d.id} className="space-y-3 rounded-xl border bg-card p-4"><h3 className="flex items-center gap-2 break-words text-sm font-semibold"><Tv className="size-4 shrink-0 text-primary" aria-hidden="true" />{d.name}</h3><dl className="grid gap-3 text-sm sm:grid-cols-2">{[["Código do dispositivo", d.device_code], ["Número de série", d.serial_number], ["Modelo", d.model], ["Local da instalação", d.location_note], ["Orientação", orientationLabel[d.orientation]], ["Ativação", activationLabel[d.activation_status]]].map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value || "Não informado"}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Somente consulta · configuração disponível na página Telas.</p></article>)}
        <Button type="button" variant="outline" disabled>Adicionar / configurar nova TV · em breve</Button>
      </>}
      {step === 3 && <div className="space-y-4 rounded-xl border bg-card p-4"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Cliente no formulário</dt><dd className="mt-1 break-words font-medium">{name.trim() || "Nome ainda não informado"}</dd></div><div><dt className="text-xs text-muted-foreground">Dados do cliente</dt><dd className="mt-1">{client ? "Cadastro existente · alterações dependem de salvar" : "Ainda não salvo"}</dd></div><div><dt className="text-xs text-muted-foreground">Estabelecimentos já salvos</dt><dd className="mt-1">{linked.length}</dd></div><div><dt className="text-xs text-muted-foreground">TVs já salvas</dt><dd className="mt-1">{total}</dd></div></dl><p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">“Salvar e continuar depois” salva somente os dados do cliente. Reabra o cadastro pela lista de Clientes. Esta versão não registra progresso das etapas nem conclui o cadastro de estabelecimentos ou TVs.</p></div>}
    </>}
  </section>;
}
