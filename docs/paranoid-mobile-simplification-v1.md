# Paranoid Mobile Simplification V1

## Objetivo

Reduzir a experiência mobile a cinco ideias: descobrir na Home, encontrar no Mapa, perguntar no Hub, entrar com Bilhetes e gerir no Perfil. A alteração é uma camada reversível sobre a arquitetura existente; não cria outro Hub, outro motor de descoberta ou novas rotas.

O desktop mantém o header e a experiência do Discovery Engine anteriores. Dark mode continua a ser a expressão principal, com os mesmos tokens funcionais em light mode.

## Feature flag e reversão

Ativar:

```env
NEXT_PUBLIC_MOBILE_SIMPLIFICATION_ENABLED=true
```

Desativar e fazer novo deploy/build para recuperar a experiência anterior:

```env
NEXT_PUBLIC_MOBILE_SIMPLIFICATION_ENABLED=false
```

Com a flag desativada, o shell volta a montar `MobileBottomNav`, o header mobile completo e a Home anterior. `NEXT_PUBLIC_DISCOVERY_FEED_ENABLED` continua suportada; a simplificação mobile também ativa o feed de descoberta porque a nova Home depende do motor já existente.

## Navegação final

| Destino | Rota | Função |
| --- | --- | --- |
| Home | `/` | Descobrir |
| Mapa | `/mapa` | Encontrar |
| P | overlay, sem mudança de rota | Perguntar |
| Bilhetes | `/bilhetes` | Entrar |
| Perfil | `/perfil` | Gerir |

Agenda e Loja saem apenas dos cinco lugares fixos. `/agenda` e `/loja` permanecem acessíveis através do feed, entidades, Hub, Perfil e ligações existentes.

## Home e Feed

No mobile, a Home não monta um hero, grelha de atalhos ou introdução. A ordem é:

1. trigger compacto do Hub;
2. contexto e sinais atuais devolvidos pelo Discovery Engine;
3. feed vertical de entidades publicadas.

`DiscoveryFeed` mantém o modo compacto para desktop e `/para-ti`, e acrescenta o modo `immersive` para a Home mobile. Ambos usam o mesmo `/api/discovery`, ranking, interações e dados Supabase. Não são introduzidos dados de demonstração.

Os componentes `FeedItem`, `FeedEventItem`, `FeedVenueItem`, `FeedArtistItem` e `FeedSignalItem` partilham a mesma base editorial. O feed atual produz eventos, espaços, promoções, produtos e comunidades. `FeedArtistItem` está pronto para uma futura origem de candidatos de artistas, mas não fabrica artistas enquanto o motor não os devolver.

Imagens reais são carregadas de forma lazy. Não existe atualmente um campo de vídeo confirmado no contrato do Discovery Engine; o feed não inventa vídeos e essa origem fica como trabalho futuro.

## Hub

`SmartHub` continua a ser o único cliente de conversa. A memória foi extraída para `lib/hub/client-history.ts`, mantendo a chave de `sessionStorage` existente e o limite de 32 trocas.

O trigger da Home e o P da navegação abrem `HubOverlayProvider`, que monta o mesmo `SmartHub`. Uma pergunta escreve na mesma sessão e emite um evento interno; a Home recebe o histórico e volta a pedir o feed com intenção e contexto atualizados.

O overlay:

- preserva a posição de scroll da página;
- não muda a rota;
- fecha por backdrop, botão, Escape ou gesto descendente na pega mobile;
- não foca automaticamente o campo ao abrir em dispositivos touch;
- esconde a navegação quando o teclado reduz o viewport.

## Paranoid Icon System

Os símbolos são SVG inline originais, usam `currentColor`, partilham viewbox, proporção, espessura e geometria angular. Não dependem de Lucide, Heroicons, Material Icons ou emojis.

| Símbolo | Construção | Estado ativo |
| --- | --- | --- |
| Home | portal/arco monumental | lintel e base reforçados |
| Mapa | território aberto com eixo de descoberta | núcleo preenchido |
| P | coluna editorial, bojo incisado e serifas próprias | incisão diagonal adicional |
| Bilhetes | ingresso estreito com cortes laterais | acesso central preenchido |
| Perfil | busto geométrico dentro de contorno interrompido | massa central preenchida |

O estado ativo também recebe um pequeno sinal inferior, por isso não depende apenas de cor. Estados pressionado e foco têm deslocação/escala de 150 ms e foco visível. A área de toque é sempre pelo menos 44 por 44 px. Badges estão suportados pelo item de navegação.

