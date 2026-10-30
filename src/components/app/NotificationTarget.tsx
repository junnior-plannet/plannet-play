import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { activationLabel, orientationLabel, statusLabel } from "@/lib/api";
import type { AdminNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";

/** Resolve IDs against current RLS, not event snapshots or arbitrary URLs. Read-only. */
export function NotificationTarget({ item, onBack }: { item: AdminNotification; onBack: () => void }) {
  const { data: me } = useMe();
  const device = useQuery({
    queryKey: ["notification-device", me?.userId, item.deviceId],
    enabled: me?.isAdmin === true && !!item.deviceId,
    queryFn: async () => {
      const result = await supabase.from("devices")
        .select("id,name,device_code,orientation,activation_status,establishments(name,client_id,clients(name))")
        .eq("id", item.deviceId!).maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const client = useQuery({
    queryKey: ["notification-client", me?.userId, item.clientId],
    enabled: me?.isAdmin === true && !item.deviceId && !!item.clientId,
    queryFn: async () => {
      const result = await supabase.from("clients").select("id,name,city,status,plans(name)").eq("id", item.clientId!).maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const query = item.deviceId ? device : client;
  const d = device.data;
  const c = client.data;
  if (!me?.isAdmin) return null;
  return <section className="space-y-4" aria-label="Registro relacionado à notificação">
    <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="size-4" />Voltar às notificações</Button>
    {query.isPending ? <p className="text-sm text-muted-foreground">Consultando cadastro atual…</p> : query.isError ? <div role="alert" className="text-sm"><p>Não foi possível consultar o registro.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : !query.data ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">Registro removido ou sem permissão de acesso.</p> : <div className="rounded-xl border border-primary/20 bg-card p-5">
      <h3 className="break-words text-base font-semibold">{d?.name ?? c?.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">Cadastro atual · somente leitura</p>
      {d && <dl className="mt-5 space-y-3 break-words text-sm">
        <div><dt className="text-muted-foreground">Cliente</dt><dd>{d.establishments?.clients?.name ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Local</dt><dd>{d.establishments?.name ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Código</dt><dd>{d.device_code}</dd></div>
        <div><dt className="text-muted-foreground">Orientação</dt><dd>{orientationLabel[d.orientation]}</dd></div>
        <div><dt className="text-muted-foreground">Ativação</dt><dd>{activationLabel[d.activation_status]}</dd></div>
      </dl>}
      {c && <dl className="mt-5 space-y-3 break-words text-sm">
        <div><dt className="text-muted-foreground">Município</dt><dd>{c.city ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Status</dt><dd>{statusLabel[c.status]}</dd></div>
        <div><dt className="text-muted-foreground">Plano</dt><dd>{c.plans?.name ?? "—"}</dd></div>
      </dl>}
      {(c?.id || d?.establishments?.client_id) && <Button asChild size="sm" variant="outline" className="mt-5"><Link to="/telas" search={{ client: c?.id ?? d?.establishments?.client_id }}>Ver TVs deste cliente</Link></Button>}
    </div>}
  </section>;
}
