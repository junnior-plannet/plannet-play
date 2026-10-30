# Mapa da Rede — geografia, ativação e limites

## Entrega: parte 1 de 3

Esta etapa altera apenas o Mapa da Rede. Dashboard e Central de Notificações permanecem para as próximas partes. Não houve SQL, migração, trigger, mudança de RLS, criação/exclusão de registros, alteração de credenciais ou modificação dos cadastros.

Os arquivos atuais disponibilizados pela integração da branch main foram inspecionados. Não há ferramenta de terminal, consulta ao HEAD remoto ou navegador neste ambiente: não foi possível comparar o HEAD com o GitHub, executar build/testes ou verificar o preview. A entrega não equivale a uma validação visual em produção.

## Funcionalidades implementadas no código

- Visão estadual fixa e responsiva, sem roda, arraste, zoom manual ou controles de movimentação.
- Um único path geográfico define o contorno luminoso e sua camada de halo; não há linhas neon decorativas independentes da malha.
- Contornos municipais oficiais, recortados pelo contorno estadual na visão geral. Aracaju mantém destaque e atalho; todos os municípios carregados podem ser selecionados, inclusive pelo teclado ou seletor.
- A seleção substitui a visão estadual por um contorno municipal ampliado, com transição de enquadramento de 550 ms. A preferência de movimento reduzido é respeitada.
- Botão **Voltar para Sergipe** no mapa e no seletor.
- Contorno municipal com mais detalhe e vias principais carregados somente após seleção. Falhas não geram traçados fictícios e permitem nova tentativa.
- Pins circulares luminosos por `devices.activation_status`: ativa/verde, pendente/amarelo, inativa/cinza, bloqueada/vermelho. Status mistos têm anel multicolorido proporcional à quantidade de TVs em cada status.
- Hover/foco exibe cliente e quantidade de TVs; clique abre detalhes à direita. Desktop amplo usa painel ao lado, e telas menores usam painel lateral não modal, mantendo parte do mapa visível.
- Detalhes preservam endereço, bairro, município, nome/código/orientação/ativação individual de cada TV e incluem distribuição dos quatro status.
- Indicadores de clientes, locais, TVs, ativas, pendentes, inativas e bloqueadas (estas quando houver). Seleção municipal aplica o mesmo filtro aos indicadores, locais e TVs.
- Seção **Endereços não localizados**, sem posicionamento artificial de registros.
- O botão Atualizar e as consultas existentes de clientes/estabelecimentos/dispositivos foram preservados.

## Origem dos dados e acesso

As consultas `clientsQuery`, `establishmentsQuery` e `devicesQuery`, em `src/lib/api.ts`, consultam o Supabase usando a sessão atual e suas RLS existentes. Nenhuma consulta privilegiada foi adicionada. O mapa não usa dados de demonstração e não tenta inferir conexão online/offline.

Na visão geral, os indicadores incluem todos os registros acessíveis, mesmo fora de Sergipe. O filtro municipal considera o município e a UF do endereço, não a posição confirmada. Clientes sem estabelecimento podem ser contados pela cidade cadastrada; os demais precisam ter um local no município selecionado. Endereços não geocodificados continuam nos indicadores.

## Origem dos contornos

- IBGE / API v3, GeoJSON oficial, Sergipe / código 28.
- Estado: `https://servicodados.ibge.gov.br/api/v3/malhas/estados/28?formato=application%2Fvnd.geo%2Bjson&qualidade=minima`.
- Limites municipais estaduais: mesmo endpoint com `intrarregiao=municipio`.
- Nomes/códigos: API v1 de localidades, `/estados/28/municipios`.
- Detalhe sob demanda: API v3, `/malhas/municipios/{codigoIBGE}?formato=application%2Fvnd.geo%2Bjson&qualidade=intermediaria`.
- SVG 2D com projeção Mercator compartilhada para contornos, vias e pontos. A malha estadual exige 75 municípios e geometrias válidas. O detalhe municipal usa a malha geral como fallback em caso de falha.

## Origem e desempenho das vias

OpenStreetMap via Overpass: `https://overpass-api.de/api/interpreter`. Uma consulta por município selecionado usa a área administrativa com `admin_level=8` e `ref:IBGE` igual ao código selecionado. Busca apenas vias nomeadas `trunk`, `primary`, `secondary` e `tertiary`, retornando suas coordenadas reais (`out geom`). Não são geradas ruas por aproximação.

