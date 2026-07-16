# Paranoid Discovery Engine V1

## Ativação

Configurar a variável abaixo no ambiente da Vercel e voltar a fazer deploy:

```env
NEXT_PUBLIC_DISCOVERY_FEED_ENABLED=true
```

Com o valor `true`, a homepage junta a conversa do Hub ao Feed adaptativo e `/para-ti` reutiliza o mesmo motor. Com a variável ausente ou com qualquer outro valor, a homepage e `/para-ti` mantêm as experiências anteriores.

## Dados e segurança

- O endpoint `POST /api/discovery` usa o cliente Supabase server-side associado à sessão atual e respeita RLS.
- Não é usada Service Role no Discovery Engine.
- Eventos, espaços, promoções, comunidades e produtos só aparecem quando existem como registos publicados ou ativos.
- Imagens são mostradas apenas quando existe um URL guardado no respetivo registo.
- A localização vem exclusivamente da localização manual já guardada pelo Mapa.
- A migração `20260716140000_discovery_interactions.sql` guarda aberturas e ocultações por utilizador, com políticas RLS de acesso ao próprio registo.
- Sem a migração aplicada, o Feed continua funcional e apenas ignora a persistência dessas interações.

## Componentes principais

- `src/lib/discovery/ranking.ts`: classificação de intenção e ranking puro.
- `src/lib/discovery/server.ts`: consultas server-only e composição dos candidatos reais.
- `src/app/api/discovery/route.ts`: contrato HTTP do Feed.
- `src/components/discovery/DiscoveryFeed.tsx`: apresentação, atualização e ações do Feed.
- `src/components/home/SmartHub.tsx`: conversa e contexto de sessão partilhados com o Feed.
