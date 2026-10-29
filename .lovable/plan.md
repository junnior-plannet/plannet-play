# PLANNET CONTROL — Diagnóstico e plano de evolução

## 1. Diagnóstico do projeto atual

Analisados: 20 páginas internas, login/recuperação, menu, componentes, integrações, testes, migrações e banco atual. Evoluir o projeto, não recriá-lo.

### O que já existe
- Supabase externo conectado ao projeto `eozuygksoxvealpabern`, preservado.
- Login, cadastro de conta, recuperação de senha e logout usam Supabase Auth. A tela de login carregou sem erros e o acesso sem sessão a `/` foi redirecionado para `/auth`.
- Clientes, estabelecimentos, TVs e leitura de planos usam dados do Supabase, com cadastro/edição, carregamento, erro e lista vazia.
- Sete tabelas: `profiles`, `user_roles`, `client_members`, `clients`, `plans`, `establishments`, `devices`.
- Relações: plano → cliente → estabelecimento → TV; contas vinculadas a clientes por membros.
- RLS ativa nas sete tabelas: acesso administrativo ou por vínculo; regra no banco protege plano, status e percentual do cliente.
- Novas contas recebem perfil Cliente. A promoção administrativa não é executável por usuários comuns; continua restrita ao ambiente privilegiado, sem cadastro administrativo público.
- Há 1 conta, 1 administrador, 1 cliente, 2 planos, nenhum estabelecimento e nenhuma TV no momento da consulta. Nenhum vínculo de membro foi encontrado. O cadastro de cliente existente será preservado.
- Marca oficial, favicon e tema Dark Tech estão aplicados. Editor de playlists de faixa única já possui ordenação, duração, repetição e prévia.

### O que ainda é demonstrativo ou incompleto
- Demais módulos ainda usam mocks ou controles sem integração operacional completa: dashboard, inteligência, regiões/mapa, conteúdo, campanhas, relatórios/histórico, monitoramento e rádio.
- Nenhum bucket de mídia foi encontrado. Marca oficial usa CDN, preservada; arquivos locais não são uploads persistentes.
- Cadastro de conta não cria uma solicitação comercial pendente, nem oferece aprovação administrativa. O acesso atual verifica sessão, não aprovação contratual.
- Planos são lidos, mas não há gestão completa de contratação, vencimento, situação financeira, exceções ou suspensão.
- O código atual de TV é identificador permanente, não código temporário de seis dígitos. Não há Player funcional, credenciais individuais, última conexão, telemetria ou comprovação de exibições.
- O sino não está ligado a uma central de eventos reais. Não existem registros de notificações, horários de funcionamento ou preferências persistentes.

### Pontos que exigem correção
1. O percentual 20 está definido como padrão em planos/clientes e em partes demonstrativas. Retirar a suposição para novos cadastros, sem alterar silenciosamente percentuais já contratados.
2. Membros podem atualizar dispositivos pelas regras atuais, inclusive campos de ativação. Isso não satisfaz a autorização segura e o limite contratual exigidos para o Player.
3. O banco concede privilégios de tabela amplos, inclusive a `anon`; as políticas RLS atuais continuam bloqueando acesso anônimo. Revisar e reduzir privilégios ao necessário, sem confundir privilégios de tabela com autorização efetiva.
4. Menu e bloqueios visuais utilizam estado demonstrativo em parte do fluxo. Substituir essa dependência por autorização real nos módulos integrados; esconder um botão não protege uma operação.
5. Recuperação de senha precisa validar o contexto de recuperação e tratar link inválido/expirado, além da confirmação de senha já existente.
6. Sem telemetria, não é possível classificar TVs como online/offline nem produzir audiência, downloads, instalações ou exibições reais. Dados ausentes aparecerão como não disponíveis, não como contagens inventadas.

**Validação:** 19 testes passaram; compilação sem erros. Não substituem novos testes RLS. Apenas consultas no banco. Sessão do proprietário indisponível para teste autenticado; confirmação de e-mail, URLs e entrega de e-mails ainda não verificadas.

## 2. Plano por etapas

### Etapa 1 — Base operacional (primeira entrega após aprovação)
- Login: “Lembrar meu usuário” guarda apenas e-mail mediante escolha; olho para mostrar/ocultar senha, oculta por padrão; cadastro com a chamada solicitada; recuperar senha com estados seguros.
- Aproveitar os perfis existentes. Autocadastro cria solicitação pendente vinculada à conta, sem permitir escolher privilégios. Administrador vê a solicitação e aprova/rejeita; duplicações e reenvios devem ser tratados.
- Enquanto pendente, mostrar somente: **“Seu cadastro está em análise. Aguarde a liberação da Plannet Play.”** Usuários aprovados e administradores recebem destinos próprios. A restrição também será aplicada aos dados e operações, não somente à página.
- Clientes/planos: separar situação cadastral/financeira; plano, limite, vencimento e condições comerciais protegidos no banco.
- “Espaço Publicitário Plannet (%)” deriva do plano, com explicação solicitada e exceção administrativa registrada. Preservar valores existentes e sinalizar contratos sem definição, sem inventar plano ou percentual.
- Estabelecimentos: cliente responsável, segmento, localização e disponibilidade publicitária; não duplicar condições contratuais nem confundir aceite de anúncios com espaço físico.
- Central básica de notificações para cadastro e aprovação, necessária ao próprio fluxo da etapa; demais eventos entram quando sua origem existir.
- Menu: Visão Geral, Rede, Conteúdo, Publicidade, Gestão; Rádio, Planos e “Parceiros — Em breve”; preservar Histórico e demais módulos.
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
