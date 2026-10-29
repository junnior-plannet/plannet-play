# PLANNET CONTROL — Diagnóstico e plano de evolução

## 1. Diagnóstico do projeto atual

Foi feita uma análise das 20 páginas internas, login, recuperação de senha, menu, componentes compartilhados, módulos demonstrativos, integrações, testes, migrações e configuração atual do banco. O projeto será evoluído, não recriado.

### O que já existe
- Supabase externo conectado ao projeto `eozuygksoxvealpabern`, preservado.
- Login, cadastro de conta, recuperação de senha e logout usam Supabase Auth. A tela de login carregou sem erros e o acesso sem sessão a `/` foi redirecionado para `/auth`.
- Clientes, estabelecimentos, TVs e leitura de planos usam dados do Supabase, com cadastro/edição, carregamento, erro e lista vazia.
- Sete tabelas: `profiles`, `user_roles`, `client_members`, `clients`, `plans`, `establishments`, `devices`.
- Relações: plano → cliente → estabelecimento → TV; contas vinculadas a clientes por membros.
- As sete tabelas têm RLS ativa. Leitura/escrita dos cadastros depende de administrador ou vínculo com o cliente; mudanças de plano, status e percentual do cliente são protegidas por uma regra no banco.
- Novas contas recebem perfil Cliente. A promoção administrativa não é executável por usuários comuns; continua restrita ao ambiente privilegiado, sem cadastro administrativo público.
- Há 1 conta, 1 administrador, 1 cliente, 2 planos, nenhum estabelecimento e nenhuma TV no momento da consulta. Nenhum vínculo de membro foi encontrado. O cadastro de cliente existente será preservado.
- Marca oficial, favicon e tema Dark Tech estão aplicados. Editor de playlists de faixa única já possui ordenação, duração, repetição e prévia.

### O que ainda é demonstrativo ou incompleto
- Dashboard, Central de Inteligência, Regiões, Mapa, conteúdos, programação, campanhas, relatórios, histórico, monitoramento e rádio ainda dependem de informações demonstrativas ou controles sem integração operacional completa.
- Não há armazenamento privado de mídias configurado nos buckets consultados; imagens oficiais da marca usam ativos CDN e serão mantidas. Seleções locais de arquivos não equivalem a uploads persistentes.
- Cadastro de conta não cria uma solicitação comercial pendente, nem oferece aprovação administrativa. O acesso atual verifica sessão, não aprovação contratual.
- Planos são lidos, mas não há gestão completa de contratação, vencimento, situação financeira, exceções ou suspensão.
- O código atual de TV é identificador permanente, não código temporário de seis dígitos. Não há Player funcional, credenciais individuais, última conexão, telemetria ou comprovação de exibições.
- O sino não está ligado a uma central de eventos reais. Não existem registros de notificações, horários de funcionamento ou preferências persistentes.
- Transmissões e comandos de rádio/TV não possuem infraestrutura de entrega.

### Pontos que exigem correção
1. O percentual 20 está definido como padrão em planos/clientes e em partes demonstrativas. Retirar a suposição para novos cadastros, sem alterar silenciosamente percentuais já contratados.
2. Membros podem atualizar dispositivos pelas regras atuais, inclusive campos de ativação. Isso não satisfaz a autorização segura e o limite contratual exigidos para o Player.
3. O banco concede privilégios de tabela amplos, inclusive a `anon`; as políticas RLS atuais continuam bloqueando acesso anônimo. Revisar e reduzir privilégios ao necessário, sem confundir privilégios de tabela com autorização efetiva.
4. Menu e bloqueios visuais utilizam estado demonstrativo em parte do fluxo. Substituir essa dependência por autorização real nos módulos integrados; esconder um botão não protege uma operação.
5. Recuperação de senha precisa validar o contexto de recuperação e tratar link inválido/expirado, além da confirmação de senha já existente.
6. Sem telemetria, não é possível classificar TVs como online/offline nem produzir audiência, downloads, instalações ou exibições reais. Dados ausentes aparecerão como não disponíveis, não como contagens inventadas.

**Validação realizada:** 19 testes existentes passaram e o registro atual de compilação está sem erros. Esses testes não substituem testes de RLS das novas regras. Nesta análise não foram executadas escritas no banco. A sessão autenticada do proprietário não está disponível para testes de ponta a ponta neste Supabase externo; políticas de confirmação de e-mail, URLs de recuperação e envio de e-mails precisam de verificação específica, não foram presumidas.

