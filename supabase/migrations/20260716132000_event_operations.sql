-- Hospitality, promotions, services, transport and expiring live state.

create table if not exists public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  zone_id uuid references public.event_zones(id) on delete set null,
  name text not null,
  vendor_type text not null default 'other',
  description text,
  logo_url text,
  opening_time time,
  closing_time time,
  kitchen_closing_time time,
  accepts_preorder boolean not null default false,
  accepts_cash boolean,
  accepts_card boolean,
  accepts_mbway boolean,
  status text not null default 'active',
  source_type text not null default 'organizer',
  source_id uuid,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  last_confirmed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_vendors_type_check check (vendor_type in (
    'bar', 'restaurant', 'food_truck', 'food_stall', 'coffee', 'merch', 'other'
  )),
  constraint event_vendors_status_check check (status in ('draft', 'active', 'closed', 'cancelled'))
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.event_vendors(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.event_vendors(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price_amount numeric(12,2) not null,
  currency char(3) not null default 'EUR',
  available boolean not null default true,
  sold_out boolean not null default false,
  vegetarian boolean not null default false,
  vegan boolean not null default false,
  gluten_free boolean not null default false,
  spicy boolean not null default false,
  alcoholic boolean not null default false,
  allergen_notes text,
  allergen_information_confirmed boolean not null default false,
  estimated_wait_minutes integer,
  source_type text not null default 'organizer',
  verified_at timestamptz,
  last_confirmed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_price_check check (price_amount >= 0),
  constraint menu_items_wait_check check (estimated_wait_minutes is null or estimated_wait_minutes >= 0)
);

create table if not exists public.allergens (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  eu_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_item_allergens (
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  allergen_id uuid not null references public.allergens(id) on delete cascade,
  presence text not null default 'contains',
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (menu_item_id, allergen_id),
  constraint menu_item_allergens_presence_check check (presence in ('contains', 'may_contain', 'cross_contamination_risk'))
);

insert into public.allergens (slug, name, eu_code)
values
  ('gluten', 'Cereais com glúten', '1'), ('crustaceans', 'Crustáceos', '2'),
  ('eggs', 'Ovos', '3'), ('fish', 'Peixe', '4'), ('peanuts', 'Amendoins', '5'),
  ('soy', 'Soja', '6'), ('milk', 'Leite', '7'), ('nuts', 'Frutos de casca rija', '8'),
  ('celery', 'Aipo', '9'), ('mustard', 'Mostarda', '10'), ('sesame', 'Sementes de sésamo', '11'),
  ('sulphites', 'Dióxido de enxofre e sulfitos', '12'), ('lupin', 'Tremoço', '13'),
  ('molluscs', 'Moluscos', '14')
on conflict (slug) do update set name = excluded.name, eu_code = excluded.eu_code;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references public.organizers(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  vendor_id uuid references public.event_vendors(id) on delete cascade,
  title text not null,
  description text,
  promotion_type text not null default 'other',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurring_rule text,
  terms text,
  active boolean not null default true,
  source_type text not null default 'organizer',
  source_id uuid,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_owner_check check (num_nonnulls(organizer_id, venue_id, event_id, vendor_id) >= 1),
  constraint promotions_type_check check (promotion_type in (
    'happy_hour', 'bundle', 'discount', 'free_item', 'early_offer', 'event_special', 'other'
  )),
  constraint promotions_dates_check check (ends_at > starts_at)
);

create table if not exists public.promotion_items (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  normal_price_amount numeric(12,2) not null,
  promotional_price_amount numeric(12,2) not null,
  quantity_limit integer,
  created_at timestamptz not null default now(),
  primary key (promotion_id, menu_item_id),
  constraint promotion_items_price_check check (
    normal_price_amount >= 0 and promotional_price_amount >= 0 and promotional_price_amount <= normal_price_amount
  ),
  constraint promotion_items_quantity_check check (quantity_limit is null or quantity_limit > 0)
);

create table if not exists public.event_services (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid references public.event_zones(id) on delete set null,
  service_type text not null,
  name text not null,
  description text,
  opens_at timestamptz,
  closes_at timestamptz,
  contact text,
  accessible boolean not null default false,
  status text not null default 'active',
  source_type text not null default 'organizer',
  source_id uuid,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  last_confirmed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_services_type_check check (service_type in (
    'toilet', 'accessible_toilet', 'medical', 'security', 'information', 'water',
    'charging', 'locker', 'cloakroom', 'lost_and_found', 'quiet_area',
    'accessibility_support', 'camping', 'shower', 'atm', 'meeting_point', 'other'
  )),
  constraint event_services_hours_check check (opens_at is null or closes_at is null or closes_at > opens_at)
);

create table if not exists public.event_transport_routes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  operator_name text,
  transport_type text not null,
  origin_name text not null,
  destination_name text not null,
  origin_latitude double precision,
  origin_longitude double precision,
  destination_latitude double precision,
  destination_longitude double precision,
  meeting_point_zone_id uuid references public.event_zones(id) on delete set null,
  accessible boolean not null default false,
  reservation_required boolean not null default false,
  reservation_url text,
  price_amount numeric(12,2),
  currency char(3) not null default 'EUR',
  notes text,
  active boolean not null default true,
  source_type text not null default 'organizer',
  source_id uuid,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_transport_routes_type_check check (transport_type in (
    'shuttle', 'bus', 'train', 'taxi', 'tvde', 'carpool', 'bicycle', 'walking', 'parking', 'other'
  )),
  constraint event_transport_routes_price_check check (price_amount is null or price_amount >= 0),
  constraint event_transport_routes_coordinates_check check (
    (origin_latitude is null or origin_latitude between -90 and 90) and
    (origin_longitude is null or origin_longitude between -180 and 180) and
    (destination_latitude is null or destination_latitude between -90 and 90) and
    (destination_longitude is null or destination_longitude between -180 and 180)
  )
);

create table if not exists public.event_transport_departures (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.event_transport_routes(id) on delete cascade,
  scheduled_departure_at timestamptz not null,
  actual_departure_at timestamptz,
  scheduled_arrival_at timestamptz,
  available_capacity integer,
  booked_count integer not null default 0,
  status text not null default 'scheduled',
  live_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_transport_departures_status_check check (status in (
    'scheduled', 'boarding', 'delayed', 'full', 'departed', 'cancelled', 'completed'
  )),
  constraint event_transport_departures_capacity_check check (
    booked_count >= 0 and (available_capacity is null or available_capacity >= 0)
  ),
  constraint event_transport_departures_arrival_check check (
    scheduled_arrival_at is null or scheduled_arrival_at > scheduled_departure_at
  )
);

create table if not exists public.live_status_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  status_type text not null,
  status_value text,
  message text,
  severity text not null default 'information',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source_type text not null default 'organizer',
  source_id uuid,
  verified boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint live_status_updates_target_check check (target_type in (
    'event', 'program_item', 'zone', 'vendor', 'menu_item', 'service',
    'transport_route', 'transport_departure'
  )),
  constraint live_status_updates_type_check check (status_type in (
    'no_queue', 'short_queue', 'medium_queue', 'long_queue', 'sold_out',
    'limited_stock', 'delayed', 'live', 'finished', 'moved', 'closed', 'reopened',
    'full', 'low_capacity', 'kitchen_closed', 'technical_issue',
    'accessibility_issue', 'route_changed', 'cancelled', 'information', 'warning', 'emergency'
  )),
  constraint live_status_updates_severity_check check (severity in ('information', 'warning', 'critical', 'emergency')),
  constraint live_status_updates_expiry_check check (expires_at > starts_at)
);