Fotografias de perfil usam um recorte poligonal coerente com o símbolo em vez de um círculo genérico.

## Desenho do P

Foram comparadas três variações internas a 24 px:

| Variação | Ideia | Leitura a 24 px | Decisão |
| --- | --- | --- | --- |
| A. Coluna incisada | haste monumental, serifas assimétricas, bojo aberto e contraforma ampla | forte; mantém P e textura editorial | escolhida |
| B. Bojo dividido | dois cortes horizontais e contraforma mais estreita | os cortes aproximam-se e geram ruído | documentada, rejeitada |
| C. Arco aberto | haste curta com arco exterior quase contínuo | simples, mas aproxima-se demasiado de um portal | documentada, rejeitada |

A variação A é um desenho SVG próprio em `ParanoidMark`; não é um caractere de sistema nem uma cópia direta de Cinzel. A referência romana/editorial aparece na distribuição de massa, serifas e contraste, mantendo leitura entre 22 e 28 px. Possui versões branca/preta através de `currentColor`.

## Tipografia e cor

O P concentra a expressão monumental. A interface continua com a família sans legível já usada no projeto. Os papéis tipográficos são:

- marca: SVG `ParanoidMark` e logótipo PARANOID STUDIO na splash;
- interface: sans, peso forte e dimensões compactas;
- conteúdo: sans com entrelinha confortável;
- metadata: sans pequena, sem letter-spacing negativo.

A paleta reutiliza preto profundo, carvão, branco sujo, cinzentos e o vermelho Paranoid existente. Light mode reutiliza os tokens claros sem mudar a linguagem dos símbolos.

## Splash

A splash usa `/brand/paranoid-studio-logo-header.png` sobre preto absoluto. Um script no `head` verifica `sessionStorage` antes da pintura da página:

- duração normal aproximada: 1,2 s;
- redução de movimento: aproximadamente 0,6 s, sem zoom ou deslocação;
- uma apresentação por sessão;
- não volta a aparecer em mudanças de rota;
- não bloqueia o carregamento de dados do feed.

## Header e Perfil

Na Home mobile o header tradicional desaparece. Nas restantes rotas existe uma barra curta com título e botão de voltar quando a página não é um dos destinos principais. Pesquisa e avatar deixam de ser duplicados no topo mobile. O desktop mantém logo, navegação, pesquisa e menu de perfil.

O Perfil mantém conta, edição, cidade, gostos, guardados, rede, bilhetes, compras, aparência, MFA, áreas profissionais e logout já existentes. A fotografia assume a geometria do sistema e `Editar perfil` fica acessível no mobile.

## Acessibilidade

- todos os destinos têm `aria-label` e `aria-current`;
- o P expõe `aria-expanded` e `aria-controls`;
- o overlay é um diálogo modal, fecha com Escape e devolve foco ao fluxo da página;
- SVG decorativo usa `aria-hidden`;
- foco visível e contraste usam tokens dos dois temas;
- estados ativos incluem forma e sinal, não apenas cor;
- animações respeitam `prefers-reduced-motion`;
- a navegação considera `safe-area-inset-bottom` e desaparece com teclado virtual.

## Preparação futura

O contrato visual de `FeedItem` não está preso a eventos. Pode receber artista, espaço, comunidade, amigo, grupo, festival ou sinal ao vivo, com media, contexto e ações reais. Amigos, presença, planos partilhados, modo festival, serviços de festival, localização autorizada e Paranoid Node não são implementados nesta fase.

## Compatibilidade

Não foram alterados slugs, autenticação, RLS, pagamentos, bilhetes ou dados. Permanecem válidas as rotas `/`, `/agenda`, `/para-ti`, `/mapa`, `/eventos/[slug]`, `/artistas/[slug]`, `/espacos/[slug]`, `/organizadores/[slug]`, `/bilhetes`, `/loja`, `/perfil`, `/guardados`, `/admin` e `/organizador`.

## Limitações e próximos passos

- o motor ainda não devolve candidatos `artist` nem vídeo, apesar de os componentes estarem preparados para evolução;
- o gesto para fechar o Hub começa na pega, evitando conflito com scroll da conversa;
- badges estão suportados, mas ainda não existe origem de notificações;
- atividade de amigos, grupos, festivais e sinais ao vivo dependem de contratos de dados futuros;
- a futura PWA pode reutilizar `ParanoidMark` para gerar favicon e ícones raster próprios.
