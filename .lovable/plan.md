# PLANNET CONTROL — Diagnóstico e plano de evolução

## 1. Diagnóstico do projeto atual

Analisados: 20 páginas internas, login/recuperação, menu, componentes, integrações, testes, migrações e banco atual. Evoluir o projeto, não recriá-lo.

### O que já existe
- Supabase externo `eozuygksoxvealpabern` preservado. Login, cadastro, recuperação e logout usam Auth. Login abriu sem erros; `/` sem sessão redireciona para `/auth`.
- Clientes, estabelecimentos e TVs: cadastro/edição/listagens reais, estados de carregamento/erro/vazio; planos são lidos do banco.
- Sete tabelas: `profiles`, `user_roles`, `client_members`, `clients`, `plans`, `establishments`, `devices`. Relações plano → cliente → estabelecimento → TV e membros vinculados a clientes.
- Todas têm RLS; acesso por administrador/vínculo. Banco protege plano, status e percentual do cliente. Novas contas são Cliente; promoção administrativa bloqueada a usuários comuns.
- Consulta atual: 1 conta administradora, 1 cliente, 2 planos, 0 estabelecimentos, 0 TVs e 0 vínculos de membro. Preservar esses registros.
- Marca/favicon oficiais, Dark Tech e editor único de faixa com ordenação, duração, repetição e prévia.

### O que ainda é demonstrativo ou incompleto
- Demais módulos ainda usam mocks ou controles sem integração operacional completa: dashboard, inteligência, regiões/mapa, conteúdo, campanhas, relatórios/histórico, monitoramento e rádio.
- Nenhum bucket de mídia foi encontrado. Marca oficial usa CDN, preservada; arquivos locais não são uploads persistentes.
- Autocadastro não cria pedido pendente; acesso verifica sessão, não aprovação.
- Sem contratação, vencimento, financeiro, exceções ou suspensão completos.
- Código de TV atual é permanente, não pareamento. Sem Player, credenciais individuais, telemetria ou exibições confirmadas.
- Sino sem eventos reais; faltam notificações, horários e preferências persistentes.

### Pontos que exigem correção
1. Retirar o padrão fixo de 20% em novos cadastros, preservando contratos atuais.
2. Membros podem atualizar dispositivos pelas regras atuais, inclusive campos de ativação. Isso não satisfaz a autorização segura e o limite contratual exigidos para o Player.
3. Privilégios de tabela são amplos inclusive para `anon`, mas RLS bloqueia anônimos. Reduzir privilégios ao necessário após revisão.
4. Menu e bloqueios visuais utilizam estado demonstrativo em parte do fluxo. Substituir essa dependência por autorização real nos módulos integrados; esconder um botão não protege uma operação.
5. Validar sessão de recuperação e links inválidos/expirados.
6. Sem fonte técnica, online/offline, downloads e exibições ficam indisponíveis. Atividade não é audiência.

**Validação:** 19 testes passaram; compilação sem erros. Não substituem novos testes RLS. Apenas consultas no banco. Sessão do proprietário indisponível para teste autenticado; confirmação de e-mail, URLs e entrega de e-mails ainda não verificadas.

## 2. Plano por etapas

### Etapa 1 — Base operacional (primeira entrega após aprovação)
- Login: “Lembrar meu usuário” guarda apenas e-mail mediante escolha; olho para mostrar/ocultar senha, oculta por padrão; cadastro com a chamada solicitada; recuperar senha com estados seguros.
- Aproveitar os perfis existentes. Autocadastro cria solicitação pendente vinculada à conta, sem permitir escolher privilégios. Administrador vê a solicitação e aprova/rejeita; duplicações e reenvios devem ser tratados.
- Enquanto pendente, mostrar somente: **“Seu cadastro está em análise. Aguarde a liberação da Plannet Play.”** Usuários aprovados e administradores recebem destinos próprios. A restrição também será aplicada aos dados e operações, não somente à página.
- Clientes/planos: separar situação cadastral/financeira; plano, limite, vencimento e condições comerciais protegidos no banco.
- “Espaço Publicitário Plannet (%)” deriva do plano, com explicação solicitada e exceção administrativa registrada. Preservar valores existentes e sinalizar contratos sem definição, sem inventar plano ou percentual.
- Estabelecimentos: vínculo, segmento, localização e aceite publicitário consistente com contrato; distinguir de espaço físico.
- Central básica de notificações para cadastro e aprovação, necessária ao próprio fluxo da etapa; demais eventos entram quando sua origem existir.
- Menu: Visão Geral, Rede, Conteúdo, Publicidade, Gestão; Rádio, Planos e “Parceiros — Em breve”; preservar Histórico e demais módulos.
- Preservar conta admin e cadastros; revisar clientes atuais sem colocá-los em análise automaticamente.

