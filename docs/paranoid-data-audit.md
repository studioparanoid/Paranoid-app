# Paranoid data audit

Data da auditoria: 2026-07-16

## Âmbito e fontes

Esta auditoria cruza quatro fontes: o catálogo OpenAPI exposto pela Data API do Supabase, as migrations versionadas em `supabase/migrations`, as 230 unidades de código em `src` e contagens agregadas da base atual. Não foram lidos conteúdos pessoais nem valores de credenciais.

Há uma limitação estrutural importante: as tabelas nucleares (`events`, `event_submissions`, `profiles`, `artists`, `venues`, `organizers` e relações associadas) são anteriores à primeira migration presente no repositório. Por isso, chaves e relações visíveis na Data API são confirmadas abaixo, mas políticas, índices, constraints e triggers criados antes de 2026-07-09 não são auditáveis pelo histórico local. A migration desta revisão não remove nem substitui políticas antigas; acrescenta políticas explícitas para as novas tabelas e inclui queries de verificação para produção.

## Estado dos dados

- 6 eventos, todos publicados.
- Os 6 eventos têm `venue_id` e `organizer_id`; nenhum depende exclusivamente do nome em texto.
- Os 6 eventos dependem de um único `display_time`.
- 28 submissões, nenhuma pendente e 12 com `artists_text`.
- 1 relação em `event_artists`.
- 1 membro em `organizer_members`.
- 0 reservas em `ticket_reservations`.
- Não existem atualmente bilhetes externos nem preços de bilhete estruturáveis nos eventos publicados.

## Esquema atual observado

`PK` identifica chave primária; `FK` identifica relação confirmada pelo catálogo. Colunas não assinaladas são nullable ou têm default no esquema atual.

### Rede e autenticação

