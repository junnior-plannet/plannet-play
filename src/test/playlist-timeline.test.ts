import { describe, expect, it } from 'vitest';
import { clipDuration, duplicateClip, insertClip, itemAtTime, playlistDuration, type TimelineItem } from '@/lib/playlist-timeline';
import { setDuration } from '@/lib/demo-rules';
const image: TimelineItem = { id: 'image', key: 'a', name: 'Imagem', category: 'Imagens', seconds: 10, fixed: false, visual: 'cafe' };
const video: TimelineItem = { ...image, id: 'video', key: 'b', category: 'Vídeos', seconds: 30, fixed: true };
describe('Timeline de exibição de TV', () => {
  it('preserva os 30 segundos originais do vídeo ao editar', () => { expect(setDuration(video, 12).seconds).toBe(30); });
  it('atualiza automaticamente o total ao configurar duração de uma imagem', () => { expect(playlistDuration([setDuration(image, 18), video])).toBe(48); });
  it('conta repetições sem alterar duração original', () => { expect(clipDuration({ ...video, repetitions: 3 })).toBe(90); expect(video.seconds).toBe(30); });
  it('mantém quantidade e total consistentes ao duplicar e remover', () => { const next = duplicateClip([image, video], 'a', 'copy'); expect(next.map(i => i.key)).toEqual(['a', 'copy', 'b']); expect(playlistDuration(next)).toBe(50); expect(playlistDuration(next.filter(i => i.key !== 'copy'))).toBe(40); });
  it('insere conteúdo na posição de soltura', () => { expect(insertClip([image, video], { ...image, key: 'new' }, 'b').map(i => i.key)).toEqual(['a', 'new', 'b']); });
  it('prévia avança no limite de um bloco e representa repetição', () => { expect(itemAtTime([image, video], 10)?.item.key).toBe('b'); expect(itemAtTime([{ ...image, repetitions: 2 }, video], 15)?.elapsed).toBe(5); expect(itemAtTime([image, video], 40)).toBeUndefined(); });
});