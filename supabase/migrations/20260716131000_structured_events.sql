-- Event core, multi-day program and multi-channel ticketing.

alter table public.events
  add column if not exists short_description text,
  add column if not exists event_type text,
  add column if not exists primary_venue_id uuid,
  add column if not exists cover_image_url text,
  add column if not exists visibility text not null default 'public',
  add column if not exists publication_status text not null default 'published',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists doors_open_at timestamptz,
  add column if not exists timezone text not null default 'Europe/Lisbon',
  add column if not exists is_recurring boolean not null default false,
  add column if not exists is_online boolean not null default false,
  add column if not exists online_url text,
  add column if not exists minimum_age integer,
  add column if not exists language text,
  add column if not exists capacity integer,
  add column if not exists free_entry boolean,
  add column if not exists cancellation_reason text,
  add column if not exists published_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_primary_venue_id_fkey') then
    alter table public.events
      add constraint events_primary_venue_id_fkey
      foreign key (primary_venue_id) references public.venues(id) on delete set null;
  end if;
end
$$;

update public.events
set
  primary_venue_id = coalesce(primary_venue_id, venue_id),
  starts_at = coalesce(starts_at, start_at),
  ends_at = coalesce(ends_at, end_at),
  cover_image_url = coalesce(cover_image_url, image_url),
  free_entry = coalesce(free_entry, lower(coalesce(price, ticket_price, '')) ~ '(gratuito|grátis|gratis|free)'),
  published_at = case when status = 'published' then coalesce(published_at, created_at) else published_at end,
  publication_status = case
    when status = 'published' then 'published'
    when status = 'archived' then 'archived'
    else coalesce(nullif(publication_status, ''), 'draft')
  end;

create or replace function public.sync_event_legacy_dates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.start_at = new.starts_at;
  elsif new.start_at is distinct from old.start_at then
    new.starts_at = new.start_at;
  end if;

  if new.ends_at is distinct from old.ends_at then
    new.end_at = new.ends_at;
  elsif new.end_at is distinct from old.end_at then
    new.ends_at = new.end_at;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_sync_legacy_dates on public.events;
create trigger events_sync_legacy_dates
before update on public.events
for each row execute function public.sync_event_legacy_dates();

create table if not exists public.event_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.event_types (slug, name, sort_order)
values
  ('concert', 'Concerto', 10), ('festival', 'Festival', 20), ('dj_set', 'DJ set', 30),
  ('theatre', 'Teatro', 40), ('cinema', 'Cinema', 50), ('exhibition', 'Exposição', 60),
  ('workshop', 'Workshop', 70), ('market', 'Mercado', 80), ('fair', 'Feira', 90),
  ('conference', 'Conferência', 100), ('talk', 'Conversa', 110), ('comedy', 'Comédia', 120),
  ('dance', 'Dança', 130), ('performance', 'Performance', 140),
  ('community', 'Comunidade', 150), ('sports_culture', 'Desporto e cultura', 160),
  ('other', 'Outro', 999)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

update public.events
set event_type = case lower(coalesce(category, ''))
  when 'concertos' then 'concert'
  when 'festivais' then 'festival'
  when 'teatro' then 'theatre'
  when 'cinema' then 'cinema'
  when 'exposições' then 'exhibition'
  when 'workshops' then 'workshop'
  else coalesce(event_type, 'other')
end
where event_type is null;

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.event_categories(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_category_links (
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.event_categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (event_id, category_id)
);

create unique index if not exists event_category_links_one_primary_idx
  on public.event_category_links(event_id) where is_primary;

create table if not exists public.event_days (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  date date not null,
  title text,
  opens_at timestamptz,
  closes_at timestamptz,
  doors_open_at timestamptz,
  description text,
  status text not null default 'scheduled',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, date),
  constraint event_days_status_check check (status in ('draft', 'scheduled', 'live', 'finished', 'cancelled')),
  constraint event_days_hours_check check (opens_at is null or closes_at is null or closes_at > opens_at)
);

create table if not exists public.event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  parent_zone_id uuid references public.event_zones(id) on delete set null,
  zone_type text not null default 'other',
  name text not null,
  slug text not null,
  description text,
  venue_id uuid references public.venues(id) on delete set null,
  map_label text,
  latitude double precision,
  longitude double precision,
  map_x numeric(8,4),
  map_y numeric(8,4),
  floor text,
  capacity integer,
  accessibility_notes text,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slug),
  constraint event_zones_type_check check (zone_type in (
    'stage', 'room', 'auditorium', 'bar', 'food_area', 'toilet', 'accessible_toilet',
    'medical', 'security', 'entrance', 'exit', 'camping', 'parking', 'merchandise',
    'information', 'meeting_point', 'quiet_area', 'charging', 'water', 'locker',
    'transport_stop', 'other'
  )),
  constraint event_zones_coordinates_check check (
    (latitude is null or latitude between -90 and 90) and
    (longitude is null or longitude between -180 and 180)
  )
);

