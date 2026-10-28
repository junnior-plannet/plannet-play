// Dados fictícios de demonstração. Substituir por chamadas reais na integração.
export const regions = [
  { name: "Zona Sul", city: "São Paulo", screens: 142, online: 136, venues: 38 },
  { name: "Centro", city: "São Paulo", screens: 118, online: 109, venues: 31 },
  { name: "Zona Oeste", city: "São Paulo", screens: 96, online: 94, venues: 27 },
  { name: "Zona Norte", city: "São Paulo", screens: 74, online: 66, venues: 22 },
  { name: "Zona Leste", city: "São Paulo", screens: 61, online: 55, venues: 19 },
  { name: "Campinas", city: "Campinas", screens: 38, online: 37, venues: 11 },
];

export const venues = [
  { id: "E-001", name: "Padaria Bella Vista", type: "Padaria", city: "São Paulo", district: "Moema", region: "Zona Sul", screens: 3, uptime: 99.2 },
  { id: "E-002", name: "Academia Corpo Ativo", type: "Academia", city: "São Paulo", district: "Pinheiros", region: "Zona Oeste", screens: 6, uptime: 98.7 },
  { id: "E-003", name: "Clínica Vida Plena", type: "Clínica", city: "São Paulo", district: "Sé", region: "Centro", screens: 4, uptime: 96.1 },
  { id: "E-004", name: "Supermercado Bom Preço", type: "Supermercado", city: "São Paulo", district: "Santana", region: "Zona Norte", screens: 8, uptime: 91.4 },
  { id: "E-005", name: "Barbearia Navalha de Ouro", type: "Barbearia", city: "São Paulo", district: "Tatuapé", region: "Zona Leste", screens: 2, uptime: 97.8 },
  { id: "E-006", name: "Restaurante Sabor Mineiro", type: "Restaurante", city: "Campinas", district: "Cambuí", region: "Campinas", screens: 3, uptime: 99.6 },
  { id: "E-007", name: "Farmácia Saúde Já", type: "Farmácia", city: "São Paulo", district: "Vila Mariana", region: "Zona Sul", screens: 2, uptime: 94.3 },
];

export const devices = [
  { id: "TV-0142", name: "Recepção Principal", venue: "Clínica Vida Plena", orientation: "16:9", status: "Online", sync: "há 2 min", playlist: "Saúde & Bem-estar", hours: 312 },
  { id: "TV-0087", name: "Caixa 01", venue: "Supermercado Bom Preço", orientation: "9:16", status: "Offline", sync: "há 3 h", playlist: "Ofertas da Semana", hours: 241 },
  { id: "TV-0203", name: "Área de Musculação", venue: "Academia Corpo Ativo", orientation: "16:9", status: "Online", sync: "há 1 min", playlist: "Fitness Mix", hours: 338 },
  { id: "TV-0019", name: "Balcão", venue: "Padaria Bella Vista", orientation: "16:9", status: "Online", sync: "há 4 min", playlist: "Manhã Gourmet", hours: 355 },
  { id: "TV-0311", name: "Espera", venue: "Barbearia Navalha de Ouro", orientation: "9:16", status: "Sincronizando", sync: "agora", playlist: "Estilo & Esporte", hours: 198 },
  { id: "TV-0156", name: "Salão", venue: "Restaurante Sabor Mineiro", orientation: "16:9", status: "Online", sync: "há 6 min", playlist: "Almoço Executivo", hours: 290 },
  { id: "TV-0098", name: "Entrada", venue: "Farmácia Saúde Já", orientation: "9:16", status: "Offline", sync: "há 26 h", playlist: "Saúde & Bem-estar", hours: 120 },
];

export const hourlyActivity = Array.from({ length: 24 }, (_, h) => ({
  hora: `${String(h).padStart(2, "0")}h`,
  telas: Math.round(h < 6 ? 60 + h * 8 : h < 12 ? 300 + (h - 6) * 30 : h < 19 ? 470 - Math.abs(15 - h) * 12 : 420 - (h - 19) * 55),
  exibicoes: Math.round(h < 6 ? 300 + h * 40 : h < 12 ? 2400 + (h - 6) * 260 : h < 19 ? 4100 - Math.abs(15 - h) * 160 : 3500 - (h - 19) * 480),
}));

