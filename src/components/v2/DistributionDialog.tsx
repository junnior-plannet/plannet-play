import { useState } from 'react';
import { Send, CheckCheck, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, selectCls, EmptyState } from '@/components/app/ui';
import { customGroups, type VisualPlaylist } from '@/lib/mock';
import { canDistribute, assignVisualPlaylist } from '@/lib/demo-rules';
import { useDemo } from './DemoProvider';
export function DistributionDialog({playlist,open,onOpenChange}:{playlist:VisualPlaylist;open:boolean;onOpenChange:(v:boolean)=>void}) {
 const d=useDemo(); const [scope,setScope]=useState('TV individual'); const [target,setTarget]=useState(''); const [selected,setSelected]=useState<string[]>([]); const [confirm,setConfirm]=useState(false);
 const allowed=d.visibleDevices.filter(tv=>{const c=d.clientFor(tv.venue);return c&&canDistribute(d.role,d.clientId,playlist,c);});
 const options=scope==='TV individual'?allowed.map(tv=>({id:tv.id,label:`${tv.id} · ${tv.name}`})):scope==='Estabelecimento'?[...new Set(allowed.map(tv=>tv.venue))].map(v=>({id:v,label:v})):scope==='Cliente'?d.clients.filter(c=>allowed.some(tv=>c.venueNames.includes(tv.venue))).map(c=>({id:c.id,label:c.name})):scope==='Região'?[...new Set(allowed.map(tv=>d.clientFor(tv.venue)?.region ?? ''))].map(v=>({id:v,label:v})):scope==='Grupo personalizado'?customGroups.map(g=>({id:g.name,label:g.name})):[];
 const chosen=allowed.filter(tv=>scope==='Toda a rede autorizada'||(scope==='TV individual'?selected.includes(tv.id):scope==='Estabelecimento'?tv.venue===target:scope==='Cliente'?d.clientFor(tv.venue)?.id===target:scope==='Região'?d.clientFor(tv.venue)?.region===target:customGroups.find(g=>g.name===target)?.ids.includes(tv.id)));
 const ids=chosen.map(tv=>tv.id); const results=d.publications.filter(p=>p.playlistId===playlist.id&&ids.includes(p.deviceId));
 function publish(){
  const rows=chosen.map(tv=>({id:`${Date.now()}-${tv.id}`,playlistId:playlist.id,deviceId:tv.id,state:tv.status==='Offline'?'Com erro':tv.status==='Online'?'Sincronizada':'Pendente'}));
  d.setPublications(prev=>[...rows,...prev.filter(p=>p.playlistId!==playlist.id||!ids.includes(p.deviceId))]);
  d.setDevices(prev=>assignVisualPlaylist(prev,ids,playlist));
  d.setPlaylists(prev=>prev.map(p=>p.id===playlist.id?{...p,state:'Publicada'}:p)); setConfirm(false);toast.success('Publicação demonstrativa registrada');
 }
 return <Dialog open={open} onOpenChange={v=>{onOpenChange(v);if(!v)setConfirm(false);}}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Distribuição de programação</DialogTitle><DialogDescription>Demonstração · nenhuma comunicação com TVs.</DialogDescription></DialogHeader>
 <div className="grid gap-4 sm:grid-cols-2"><Field label="Destino"><select aria-label="Destino" className={selectCls} value={scope} onChange={e=>{setScope(e.target.value);setTarget('');setConfirm(false);}}>{['TV individual','Estabelecimento','Cliente','Região','Grupo personalizado','Toda a rede autorizada'].map(s=><option key={s}>{s}</option>)}</select></Field>{scope!=='TV individual'&&scope!=='Toda a rede autorizada'&&<Field label="Selecionar destino"><select aria-label="Selecionar destino" className={selectCls} value={target} onChange={e=>{setTarget(e.target.value);setConfirm(false);}}><option value="">Selecione</option>{options.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select></Field>}</div>
 {scope==='TV individual'&&<div className="grid max-h-48 gap-2 overflow-y-auto">{options.map(o=><label className="flex items-center gap-2 rounded-md border p-2 text-sm" key={o.id}><input type="checkbox" checked={selected.includes(o.id)} onChange={e=>{setSelected(prev=>e.target.checked?[...prev,o.id]:prev.filter(id=>id!==o.id));setConfirm(false);}}/>{o.label}</label>)}</div>}
 {!allowed.length&&<EmptyState title="Nenhuma TV autorizada" description="A reserva contratual ou o vínculo do cliente não permite este destino."/>}
 <div className="border-t pt-4"><div className="text-sm font-semibold">{chosen.length} TVs selecionadas · {playlist.name}</div><p className="mt-1 text-xs text-muted-foreground">Playlist {playlist.owner==='plannet'?'Plannet compartilhada':'do cliente'} · a programação original do cliente é preservada.</p><div className="mt-3 space-y-2">{chosen.map(tv=>{const c=d.clientFor(tv.venue);const result=results.find(r=>r.deviceId===tv.id);return <div key={tv.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{tv.id} · {tv.venue}<br/><span className="text-muted-foreground">{100-(c?.reserved??0)}% cliente / {c?.reserved??0}% Plannet · {tv.playlist}</span></span>{result&&<span className={result.state==='Com erro'?'text-destructive':result.state==='Pendente'?'text-warning':'text-success'}>{result.state==='Com erro'?<AlertTriangle className="inline size-3"/>:result.state==='Pendente'?<Clock className="inline size-3"/>:<CheckCheck className="inline size-3"/>} {result.state}</span>}</div>;})}</div></div>
 <p className="text-xs text-muted-foreground">Atualizações da playlist compartilhada serão propagadas futuramente às TVs vinculadas.</p>
 {confirm?<div className="border-t pt-3"><p className="mb-3 text-sm">Confirmar publicação demonstrativa em {chosen.length} TVs?</p><div className="flex gap-2"><Button onClick={publish}><Send/>Confirmar publicação</Button><Button variant="outline" onClick={()=>setConfirm(false)}>Cancelar</Button></div></div>:<Button disabled={!chosen.length||!playlist.items.length} onClick={()=>setConfirm(true)}><Send/>Revisar publicação</Button>}
 </DialogContent></Dialog>;
}