## 2. Plano por etapas

### Etapa 1 — Base operacional (primeira entrega após aprovação)
- Login: “Lembrar meu usuário” guarda apenas e-mail mediante escolha; olho para mostrar/ocultar senha, oculta por padrão; cadastro com a chamada solicitada; recuperar senha com estados seguros.
- Aproveitar os perfis existentes. Autocadastro cria solicitação pendente vinculada à conta, sem permitir escolher privilégios. Administrador vê a solicitação e aprova/rejeita; duplicações e reenvios devem ser tratados.
- Enquanto pendente, mostrar somente: **“Seu cadastro está em análise. Aguarde a liberação da Plannet Play.”** Usuários aprovados e administradores recebem destinos próprios. A restrição também será aplicada aos dados e operações, não somente à página.
- Gestão de clientes e planos: separar situação cadastral da financeira, definir plano, limite de TVs, vencimento e condições comerciais; proteger esses campos no servidor/banco.
- “Espaço Publicitário Plannet (%)” deriva do plano, com explicação solicitada e exceção administrativa registrada. Preservar valores existentes e sinalizar contratos sem definição, sem inventar plano ou percentual.
- Estabelecimentos: cliente responsável, segmento, localização e disponibilidade publicitária; não duplicar condições contratuais nem confundir aceite de anúncios com espaço físico.
- Central básica de notificações para cadastro e aprovação, necessária ao próprio fluxo da etapa; demais eventos entram quando sua origem existir.
- Reorganizar o menu em Visão Geral, Rede, Conteúdo, Publicidade e Gestão; usar Rádio; preservar Histórico e todos os módulos. Gestão separada de Planos e entrada não operacional “Parceiros — Em breve”.
- Preservar a conta administradora e todos os cadastros atuais. Não colocar clientes existentes em análise automaticamente: revisar a classificação antes da conversão.

### Etapa 2 — Gestão e monitoramento
- Dashboard com totais reais de clientes, estabelecimentos e TVs; aprovações pendentes e notificações reais. Métricas sem fonte ficam indisponíveis.
- Regiões por cidade/estado; mapa escuro minimalista de Sergipe, foco Aracaju, com contorno municipal e pontos de estabelecimentos reais. Cidade abre locais e TVs; estrutura expansível. Coordenadas virão de cadastro/geocodificação validada, sem pontos fictícios.
- Central de notificações com não lidas, histórico, filtros e marcação de leitura; preferências do cliente e horários dos estabelecimentos.
- Histórico de ações administrativas e ativações manuais. Preparar campos para última conexão, mas ativar alertas de desconexão apenas quando existir comunicação real do Player.
- Vencimento: notificar no vencimento, manter serviços durante 48 horas e suspender depois somente com pendência confirmada e sem exceção. Permitir prazo adicional, liberação, suspensão e reativação administrativas. Nenhuma cobrança será exibida publicamente na TV.
- Começar com confirmação financeira administrativa confiável; integração automática de cobrança será uma entrega posterior. Falha temporária de integração nunca confirma dívida.

### Etapa 3 — Conteúdo e publicidade
- Upload privado real com clique/arrastar, progresso, prévias, validação de formato/tamanho, erros e organização; definir limites antes de aplicá-los, sem inventar franquias comerciais.
- Persistir mídias, playlists e atribuições; reutilizar o editor único existente, preservando ordem, duração e playlists originais.
- Programação Inteligente com Inserção Rápida e Campanha Programada: rede elegível, estado, cidade, estabelecimento, segmento e TV; período, frequência, prioridade e pausas.
- Integrar anunciantes/campanhas sem duplicação; calcular elegibilidade e ocupação publicitária no servidor, respeitando contratos e campanhas concorrentes.
- Publicar uma programação não significa que a TV a recebeu: distinguir preparada, enviada e confirmada pelo Player. Resultados de exibição só serão exibidos após confirmação técnica.

### Etapa 4 — Integração com o Plannet Player
- Implementar protocolo de ativação por código de seis dígitos, prazo limitado, uso único, limite de tentativas e consumo atômico; verificar aprovação, validade contratual, limite e estabelecimento do cliente.
- Identidade permanente e credenciais individuais revogáveis; bloquear/liberar/desvincular somente com autorização apropriada.
- Comunicação periódica, última conexão e histórico; definir critérios explícitos para offline. Sincronização e reprodução offline dependem do aplicativo.
- Downloads mensuráveis, instalações confirmadas, ativações e atividade de 7/30 dias ficam separados; nunca inferir um evento a partir de outro.
- **Dependência:** aplicativo Android TV e seu instalador ainda precisam ser desenvolvidos e testados em dispositivos compatíveis. Este painel web não gera sozinho um Player instalável.

