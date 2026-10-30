import type { EstablishmentDraft } from "@/lib/client-form";
import { resizeTvs } from "@/lib/client-form";
import { Field, inputCls, selectCls } from "@/components/app/ui";
import type { Orientation } from "@/lib/api";

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
    <h2 className="text-sm font-semibold">TVs do cliente</h2>
    <Field label="Quantidade de TVs"><input aria-label="Quantidade de TVs" type="number" min={savedCount} max={max} step={1} value={est.tvs.length} disabled={disabled} className={inputCls} onChange={(e) => {
      const count = Number(e.target.value);
      if (count <= max) update(resizeTvs(est, count, () => crypto.randomUUID()));
    }} /></Field>
    {plan?.max_tvs != null && <p className="text-xs text-muted-foreground">Limite do plano: {plan.max_tvs} TVs</p>}
    {otherTvCount > 0 && <p className="text-xs text-muted-foreground">Este cliente tem mais {otherTvCount} TVs em vínculos anteriores, preservadas e incluídas no limite do plano. Consulte e edite essas TVs em Dispositivos.</p>}
    {savedCount > 0 && <p className="text-xs text-muted-foreground">TVs já salvas não são excluídas ao alterar a quantidade. Para gerenciar a ativação, acesse Dispositivos.</p>}
    {!plan?.active && <p className="text-xs text-muted-foreground">Selecione um plano ativo para adicionar novas TVs. As TVs existentes continuam disponíveis para edição.</p>}
    {plan?.max_tvs != null && est.tvs.length + otherTvCount > plan.max_tvs && <p role="alert" className="text-sm text-destructive">A quantidade excede o limite do plano.</p>}
    <div className="space-y-3">
      {est.tvs.map((tv, index) => <div key={tv.id} className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">TV {index + 1}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Nome da TV ${index + 1}`}><input aria-label={`Nome da TV ${index + 1}`} required className={inputCls} value={tv.name} disabled={disabled} onChange={(e) => update({ ...est, tvs: est.tvs.map((t) => t.id === tv.id ? { ...t, name: e.target.value } : t) })} /></Field>
          <Field label={`Orientação da TV ${index + 1}`}><select aria-label={`Orientação da TV ${index + 1}`} className={selectCls} value={tv.orientation} disabled={disabled} onChange={(e) => update({ ...est, tvs: est.tvs.map((t) => t.id === tv.id ? { ...t, orientation: e.target.value as Orientation } : t) })}>
            <option value="horizontal">Horizontal (16:9)</option>
            <option value="vertical">Vertical (9:16)</option>
          </select></Field>
        </div>
      </div>)}
    </div>
  </section>;
}
