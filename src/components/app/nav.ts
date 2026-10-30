import {
  LayoutDashboard, BrainCircuit, MapPinned, MonitorSmartphone, Map, Film, ListVideo,
  CalendarClock, Newspaper, LayoutGrid, Radio, Building2, Megaphone, FileBarChart, Activity,
  History, Settings, Users, Music2, Handshake, type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; url: string; icon: LucideIcon; comingSoon?: boolean };
export const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "Visão Geral", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Central de Inteligência", url: "/inteligencia", icon: BrainCircuit },
  ]},
  { label: "Rede", items: [
    { title: "Clientes", url: "/clientes", icon: Users },
    { title: "Regiões", url: "/regioes", icon: MapPinned },
    { title: "Dispositivos", url: "/telas", icon: MonitorSmartphone },
    { title: "Mapa da Rede", url: "/mapa", icon: Map },
  ]},
  { label: "Conteúdo", items: [
    { title: "Biblioteca de Mídias", url: "/midias", icon: Film },
    { title: "Playlists", url: "/playlists", icon: ListVideo },
    { title: "Programação Inteligente", url: "/programacao", icon: CalendarClock },
    { title: "Notícias e RSS", url: "/noticias", icon: Newspaper },
    { title: "Widgets", url: "/widgets", icon: LayoutGrid },
    { title: "Transmissões ao Vivo", url: "/ao-vivo", icon: Radio },
    { title: "Rádio", url: "/audio-ambiente", icon: Music2 },
  ]},
  { label: "Publicidade", items: [
    { title: "Anunciantes", url: "/anunciantes", icon: Building2 },
    { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  ]},
  { label: "Gestão", items: [
    { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
    { title: "Monitoramento", url: "/monitoramento", icon: Activity },
    { title: "Histórico de Exibições", url: "/historico", icon: History },
    { title: "Parceiros — Em breve", url: "parceiros-em-breve", icon: Handshake, comingSoon: true },
    { title: "Configurações", url: "/configuracoes", icon: Settings },
  ]},
];
