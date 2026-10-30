# Central de Notificações — parte 3

## Entrega e limites

O cabeçalho compartilhado em `AppShell` agora contém o sino **Notificações**, somente para o administrador autenticado (`useMe().isAdmin`, originado de `user_roles`). O papel demonstrativo não concede acesso. O painel lateral usa os tokens existentes, preservando a identidade Dark Tech nos dois temas e ocupando a largura disponível no celular. Há foco/fechamento pelo Sheet acessível, rolagem independente e respeito a movimento reduzido.

**A central está deliberadamente desconectada.** O painel informa “Integração pendente de autorização”; não mostra contador zero como se uma consulta tivesse ocorrido. Não há eventos reais, dados de demonstração, notificações derivadas de navegação, armazenamento local ou chamadas a tabelas inexistentes. Atualizar e marcar leitura permanecem desabilitados nesse estado.

O contrato `NotificationSource` permite conectar uma implementação autorizada: consulta, total não lido, confirmação de leitura individual/em lote e assinatura opcional para invalidar a consulta. O consumidor já prepara ordenação recente, filtros, ícones por categoria, nomes de cliente/TV, horário, leitura persistida pelo adaptador, estados de carregamento/erro, atualização manual e consulta a cada 30 segundos (sem polling em segundo plano). A animação do sino ocorre uma vez para uma nova notificação não lida após a primeira consulta, nunca continuamente. Nada disso gera eventos no modo desconectado.

Ao conectar uma fonte real, “Abrir cliente/TV” resolve o ID em uma consulta atual ao Supabase sob RLS e abre um resumo somente leitura dentro do painel. Registros removidos ou sem acesso têm estado específico; não há links arbitrários vindos do evento. Não foram alterados os formulários de cadastro, TVs, planos, autenticação, mídia ou permissões.

## Infraestrutura inspecionada — apenas arquivos

- `src/integrations/supabase/types.ts`: sete tabelas (profiles, user_roles, plans, clients, client_members, establishments e devices); nenhuma tabela de notificações, recibos ou auditoria.
- As duas migrações existentes definem cadastro, RLS, funções de autorização e gatilhos de updated_at/proteção/cadastro de usuários. Não há registro de eventos nem publicação de notificações para Realtime nesses arquivos.
- Busca no código não encontrou assinaturas de eventos Postgres. A assinatura de autenticação existente não é uma fonte de notificações.
- `error-capture.ts` é diagnóstico técnico temporário do servidor, não um histórico administrativo persistente. Não foi reutilizado para expor erros ou dados sensíveis.

**Nenhum SQL foi executado, nem mesmo para inspeção.** As conclusões acima são sobre a infraestrutura versionada, não uma confirmação do catálogo atual do banco. Antes de uma futura migração, conferir o esquema real e reutilizar infraestrutura eventualmente existente fora do repositório.

## Proposta de persistência — NÃO EXECUTADA, depende de autorização

### Estrutura e relacionamentos

1. **notification_events**, registro imutável compartilhado:
   - id UUID, created_at timestamptz gerado pelo servidor;
   - event_type validado (client.created/status_changed/updated/plan_changed, device.created/activation_changed/updated, system.operation_failed/admin_event);
   - categoria client/plan/device/system, título e descrição curtos;
   - client_id UUID opcional → clients; obrigatório para eventos de cliente/TV;
   - device_id UUID opcional → devices; actor_id UUID opcional → profiles;
   - escopo administrativo explícito para eventos do sistema sem cliente;
   - event_key única, produzida no servidor para idempotência;
   - nomes de cliente/TV opcionais como retrato mínimo, sem documentos, e-mails, tokens, endereços ou payloads brutos.
2. **notification_reads**, recibo por pessoa:
   - notification_id UUID → notification_events, user_id UUID → auth.users, read_at timestamptz;
   - chave primária composta (notification_id, user_id); um administrador não altera a leitura dos demais.

Para remoções futuras, propor limpar o ID relacionado com SET NULL, mantendo o escopo administrativo do evento e sem ampliar visibilidade. Validar a retenção/anonimização dos nomes com o responsável antes da migração. Nenhuma remoção de registros faz parte desta entrega.

Índices propostos: eventos por created_at/id, client_id/created_at, device_id e event_key; recibos por user_id/notification_id. A consulta deve retornar itens e total não lido da mesma visão autorizada, com paginação/cursor definido antes da conexão definitiva.

### Acesso / RLS proposta