create or replace view public.active_live_status_updates
with (security_invoker = true)
as
select *
from public.live_status_updates
where starts_at <= now() and expires_at > now();

create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  name text not null,
  event_type text,
  template_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_templates_data_check check (jsonb_typeof(template_data) = 'object')
);

create index if not exists event_vendors_event_idx on public.event_vendors(event_id, status);
create index if not exists menu_categories_vendor_idx on public.menu_categories(vendor_id, active, sort_order);
create index if not exists menu_items_vendor_available_idx on public.menu_items(vendor_id, available, sold_out);
create index if not exists promotions_event_dates_idx on public.promotions(event_id, starts_at, ends_at) where active;
create index if not exists promotions_vendor_dates_idx on public.promotions(vendor_id, starts_at, ends_at) where active;
create index if not exists event_services_event_type_idx on public.event_services(event_id, service_type, status);
create index if not exists event_transport_routes_event_idx on public.event_transport_routes(event_id, active);
create index if not exists transport_departures_route_start_idx on public.event_transport_departures(route_id, scheduled_departure_at);
create index if not exists live_status_updates_target_idx on public.live_status_updates(target_type, target_id, expires_at);
create index if not exists live_status_updates_event_expiry_idx on public.live_status_updates(event_id, expires_at);
create index if not exists event_templates_organizer_idx on public.event_templates(organizer_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'event_vendors', 'menu_categories', 'menu_items', 'allergens', 'promotions',
    'event_services', 'event_transport_routes', 'event_transport_departures', 'event_templates'
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