export const campaigns = [
  { name: "Black Friday Bom Preço", advertiser: "Supermercado Bom Preço", status: "Ativa", period: "01/11 – 30/11", screens: 120, plays: 48210, progress: 62 },
  { name: "Lançamento Plano Fit", advertiser: "Academia Corpo Ativo", status: "Ativa", period: "15/10 – 15/12", screens: 85, plays: 31840, progress: 48 },
  { name: "Check-up Preventivo", advertiser: "Clínica Vida Plena", status: "Pausada", period: "01/10 – 31/10", screens: 60, plays: 18320, progress: 90 },
  { name: "Café da Manhã Completo", advertiser: "Padaria Bella Vista", status: "Agendada", period: "05/11 – 05/12", screens: 40, plays: 0, progress: 0 },
  { name: "Feijoada de Sábado", advertiser: "Restaurante Sabor Mineiro", status: "Concluída", period: "01/09 – 30/09", screens: 30, plays: 22410, progress: 100 },
];

export const advertisers = [
  { name: "Supermercado Bom Preço", segment: "Varejo", contact: "Marina Lopes", campaigns: 3, media: 14, status: "Ativo" },
  { name: "Academia Corpo Ativo", segment: "Fitness", contact: "Rafael Souza", campaigns: 2, media: 9, status: "Ativo" },
  { name: "Clínica Vida Plena", segment: "Saúde", contact: "Dra. Ana Ribeiro", campaigns: 1, media: 5, status: "Ativo" },
  { name: "Padaria Bella Vista", segment: "Alimentação", contact: "Carlos Mendes", campaigns: 1, media: 4, status: "Ativo" },
  { name: "Auto Center Turbo", segment: "Automotivo", contact: "Pedro Alves", campaigns: 0, media: 2, status: "Inativo" },
];

export const media = [
  { name: "black-friday-30s.mp4", type: "Vídeo", duration: "0:30", size: "18,4 MB", format: "16:9", tag: "Publicidade" },
  { name: "plano-fit-vertical.mp4", type: "Vídeo", duration: "0:15", size: "9,1 MB", format: "9:16", tag: "Publicidade" },
  { name: "cardapio-almoco.png", type: "Imagem", duration: "0:10", size: "1,2 MB", format: "16:9", tag: "Informações" },
  { name: "dica-saude-hidratacao.mp4", type: "Vídeo", duration: "0:20", size: "12,7 MB", format: "16:9", tag: "Entretenimento" },
  { name: "promo-cafe.jpg", type: "Imagem", duration: "0:08", size: "860 KB", format: "9:16", tag: "Publicidade" },
  { name: "curiosidades-sp.mp4", type: "Vídeo", duration: "0:45", size: "26,3 MB", format: "16:9", tag: "Entretenimento" },
  { name: "horario-funcionamento.png", type: "Imagem", duration: "0:10", size: "640 KB", format: "16:9", tag: "Informações" },
  { name: "checkup-preventivo.mp4", type: "Vídeo", duration: "0:30", size: "17,9 MB", format: "16:9", tag: "Publicidade" },
];

export const alerts = [
  { device: "TV-0098", venue: "Farmácia Saúde Já", issue: "Offline há 26 horas", level: "Offline" },
  { device: "TV-0087", venue: "Supermercado Bom Preço", issue: "Sem sincronizar há 3 horas", level: "Offline" },
  { device: "TV-0244", venue: "Academia Corpo Ativo", issue: "Armazenamento acima de 90%", level: "Alerta" },
  { device: "TV-0177", venue: "Clínica Vida Plena", issue: "Temperatura elevada", level: "Alerta" },
];

export const activity = [
  { who: "Marina L.", what: "publicou a campanha Black Friday Bom Preço", when: "há 5 min" },
  { who: "Sistema", what: "sincronizou 312 telas com a nova programação", when: "há 12 min" },
  { who: "Rafael S.", what: "enviou 3 mídias para a biblioteca", when: "há 40 min" },
  { who: "Sistema", what: "detectou TV-0098 offline", when: "há 1 h" },
  { who: "Junnior P.", what: "cadastrou o estabelecimento Farmácia Saúde Já", when: "há 3 h" },
];

export const playlists = [
  { name: "Saúde & Bem-estar", items: 12, duration: "08:40", screens: 64, updated: "hoje" },
  { name: "Ofertas da Semana", items: 9, duration: "05:15", screens: 120, updated: "ontem" },
  { name: "Fitness Mix", items: 15, duration: "11:20", screens: 85, updated: "há 2 dias" },
  { name: "Manhã Gourmet", items: 7, duration: "04:30", screens: 40, updated: "há 5 dias" },
];

export const fmt = (n: number) => n.toLocaleString("pt-BR");