- Ativar RLS nas duas tabelas. Sem leitura anônima.
- Nesta primeira versão, SELECT dos eventos somente com `has_role(auth.uid(), 'admin')`. O sino não aparece para clientes. Isso corresponde ao módulo administrativo atual, onde administradores têm acesso global.
- Se futuramente houver uma caixa para clientes, criar uma política separada com `is_client_member(auth.uid(), client_id)`, verificar o vínculo atual em cada consulta e excluir eventos globais/administrativos; nunca autorizar pela presença de um ID no frontend.
- Nenhum INSERT/UPDATE/DELETE direto de eventos pelo navegador, incluindo administradores. Escrita exclusivamente por mecanismos confiáveis de servidor.
- Recibos: somente o próprio user_id e somente quando o evento relacionado também for visível. INSERT/UPDATE via operação controlada, com horário do servidor. Sem permissão para alterar o evento ou marcar leitura de outra pessoa.
- Consulta, contagem, lote e entrega Realtime devem aplicar as mesmas regras. O frontend é somente uma barreira de interface, não de segurança.

### Registro dos eventos reais

- Após autorização, usar gatilhos transacionais de INSERT/UPDATE em clients/devices: um evento de criação por novo registro; em UPDATE comparar os campos relevantes com OLD/NEW.
- Clientes: nome/contato/cidade efetivamente modificados, status e plano. TVs: nome, orientação, local, identificação e activation_status. Conexão online não equivale a ativação.
- Priorizar mudanças de plano/status/ativação ou agregá-las em um único resumo por transação, sem duplicar notificações de um mesmo salvamento. Alteração apenas de updated_at não gera evento.
- Capturar mudanças realizadas fora desta interface pelo mesmo mecanismo de banco; não depender de toasts, navegação, refetch ou comparações de listas no navegador.
- Falhas de operações importantes: registrar em serviço de backend confiável, com identificador idempotente e mensagem saneada. Um gatilho na transação que falhou não conserva o evento após rollback. Erros comuns de validação/navegação não geram eventos.
- Sem preenchimento retroativo de “novos eventos” usando cadastros antigos. O histórico começa quando o mecanismo for ativado, com essa data explícita.

### Tempo real e impacto

Depois de autorizado, habilitar apenas a publicação necessária e confirmar suporte/RLS no ambiente. A assinatura notifica que há mudança; o adaptador reconsulta itens e contagem sob a sessão atual, sem inserir payloads recebidos diretamente na tela. Notificações de leitura também devem invalidar o cache; cancelar assinatura na saída/troca de pessoa. A consulta periódica existente serve de fallback e reconciliação.

Impacto previsto: duas tabelas, índices, políticas novas, mecanismo confiável de eventos e possível publicação Realtime. Haverá escrita adicional por alteração relevante, retenção a definir e volume a monitorar. Não exige alterar as tabelas/forms de cadastro nem credenciais, mas gatilhos dependem de autorização explícita. Não há arquivos de migração preparados nesta entrega.

## Conexão futura

Implementar `NotificationSource` em módulo dedicado e substituir somente `notificationSource = null` depois de validar a autorização real. Não basta remover o aviso: confirmar geração de eventos, recibos por usuário, contagem, escopo e assinatura antes de ativar. O adaptador não deve aceitar um user_id arbitrário como autoridade; usar a sessão Supabase e RLS.

A interface atual filtra a coleção retornada; o adaptador deve fornecer a caixa completa autorizada ou implementar paginação e filtro no servidor junto com controles de “carregar mais” antes de limitar resultados. Não mostrar uma lista parcial como se fosse completa. A leitura em lote deve usar um limite temporal/cursor no servidor para não consumir eventos que chegam depois da operação.

## Arquivos desta parte

- `src/components/app/AppShell.tsx`: sino no cabeçalho comum.
- `src/components/app/NotificationCenter.tsx`: painel e integração com o consumidor.
- `src/components/app/NotificationCards.tsx`: pendência e apresentação dos eventos.
- `src/components/app/NotificationTarget.tsx`: abertura somente leitura do registro sob RLS.
- `src/hooks/use-notifications.ts`: consulta isolada por pessoa/fonte, mutações e assinatura.
- `src/lib/notifications.ts`: contrato e funções puras, sem fonte fictícia.
- `src/styles.css`: animação breve do sino, respeitando movimento reduzido.
- `src/test/notifications.test.tsx`: testes com adaptador exclusivo de testes.
- `src/test/panel-interface.test.ts`: regressão do cabeçalho sem eventos fictícios.
- `docs/central-de-notificacoes.md`: inspeção, proposta e limites.

## Validação

Testes adicionados para: papel real e sessão ausente, fonte desconectada, filtros e ordenação, contrato de leitura, atualização por assinatura, limpeza, chegada sem animação inicial, abertura do vínculo e falha de gravação sem confirmação falsa. Os dados desses testes nunca chegam ao aplicativo ou ao banco.

**Não foi possível executar build, Vitest ou navegador neste ambiente de edição.** A inspeção foi estática. Para validar no projeto: executar `npm test` e `npm run build`; abrir o sino como administrador em desktop/celular, testar fechamento por Escape e foco, e verificar sua ausência no perfil de cliente. Com o banco ainda desconectado, não é possível validar eventos reais, recibos persistentes, Realtime ou políticas novas. Mapas e gráficos das partes anteriores não foram modificados.
