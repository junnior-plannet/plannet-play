# Dashboard interativo — parte 2

## Escopo entregue no código

- A rota inicial continua usando as consultas compartilhadas de clientes, dispositivos e planos. Agora também reutiliza `establishmentsQuery`, necessária para relacionar cada TV ao município do seu local.
- Indicadores de clientes, TVs cadastradas, ativas e pendentes preservados; status refere-se à ativação, não à presença online.
- Cinco recortes sem dados demonstrativos: TVs por status (rosca), clientes por plano (rosca), orientação das TVs (rosca), TVs por cliente (barras) e TVs por município (barras).
- Barras e segmentos com brilho discreto, intensificação no hover, tooltips com valores e percentuais, animação de entrada/atualização e suporte a movimento reduzido.
- Roscas com total central e legendas selecionáveis por mouse, toque e teclado. A seleção destaca uma categoria sem excluir registros nem mudar o denominador dos percentuais.
- Rankings exibem as sete maiores categorias e agregam o restante em “Demais”, sem perder TVs no total. Cada gráfico oferece “Ver todos os dados” com tabela completa e percentuais, inclusive categorias com zero quando disponíveis.
- Canvas medido após a montagem, sem acesso a `window` durante SSR/render. Dimensões acompanham o contêiner via ResizeObserver (ou evento de resize como fallback).
- Paleta Dark Tech com ciano local ao Dashboard e demais cores semânticas existentes. Funciona nas classes de tema claro e escuro, que atualmente compartilham os tokens escuros do projeto. Não altera as cores do restante do site.

## Origem e integridade dos dados

Apenas consultas existentes do Supabase em `src/lib/api.ts`, protegidas pelas mesmas políticas RLS. Nenhum registro é criado, alterado ou excluído por este trabalho. Não há telemetria online/offline, posições geográficas nem eventos de notificação nesta parte.

- Status: `devices.activation_status` (ativa, pendente, inativa e bloqueada).
- Orientação: `devices.orientation`.
- Cliente da TV: relação `devices.establishment_id` → `establishments.client_id`, agrupada pelo ID do cliente para preservar homônimos.
- Município: `establishments.city`; remove espaços excedentes e ignora diferenças de caixa/acentos no agrupamento. Não infere município de outro campo.
- Planos: quantidade de clientes por `clients.plan_id`; sem plano e planos não disponíveis para consulta ficam identificados.
- Relações não disponíveis para consulta e municípios ausentes recebem categorias explícitas, não valores estimados. Os totais dos recortes de TVs mantêm todos os dispositivos retornados pela consulta autorizada.

## Atualização

O botão existente “Atualizar” refaz as quatro consultas em paralelo, sem reload, com trava durante carregamento e mensagem de erro se alguma fonte falhar. Indicadores e os cinco gráficos derivam das mesmas respostas em cache. A tela de erro e a tentativa novamente incluem agora estabelecimentos. Não há assinatura realtime nova nem requisições independentes por gráfico.

## Arquivos

- `src/routes/_authenticated/index.tsx`: integração dos indicadores, gráficos e atualização conjunta.
- `src/components/app/DashboardCharts.tsx`: gráficos Recharts, tooltips, legendas e tabelas.
- `src/lib/dashboard.ts`: agregações puras e formatação.
- `src/styles.css`: efeitos exclusivos dos gráficos do Dashboard.
- `src/test/dashboard.test.ts`: agregações, totais, ausência de registros e rankings.
- `src/test/dashboard-charts.test.tsx`: legendas, tabelas e estados vazios.
- `src/test/management-pages.test.tsx`: cenário adicional de atualização das quatro fontes e dos cinco gráficos.
- Este documento.

## Validação e pendências

Revisão estática dos campos/tipos das consultas, junções, proteção SSR, cores, escopo de atualização e consistência dos totais. Testes automatizados adicionados, mas **não executados neste ambiente**, que não disponibiliza terminal/runner. Build e navegação visual também não foram executados; precisam ser validados na prévia sincronizada do Lovable.

Comandos para a validação local: `npm test -- src/test/dashboard.test.ts src/test/dashboard-charts.test.tsx src/test/management-pages.test.tsx src/test/refresh-button.test.tsx` e `npm run build`.

Na prévia, conferir desktop/mobile, hover dos tooltips, seleção das legendas, resize, preferência de movimento reduzido, estado sem cadastros e atualização/erro de rede. Esses comportamentos não são declarados como verificados em navegador.

Nenhuma execução SQL, migração, política, cadastro, autenticação ou configuração de produção foi alterada. A Central de Notificações permanece exclusivamente para a parte 3. Não há alteração futura de banco necessária para os gráficos implementados nesta parte.
