import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Me } from "@/lib/auth";
import { canUseNotifications, type NotificationSource } from "@/lib/notifications";

export function useNotifications(me: Me | null | undefined, source: NotificationSource | null) {
  const queryClient = useQueryClient();
  const enabled = canUseNotifications(me) && source !== null;
  const queryKey = ["admin-notifications", me?.userId, source?.key];
  const inbox = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!enabled || !source) throw new Error("Central indisponível");
      return source.list(signal);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const userId = me?.userId;
  useEffect(() => {
    if (!enabled || !source?.subscribe) return;
    return source.subscribe(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin-notifications", userId, source.key] });
    });
  }, [enabled, source, queryClient, userId]);

  const mutation = useMutation({
    mutationFn: async (id: string | null) => {
      if (!enabled || !source) throw new Error("Central indisponível");
      if (id === null) await source.markAllRead();
      else await source.markRead(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const previous = useRef<{ scope: string; ids: Set<string> } | null>(null);
  const [arrival, setArrival] = useState(0);
  const scope = `${userId}:${source?.key}`;
  useEffect(() => {
    if (!enabled || !inbox.data) { previous.current = null; return; }
    const ids = new Set(inbox.data.items.map((item) => item.id));
    if (previous.current?.scope === scope && inbox.data.items.some((item) => !item.readAt && !previous.current?.ids.has(item.id))) {
      setArrival((value) => value + 1);
    }
    previous.current = { scope, ids };
  }, [enabled, inbox.data, scope]);

  return {
    inbox, enabled, arrival,
    // Never surface cached data when access is lost.
    items: enabled ? inbox.data?.items ?? [] : [],
    unreadCount: enabled ? inbox.data?.unreadCount ?? 0 : 0,
    markRead: (id: string) => mutation.mutate(id),
    markAllRead: () => mutation.mutate(null),
    isSaving: mutation.isPending,
    saveError: mutation.isError,
  };
}
