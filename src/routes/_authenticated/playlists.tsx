import { createFileRoute } from '@tanstack/react-router';
import { PlaylistEditor } from '@/components/v2/PlaylistEditor';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/_authenticated/playlists')({head:()=>seo('Playlists','Biblioteca, prévia e timeline visual de programação de TV com distribuição demonstrativa.'),component:PlaylistEditor});
