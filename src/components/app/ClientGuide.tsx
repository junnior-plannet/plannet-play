import { Building2, Plus, Trash2, Tv } from "lucide-react";
import type { EstablishmentDraft } from "@/lib/client-form";
import { resizeTvs } from "@/lib/client-form";
import { Button } from "@/components/ui/button";
import { Field, inputCls, selectCls } from "@/components/app/ui";

type Props = {
  drafts: EstablishmentDraft[];
  onChange: (drafts: EstablishmentDraft[]) => void;
  disabled: boolean;
  plan: { name: string; max_tvs: number | null; active: boolean } | undefined;
};

/** Two sections of the single client form, not a stepper or a separate form. */
export function ClientStructureFields({ drafts, onChange, disabled, plan }: Props) {
  const total = drafts.reduce((n, e) => n + e.tvs.length, 0);
  const update = (id: string, value: EstablishmentDraft) => onChange(drafts.map((e) => e.id === id ? value : e));
  return <>
    <section aria-labelledby="client-establishments-title" className="space-y-4 border-t pt-6">
      <h2 id="client-establishments-title" className="flex items-center gap-2 text-base font-semibold"><Building2 className="size-4 text-primary" aria-hidden="true" />Estabelecimentos</h2>
      <p className="text-xs text-muted-foreground">Informe os nomes. Endereço, tipo e demais detalhes continuam na página Estabelecimentos. Registros já salvos não são removidos por este formulário.</p>
      {!drafts.length && <p className="text-sm text-muted-foreground">Nenhum estabelecimento vinculado. Você pode adicioná-los agora ou depois.</p>}
      {drafts.map((est, index) => <div key={est.id} className="space-y-2 rounded-xl border bg-card p-4">
        <Field label={`Nome do estabelecimento ${index + 1}`}><input aria-label={`Nome do estabelecimento ${index + 1}`} value={est.name} disabled={disabled} onChange={(e) => update(est.id, { ...est, name: e.target.value })} className={inputCls} /></Field>
        <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{est.saved ? "Já salvo · ID preservado" : "Novo · ainda não salvo"}</span>{!est.saved && <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(drafts.filter((e) => e.id !== est.id))}><Trash2 />Remover novo estabelecimento {index + 1}</Button>}</div>
      </div>)}
      <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange([...drafts, { id: crypto.randomUUID(), name: "", saved: false, tvs: [] }])}><Plus />Adicionar estabelecimento</Button>
    </section>
    <section aria-labelledby="client-tvs-title" className="space-y-4 border-t pt-6">
      <h2 id="client-tvs-title" className="flex items-center gap-2 text-base font-semibold"><Tv className="size-4 text-primary" aria-hidden="true" />TVs por estabelecimento</h2>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm" aria-live="polite">
        <p>{plan?.name ?? "Sem plano confirmado"} · {total} TV(s) no formulário</p>
        <p className="mt-1 text-xs text-muted-foreground">{plan ? (plan.max_tvs === null ? "Plano sem limite de TVs definido." : `Limite: ${plan.max_tvs} TV(s) · Disponíveis: ${Math.max(0, plan.max_tvs - total)}`) : "Selecione um plano ativo para adicionar TVs."}</p>
        {plan && !plan.active && <p className="mt-2 text-xs text-destructive">Plano inativo: não permite adicionar TVs.</p>}
        {plan?.max_tvs != null && total > plan.max_tvs && <p role="alert" className="mt-2 text-xs text-destructive">A quantidade excede o limite do plano. Revise antes de salvar.</p>}
      </div>
      <p className="text-xs text-muted-foreground">A quantidade inclui as TVs já salvas, que não podem ser excluídas aqui. Código, série, modelo, local e ativação continuam na página Telas.</p>
      {!drafts.length && <p className="text-sm text-muted-foreground">Adicione um estabelecimento para configurar suas TVs.</p>}
      {drafts.map((est, index) => {
        const savedCount = est.tvs.filter((tv) => tv.saved).length;
        const max = Math.min(1000, !plan || !plan.active ? est.tvs.length : plan.max_tvs === null ? 1000 : Math.max(est.tvs.length, plan.max_tvs - total + est.tvs.length));
        return <article key={est.id} className="space-y-4 rounded-xl border bg-card p-4">
          <h3 className="break-words text-sm font-semibold">{est.name.trim() || `Estabelecimento ${index + 1}`}</h3>
          <Field label={`Quantidade de TVs · estabelecimento ${index + 1}`}><input aria-label={`Quantidade de TVs · estabelecimento ${index + 1}`} type="number" min={savedCount} max={max} step={1} value={est.tvs.length} disabled={disabled} className={inputCls} onChange={(e) => {
            const count = Number(e.target.value);
            if (count <= max) update(est.id, resizeTvs(est, count, () => crypto.randomUUID()));
          }} /></Field>
          {est.tvs.map((tv, tvIndex) => <div key={tv.id} className="space-y-2 border-t pt-3">
            <p className="text-xs text-muted-foreground">TV {tvIndex + 1} · {tv.saved ? "já salva" : "nova"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome da TV"><input aria-label={`Nome da TV ${tvIndex + 1} · estabelecimento ${index + 1}`} className={inputCls} value={tv.name} disabled={disabled} onChange={(e) => update(est.id, { ...est, tvs: est.tvs.map((t) => t.id === tv.id ? { ...t, name: e.target.value } : t) })} /></Field>
              <Field label="Orientação"><select aria-label={`Orientação da TV ${tvIndex + 1} · estabelecimento ${index + 1}`} className={selectCls} value={tv.orientation} disabled={disabled} onChange={(e) => update(est.id, { ...est, tvs: est.tvs.map((t) => t.id === tv.id ? { ...t, orientation: e.target.value === "vertical" ? "vertical" : "horizontal" } : t) })}><option value="horizontal">Horizontal (16:9)</option><option value="vertical">Vertical (9:16)</option></select></Field>
            </div>
          </div>)}
        </article>;
      })}
    </section>
  </>;
}
