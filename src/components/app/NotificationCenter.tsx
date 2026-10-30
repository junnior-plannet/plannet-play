import { useState } from "react";
import { Bell, CheckCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useMe, type Me } from "@/lib/auth";
import { useNotifications } from "@/hooks/use-notifications";
import {
  canUseNotifications, notificationSource, selectNotifications,
  type AdminNotification, type NotificationSource,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationTarget } from "./NotificationTarget";
import { DisconnectedInbox, NotificationCard } from "./NotificationCards";

/** Only the real authenticated role can mount the inbox; demo roles never grant access. */
export function NotificationCenter({ source = notificationSource }: { source?: NotificationSource | null }) {
  const { data: me } = useMe();
  if (!canUseNotifications(me) || !me) return null;
  return <NotificationInbox key={`${me.userId}:${source?.key ?? "disconnected"}`} me={me} source={source} />;
}

function NotificationInbox({ me, source }: { me: Me; source: NotificationSource | null }) {
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<AdminNotification | null>(null);
  const state = useNotifications(me, source);
  const items = selectNotifications(state.items, unreadOnly);
  const canRead = state.enabled && !state.inbox.isError && !!state.inbox.data;
  const changeOpen = (value: boolean) => { setOpen(value); if (!value) setSelected(null); };
  return <Sheet open={open} onOpenChange={changeOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" className="relative ml-auto shrink-0" aria-label={state.unreadCount ? `Notificações: ${state.unreadCount} não lidas` : "Notificações"} title={source ? "Central de Notificações" : "Notificações · integração pendente"}>
        <Bell key={state.arrival} className={`size-5 ${state.arrival ? "notification-arrival" : ""}`} aria-hidden="true" />
        {state.unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-background bg-primary px-1 text-[10px] font-bold leading-5 text-primary-foreground">{state.unreadCount > 99 ? "99+" : state.unreadCount}</span>}
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="flex h-dvh w-full flex-col gap-0 border-primary/20 p-0 sm:max-w-lg">
      <SheetHeader className="border-b bg-card px-5 pb-5 pt-6 text-left">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary-glow"><Bell className="size-4" aria-hidden="true" />Atividade administrativa</div>
        <SheetTitle>Central de Notificações</SheetTitle>
        <SheetDescription>{source ? "Eventos de clientes, TVs e sistema, com acesso autorizado." : "Interface preparada · aguardando integração com o banco."}</SheetDescription>
        <p className="pt-2 text-xs text-muted-foreground" role="status" aria-live="polite">{!source ? "Sem fonte de eventos conectada" : state.inbox.isPending ? "Carregando notificações…" : state.inbox.isError ? "Não foi possível consultar as notificações" : `${state.unreadCount} não lida${state.unreadCount === 1 ? "" : "s"}`}</p>
      </SheetHeader>
      <div className="space-y-3 border-b px-5 py-4">
        <div className="flex gap-2" role="group" aria-label="Filtrar notificações">
          <Button size="sm" variant={!unreadOnly ? "secondary" : "ghost"} aria-pressed={!unreadOnly} onClick={() => { setUnreadOnly(false); setSelected(null); }}>Todas</Button>
          <Button size="sm" variant={unreadOnly ? "secondary" : "ghost"} aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(true); setSelected(null); }}>Não lidas</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={!canRead || !state.unreadCount || state.isSaving} onClick={state.markAllRead}><CheckCheck className="size-4" />Marcar todas como lidas</Button>
          <Button variant="ghost" size="sm" disabled={!source || state.inbox.isFetching} onClick={() => void state.inbox.refetch()}><RefreshCw className={`size-4 ${state.inbox.isFetching ? "motion-safe:animate-spin" : ""}`} />Atualizar</Button>
        </div>
        {state.saveError && <p role="alert" className="text-xs text-destructive">Não foi possível salvar a leitura. Tente novamente.</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {!source ? <DisconnectedInbox /> : state.inbox.isError ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5 text-sm"><p>Não foi possível carregar os eventos. Nenhuma notificação foi criada.</p><Button className="mt-3" size="sm" variant="outline" disabled={state.inbox.isFetching} onClick={() => void state.inbox.refetch()}>Tentar novamente</Button></div> : state.inbox.isPending ? <p className="py-12 text-center text-sm text-muted-foreground">Consultando eventos autorizados…</p> : selected ? <NotificationTarget item={selected} onBack={() => setSelected(null)} /> : <>
          {!items.length ? <div className="py-12 text-center"><Bell className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" /><h3 className="text-sm font-medium">{unreadOnly ? "Nenhuma notificação não lida" : "Nenhuma notificação disponível"}</h3><p className="mt-2 text-xs text-muted-foreground">Novos eventos autorizados aparecerão aqui.</p></div> : <ul className="space-y-3" aria-label="Eventos administrativos">{items.map((item) => <NotificationCard key={item.id} item={item} disabled={state.isSaving} onRead={() => state.markRead(item.id)} onOpen={() => { setSelected(item); if (!item.readAt) state.markRead(item.id); }} />)}</ul>}
        </>}
      </div>
      <footer className="border-t bg-card px-5 py-3 text-xs text-muted-foreground"><ShieldCheck className="mr-1.5 inline size-3.5" aria-hidden="true" />{source ? "Leitura individual por usuário · somente eventos autorizados." : "Nenhum evento simulado. Persistência e tempo real pendentes de autorização."}</footer>
    </SheetContent>
  </Sheet>;
}
