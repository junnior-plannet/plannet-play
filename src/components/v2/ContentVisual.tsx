import { CloudSun, Radio, Newspaper, Clock3, Film, Instagram } from 'lucide-react';
import photo from '@/assets/content-preview.jpg';
import type { Content } from '@/lib/mock';
export function ContentVisual({item,compact=false}:{item:Content;compact?:boolean}) {
 const Icon = item.visual==='weather'?CloudSun:item.visual==='rss'?Newspaper:item.visual==='live'?Radio:item.visual==='widget'?Clock3:item.visual==='social'?Instagram:Film;
 return <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-accent text-primary">
 {item.visual==='cafe'?<img src={photo} alt="Café da manhã demonstrativo" width={1536} height={1024} className="h-full w-full object-cover" loading="lazy"/>:<div className="flex flex-col items-center gap-3 p-3 text-center"><Icon className={compact?'size-6':'size-12'}/>{!compact&&<><div className="text-lg font-semibold text-foreground">{item.visual==='weather'?'São Paulo · 24°C':item.visual==='rss'?'Notícias do dia':item.name}</div><span className="text-xs text-muted-foreground">Conteúdo demonstrativo</span></>}</div>}
 </div>;
}