- `profiles`: `id uuid PK`, `display_name`, `username`, `avatar_url`, `city`, `role`, `preferred_cities text[]`, `preferred_categories text[]`, `account_type`, `artist_name`, `organizer_name`, `venue_name`, `instagram_url`, `account_status`, `entity_id`, `entity_slug`, `approved_at`, `approved_by`, `email`, `created_at`, `updated_at`.
- `profile_claims`: `id uuid PK`, `user_id`, `account_type`, `display_name`, `entity_name`, `city`, `instagram_url`, `status`, `entity_id`, `entity_slug`, `review_note`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`.
- `app_admins`: `user_id uuid PK`, `created_at`.
- `organizers`: `id uuid PK`, `slug`, `name`, `city`, `description`, `pack`, `verified`, `instagram`, `image_url`, `organizer_type`, `organizer_type_other`, `created_at`.
- `organizer_members`: `id uuid PK`, `organizer_id uuid FK organizers.id`, `user_id`, `role`, `created_at`.
- `artists`: `id uuid PK`, `slug`, `name`, `city`, `genres text[]`, `description`, `instagram`, `bandcamp`, `image_url`, `artist_category`, `artist_category_other`, `music_genres text[]`, `created_at`.
- `venues`: `id uuid PK`, `slug`, `name`, `city`, `address`, `description`, `instagram`, `latitude`, `longitude`, `district`, `location_source`, `postal_code`, `municipality`, `image_url`, `created_at`.
- `follows`: `id uuid PK`, `user_id`, `target_type`, `target_id text`, `created_at`.

Não existe tabela `communities`. O tipo `community` existe apenas em `profiles.account_type`; não há entidade, página pública, membros ou ownership próprios.

### Eventos e bilheteira

- `events`: `id uuid PK`, `slug`, `title`, `city`, `venue_id uuid FK venues.id`, `organizer_id uuid FK organizers.id`, `start_at`, `end_at`, `start_date`, `end_date`, `display_date`, `display_time`, `category`, `price`, `description`, `image_url`, `featured`, `status`, `venue_name`, `organizer_name`, `is_multi_day`, `ticket_url`, `instagram_url`, `ticket_mode`, `ticket_price`, `ticket_capacity`, `ticket_button_label`, `latitude`, `longitude`, `district`, `location_source`, `address`, `postal_code`, `municipality`, `is_featured`, `featured_until`, `featured_payment_id`, `created_at`.
- `event_submissions`: `id uuid PK`, `title`, `city`, `venue`, `organizer`, `category`, `event_date`, `event_time`, `price`, `description`, `image_url`, `status`, `submitted_by text`, `organizer_id uuid FK organizers.id`, `artists_text`, `end_date`, `is_multi_day`, `ticket_url`, `instagram_url`, `ticket_mode`, `ticket_price`, `ticket_capacity`, `ticket_button_label`, campos de morada e coordenadas, `created_at`.
- `event_artists`: `event_id uuid PK/FK events.id`, `artist_id uuid PK/FK artists.id`.
- `ticket_reservations`: `id uuid PK`, `event_id uuid FK events.id`, `user_id`, `user_email`, `quantity`, `status`, `check_in_code`, `created_at`, `updated_at`.
- `saved_events`: `id uuid PK`, `user_id`, `event_id uuid FK events.id`, `created_at`.

### Comércio, billing e patrocínio

- `billing_products`: `id PK`, `code`, `name`, `description`, `type`, `price_cents`, `vat_rate`, `active`, timestamps.
- `billing_payments`: `id PK`, `user_id`, `product_code`, `related_type`, `related_id`, valores em cêntimos, provider, status, `metadata jsonb`, timestamps.
- `billing_entitlements`: `id PK`, `user_id`, relação genérica, tipo, validade, status, `payment_id`, timestamps.
- `billing_subscriptions`: `id PK`, `user_id`, `organizer_id`, plano, status, período, provider, timestamps.
- `organizer_visibility_passes`: `id PK`, `organizer_id`, `user_id`, produto, pagamento, validade, flags editoriais, prioridades, status, timestamps.
- `event_highlight_credit_packs`: `id PK`, organizer/user/payment, créditos, status, validade, timestamps.
- `event_highlight_credit_uses`: `id PK`, pack/event/organizer/user, utilização e validade.
- `sponsorship_campaigns`: `id PK`, user/sponsor/product/payment, validade, limites, status, timestamps.
- `sponsorship_placements`: `id PK`, campaign, placement, validade, status, timestamps.
- `shop_sellers`: perfil, dados fiscais e payout estão hoje na mesma tabela.
- `shop_products`, `shop_product_images`, `shop_product_variants`: catálogo e stock.
- `shop_orders`, `shop_order_items`, `shop_shipments`, `shop_payouts`, `shop_order_emails`, `shop_settings`: checkout, fulfillment, repartição financeira e configuração.
- `portugal_city_centers`: centroide por cidade para filtros geográficos.

## Chaves, índices e constraints conhecidos

O catálogo confirma as PK/FK indicadas acima. As migrations versionadas acrescentam:

- Índices de `events` para `status + start_at`, destaque, organizer, venue e localização.
- Índices de catálogo, estado, seller e encomendas da loja.
- Índices de pagamentos, entitlements, passes, destaques e patrocínios.
- Unicidade parcial de um passe ativo por organizador e de usos/pagamentos associados.
- Checks de estados e intervalos de validade em billing, passes e campanhas.

Riscos encontrados:

- Não há migration versionada que prove a unicidade de todos os slugs nucleares.
- Não há FK observável entre vários `user_id` públicos e `auth.users` no catálogo.
- `follows.target_id` é texto e não pode ter FK polimórfica.
- `event_highlight_credit_uses.event_id` e vários `organizer_id` comerciais não têm FK declarada nas migrations locais.
- A aplicação procura entidades apenas por slug ao criar/associar, o que pode confundir homónimos.

## Triggers e funções

Versionados:

- `sync_extended_profile_signup` em `profiles`, executa `sync_extended_profile_from_signup()` após insert ou alteração de `entity_id`.
- `update_my_extended_profile(...)`, `SECURITY DEFINER`, atualiza perfil e entidade ligada.
- Funções auxiliares de timestamps não estão uniformizadas no histórico local.

O trigger atual transporta metadata de signup para artistas, organizadores e espaços. O registo pede demasiados dados de entidade e mistura onboarding pessoal com criação/reivindicação de uma entidade cultural.

## RLS conhecida

As migrations versionadas confirmam RLS em todas as tabelas de loja, billing, passes, destaques e patrocínios. Os padrões existentes são:

- leitura pública apenas de produtos/campanhas/placements ativos;
- leitura do próprio utilizador para pagamentos, entitlements e subscrições;
- leitura do organizador por membership;
- gestão financeira por `service_role`;
- gestão da loja por seller e admins.

As políticas nucleares anteriores ao histórico local não podem ser enumeradas pelo repositório. O frontend escreve diretamente em `events`, `event_submissions`, `artists`, `venues`, `organizers`, `event_artists`, `organizer_members`, `saved_events`, `follows` e `ticket_reservations`; portanto existem políticas de escrita em produção ou permissões excessivas que precisam de ser verificadas. A nova arquitetura centraliza operações sensíveis no servidor e não depende apenas dessas regras antigas.

## Storage

- `event-images`: público, limite 5 MB, tipos MIME não restringidos no bucket atual. Usado pelos quatro formulários de evento/submissão.
- `profile-images`: público, limite 5 MB, JPEG/PNG/WebP. As políticas versionadas permitem leitura pública e escrita apenas na pasta do próprio `auth.uid()`.

## Consumidores por tabela

- `events`: Agenda, mapa, homepage/Hub, evento público, guardados, Para Ti, bilhetes, scanner, dashboards admin/organizador, editores, localizações, pesquisa global, billing e destaques.
- `event_submissions`: formulário público, editores admin/organizador, aprovação, dashboards e operações admin em lote.
- `event_artists`: criação/edição/aprovação, evento/artista público e recomendações.
- `artists`: Descobrir, pesquisa, perfil, páginas públicas, admin de rede e todos os editores de evento.
- `venues`: mapa, pesquisa, perfil/página pública, admin de localizações/rede e editores de evento.
- `organizers`: pesquisa, perfil/página pública, dashboards, billing, admin de rede e editores de evento.
- `organizer_members`: guards de organizador, edição, bilhetes, submissões, dashboard e billing.
- `profiles`: autenticação, perfil, Para Ti, submissão e contexto do Hub.
- `saved_events`: evento público, Guardados e botões de guardar.
- `follows`: Descobrir, Para Ti e páginas públicas de entidades.
- `ticket_reservations`: compra interna legada, carteira, scanner e administração.
- Tabelas `shop_*`: Loja, checkout, painel de seller e administração.
- Tabelas `billing_*`, passes, destaques e sponsorships: APIs e painéis comerciais.

## Texto livre e duplicação

- `events.venue_name` duplica `venues.name`, mas é necessário como snapshot/fallback durante a transição.
- `events.organizer_name` duplica `organizers.name`, com a mesma necessidade temporária.
- `events.city`, morada e coordenadas duplicam o espaço quando o evento ocorre num venue permanente, mas continuam válidos para local temporário ou override do evento.
- `events.category` e `artists.genres/music_genres` não são normalizados.
- `display_date`, `display_time`, `price`, `ticket_price` são strings de apresentação, não fontes operacionais.
- `event_submissions.artists_text`, `venue` e `organizer` são adequados para submissão rápida, mas não para publicação final.
- A loja usa JSONB apenas para snapshot de morada de envio, um uso aceitável; billing usa JSONB para payload de integração, também aceitável.

## Criação automática de entidades

`AdminEventCreateClient`, `AdminEventEditClient`, `OrganizerEventEditClient` e `AdminSubmissionActions` implementam versões duplicadas de `findOrCreateArtist`, `findOrCreateVenue` e/ou `findOrCreateOrganizer`.

Comportamento atual:

- procura exclusivamente por slug;
- cria organizer com `verified=false`;
- cria venue sem estado de verificação;
- cria artist sem estado `provisional/unclaimed`;
- no fluxo de aprovação, pode atualizar dados de um venue existente encontrado pelo slug;
- separa `artists_text` apenas por vírgulas;
- a aprovação não é transacional: um evento pode ser criado e a submissão continuar pendente se uma etapa posterior falhar.

## Suposições legadas no código

- `artists_text`: 12 submissões; parse e criação automática em admin, editores e aprovação.
- Horário único: `event_time`/`display_time` é usado em Agenda, evento, páginas de entidade, bilhetes, Hub e todos os formulários.
- Preço textual: filtros extraem o primeiro número de `price`/`ticket_price`; “gratuito” é detetado por texto.
- Bilheteira única: `ticket_mode`, `ticket_url`, `ticket_price`, `ticket_capacity` e `ticket_reservations` assumem um produto/canal por evento.
- Espaço único: `venue_id` + snapshot textual; não há palco, sala ou zona do recinto.
- Horários sobrepostos, mudanças de palco e estados live não podem ser representados no esquema atual.

## Estado atual → Estado pretendido

| Atual | Pretendido |
| --- | --- |
| Perfil mistura pessoa e entidade | `profiles` pessoal + `user_preferences` + entidades e memberships |
| Comunidade é apenas um account type | `communities` + `community_members` |
| Organizer depende parcialmente de `profiles.entity_id` | `organizer_members` com permissões granulares |
| Géneros em arrays/string | `genres` + `artist_genres` |
| Evento guarda apresentação e operação na mesma linha | núcleo em `events`; dias, programa, zonas e live em tabelas próprias |
| Um horário | `event_days` + `event_program_items` |
| Um espaço | `primary_venue_id` + `event_zones` hierárquicas |
| Lineup geral | `program_item_artists` por atuação |
| Uma bilheteira/preço | `ticket_channels` + `ticket_products` |
| Sem ementas | vendors, categorias, itens e alergénios relacionais |
| Sem happy hour válido | `promotions` com `starts_at`/`ends_at` |
| Sem serviços/transporte | serviços, rotas e partidas estruturadas |
| Estado temporário impossível | `live_status_updates` obrigatório com `expires_at` |
| Hub consulta 100 eventos e interpreta strings | ferramentas server-side tipadas e consultas pequenas |

## Plano de migração

1. Adicionar colunas compatíveis e tabelas novas sem remover colunas existentes.
2. Criar helpers de autorização para admin e membros de organizer.
3. Ativar RLS em todas as tabelas novas e aplicar policies explícitas.
4. Fazer backfill apenas quando não ambíguo: dias de evento, item principal, canal externo e produto numérico.
5. Registar ambiguidades em `data_migration_review_items`; nunca adivinhar relações.
6. Atualizar leituras para preferirem dados estruturados e manter fallback legado.
7. Atualizar escritas sensíveis para camada server-side/transações.
8. Só depois de validação em produção marcar campos antigos como deprecated. Nenhuma coluna é removida nesta revisão.

## Riscos de migração

- Policies antigas desconhecidas podem sobrepor-se permissivamente; devem ser exportadas do dashboard antes do deploy.
- Adicionar `NOT NULL` a dados históricos é evitado; novos campos têm defaults seguros ou começam nullable.
- Backfill de `display_time` não conhece timezone nem duração real; itens gerados ficam com `source='legacy'` e precisam de confirmação.
- Os 12 `artists_text` pertencem a submissões, não a `events`; não serão convertidos automaticamente em artistas definitivos.
- Preços textuais ambíguos não serão convertidos.
- O modelo interno atual de reservas permanece funcional e coexistirá com produtos de bilhete.
- Slugs não mudam e todas as páginas atuais mantêm fallback para campos legados.

## Ficheiros afetados previstos

- `supabase/migrations/*`: modelo, RLS, índices, helpers e backfill.
- `src/lib/data/*`: tipos, validação e respostas com proveniência.
- `src/lib/hub/*` e `src/app/api/hub/route.ts`: ferramentas e compatibilidade do Hub.
- `src/components/organizer/*` e rotas de organizador: programa progressivo/importação.
- `src/app/eventos/[slug]/page.tsx`: secções estruturadas condicionais.
- `docs/*`: auditoria, operação e relatório de revisão manual.

## Verificações de produção obrigatórias

Antes de aplicar migrations, exportar `pg_policies`, `pg_indexes`, `pg_constraint`, `pg_trigger` e a lista de extensões pelo SQL Editor/Management API. Comparar com este documento e guardar o resultado versionado. A aplicação não contém um PAT da Management API, por isso esta parte do catálogo não pode ser consultada automaticamente a partir do ambiente local atual.
