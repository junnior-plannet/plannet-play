# Revisão do painel — parte 2

## Alterações efetivas

- **Clientes → Novo Cliente / Editar cadastro:** formulário único, sem etapas ou abas, organizado em Dados do cliente, Endereço, Plano e status e TVs do cliente. Um único botão principal **Salvar cadastro**. Preservados os campos e as restrições de administrador existentes.
- **Editar cadastro → Gerenciar acessos do cliente:** área recolhida por padrão, depois do formulário, com explicação de que vincular/remover usuários são ações independentes. O formulário de e-mail fica fora do formulário de cadastro, com validação nativa, estado de vinculação e bloqueio enquanto há operação de acesso pendente. Falhas de consulta oferecem nova tentativa. A área continua exclusiva de administradores e de clientes existentes, conforme a página já determinava.
- **TVs do cliente:** explicações sobre TVs históricas em outros vínculos, inclusão no limite do plano, preservação de TVs salvas e necessidade de plano ativo para adicionar TVs. Orientações individuais e a edição em Dispositivos permanecem intactas.
- **Vínculos internos:** adicionada recusa explícita antes de gravar quando um estabelecimento marcado como salvo desaparece da consulta atual. Não é substituído silenciosamente por outro estabelecimento. Mantidas a reutilização por ID/nome/antiguidade e a validação de pertencimento de estabelecimentos e TVs.
- **Faixa superior do painel:** identificada em `AppShellContent`, no `header` de `src/components/app/AppShell.tsx`. A busca não possuía evento ou consulta; o sino não possuía ação e mostrava um ponto de notificação constante. Removidos esses dois controles sem função e inserido o nome da página. Mantidos o header, o controle de abrir/recolher menu, a navegação lateral, a marca, o perfil e a saída.
- As mudanças visuais usam os tokens existentes, sem mudar a paleta Dark Tech; aplicam-se aos dois modos, que atualmente compartilham a base de cores do stylesheet.

## O que já estava correto e foi preservado

- O menu não contém Estabelecimentos. A antiga rota `/estabelecimentos` redireciona para Dispositivos; não há etapa de cadastro manual nesse fluxo.
- O cadastro novo começa com zero TVs e cria automaticamente um estabelecimento interno com o nome do cliente, inclusive sem plano e sem TVs. Novas TVs exigem plano ativo e respeitam o total de vínculos do cliente.
- Na edição, o vínculo padrão é escolhido por nome correspondente ou, na ausência dele, pelo registro mais antigo. O esquema versionado não tem marcador explícito de estabelecimento padrão. Nomes históricos de estabelecimentos existentes não são renomeados automaticamente, e os demais vínculos, endereços, estados e TVs não são excluídos ou transferidos.
- A página Clientes usa Supabase; vinculação/remoção de usuários continua nas funções existentes e sujeita às mesmas permissões do banco. Nenhuma chamada de cadastro recebeu poder administrativo novo.

## Revisão de demonstração

A árvore de rotas, o menu e o shell não expõem módulo, rota ou seletor independente chamado Demonstração. A busca por controles de troca de perfil/cliente encontrou apenas estado interno e a sincronização de perfil com `useMe` no shell, sem seletor na interface. Portanto, não houve exclusão de páginas ou componentes compartilhados por suposição.

Outros módulos ainda usam dados de `src/lib/mock.ts`, conforme a arquitetura atual: por exemplo, reprodução/playlists, rádio, monitoramento e relatórios. Eles NÃO foram convertidos em integrações reais nem apresentados aqui como concluídos. `DemoProvider`, contexto, editores e componentes de reprodução foram preservados porque são compartilhados; removê-los quebraria esses módulos. Esta revisão não cria um novo módulo demonstrativo nem remove os avisos de demonstração que identificam dados simulados.

## Endereço: persistência real atual, sem migração

Inspeção baseada em `src/lib/client-address.ts`, `src/lib/client-form.ts`, `src/lib/api.ts` e na migração inicial versionada; não em consulta ao banco de produção.

- `establishments.address` recebe **um texto versionado e rotulado**, com o prefixo `Endereço Plannet (v1)` e os valores de CEP, logradouro, número, complemento, bairro, cidade e estado. O leitor reconstitui os campos a partir desse texto.
- Bairro e cidade também usam as colunas já existentes `establishments.district` e `establishments.city`; a cidade do cliente usa `clients.city`.
- **CEP, logradouro, número, complemento e estado NÃO possuem persistência em colunas individuais.** Não foi adicionada nenhuma coluna. A representação textual não equivale a endereço estruturado no banco.
- Endereço legado não versionado é carregado inteiro como logradouro, sem tentar deduzir número/CEP. Ao salvar, esse texto é preservado como valor do logradouro no formato versionado, salvo edição explícita do usuário.
- `region` não é usado como estado nem exposto no formulário. Coordenadas não são inferidas. Consulta de CEP ocorre no navegador via ViaCEP, com correção manual e falhas informadas.

