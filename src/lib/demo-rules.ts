import type { Client, VisualPlaylist } from './mock';
export type DemoRole = 'admin' | 'client';
export function canEditPlaylist(role: DemoRole, clientId: string, p: VisualPlaylist) { return role === 'admin' || p.owner === clientId; }
export function canDistribute(role: DemoRole, clientId: string, p: VisualPlaylist, target: Client) {
  if (role === 'client') return p.owner === clientId && target.id === clientId;
  return p.owner === 'plannet' ? target.reserved > 0 : p.owner === target.id;
}
export function changeReservation(role: DemoRole, client: Client, value: number): Client {
  return role === 'admin' ? { ...client, reserved: Math.max(0, Math.min(100, value)) } : client;
}
export function setDuration<T extends { fixed: boolean; seconds: number }>(item:T, seconds:number):T { return item.fixed ? item : {...item, seconds:Math.max(1,Math.round(seconds))}; }
export function assignVisualPlaylist<T extends {id:string;playlist:string}>(devices:T[], ids:string[], playlist:VisualPlaylist):T[] {
  return playlist.owner==='plannet'?devices:devices.map(tv=>ids.includes(tv.id)?{...tv,playlist:playlist.name}:tv);
}
