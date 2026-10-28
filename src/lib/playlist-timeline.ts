import type { SequenceItem } from './mock';

export type TimelineItem = SequenceItem & { repetitions?: number; sourceUrl?: string; mediaType?: 'image' | 'video' };
export function repeatCount(item: TimelineItem) { return Math.max(1, Math.round(item.repetitions ?? 1)); }
export function clipDuration(item: TimelineItem) { return item.seconds * repeatCount(item); }
export function playlistDuration(items: TimelineItem[]) { return items.reduce((sum, item) => sum + clipDuration(item), 0); }
export function itemAtTime(items: TimelineItem[], time: number) {
  let start = 0;
  for (const item of items) {
    const end = start + clipDuration(item);
    if (time < end) return { item, start, elapsed: Math.max(0, time - start) % item.seconds };
    start = end;
  }
  return undefined;
}
export function duplicateClip(items: TimelineItem[], key: string, newKey: string) {
  const index = items.findIndex(item => item.key === key);
  const item = items[index];
  if (!item) return items;
  const next = [...items];
  next.splice(index + 1, 0, { ...item, key: newKey });
  return next;
}
export function insertClip(items: TimelineItem[], clip: TimelineItem, beforeKey?: string) {
  const index = items.findIndex(item => item.key === beforeKey);
  const next = [...items];
  next.splice(index < 0 ? next.length : index, 0, clip);
  return next;
}