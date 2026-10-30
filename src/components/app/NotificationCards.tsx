import { Bell, Check, Inbox, Layers, ShieldCheck, Tv, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNotificationDate, type AdminNotification, type NotificationKind } from "@/lib/notifications";

const eventIcons = { client: Users, plan: Layers, device: Tv, system: ShieldCheck } satisfies Record<NotificationKind, typeof Bell>;

export function DisconnectedInbox() {
  return <section className="rounded-2xl border border-primary/20 bg-card p-6" aria-labelledby="notification-pending-title">
    <span className="mb-5 grid size-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary-glow"><Inbox className="size-6" aria-hidden="true" /></span>
    <h3 id="notification-pending-title" className="text-base font-semibold">Integração pendente de autorização</h3>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Ainda não há uma fonte de eventos conectada a esta central. Por isso, não exibimos contadores, histórico ou notificações de demonstração.</p>
    <div className="mt-5 space-y-3 border-t pt-5 text-sm">
      <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /><span>Nenhuma alteração no banco ou nas permissões.</span></p>
      <p className="text-muted-foreground">Após a autorização e implementação da persistência, a central poderá receber eventos reais de clientes, planos, TVs e operações importantes.</p>
    </div>
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">A proposta de estrutura, acesso e registro de eventos está em docs/central-de-notificacoes.md, no projeto.</p>
  </section>;
}

export function NotificationCard({ item, disabled, onRead, onOpen }: {
  item: AdminNotification;
  disabled: boolean;
  onRead: () => void;
  onOpen: () => void;
}) {
  const Icon = eventIcons[item.kind] ?? Bell;
  const unread = item.readAt === null;
  return <li className={`rounded-xl border bg-card p-4 transition-colors ${unread ? "border-primary/35" : "border-border"}`}>
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-glow"><Icon className="size-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2"><h3 className="min-w-0 flex-1 break-words text-sm font-semibold">{item.title}</h3><span className={`shrink-0 text-[10px] ${unread ? "text-primary-glow" : "text-muted-foreground"}`}>{unread ? "Não lida" : "Lida"}</span></div>
        <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{item.description}</p>
        {item.clientName && <p className="mt-2 break-words text-xs">Cliente: {item.clientName}</p>}
        {item.deviceName && <p className="mt-1 break-words text-xs">TV: {item.deviceName}</p>}
        <time dateTime={item.createdAt} className="mt-2 block text-xs text-muted-foreground">{formatNotificationDate(item.createdAt)}</time>
        <div className="mt-3 flex flex-wrap gap-2">
          {(item.clientId || item.deviceId) && <Button size="sm" variant="outline" disabled={disabled} onClick={onOpen}>Abrir {item.deviceId ? "TV" : "cliente"}</Button>}
          {unread && <Button size="sm" variant="ghost" disabled={disabled} onClick={onRead}><Check className="size-3.5" />Marcar como lida</Button>}
        </div>
      </div>
    </div>
  </li>;
}
