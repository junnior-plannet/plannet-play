# Mapa da Rede — implementação e limites

## Escopo

- Menu único **Mapa da Rede**; `/regioes` redireciona para `/mapa`, preservando links antigos.
- Nenhuma tabela, relacionamento, dado de produção, autenticação ou formulário de cadastro foi alterado. Nenhum SQL ou migração foi executado.
- As consultas existentes `clientsQuery`, `establishmentsQuery` e `devicesQuery` são reutilizadas, com as permissões RLS da sessão. Não há dados de demonstração na página.
- Os indicadores mostram todos os registros acessíveis na visão geral. No município, usam o município do endereço; clientes sem estabelecimento usam sua cidade cadastrada. Inativas/bloqueadas entram no total de TVs, mas não nas ativadas/pendentes. Nenhum status de conexão é inferido.

## Dados geográficos

- Malhas oficiais do **IBGE**, API v3, estado **28 / Sergipe**, formato GeoJSON e qualidade mínima para reduzir o peso.
- Municípios: `https://servicodados.ibge.gov.br/api/v3/malhas/estados/28`, com `intrarregiao=municipio`.
- Contorno estadual: mesmo endpoint, sem subdivisão.
- Nomes/códigos: `https://servicodados.ibge.gov.br/api/v1/localidades/estados/28/municipios`.
- A malha só é aceita com os 75 municípios identificados e geometrias válidas; falhas exibem erro com nova tentativa, sem substituir por desenhos fictícios.
- Renderização vetorial SVG com projeção Mercator, seleção acessível por teclado, zoom animado com respeito à redução de movimento, arraste, roda do mouse e controles. Não é uma imagem estática. Aracaju tem destaque e atalho, sem restringir os outros municípios.
- O carregamento depende de acesso às APIs do IBGE no navegador. Cache em memória por um dia; nenhuma dependência npm foi adicionada.

## Localização dos pontos

A estrutura de estabelecimentos/dispositivos consultada não possui latitude/longitude. Por isso a página inicia com os locais na lista **sem posição confirmada**. Um local só pode gerar ponto se tiver TVs e houver uma consulta individual seguida de confirmação explícita do usuário.

Em **Detalhes do local → Consultar este endereço no OpenStreetMap**, logradouro, número, município e CEP disponível são enviados ao Nominatim público. Não são enviados nome do cliente, código das TVs ou credenciais. Não há consulta automática, lote, localização baseada somente em CEP ou uso do centro municipal como localização.

Resultados exigem número correspondente ao solicitado e coordenadas dentro do polígono do município, respeitando ilhas e buracos. Mesmo assim, a precisão depende do endereço e da base do serviço; o usuário deve conferir o endereço retornado antes de confirmar. Endereços legados sem número separado, incompletos, fora de Sergipe ou não encontrados continuam na lista. Consultas individuais têm bloqueio de concorrência e intervalo mínimo local de 1,2 segundo, com tempo limite de 15 segundos.

As coordenadas confirmadas permanecem **apenas no estado da página**. São descartadas ao sair/recarregar, e invalidadas se o endereço mudar. Não há persistência em Supabase nem localStorage. O ponto representa um estabelecimento com TVs, é colorido pela ativação (ou status mistos), tem tooltip e abre os detalhes. O painel desktop mantém o mapa; tablet/mobile usam painel inferior deslizante.

## Temas e aparência

A paleta azul-marinho/ciano do canvas é intencionalmente a mesma nos dois temas. Indicadores, listas e detalhes reutilizam os tokens existentes. O brilho não utiliza animações contínuas pesadas.

## Verificação e testes

Adicionado `src/test/network-map.test.ts`: menu único, normalização municipal, ausência de coordenadas inventadas, totais reais por vínculo, distinção de ativação, UF, Polygon/MultiPolygon/buracos, limites, contrato de carregamento dos 75 municípios e geocodificação com rejeição de resultados inadequados. As chamadas externas são simuladas apenas nos testes; nenhum endereço real é consultado por eles.

Foi feita revisão estática do código e das opções estritas do TypeScript. Este ambiente não disponibiliza execução de terminal/build/testes nem consulta ao HEAD remoto: **não foi possível executar a suíte, validar o preview no navegador ou confirmar se há commits remotos mais recentes em main**. Os arquivos inspecionados são os disponibilizados pela integração. Após a sincronização, validar `npm test`, `npm run build`, os dois temas, clique em Aracaju/Barra dos Coqueiros e navegação mobile. Conferir o carregamento real das APIs e um endereço individual autorizado.

## Pendências para localização durável

1. Escolher um provedor de geocodificação apropriado à produção, com cobertura, limites, política de privacidade e disponibilidade definidos. O Nominatim público é externo, sujeito a limites e não oferece garantia de cobertura/disponibilidade.
2. Para posições duráveis, apresentar e obter autorização para um modelo que guarde coordenadas, provedor, precisão, endereço consultado e confirmação/data; só depois implementar persistência. Nenhuma mudança no banco foi proposta como já autorizada ou executada.
3. Geocodificação em massa depende de aprovação separada e política do provedor. Não foi implementada nem executada.
4. Online/offline depende de telemetria real; a página mostra exclusivamente o status de ativação existente.

## Arquivos

- Alterados: `src/components/app/nav.ts`, `src/routes/_authenticated/mapa.tsx`, `src/routes/_authenticated/regioes.tsx`, `src/styles.css`.
- Criados: `src/lib/network-map.ts`, `src/components/app/NetworkGeography.tsx`, `src/components/app/NetworkPlaceDetails.tsx`, `src/test/network-map.test.ts`, `docs/mapa-da-rede.md`.
