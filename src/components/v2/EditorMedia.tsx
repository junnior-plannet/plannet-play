import { ContentVisual } from './ContentVisual';
import type { TimelineItem } from '@/lib/playlist-timeline';
import type { Content } from '@/lib/mock';

export function EditorMedia({ item, compact = false }: { item: Content & Partial<TimelineItem>; compact?: boolean }) {
  if (item.sourceUrl && item.mediaType === 'image') return <img src={item.sourceUrl} alt={item.name} className="h-full w-full object-contain" />;
  if (item.sourceUrl && item.mediaType === 'video') return <video src={item.sourceUrl} muted playsInline preload="metadata" className="h-full w-full object-contain" />;
  return <ContentVisual item={item} compact={compact} />;
}