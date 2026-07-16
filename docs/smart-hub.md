# Centro inteligente Paranoid

## Arquitetura atual

O cliente em `SmartHub.tsx` envia apenas o pedido escrito para `POST /api/hub`. A rota valida o pedido, lê a sessão Supabase no servidor e consulta apenas dados publicados necessários para a intenção detetada.

`src/lib/hub/router.ts` contém o interpretador determinístico inicial. O resultado segue o contrato de `src/lib/hub/types.ts`, com título, descrição, resultados de eventos e ações. A interface depende apenas deste contrato.

O histórico recente é guardado em `sessionStorage`, limitado a três respostas. Não são guardadas coordenadas, códigos, tokens ou credenciais.

## Ligar uma IA real

A integração futura deve permanecer em `src/app/api/hub/route.ts`. O interpretador pode ser substituído por um modelo com tool calling, mantendo o mesmo `HubResponse` para não refazer a interface.

As ferramentas do servidor poderão incluir:

- pesquisa de eventos publicados;
- lineup e horários estruturados;
- mapa e cálculo de distância;
- bilhetes do utilizador autenticado;
- restaurantes, transportes e informação de festival obtidos de fontes verificadas;
- preferências, guardados e artistas seguidos com autorização do utilizador.

As chaves da futura API devem existir apenas em variáveis de ambiente do servidor. O browser nunca deve receber a chave nem chamar diretamente o fornecedor de IA.
