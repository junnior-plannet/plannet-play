import { useEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, pointerWithin, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Search, Copy, Trash2, Play, Pause, Save, Send, ArrowLeft, ArrowRight, Film, Upload, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, Field, inputCls, selectCls, EmptyState, StatusBadge } from '@/components/app/ui';
import { contentLibrary, type Content } from '@/lib/mock';
import { setDuration, canEditPlaylist } from '@/lib/demo-rules';
import { clipDuration, duplicateClip, insertClip, itemAtTime, playlistDuration, type TimelineItem } from '@/lib/playlist-timeline';
import { useDemo } from './DemoProvider';
import { EditorMedia } from './EditorMedia';
import { PlaylistTimeline, timeLabel } from './PlaylistTimeline';
import { DistributionDialog } from './DistributionDialog';
const uid = () => crypto.randomUUID();
function LibraryItem({ item, onAdd, disabled }: { item: Content & Partial<TimelineItem>; onAdd: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lib:${item.id}`, data: { item }, disabled });
  return <div ref={setNodeRef} className={`min-w-0 overflow-hidden rounded-md border bg-card ${isDragging ? 'opacity-40' : ''}`}>
    <div {...attributes} {...listeners} aria-label={`Arrastar da biblioteca ${item.name}`} className="aspect-video cursor-grab touch-none overflow-hidden"><EditorMedia item={item} compact/></div>
    <div className="flex items-center gap-1 p-2"><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium" title={item.name}>{item.name}</div><div className="truncate text-[10px] text-muted-foreground">{item.category} · {timeLabel(item.seconds)}</div></div><Button disabled={disabled} variant="ghost" size="icon" className="size-6 shrink-0" aria-label={`Adicionar ${item.name}`} title="Adicionar à timeline" onClick={onAdd}><Plus/></Button></div>
  </div>;
}
export function PlaylistEditor() {
  const d = useDemo();
  const [activeId, setActiveId] = useState('');
  const [search, setSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selected, setSelected] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [format, setFormat] = useState('16:9');
  const [zoom, setZoom] = useState(6);
  const [publish, setPublish] = useState(false);
  const [preview, setPreview] = useState(false);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('client');
  const [uploads, setUploads] = useState<(Content & Partial<TimelineItem>)[]>([]);
  const [dragItem, setDragItem] = useState<Content | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const active = d.visiblePlaylists.find(p => p.id === activeId);
  const items: TimelineItem[] = active?.items ?? [];
  const editable = !!active && canEditPlaylist(d.role, d.clientId, active);
  const total = playlistDuration(items);
  const selectedItem = items.find(i => i.key === selected);
  const frame = itemAtTime(items, time);
  const current = frame?.item;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { setTime(0); setPlaying(false); setSelected(''); }, [activeId]);
  useEffect(() => { if (!active) { setPlaying(false); setPreview(false); setPublish(false); } }, [active?.id]);
  useEffect(() => { if (!playing || !total) return; const timer = setInterval(() => setTime(t => (t + .25) % total), 250); return () => clearInterval(timer); }, [playing, total]);
  useEffect(() => { if (time >= total) setTime(0); }, [total, time]);
  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);
  function change(next: TimelineItem[]) {
    if (!active || !editable) return;
    d.setPlaylists(prev => prev.map(p => p.id === active.id ? { ...p, items: next, state: 'Modificado' } : p));
  }
  function add(item: Content & Partial<TimelineItem>, beforeKey?: string) {
    const clip: TimelineItem = { ...item, key: uid() };
    change(insertClip(items, clip, beforeKey)); setSelected(clip.key); setPlaying(false);
    const start = beforeKey ? items.slice(0, Math.max(0, items.findIndex(i => i.key === beforeKey))).reduce((s, i) => s + clipDuration(i), 0) : total;
    setTime(start);
  }
  function select(key: string) { setSelected(key); setPlaying(false); const index = items.findIndex(i => i.key === key); setTime(playlistDuration(items.slice(0, index))); }
  function drag(e: DragEndEvent) {
    setDragItem(null);
    if (!e.over || !editable) return;
    const id = String(e.active.id);
    if (id.startsWith('lib:')) {
      const item = e.active.data.current?.item as (Content & Partial<TimelineItem>) | undefined;
      if (item) add(item, e.over.id === 'timeline' ? undefined : String(e.over.id));
    } else {
      const from = items.findIndex(i => i.key === id), to = e.over.id === 'timeline' ? items.length - 1 : items.findIndex(i => i.key === e.over?.id);
      if (from >= 0 && to >= 0) { change(arrayMove(items, from, to)); setPlaying(false); setTime(0); }
    }
  }
  function property(values: Partial<TimelineItem>) { if (selectedItem) change(items.map(i => i.key === selectedItem.key ? { ...i, ...values } : i)); }
  async function upload(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toast.error('Selecione uma imagem ou um vídeo'); continue; }
      const url = URL.createObjectURL(file); objectUrls.current.push(url);
      const isVideo = file.type.startsWith('video/');
      let seconds = 10;
      if (isVideo) {
        try { seconds = await new Promise<number>((resolve, reject) => { const video = document.createElement('video'); const timer = setTimeout(() => { video.removeAttribute('src'); reject(new Error('metadata')); }, 10000); video.preload = 'metadata'; video.onloadedmetadata = () => { clearTimeout(timer); if (Number.isFinite(video.duration) && video.duration > 0) resolve(Math.ceil(video.duration)); else reject(new Error('duration')); video.removeAttribute('src'); }; video.onerror = () => { clearTimeout(timer); reject(new Error('video')); }; video.src = url; }); }
        catch { toast.error(`Não foi possível ler ${file.name}`); continue; }
      }
      setUploads(prev => [...prev, { id: uid(), name: file.name, category: isVideo ? 'Vídeos' : 'Imagens', seconds, fixed: isVideo, visual: isVideo ? 'video' : 'cafe', owner: d.clientId, sourceUrl: url, mediaType: isVideo ? 'video' : 'image' }]);
      toast.success('Mídia adicionada nesta demonstração');
    }
    if (fileInput.current) fileInput.current.value = '';
  }
  const library = [...contentLibrary, ...uploads].filter(m => (d.role === 'admin' || !m.owner || m.owner === d.clientId) && (category === 'Todos' || m.category === category) && m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const player = <><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Pré-visualização</h2><div className="flex gap-1">{['16:9', '9:16'].map(f => <Button size="sm" variant={format === f ? 'secondary' : 'ghost'} key={f} onClick={() => setFormat(f)}>{f}</Button>)}</div></div><div className={`mx-auto overflow-hidden rounded-md border bg-background ${format === '16:9' ? 'aspect-video w-full max-w-[560px]' : 'aspect-[9/16] h-[265px] max-w-full'}`}>
    {current ? <EditorMedia item={current}/> : <div className="flex h-full items-center justify-center text-muted-foreground"><Film className="size-10"/></div>}
  </div><div className="mt-3 flex items-center justify-between gap-2"><div className="flex items-center gap-1"><Button size="icon" variant="secondary" disabled={!items.length} aria-label={playing ? 'Pausar prévia' : 'Reproduzir prévia'} title={playing ? 'Pausar' : 'Reproduzir'} onClick={() => setPlaying(p => !p)}>{playing ? <Pause/> : <Play/>}</Button><Button size="icon" variant="ghost" disabled={!items.length} aria-label="Próximo conteúdo" title="Próximo conteúdo" onClick={() => setTime(frame ? (frame.start + clipDuration(frame.item)) % total : 0)}><SkipForward/></Button><span className="text-xs tabular-nums" data-testid="preview-time">{timeLabel(time)} <span className="text-muted-foreground">/ {timeLabel(total)}</span></span></div><span className="text-[10px] text-muted-foreground">Prévia demonstrativa</span></div><div className="mt-2 truncate text-xs text-muted-foreground" title={current?.name}>{current?.name ?? 'Nenhum conteúdo'}</div></>;
  return <>
    {!active ? <><PageHeader title="Playlists" actions={<Button onClick={() => setCreate(true)}><Plus/>Nova playlist</Button>}/><div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-3 size-3.5 text-muted-foreground"/><input aria-label="Buscar playlists" placeholder="Buscar playlist" className={`${inputCls} pl-9`} value={listSearch} onChange={e => setListSearch(e.target.value)}/></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.visiblePlaylists.filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase())).map(p => <article key={p.id} className="min-w-0 rounded-lg border bg-card p-4"><div className="mb-3 flex items-start justify-between gap-3"><Film className="size-5 text-primary"/><StatusBadge status={p.state}/></div><h2 className="mb-1 break-words text-sm font-semibold">{p.name}</h2><p className="truncate text-xs text-muted-foreground">{p.owner === 'plannet' ? 'Programação Plannet' : d.clients.find(c => c.id === p.owner)?.name}</p><div className="mt-4 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground" data-testid={`playlist-count-${p.id}`}>{p.items.length} itens · {timeLabel(playlistDuration(p.items))}</span><Button size="sm" variant="outline" aria-label={`Editar ${p.name}`} onClick={() => setActiveId(p.id)}>Editar<ArrowRight/></Button></div></article>)}</div>{!d.visiblePlaylists.length && <EmptyState title="Nenhuma playlist"/>}</> : <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Button size="icon" variant="outline" aria-label="Voltar para listagem" title="Voltar para listagem" onClick={() => { setActiveId(''); setPlaying(false); }}><ArrowLeft/></Button><div className="min-w-0"><h1 className="break-words text-xl font-semibold">{active.name}</h1><div className="text-xs text-muted-foreground">{active.owner === 'plannet' ? 'Programação Plannet' : d.clients.find(c => c.id === active.owner)?.name} · {active.state}</div></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!editable} onClick={() => { d.setPlaylists(prev => prev.map(p => p.id === active.id ? { ...p, state: 'Rascunho salvo' } : p)); toast.success('Rascunho salvo nesta demonstração'); }}><Save/>Salvar rascunho</Button><Button variant="outline" disabled={!items.length} onClick={() => { setPreview(true); setTime(0); setPlaying(true); }}><Play/>Pré-visualizar</Button><Button disabled={!items.length || !editable} onClick={() => setPublish(true)}><Send/>Publicar nas TVs</Button></div></div>
      <DndContext sensors={sensors} collisionDetection={args => { const hits = pointerWithin(args); return hits.length ? hits.filter(h => h.id !== 'timeline').length ? hits.filter(h => h.id !== 'timeline') : hits : args.active.id.toString().startsWith('lib:') ? [] : closestCenter(args); }} onDragStart={e => setDragItem(e.active.data.current?.item ?? items.find(i => i.key === e.active.id) ?? null)} onDragCancel={() => setDragItem(null)} onDragEnd={drag}>
        <div className="grid min-w-0 gap-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="min-w-0"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Biblioteca de conteúdos</h2><Button size="sm" variant="outline" disabled={!editable} onClick={() => fileInput.current?.click()}><Upload/>Adicionar mídias</Button><input ref={fileInput} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => void upload(e.target.files)}/></div><div className="mb-3 grid gap-2 sm:grid-cols-2"><div className="relative"><Search className="absolute left-2.5 top-3 size-3.5 text-muted-foreground"/><input aria-label="Pesquisar conteúdo" className={`${inputCls} pl-8`} placeholder="Pesquisar conteúdo" value={search} onChange={e => setSearch(e.target.value)}/></div><select aria-label="Categoria de conteúdo" className={`${selectCls} min-w-0`} value={category} onChange={e => setCategory(e.target.value)}>{['Todos', 'Vídeos', 'Imagens', 'Notícias RSS', 'Previsão do tempo', 'Redes sociais', 'Widgets', 'Transmissões ao vivo', 'Publicidades'].map(c => <option key={c}>{c}</option>)}</select></div><div className="grid h-[300px] auto-rows-max grid-cols-2 gap-2 overflow-y-auto pr-1 xl:grid-cols-3">{library.map(m => <LibraryItem key={m.id} item={m} disabled={!editable} onAdd={() => add(m)}/>)}{!library.length && <p className="col-span-full py-8 text-center text-xs text-muted-foreground">Nenhum conteúdo encontrado</p>}</div></section>
          <section className="min-w-0 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">{player}</section>
        </div>
        <PlaylistTimeline items={items} total={total} time={time} selected={selected} zoom={zoom} onZoom={setZoom} editable={editable} onSeek={v => { setTime(v); setPlaying(false); const match = itemAtTime(items, v); if (match) setSelected(match.item.key); }} onSelect={select}/>
        <DragOverlay>{dragItem && <div className="h-24 w-40 overflow-hidden rounded-md border border-primary bg-card"><EditorMedia item={dragItem} compact/><span className="text-xs">{dragItem.name}</span></div>}</DragOverlay>
      </DndContext>
      <section className="mt-4 border-t pt-4" aria-label="Propriedades do conteúdo"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Propriedades do conteúdo</h2>{selectedItem && <div className="flex gap-1"><Button size="icon" variant="ghost" disabled={!editable || items[0]?.key === selected} aria-label="Mover para esquerda" title="Mover para esquerda" onClick={() => { const i = items.findIndex(m => m.key === selected); change(arrayMove(items, i, i - 1)); }}><ArrowLeft/></Button><Button size="icon" variant="ghost" disabled={!editable || items[items.length - 1]?.key === selected} aria-label="Mover para direita" title="Mover para direita" onClick={() => { const i = items.findIndex(m => m.key === selected); change(arrayMove(items, i, i + 1)); }}><ArrowRight/></Button><Button size="icon" variant="ghost" disabled={!editable} aria-label="Duplicar conteúdo" title="Duplicar conteúdo" onClick={() => change(duplicateClip(items, selected, uid()))}><Copy/></Button><Button size="icon" variant="ghost" disabled={!editable} aria-label="Excluir conteúdo" title="Excluir conteúdo" onClick={() => { change(items.filter(m => m.key !== selected)); setSelected(''); }}><Trash2/></Button></div>}</div>{selectedItem ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]"><Field label="Nome"><input aria-label="Nome do conteúdo" className={inputCls} value={selectedItem.name} disabled={!editable} onChange={e => property({ name: e.target.value })}/></Field><Field label={selectedItem.fixed ? 'Duração original (s)' : 'Duração (s)'}><input aria-label="Duração do conteúdo" type="number" min="1" className={inputCls} value={selectedItem.seconds} disabled={!editable || selectedItem.fixed} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 1) property({ seconds: setDuration(selectedItem, value).seconds }); }}/></Field><Field label="Tipo de conteúdo"><input aria-label="Tipo de conteúdo" className={inputCls} value={selectedItem.category} readOnly/></Field><Field label="Repetições"><input aria-label="Repetições do conteúdo" type="number" min="1" max="99" className={inputCls} value={selectedItem.repetitions ?? 1} disabled={!editable || selectedItem.category === 'Transmissões ao vivo'} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 1) property({ repetitions: Math.min(99, Math.round(value)) }); }}/></Field></div> : <div className="text-xs text-muted-foreground">Nenhum conteúdo selecionado</div>}</section>
    </>}
    <Dialog open={create} onOpenChange={setCreate}><DialogContent className="w-[calc(100%-2rem)]"><DialogHeader><DialogTitle>Nova playlist</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={e => { e.preventDefault(); const p = { id: uid(), name: name.trim(), owner: d.role === 'client' ? d.clientId : owner === 'plannet' ? 'plannet' : d.clientId, items: [], state: 'Rascunho' }; d.setPlaylists(prev => [...prev, p]); setActiveId(p.id); setCreate(false); setName(''); }}><Field label="Nome"><input required aria-label="Nome da playlist" value={name} onChange={e => setName(e.target.value)} className={inputCls}/></Field>{d.role === 'admin' && <Field label="Programação"><select className={selectCls} value={owner} onChange={e => setOwner(e.target.value)}><option value="client">Cliente selecionado</option><option value="plannet">Plannet compartilhada</option></select></Field>}<Button type="submit" disabled={!name.trim()}>Criar playlist</Button></form></DialogContent></Dialog>
    <Dialog open={preview} onOpenChange={v => { setPreview(v); if (!v) setPlaying(false); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Prévia · {active?.name}</DialogTitle></DialogHeader>{player}</DialogContent></Dialog>
    {active && <DistributionDialog key={active.id} playlist={active} open={publish} onOpenChange={setPublish}/>}
  </>;
}
