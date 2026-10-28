import { createFileRoute } from '@tanstack/react-router';
import { PlaylistEditor } from '@/components/v2/PlaylistEditor';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/playlists')({head:()=>seo('Playlists','Editor visual de playlists e distribuição demonstrativa para TVs.'),component:PlaylistEditor});
