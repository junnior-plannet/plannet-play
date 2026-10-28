import type { CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Minus, Plus, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clipDuration, type TimelineItem } from '@/lib/playlist-timeline';
import { EditorMedia } from './EditorMedia';

export const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function Clip({ item, selected, scale, onSelect, editable }: { item: TimelineItem; selected: boolean; scale: number; onSelect: () => void; editable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key, disabled: !editable });
  const layout: CSSProperties = { width: clipDuration(item) * scale, transform: CSS.Transform.toString(transform), transition };
  return <li ref={setNodeRef} style={layout} className={`relative h-28 shrink-0 overflow-hidden rounded-md border-2 bg-card ${selected ? 'border-primary' : 'border-border'} ${isDragging ? 'z-20 opacity-50' : ''}`}>
    <Button variant="ghost" aria-label={`Selecionar ${item.name}`} onClick={onSelect} className="flex h-full w-full flex-col items-stretch justify-start gap-0 overflow-hidden rounded-none p-0 text-left">
      <div className="h-16 shrink-0 overflow-hidden"><EditorMedia item={item} compact /></div>
      <div className="min-w-0 px-2 py-1"><div className="truncate text-xs" title={item.name}>{item.name}</div><div className="truncate text-[10px] text-muted-foreground">{timeLabel(clipDuration(item))}{(item.repetitions ?? 1) > 1 ? ` · ×${item.repetitions}` : ''}</div></div>
    </Button>
    {editable && <Button {...attributes} {...listeners} size="icon" variant="secondary" className="absolute right-1 top-1 size-6 cursor-grab touch-none" aria-label={`Arrastar ${item.name}`} title="Arrastar conteúdo"><GripVertical className="size-3" /></Button>}
  </li>;
}
export function PlaylistTimeline({ items, total, time, selected, zoom, onZoom, onSeek, onSelect, editable }: { items: TimelineItem[]; total: number; time: number; selected: string; zoom: number; onZoom: (v: number) => void; onSeek: (v: number) => void; onSelect: (key: string) => void; editable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline', disabled: !editable });
  // Every clip shares the same pixels-per-second scale, including long events.
  const scale = zoom;
  const width = Math.max(680, total * scale + 96);
  const interval = scale < 2 ? 60 : scale < 5 ? 30 : scale < 10 ? 10 : 5;
  const ticks = Array.from({ length: Math.floor((width / scale) / interval) + 1 }, (_, i) => i * interval);
  return <section className="min-w-0 border-t pt-4" aria-label="Timeline de reprodução">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Timeline</h2><span className="text-xs text-muted-foreground" data-testid="timeline-summary">{items.length} itens · {timeLabel(total)}</span></div><div className="flex items-center gap-2"><Repeat2 className="size-3.5 text-muted-foreground"/><span className="text-xs text-muted-foreground">Loop</span><Button size="icon" variant="ghost" aria-label="Reduzir zoom" title="Reduzir zoom" disabled={zoom <= 1} onClick={() => onZoom(Math.max(1, zoom - 1))}><Minus/></Button><input aria-label="Zoom da timeline" type="range" min="1" max="16" value={zoom} onChange={e => onZoom(Number(e.target.value))} className="w-24 accent-primary"/><Button size="icon" variant="ghost" aria-label="Aumentar zoom" title="Aumentar zoom" disabled={zoom >= 16} onClick={() => onZoom(Math.min(16, zoom + 1))}><Plus/></Button></div></div>
    <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-md border bg-background" data-testid="timeline-scroll">
      <div ref={setNodeRef} className={`relative min-h-48 pb-6 ${isOver ? 'bg-primary/5' : ''}`} style={{ width }}>
        <div role="slider" tabIndex={0} aria-label="Posição de reprodução" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.floor(time)} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); onSeek(Math.min(Math.max(0, time + (e.key === 'ArrowRight' ? 1 : -1)), Math.max(0, total - .01))); } }} onPointerDown={e => { const rect = e.currentTarget.getBoundingClientRect(); onSeek(Math.min(Math.max(0, (e.clientX - rect.left) / scale), Math.max(0, total - .01))); }} className="relative mb-3 h-9 cursor-crosshair border-b outline-none focus-visible:ring-1 focus-visible:ring-primary">
          {ticks.map(t => <span key={t} className="absolute bottom-0 border-l border-border pb-1 pl-1 text-[10px] tabular-nums text-muted-foreground" style={{ left: t * scale }}>{timeLabel(t)}</span>)}
        </div>
        <SortableContext items={items.map(i => i.key)} strategy={horizontalListSortingStrategy}><ol className="flex w-fit min-w-full" aria-label="Sequência da playlist">{items.map(item => <Clip key={item.key} item={item} selected={selected === item.key} scale={scale} editable={editable} onSelect={() => onSelect(item.key)}/>)}</ol></SortableContext>
        {!items.length && <div className="px-6 py-8 text-sm text-muted-foreground">Playlist vazia</div>}
        <div className="pointer-events-none absolute bottom-4 top-0 z-10 w-px bg-primary" data-testid="playhead" style={{ left: time * scale }}><div className="absolute -left-1 top-0 h-3 w-2 rounded-b-sm bg-primary"/></div>
        <div className="absolute bottom-2 left-2 text-[10px] uppercase text-muted-foreground">Programação visual</div>
      </div>
    </div>
  </section>;
}