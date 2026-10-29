# PLANNET CONTROL V2
## Identidade oficial
- [x] Aplicar logo completa no login e menu lateral sem alterar demais páginas.
- [x] Preparar favicon e ícones PWA/Smart TV a partir do símbolo oficial.
- [x] Conferir login real e marca do menu em renderização visual isolada, desktop/mobile, e apresentar imagens para validação; sessão autenticada indisponível no Supabase externo.

- [x] Estado demonstrativo compartilhado: TVs, clientes, playlists e áudio; simulação de perfis.
- [x] Editor visual único com biblioteca, arrastar/reordenar, duração e prévia em loop.
- [x] Distribuição autorizada com confirmação e estados demonstrativos.
- [x] Monitoramento visual individual e mosaico com filtros.
- [x] Clientes: cadastro, detalhes, regras e permissões.
- [x] Áudio Ambiente: canais, faixas, rádio externa, configurações e administração.
- [x] Integrar páginas existentes, testar regras e verificar os cinco módulos em desktop e celular.

## Reformulação de Playlists
- [x] Listagem e ambiente único: biblioteca, prévia e timeline horizontal.
- [x] Arrastar, reordenar, selecionar, duplicar, excluir e propriedades com duração/repetição.
- [x] Rascunho, prévia em loop e publicação demonstrativa preservados.
- [x] Testes de duração/sequência e verificação visual desktop/celular.
## Backend Etapa 1
- [x] Tabelas, papéis, RLS e procedimento do primeiro administrador
- [x] Login/logout e telas de Clientes, Estabelecimentos e TVs ligadas ao banco
- [x] Teste de segurança RLS V2 autorizado anteriormente: 46 verificações e rollback integral confirmados.

## Atualização completa — diagnóstico e plano
- [x] Analisar páginas, integrações, banco e segurança sem alterar a aplicação.
- [x] Apresentar diagnóstico e plano por etapas para aprovação.
- [x] Plano aprovado; primeira entrega limitada à Etapa 1.
- [x] Login: lembrar apenas e-mail, mostrar/ocultar senha e chamada de cadastro; menu reorganizado com Parceiros não operacional.
- [x] Recuperação: validar contexto e tratar link inválido/expirado.
- [ ] Aprovar SQL aditivo da Etapa 1 antes de aplicar banco e conectar aprovação, condições comerciais, planos e notificações.
- [x] Revisar SQL: concorrência/limite de TVs, campos protegidos, publicidade, exceções justificadas, funções/RLS, leitura para suspensos e compatibilidade; apresentar versão e testes sem executar.
- [x] Revisão pontual V2 (OLD em INSERT, v2_sync_plan, GRANT/REVOKE/SECURITY DEFINER): validada em PostgreSQL 17 local isolado — migração aplicada sem erros, 37/37 testes de segurança, 22/22 testes focados, reaplicação abortada pelo preflight, zero resíduos; SQL inalterado, aguardando autorização para aplicar.
- [x] Verificação pré-migração: checksum idêntico (f61c4362…), revalidação local 37/37 com dados equivalentes à produção, preservação de admin/planos/cliente confirmada, preflight de reaplicação OK. Backup: Supabase externo sem PITR verificável por SQL — orientado pg_dump/snapshot antes de aplicar.
- [ ] Aguardando autorização do usuário para aplicar etapa1-base-operacional_v2.sql em produção.
- [ ] Pós-aplicação: testar autocadastro, aprovação administrativa, liberação de planos e permissões do cliente.
