import { useContext, useState, type ReactNode } from 'react';
import { DemoContext } from './demo-context';
import { clients as initialClients, venues as initialVenues, devices as initialDevices, visualPlaylists, musicChannels, musicTracks, type Client, type VisualPlaylist, type Channel, type Track, type AudioConfig, type Station, personalMusicLists } from '@/lib/mock';
import type { DemoRole } from '@/lib/demo-rules';
export type Device = typeof initialDevices[number];
export type Publication = { id:string; playlistId:string; deviceId:string; state:string };
function useDemoState() {
 const [clients,setClients] = useState<Client[]>(initialClients);
 const [venues,setVenues] = useState(initialVenues);
 const [devices,setDevices] = useState<Device[]>(initialDevices);
 const [playlists,setPlaylists] = useState<VisualPlaylist[]>(visualPlaylists);
 const [channels,setChannels] = useState<Channel[]>(musicChannels);
 const [tracks,setTracks] = useState<Track[]>(musicTracks);
 const [musicListsByOwner,setMusicListsByOwner] = useState(personalMusicLists);
 const [stations,setStations] = useState<Station[]>([]);
 const [audio,setAudio] = useState<Record<string,AudioConfig>>({});
 const [publications,setPublications] = useState<Publication[]>([]);
 const [role,setRole] = useState<DemoRole>('admin');
 const [clientId,setClientId] = useState('C-1');
 const clientFor = (venue:string) => clients.find(c => c.venueNames.includes(venue));
 const visibleDevices = devices.filter(d => role === 'admin' || clientFor(d.venue)?.id === clientId);
 const visiblePlaylists = playlists.filter(p => role === 'admin' || p.owner === clientId);
 return {musicListsByOwner,setMusicListsByOwner,stations,setStations,clients,setClients,venues,setVenues,devices,setDevices,playlists,setPlaylists,channels,setChannels,tracks,setTracks,audio,setAudio,publications,setPublications,role,setRole,clientId,setClientId,clientFor,visibleDevices,visiblePlaylists};
}
export type DemoState = ReturnType<typeof useDemoState>;
export function DemoProvider({children}:{children:ReactNode}) { const value=useDemoState(); return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>; }
export function useDemo() { const ctx=useContext(DemoContext); if(!ctx) throw new Error('DemoProvider ausente'); return ctx; }