## Propostas pendentes de autorização — NÃO executadas

### A. Persistência estruturada de endereço

1. Revisar o esquema real autorizado e adicionar, somente após aprovação, colunas opcionais em `establishments` para CEP, logradouro, número, complemento e UF, reutilizando `district` e `city` para bairro e cidade.
2. Manter `address` e o leitor legado durante a transição; não apagar nem converter irreversivelmente textos existentes. Converter somente os valores versionados reconhecidos, com prévia de resultados e testes isolados; endereços livres exigem revisão manual.
3. Definir limites e validações de formato sem impedir textos históricos. Atualizar tipos, leitura e gravação da aplicação em conjunto e verificar as permissões existentes. Não reutilizar `region`.

### B. Salvamento atômico de cliente + vínculo interno + TVs

O salvamento atual é uma sequência de requisições. IDs fixos, validação prévia e releitura permitem retomar falhas no mesmo formulário e reduzem duplicações, mas **não garantem atomicidade, isolamento entre sessões nem ausência de duplicação após fechar e iniciar outro cadastro**. A interface conserva o aviso de falha parcial e não executa exclusões compensatórias.

Proposta para aprovação:

1. Criar uma função transacional de banco (RPC) para as três gravações em uma única transação, com rollback integral em erro. Preferir execução com permissões do chamador e RLS vigente, sem chave privilegiada no navegador.
2. Validar autenticação, papel administrativo, vínculo do cliente, campos protegidos, IDs, orientações e propriedade de todos os registros no servidor. Preservar códigos, ativação, usuários e vínculos históricos que não constam do rascunho.
3. Bloquear a linha do cliente durante a verificação do limite e durante as gravações, contando todos os estabelecimentos. Auditar também os demais caminhos de criação/edição de TVs para compartilhar a mesma regra de concorrência; uma RPC isolada não resolve escritores que ignoram o bloqueio.
4. Definir seleção persistente e inequívoca do estabelecimento padrão (por exemplo, referência opcional no cliente), com estratégia de compatibilidade para os registros existentes, sem forçar unicidade de estabelecimentos por cliente.
5. Usar IDs estáveis e uma estratégia de idempotência validada no servidor para repetição após resposta perdida. Testar falhas em cada passo, repetição, concorrência, autorização, zero TVs e todos os limites de planos em ambiente isolado antes de qualquer implantação.
6. Só então trocar a sequência de gravações da interface pela RPC e atualizar os tipos do Supabase. Nenhuma função, política ou migração desta proposta foi criada nesta entrega.

## Arquivos modificados nesta parte

- `src/components/app/ClientForm.tsx`
- `src/components/app/ClientGuide.tsx`
- `src/components/app/AppShell.tsx`
- `src/lib/client-form.ts`
- `src/routes/_authenticated/clientes.tsx`
- `src/test/client-form-ui.test.tsx`
- `src/test/client-form.test.ts`
- `src/test/client-guide.test.tsx`
- `src/test/panel-interface.test.ts` (novo)
- `docs/revisao-painel-parte-2.md` (este relatório)

## Verificação, testes e limites da entrega

**Efetuado:** revisão estática dos arquivos atuais fornecidos no repositório, das referências de menu/rotas/shell, dos formulários, do fluxo de gravação e da migração inicial versionada. Preparados testes isolados adicionais para a separação de acessos, zero TVs sem nome de estabelecimento/Região, preservação de vínculos históricos e recusa de vínculos inválidos ou desaparecidos. O teste de interface do painel verifica apenas contratos estruturais do código/menu; não substitui teste visual.

**Não executado nesta sessão:** testes, build, navegação autenticada e conferência visual do preview. O ambiente de edição não disponibiliza execução de comandos, navegador ou operações Git; não foi possível comprovar sincronização GitHub/Lovable ou ausência de alterações ainda não sincronizadas. Foram feitas substituições pontuais nos arquivos lidos, sem reescrever histórico, arquivos gerados, ambiente ou credenciais.

Para validação em ambiente de desenvolvimento/CI, executar `npm test -- src/test/client-form.test.ts src/test/client-form-ui.test.tsx src/test/client-guide.test.tsx src/test/panel-interface.test.ts`, a suíte completa `npm test` e `npm run build`. Verificar manualmente Novo Cliente com zero TVs, edição de orientação, vínculos históricos, acesso administrativo, vínculo/remoção de usuário e menu mobile. **Resultado de execução: indisponível; não declarar aprovação sem executar.**

**Banco de produção:** nenhuma consulta SQL, migração, alteração de RLS, criação/exclusão de registros ou acesso ao banco foi executado nesta sessão. As propostas acima aguardam autorização. As gravações existentes só são acionadas pelo uso da interface; os testes preparados usam mocks, não dados reais.