Dados inválidos, respostas parciais com aviso do servidor e vias sem pontos no município são rejeitados. As linhas são recortadas pelo contorno municipal no SVG. A diferença de bases IBGE/OSM pode excluir pequenos trechos na borda. Ausência de uma área municipal referenciada no OSM resulta em ausência de vias, não em geometria substituta. A cobertura e disponibilidade reais precisam ser verificadas no navegador.

As consultas usam cache em memória de um dia, sem polling ou carregamento de todas as cidades. Vias não têm retentativa automática. Não há novas dependências nem mapas 3D. A atribuição IBGE/OpenStreetMap fica no mapa.

## Estratégia para os pins

A estrutura usada pelas consultas atuais não fornece coordenadas persistidas verificadas. Por isso os locais começam em **Endereços não localizados**. Em **Detalhes do local → Consultar este endereço no OpenStreetMap**, uma ação individual consulta o Nominatim com logradouro, número, município e CEP disponível. Nome do cliente, códigos das TVs e credenciais não são enviados.

Somente resultados numerados, com número correspondente e posição dentro do município, podem ser confirmados pelo usuário. O ponto só aparece após confirmação. Não há geocodificação automática/em massa, posição por CEP ou deslocamento para o centro municipal. Consultas têm intervalo mínimo local de 1,2 segundo e limite de 15 segundos.

Confirmações ficam exclusivamente no estado da página, não em Supabase ou localStorage. São descartadas ao sair/recarregar e invalidadas por mudança no endereço, coordenadas inválidas ou posição fora da malha municipal/estadual. A precisão final depende da cobertura do Nominatim e da conferência humana; não representa levantamento geodésico.

## Identidade visual e responsividade

O canvas mantém azul-marinho/ciano em ambos os temas. Cards, listas e detalhes usam os tokens existentes. O brilho dos pins aumenta apenas em interação e não há animação contínua. O SVG reserva espaço para cabeçalho/legendas; o enquadramento não depende de gestos manuais. Revisão visual desktop/mobile ainda necessária.

## Testes adicionados e validação pendente

- `src/test/network-map.test.ts`: testes preexistentes preservados, incluindo vínculos, geometrias e geocodificação.
- `src/test/network-map-update.test.ts`: quatro status, filtro municipal, distribuição agrupada, confirmações inválidas/obsoletas, contrato dos serviços de ruas e contornos, falhas e rejeição de vias inadequadas.
- `src/test/network-geography.test.tsx`: clique municipal, retorno ao estado, ausência de controles manuais, halo e contorno usando o mesmo path, ausência de ruas fabricadas e interação com pin confirmado.

Os testes usam apenas fixtures sintéticas locais e mocks HTTP, sem chamar o Supabase ou geocodificar endereços reais. Foi feita revisão estática; não foi possível executar a suíte ou o build neste ambiente. Após sincronizar, executar `npm test` e `npm run build` e validar no preview Aracaju, outro município, APIs externas, quatro status, seleção por teclado, temas, desktop/mobile e confirmação individual de endereço autorizado.

## Pendências e banco futuro

Pins duráveis exigem autorização para persistir coordenadas, endereço de origem, provedor, precisão e confirmação/data, com políticas que respeitem o acesso aos clientes. Nada disso foi criado ou executado. Também é necessário definir um provedor de geocodificação adequado à produção e sua política de privacidade/limites; serviços públicos não garantem disponibilidade nem cobertura. O pedido não autoriza geocodificação em massa.

Não há origem de eventos de notificação nesta etapa: a Central será tratada na parte 3, sem simular eventos. Dashboard/gráficos serão tratados na parte 2.

## Arquivos desta etapa

- Alterados: `src/lib/network-map.ts`, `src/components/app/NetworkGeography.tsx`, `src/components/app/NetworkPlaceDetails.tsx`, `src/routes/_authenticated/mapa.tsx`, `src/styles.css`, `docs/mapa-da-rede.md`.
- Criados: `src/lib/network-roads.ts`, `src/test/network-map-update.test.ts`, `src/test/network-geography.test.tsx`.
