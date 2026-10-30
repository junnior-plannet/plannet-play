import type { EstablishmentDraft } from "@/lib/client-form";
import { resizeTvs } from "@/lib/client-form";
import { Field, inputCls } from "@/components/app/ui";

type Props = {
  drafts: EstablishmentDraft[];
  onChange: (drafts: EstablishmentDraft[]) => void;
  disabled: boolean;
  plan: { name: string; max_tvs: number | null; active: boolean } | undefined;
  otherTvCount?: number;
};

export function ClientStructureFields({ drafts, onChange, disabled, plan, otherTvCount = 0 }: Props) {
  const est = drafts[0];
  if (!est) return null;
  const savedCount = est.tvs.filter((tv) => tv.saved).length;
  const max = !plan?.active ? est.tvs.length : plan.max_tvs === null ? 1000 : Math.max(savedCount, Math.min(1000, plan.max_tvs - otherTvCount));
  const update = (value: EstablishmentDraft) => onChange([value]);
  return <section className="space-y-4 border-t pt-4">
    <Field label="Quantidade de TVs"><input aria-label="Quantidade de TVs" type="number" min={savedCount} max={max} step={1} value={est.tvs.length} disabled={disabled} className={inputCls} onChange={(e) => {
      const count = Number(e.target.value);
      if (count <= max) update(resizeTvs(est, count, () => crypto.randomUUID()));
    }} /></Field>
    {plan?.max_tvs != null && <p className="text-xs text-muted-foreground">Limite do plano: {plan.max_tvs} TVs{otherTvCount > 0 && ` · ${otherTvCount} em outros estabelecimentos`}</p>}
    {plan?.max_tvs != null && est.tvs.length + otherTvCount > plan.max_tvs && <p role="alert" className="text-sm text-destructive">A quantidade excede o limite do plano.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {est.tvs.map((tv, index) => <Field key={tv.id} label={`Nome da TV ${index + 1}`}><input aria-label={`Nome da TV ${index + 1}`} required className={inputCls} value={tv.name} disabled={disabled} onChange={(e) => update({ ...est, tvs: est.tvs.map((t) => t.id === tv.id ? { ...t, name: e.target.value } : t) })} /></Field>)}
    </div>
  </section>;
}