create table if not exists public.event_program_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  event_day_id uuid references public.event_days(id) on delete set null,
  zone_id uuid references public.event_zones(id) on delete set null,
  title text not null,
  program_type text not null default 'other',
  description text,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  doors_open_at timestamptz,
  status text not null default 'scheduled',
  delay_minutes integer not null default 0,
  capacity integer,
  reservation_required boolean not null default false,
  reservation_url text,
  age_limit integer,
  language text,
  highlighted boolean not null default false,
  sort_order integer not null default 0,
  source_type text not null default 'organizer',
  source_id uuid,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  last_confirmed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_program_items_type_check check (program_type in (
    'concert', 'dj_set', 'performance', 'workshop', 'screening', 'talk', 'conference',
    'signing', 'meet_and_greet', 'opening', 'break', 'afterparty', 'transport', 'activity', 'other'
  )),
  constraint event_program_items_status_check check (status in (
    'draft', 'scheduled', 'confirmed', 'delayed', 'starting_soon', 'live',
    'finished', 'moved', 'cancelled'
  )),
  constraint event_program_items_schedule_check check (
    scheduled_end_at is null or scheduled_end_at > scheduled_start_at
  ),
  constraint event_program_items_actual_check check (
    actual_end_at is null or actual_start_at is null or actual_end_at > actual_start_at
  )
);

create table if not exists public.program_item_artists (
  program_item_id uuid not null references public.event_program_items(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text,
  billing_order integer not null default 0,
  is_headliner boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (program_item_id, artist_id)
);

create table if not exists public.ticket_channels (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  provider text not null,
  channel_type text not null default 'external',
  name text not null,
  external_url text,
  internal_enabled boolean not null default false,
  active boolean not null default true,
  priority integer not null default 0,
  allocated_capacity integer,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_channels_type_check check (channel_type in ('internal', 'external', 'door', 'guest_list')),
  constraint ticket_channels_sales_check check (sales_start_at is null or sales_end_at is null or sales_end_at > sales_start_at)
);

create table if not exists public.ticket_products (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_channel_id uuid references public.ticket_channels(id) on delete set null,
  event_day_id uuid references public.event_days(id) on delete set null,
  name text not null,
  description text,
  product_type text not null default 'general',
  price_amount numeric(12,2) not null default 0,
  currency char(3) not null default 'EUR',
  service_fee_amount numeric(12,2) not null default 0,
  capacity integer,
  sold_count integer not null default 0,
  min_quantity integer not null default 1,
  max_quantity integer not null default 10,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  refundable boolean not null default false,
  transferable boolean not null default false,
  nominal boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_products_type_check check (product_type in (
    'general', 'early_bird', 'phase', 'day_pass', 'festival_pass', 'vip',
    'reduced', 'free_registration', 'donation', 'accreditation', 'guest_list'
  )),
  constraint ticket_products_amounts_check check (price_amount >= 0 and service_fee_amount >= 0),
  constraint ticket_products_capacity_check check (capacity is null or (capacity >= 0 and sold_count between 0 and capacity)),
  constraint ticket_products_quantity_check check (min_quantity > 0 and max_quantity >= min_quantity),
  constraint ticket_products_sales_check check (sales_start_at is null or sales_end_at is null or sales_end_at > sales_start_at)
);

create table if not exists public.data_migration_review_items (
  id uuid primary key default gen_random_uuid(),
  migration_key text not null,
  entity_type text not null,
  entity_id uuid,
  field_name text,
  legacy_value text,
  reason text not null,
  status text not null default 'pending',
  resolution_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (migration_key, entity_type, entity_id, field_name),
  constraint data_migration_review_status_check check (status in ('pending', 'resolved', 'ignored'))
);

create index if not exists events_publication_starts_idx
  on public.events(publication_status, starts_at);
create index if not exists events_organizer_id_idx on public.events(organizer_id);
create index if not exists events_primary_venue_id_idx on public.events(primary_venue_id);
create index if not exists event_days_event_date_idx on public.event_days(event_id, date);
create index if not exists event_program_items_event_start_idx on public.event_program_items(event_id, scheduled_start_at);
create index if not exists event_program_items_zone_start_idx on public.event_program_items(zone_id, scheduled_start_at);
create index if not exists event_program_items_live_idx on public.event_program_items(event_id, status, scheduled_start_at);
create index if not exists program_item_artists_artist_idx on public.program_item_artists(artist_id);
create index if not exists ticket_channels_event_priority_idx on public.ticket_channels(event_id, active, priority);
create index if not exists ticket_products_event_active_idx on public.ticket_products(event_id, active);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'event_types', 'event_categories', 'event_days', 'event_zones', 'event_program_items',
    'ticket_channels', 'ticket_products', 'data_migration_review_items'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end
$$;