### Etapa 2 — Gestão e monitoramento
- Dashboard com totais reais de clientes, estabelecimentos e TVs; aprovações pendentes e notificações reais. Métricas sem fonte ficam indisponíveis.
- Regiões consolida cidades/estados; mapa minimalista de Sergipe/Aracaju com municípios, pontos reais e expansão por cidade. Coordenadas validadas, sem pontos fictícios.
- Central de notificações com não lidas, histórico, filtros e marcação de leitura; preferências do cliente e horários dos estabelecimentos.
- Histórico de ações administrativas e ativações manuais. Preparar campos para última conexão, mas ativar alertas de desconexão apenas quando existir comunicação real do Player.
- Vencimento: notificar, manter serviços por 48h e suspender depois só com dívida confirmada e sem exceção. Administrador concede prazo/libera/suspende/reativa. TV bloqueada usa tela neutra, nunca cobrança.
- Financeiro começa com confirmação administrativa; cobrança integrada vem depois. Falha de integração nunca confirma dívida.

### Etapa 3 — Conteúdo e publicidade
- Upload privado real com clique/arrastar, progresso, prévias, validação de formato/tamanho, erros e organização; definir limites antes de aplicá-los, sem inventar franquias comerciais.
- Persistir mídias, playlists e atribuições; reutilizar o editor único existente, preservando ordem, duração e playlists originais.
- Programação: Inserção Rápida/Campanha Programada por rede, estado, cidade, estabelecimento, segmento/TV; período, frequência, prioridade e pausas.
- Integrar anunciantes/campanhas sem duplicação; calcular elegibilidade e ocupação publicitária no servidor, respeitando contratos e campanhas concorrentes.
- Distinguir programação preparada/enviada/confirmada; resultados de exibição dependem do Player.

### Etapa 4 — Integração com o Plannet Player
- Código de seis dígitos temporário, único, com limite de tentativas e consumo atômico; validar aprovação, contrato, limite e estabelecimento do cliente.
- Identidade permanente e credenciais individuais revogáveis; bloquear/liberar/desvincular somente com autorização apropriada.
- Comunicação periódica, última conexão e histórico; definir critérios explícitos para offline. Sincronização e reprodução offline dependem do aplicativo.
- Separar downloads, instalações, ativações e atividade 7/30 dias, só com evidência técnica.
- **Dependência:** desenvolver/testar aplicativo e instalador Android TV; painel web não entrega sozinho um Player.

### Etapa 5 — Recursos avançados
- Tela, URL e câmera: transmissão multi-TV depende de streaming e Player compatível.
- Rádio sob operação do cliente; administrador controla habilitação por plano e suporte. Persistir configurações e prevenir conflito entre rádio e vídeos com áudio.
- Lembretes/e-mail/cobrança após serviços configurados e preferências; sem sucesso fictício.
- Créditos publicitários e fluxos de parceiros/afiliados ficam fora desta implementação.

## 3. Detalhes técnicos e alterações no banco
- Evoluir tabelas existentes sem recriar schemas. Funções internas autenticadas do TanStack com RLS; rotas externas de Player/webhooks verificam credenciais/assinaturas próprias.
- Etapa 1: solicitações/aprovação e responsáveis; condições comerciais/financeiras, vencimento, limite e exceção publicitária; vínculos, aceite publicitário, notificações iniciais e auditoria. Proteger INSERT e UPDATE contratuais.
- Etapa 2: preferências, horários, localização, eventos e exceções de prazo. Autorização temporal baseada em datas e dívida confirmada. Notificações automáticas exigem execução confiável independente do navegador; priorizar eventos/SQL e agendamento SQL aprovado quando necessário.
- Etapa 3: mídias/Storage privado, playlists/itens, atribuições, anunciantes/campanhas/alvos. Acesso por cliente, administrador autorizado e URLs temporárias.
- Etapa 4: pareamento, hashes de credenciais revogáveis, telemetria e exibições. Ativação atômica impede reutilização de código e estouro de limite.
- Novas tabelas terão privilégios explícitos e RLS. Papéis continuam em `user_roles`; tipos regenerados pelo Supabase; auditoria não aceita identidade administrativa enviada pelo navegador.

## 4. Dados, riscos e testes
- Conferir banco e disponibilidade de backup antes de cada migração; apresentar SQL para aprovação. Novos campos compatíveis, classificação dos registros atuais revisada e nenhuma exclusão para corrigir inconsistências.
- Riscos: bloquear clientes atuais, alterar contratos, exclusões em cascata existentes, falhas de trigger no cadastro, confundir ativação com conexão e troca de mocks por listas reais vazias. Storage e streaming podem gerar custos.
- Testar pendência sem acesso operacional; isolamento; proteção de plano/limite/percentual; 48h e exceções; ativação única/expirada/concorrente; arquivos privados; limite publicitário e playlist intacta.
- SQL de segurança aprovado previamente, transacional com rollback integral inclusive usuários, contagem de linhas afetadas e estado final. Sem resíduos permanentes.
- Verificar cadastro/aprovação, login/logout/recuperação e entregas em desktop, tablet e celular. Sem sessão autenticada disponível, registrar a limitação, sem declarar fluxo validado.

## 5. Aprovação e escopo imediato
Nenhuma funcionalidade, migração ou permissão foi alterada. A aprovação inicia **somente a Etapa 1**, apresentando mudanças no banco antes de aplicá-las. Etapas seguintes terão revisão de dependências e autorização para alterações críticas. Não refazer cadastro nem promover novamente sua conta.