### Etapa 5 — Recursos avançados
- Preparar modalidades de transmissão por tela, URL e câmera; entregar para múltiplas TVs somente após infraestrutura de streaming e Player compatível.
- Rádio sob operação do cliente; administrador controla habilitação por plano e suporte. Persistir configurações e prevenir conflito entre rádio e vídeos com áudio.
- Automação de lembretes, entrega de e-mail e cobrança integrada após configurar serviços e preferências. Recursos indisponíveis não terão botões que anunciem sucesso fictício.
- Créditos publicitários e fluxos de parceiros/afiliados ficam fora desta implementação.

## 3. Detalhes técnicos e alterações necessárias no banco
- Evolução incremental nas tabelas existentes, sem recriar schemas ou copiar tabelas reais para mocks. Novas operações internas usarão funções de servidor autenticadas do TanStack; RLS permanece como defesa de acesso. Rotas externas de Player/webhooks verificarão credenciais/assinaturas próprias.
- Etapa 1: estado de aprovação/solicitação e responsáveis pela decisão; dados comerciais e financeiros separados, vencimento, limite e exceção publicitária; regras de vínculo; disponibilidade publicitária; notificações iniciais e auditoria. Proteger criação e alteração de campos contratuais, não apenas UPDATE.
- Etapa 2: preferências, horários, eventos/notificações, localização e exceções de prazo; autorização temporal derivada de datas e confirmação financeira. Transições/notificações automáticas exigem execução confiável: usar eventos e operações SQL; agendamento SQL no Supabase externo somente quando necessário e aprovado, sem depender de o navegador estar aberto.
- Etapa 3: catálogo de mídias e Storage privado, playlists/itens, atribuições, anunciantes/campanhas/alvos e programação. Políticas por cliente e acesso administrativo explícito; URLs temporárias para arquivos privados.
- Etapa 4: sessões de pareamento, hashes de credenciais de dispositivos, telemetria e eventos de reprodução. Não guardar credenciais em texto puro nem expô-las nas listagens. Ativação concorrente não pode ultrapassar limite nem reutilizar código.
- Toda tabela nova terá privilégios explícitos e RLS; papéis permanecem em `user_roles`. Tipos serão regenerados pelo Supabase. Auditoria não aceitará identidade administrativa fornecida pelo navegador.

## 4. Proteção dos dados, riscos e testes
- Antes de cada migração: conferir estado real, backup/recuperação disponível e apresentar o SQL relevante para aprovação; evitar exclusões e mudanças destrutivas. Novos campos entram com compatibilidade e classificação dos registros existentes revisada.
- Principais riscos: nova regra bloquear clientes atuais; alteração indevida de percentuais; exclusões em cascata já existentes; confundir ativação manual com conexão; trocar mocks por listas reais vazias; falha em trigger impedir cadastro; upload consumir armazenamento; streaming gerar custos.
- Não apagar registros para resolver inconsistências. Não recalcular contratos anteriores ao mudar plano sem política explícita. Não executar testes com resíduos permanentes.
- Testar regras concretas: pendente sem acesso operacional; isolamento entre clientes; plano/limite/percentual só administrativos; 48h exatas e exceções; ativação única/expirada/concorrente; arquivos privados; publicidade dentro do contratado e playlist original intacta.
- Testes SQL transacionais com rollback integral, inclusive contas de teste, contagem de linhas afetadas e conferência do estado final; apresentar SQL de segurança antes de executar.
- Testes de navegação, cadastro/aprovação, login/logout e recuperação; verificar cada entrega em desktop, tablet e celular. Fluxos autenticados exigem sessão de teste disponível; registrar claramente o que não pôde ser verificado.

## 5. Aprovação e escopo imediato
Este plano não executou mudanças funcionais, migrações ou alterações de permissões. A aprovação inicia **somente a Etapa 1**, com apresentação das mudanças no banco antes de aplicá-las. Etapas seguintes permanecem sequenciadas, com revisão de dependências e autorização para alterações críticas. Não é necessário refazer seu cadastro nem promover novamente sua conta.