import type { Me } from "@/lib/auth";

export type NotificationKind = "client" | "plan" | "device" | "system";
export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  clientId: string | null;
  clientName: string | null;
  deviceId: string | null;
  deviceName: string | null;
  createdAt: string;
  readAt: string | null;
};

export type NotificationSnapshot = {
  // Complete accessible inbox; introduce server pagination + UI together if needed.
  items: AdminNotification[];
  unreadCount: number;
};

/**
 * Connection point for an authorized backend, NOT an in-memory event generator.
 * The implementation must enforce authorization on the server for every method,
 * return the complete inbox, and persist read receipts per authenticated user.
 * Introduce cursor pagination with matching UI before limiting the returned list.
 * subscribe only invalidates the snapshot; it must never deliver unchecked rows.
 */
export interface NotificationSource {
  key: string;
  list(signal: AbortSignal): Promise<NotificationSnapshot>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  subscribe?(onChange: () => void): () => void;
}

// Deliberately disconnected until database infrastructure is approved.
// Do not infer events from created_at/updated_at or from navigation/refreshes.
export const notificationSource: NotificationSource | null = null;

export function canUseNotifications(me: Pick<Me, "isAdmin"> | null | undefined) {
  return me?.isAdmin === true;
}

export function selectNotifications(items: AdminNotification[], unreadOnly: boolean) {
  return items
    .filter((item) => !unreadOnly || item.readAt === null)
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
}

export function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
