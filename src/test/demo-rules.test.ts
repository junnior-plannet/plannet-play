import { describe,it,expect } from 'vitest';
import { canDistribute,canEditPlaylist,changeReservation,setDuration } from '@/lib/demo-rules';
import { clients,visualPlaylists,defaultAudio } from '@/lib/mock';
const c=clients[0];const p=visualPlaylists.find(p=>p.owner==='plannet');
if(!c||!p)throw new Error('Fixtures ausentes');
describe('Regras contratuais V2',()=>{
 it('reserva exemplificada é 20% Plannet e 80% cliente',()=>{expect(c.reserved).toBe(20);expect(100-c.reserved).toBe(80);});
 it('cliente não altera percentual reservado',()=>{expect(changeReservation('client',c,0).reserved).toBe(20);});
 it('administrador configura percentual conforme contrato',()=>{expect(changeReservation('admin',c,35).reserved).toBe(35);});
 it('Plannet distribui somente com reserva autorizada',()=>{expect(canDistribute('admin',c.id,p,{...c,reserved:0})).toBe(false);expect(canDistribute('admin',c.id,p,c)).toBe(true);});
 it('cliente edita apenas a própria playlist',()=>{expect(canEditPlaylist('client',c.id,{...p,owner:c.id})).toBe(true);expect(canEditPlaylist('client',c.id,p)).toBe(false);});
 it('cliente distribui apenas para suas TVs',()=>{const own={...p,owner:c.id};expect(canDistribute('client',c.id,own,c)).toBe(true);expect(canDistribute('client',c.id,own,{...c,id:'outro'})).toBe(false);});
 it('vídeos preservam duração original',()=>{expect(setDuration({fixed:true,seconds:30},90).seconds).toBe(30);});
 it('imagens permitem duração em segundos',()=>{expect(setDuration({fixed:false,seconds:10},18).seconds).toBe(18);});
 it('publicação compartilhada não muta playlist original',()=>{const before=JSON.stringify(p);canDistribute('admin',c.id,p,c);expect(JSON.stringify(p)).toBe(before);});
 it('configuração de áudio é independente de playlist visual',()=>{const original={...defaultAudio};const updated={...original,channel:'ch-1'};expect(updated.channel).toBe('ch-1');expect('playlist' in updated).toBe(false);});
});
