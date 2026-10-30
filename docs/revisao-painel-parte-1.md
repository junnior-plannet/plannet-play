# Revisão do painel — parte 1

## Escopo entregue

- **Clientes → Novo Cliente / Editar cadastro:** orientação individual por TV, com opções Horizontal (16:9) e Vertical (9:16). Os novos rascunhos continuam começando na horizontal; nomes e orientações existentes são carregados pelas consultas de vínculos. A quantidade inicia em zero e continua limitada pelo plano, contando TVs dos demais estabelecimentos vinculados.
- **Dashboard, Clientes e Dispositivos:** botão Atualizar usando as consultas existentes do Supabase via React Query, sem recarregar o navegador. O controle fica desabilitado durante consultas relacionadas, evita cliques repetidos, aguarda todas as consultas solicitadas e apresenta falhas sem anunciar sucesso fictício. A ausência de conexão detectada pelo React Query também é informada.
- **Dashboard:** indicadores calculados a partir dos clientes, planos e dispositivos consultados, incluindo ativação (não conexão). Removida a entrada de cadastro de dispositivo do Dashboard.
- **Dispositivos:** cliente vinculado, código, orientação e ativação; edição preservando o estabelecimento vinculado. O cadastro de novas TVs fica em Clientes. Mantidos os filtros de links existentes por estabelecimento, sem ampliar silenciosamente o filtro para outros locais do mesmo cliente.
- Usados componentes e cores semânticas existentes, compatíveis com os temas claro e escuro. Não foram alteradas autenticação, políticas de acesso ou credenciais.

## Arquivos modificados nesta parte

1. `src/components/app/ClientGuide.tsx`
2. `src/components/app/RefreshButton.tsx` (novo)
3. `src/routes/_authenticated/clientes.tsx`
4. `src/routes/_authenticated/index.tsx`
5. `src/routes/_authenticated/telas.tsx`
6. `src/test/client-guide.test.tsx`
7. `src/test/client-form-ui.test.tsx`
8. `src/test/client-form.test.ts`
9. `src/test/refresh-button.test.tsx` (novo)
10. `src/test/management-pages.test.tsx` (novo)
11. `docs/revisao-painel-parte-1.md` (este relatório)

Os arquivos preparados na execução anterior deste mesmo pedido foram revisados e preservados, com complementos pontuais; não houve reescrita geral do projeto.

## Verificação e testes

**Executado nesta entrega:** revisão estática dos componentes, consultas, fluxo de persistência e políticas documentadas nas migrações existentes. A revisão do código confirma que o fluxo de persistência existente envia `orientation` com os valores `horizontal`/`vertical` para cada TV e valida os limites antes das gravações; isso não equivale a uma validação no banco real.

**Testes isolados preparados/ampliados, mas NÃO executados nesta sessão:**

- Zero TVs, geração dinâmica de nomes e orientações, horizontal como padrão e edição individual.
- Carregamento de nomes e orientações salvos na edição do cliente, sem trocar os identificadores dos vínculos.
- Restrições de quantidade e preservação de TVs já salvas.
- Persistência de orientações individuais e recusa de valores inválidos antes de qualquer gravação.
- Atualização de cache, listas e indicadores das três páginas, bloqueio de cliques duplicados, falhas, nova tentativa e ausência de conexão.
- Ausência do botão Cadastrar Dispositivo no Dashboard, edição de orientação em Dispositivos e compatibilidade do filtro por estabelecimento.

Os testes usam mocks e não requerem dados de produção. Para execução em ambiente de desenvolvimento/CI: `npm test -- src/test/client-guide.test.tsx src/test/client-form-ui.test.tsx src/test/client-form.test.ts src/test/refresh-button.test.tsx src/test/management-pages.test.tsx`, seguido de `npm run build` e da suíte completa `npm test`.

**Resultado de execução:** indisponível. Esta sessão não oferece execução de comandos, navegador de preview nem operações Git; portanto, não foram executados testes/build, nem comprovada a sincronização ou a ausência de divergências entre GitHub e Lovable. A validação visual e funcional autenticada continua pendente em ambiente apropriado.

## Segurança e pendências

- Nenhum SQL foi executado, nenhum banco foi consultado nesta sessão e nenhuma alteração foi feita no banco de produção.
- Não foram criadas migrações, tabelas, políticas, dados fictícios ou novas dependências. Não houve exclusão de registros nem alteração de ambiente/credenciais.
- As consultas e gravações da interface continuam usando o cliente Supabase existente e as permissões impostas pelo banco. A aplicação só grava quando o usuário salva um formulário.
- A segunda parte permanece pendente: revisão final do cadastro único, gerenciamento de usuários, menus, faixa superior e exposição de recursos demonstrativos, além da proposta de persistência estruturada/atômica.
- O salvamento existente continua sequencial, não transacional: IDs estáveis e releituras permitem retomar tentativas, mas não garantem atomicidade. O formulário já informa a possibilidade de salvamento parcial.
- O endereço continua usando a representação textual versionada em `establishments.address`, além das colunas existentes de bairro/cidade; isso NÃO significa persistência em colunas individuais para todos os componentes do endereço. Qualquer migração ou função de banco exige proposta e autorização prévias.
