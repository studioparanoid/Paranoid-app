-- Conservative compatibility backfill. Ambiguous values are queued for review.

insert into public.event_days (event_id, date, title, opens_at, closes_at, doors_open_at, status, sort_order)
select
  event.id,
  generated.day::date,
  case when event.is_multi_day then 'Dia ' || (generated.day::date - event.start_date + 1)::text else event.title end,
  case when generated.day::date = coalesce(event.start_date, event.starts_at::date) then event.starts_at else null end,
  case when generated.day::date = coalesce(event.end_date, event.ends_at::date, event.start_date) then event.ends_at else null end,
  case when generated.day::date = coalesce(event.start_date, event.starts_at::date) then event.doors_open_at else null end,
  case when event.publication_status = 'published' then 'scheduled' else 'draft' end,
  (generated.day::date - coalesce(event.start_date, event.starts_at::date))::integer
from public.events event
cross join lateral generate_series(
  coalesce(event.start_date, event.starts_at::date),
  least(
    coalesce(event.end_date, event.ends_at::date, event.start_date, event.starts_at::date),
    coalesce(event.start_date, event.starts_at::date) + 30
  ),
  interval '1 day'
) generated(day)
where coalesce(event.start_date, event.starts_at::date) is not null
on conflict (event_id, date) do nothing;

insert into public.event_program_items (
  event_id, event_day_id, title, program_type, scheduled_start_at, scheduled_end_at,
  status, source_type, last_confirmed_at, sort_order
)
select
  event.id,
  day.id,
  event.title,
  case event.event_type
    when 'concert' then 'concert'
    when 'dj_set' then 'dj_set'
    when 'workshop' then 'workshop'
    when 'cinema' then 'screening'
    when 'conference' then 'conference'
    when 'talk' then 'talk'
    when 'dance' then 'performance'
    when 'performance' then 'performance'
    else 'other'
  end,
  event.starts_at,
  event.ends_at,
  case when event.publication_status = 'published' then 'confirmed' else 'draft' end,
  'imported',
  event.updated_at,
  0
from public.events event
left join public.event_days day
  on day.event_id = event.id
  and day.date = (event.starts_at at time zone coalesce(event.timezone, 'Europe/Lisbon'))::date
where event.starts_at is not null
  and not exists (
    select 1 from public.event_program_items item
    where item.event_id = event.id and item.source_type = 'imported' and item.title = event.title
  );

insert into public.program_item_artists (program_item_id, artist_id, billing_order)
select item.id, relation.artist_id, 0
from public.event_artists relation
join lateral (
  select id
  from public.event_program_items
  where event_id = relation.event_id
  order by scheduled_start_at, sort_order, created_at
  limit 1
) item on true
on conflict (program_item_id, artist_id) do nothing;

insert into public.ticket_channels (
  event_id, provider, channel_type, name, external_url, internal_enabled,
  active, priority, allocated_capacity, sales_end_at
)
select
  event.id,
  case when event.ticket_mode = 'internal' then 'paranoid' else 'external' end,
  case when event.ticket_mode = 'internal' then 'internal' else 'external' end,
  case when event.ticket_mode = 'internal' then 'Bilheteira Paranoid' else coalesce(event.ticket_button_label, 'Bilheteira externa') end,
  case when event.ticket_mode = 'external' then event.ticket_url else null end,
  event.ticket_mode = 'internal',
  true,
  0,
  event.ticket_capacity,
  event.ends_at
from public.events event
where event.ticket_mode in ('internal', 'external')
  and not exists (select 1 from public.ticket_channels channel where channel.event_id = event.id);

insert into public.ticket_products (
  event_id, ticket_channel_id, name, product_type, price_amount, currency,
  capacity, max_quantity, sales_end_at, active
)
select
  event.id,
  channel.id,
  coalesce(event.ticket_button_label, 'Bilhete geral'),
  'general',
  replace(regexp_replace(event.ticket_price, '[^0-9,.]', '', 'g'), ',', '.')::numeric,
  'EUR',
  event.ticket_capacity,
  10,
  event.ends_at,
  true
from public.events event
join public.ticket_channels channel on channel.event_id = event.id
where event.ticket_price ~ '^\s*[0-9]+([,.][0-9]{1,2})?\s*(€|EUR)?\s*$'
  and not exists (select 1 from public.ticket_products product where product.event_id = event.id);

insert into public.data_migration_review_items (
  migration_key, entity_type, entity_id, field_name, legacy_value, reason
)
select
  'structured-model-v1', 'event_submission', submission.id, 'artists_text', submission.artists_text,
  'A submissão contém artistas em texto. Associar a artistas existentes ou criar entidades provisórias após revisão.'
from public.event_submissions submission
where nullif(trim(submission.artists_text), '') is not null
on conflict (migration_key, entity_type, entity_id, field_name) do nothing;

insert into public.data_migration_review_items (
  migration_key, entity_type, entity_id, field_name, legacy_value, reason
)
select
  'structured-model-v1', 'event', event.id, 'ticket_price', event.ticket_price,
  'O preço textual não pode ser convertido com segurança para ticket_products.price_amount.'
from public.events event
where nullif(trim(event.ticket_price), '') is not null
  and event.ticket_price !~ '^\s*[0-9]+([,.][0-9]{1,2})?\s*(€|EUR)?\s*$'
on conflict (migration_key, entity_type, entity_id, field_name) do nothing;

insert into public.data_migration_review_items (
  migration_key, entity_type, entity_id, field_name, legacy_value, reason
)
select
  'structured-model-v1', 'event', event.id, 'event_days',
  event.start_date::text || ' → ' || event.end_date::text,
  'O intervalo tem mais de 31 dias. Foram criados apenas os primeiros 31 dias para evitar um backfill excessivo.'
from public.events event
where event.start_date is not null and event.end_date > event.start_date + 30
on conflict (migration_key, entity_type, entity_id, field_name) do nothing;

comment on column public.events.city is 'LEGACY compatibility snapshot; prefer primary venue or event-specific location.';
comment on column public.events.venue_name is 'LEGACY compatibility snapshot; prefer primary_venue_id.';
comment on column public.events.organizer_name is 'LEGACY compatibility snapshot; prefer organizer_id.';
comment on column public.events.display_date is 'LEGACY presentation field; prefer event_days and starts_at.';
comment on column public.events.display_time is 'LEGACY presentation field; prefer event_program_items.';
comment on column public.events.price is 'LEGACY presentation field; prefer ticket_products.price_amount.';
comment on column public.events.ticket_url is 'LEGACY single-channel field; prefer ticket_channels.';
comment on column public.events.ticket_price is 'LEGACY textual price; prefer ticket_products.price_amount.';
comment on column public.events.ticket_capacity is 'LEGACY single-product capacity; prefer ticket_products.capacity.';
comment on column public.event_submissions.artists_text is 'Submission-only free text. Never use as canonical lineup data.';

do $$
begin
  if exists (
    select 1 from public.live_status_updates where expires_at <= starts_at
  ) then
    raise exception 'Invalid live status expiry detected';
  end if;

  if exists (
    select 1 from public.event_program_items
    where scheduled_end_at is not null and scheduled_end_at <= scheduled_start_at
  ) then
    raise exception 'Invalid program schedule detected';
  end if;
end
$$;
