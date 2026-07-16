-- Permanent identities, preferences and reusable venue data.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists bio text,
  add column if not exists preferred_city text,
  add column if not exists preferred_municipality text,
  add column if not exists preferred_district text,
  add column if not exists preferred_radius_km numeric(6,2),
  add column if not exists profile_visibility text default 'public',
  add column if not exists locale text default 'pt-PT',
  add column if not exists timezone text default 'Europe/Lisbon',
  add column if not exists onboarding_completed boolean not null default false;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_categories text[] not null default '{}',
  favorite_genres text[] not null default '{}',
  food_preferences text[] not null default '{}',
  accessibility_preferences text[] not null default '{}',
  preferred_price_min numeric(10,2),
  preferred_price_max numeric(10,2),
  preferred_event_distance_km numeric(6,2),
  allow_personalized_recommendations boolean not null default true,
  allow_location_context boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_price_range_check check (
    preferred_price_min is null or preferred_price_max is null or preferred_price_max >= preferred_price_min
  )
);

alter table public.organizers
  add column if not exists legal_type text,
  add column if not exists short_description text,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists municipality text,
  add column if not exists district text,
  add column if not exists country text default 'Portugal',
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists public_email text,
  add column if not exists public_phone text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.organizer_private_details (
  organizer_id uuid primary key references public.organizers(id) on delete cascade,
  legal_name text,
  tax_number text,
  fiscal_country text default 'Portugal',
  fiscal_address text,
  billing_email text,
  representative_name text,
  representative_document_status text,
  payout_account_status text,
  payment_provider_account_id text,
  ticket_sales_authorized boolean not null default false,
  merch_sales_authorized boolean not null default false,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizer_members
  add column if not exists can_manage_profile boolean not null default false,
  add column if not exists can_manage_events boolean not null default false,
  add column if not exists can_manage_program boolean not null default false,
  add column if not exists can_manage_tickets boolean not null default false,
  add column if not exists can_manage_store boolean not null default false,
  add column if not exists can_manage_live_status boolean not null default false,
  add column if not exists can_manage_team boolean not null default false,
  add column if not exists status text not null default 'active',
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.organizer_members
set
  can_manage_profile = true,
  can_manage_events = true,
  can_manage_program = true,
  can_manage_tickets = true,
  can_manage_store = true,
  can_manage_live_status = true,
  can_manage_team = true,
  accepted_at = coalesce(accepted_at, created_at)
where role in ('owner', 'admin');

create unique index if not exists organizer_members_organizer_user_idx
  on public.organizer_members(organizer_id, user_id);
create index if not exists organizer_members_user_status_idx
  on public.organizer_members(user_id, status);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  community_type text not null default 'other',
  short_description text,
  description text,
  logo_url text,
  cover_url text,
  city text,
  municipality text,
  district text,
  country text not null default 'Portugal',
  website_url text,
  instagram_url text,
  public_email text,
  visibility text not null default 'public',
  membership_mode text not null default 'approval',
  verified boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_type_check check (community_type in (
    'association', 'informal_collective', 'fan_group', 'cultural_project',
    'student_group', 'local_community', 'media', 'club', 'other'
  )),
  constraint communities_visibility_check check (visibility in ('public', 'unlisted', 'private')),
  constraint communities_membership_mode_check check (membership_mode in ('open', 'approval', 'invite'))
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (community_id, user_id),
  constraint community_members_role_check check (role in ('owner', 'admin', 'moderator', 'member')),
  constraint community_members_status_check check (status in ('invited', 'active', 'suspended', 'left'))
);

alter table public.artists
  add column if not exists artist_type text not null default 'other',
  add column if not exists short_description text,
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists origin_city text,
  add column if not exists origin_country text,
  add column if not exists primary_genre_id uuid,
  add column if not exists booking_email text,
  add column if not exists booking_phone text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists spotify_url text,
  add column if not exists bandcamp_url text,
  add column if not exists soundcloud_url text,
  add column if not exists verified boolean not null default false,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.genres(id) on delete set null,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'artists_primary_genre_id_fkey'
  ) then
    alter table public.artists
      add constraint artists_primary_genre_id_fkey
      foreign key (primary_genre_id) references public.genres(id) on delete set null;
  end if;
end
$$;

create table if not exists public.artist_genres (
  artist_id uuid not null references public.artists(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artist_id, genre_id)
);

create unique index if not exists artist_genres_one_primary_idx
  on public.artist_genres(artist_id) where is_primary;

create table if not exists public.artist_members (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  name text not null,
  role text,
  instrument text,
  profile_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_professional_details (
  artist_id uuid primary key references public.artists(id) on delete cascade,
  manager_name text,
  manager_email text,
  booking_agent text,
  booking_email text,
  typical_set_duration_minutes integer,
  available_formats text[] not null default '{}',
  home_base text,
  travel_radius_km numeric(8,2),
  technical_rider_url text,
  hospitality_rider_url text,
  press_kit_url text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venues
  add column if not exists venue_type text not null default 'other',
  add column if not exists short_description text,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists locality text,
  add column if not exists country text not null default 'Portugal',
  add column if not exists timezone text not null default 'Europe/Lisbon',
  add column if not exists public_email text,
  add column if not exists public_phone text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists capacity integer,
  add column if not exists indoor_outdoor text,
  add column if not exists minimum_age_default integer,
  add column if not exists verified boolean not null default false,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.venue_features (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  feature_type text not null,
  value_boolean boolean,
  value_text text,
  value_number numeric,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (venue_id, feature_type),
  constraint venue_features_one_value_check check (
    num_nonnulls(value_boolean, value_text, value_number) <= 1
  )
);

create table if not exists public.venue_opening_hours (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  weekday smallint not null,
  opens_at time,
  closes_at time,
  kitchen_opens_at time,
  kitchen_closes_at time,
  is_closed boolean not null default false,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_opening_hours_weekday_check check (weekday between 0 and 6),
  constraint venue_opening_hours_validity_check check (
    valid_from is null or valid_until is null or valid_until >= valid_from
  )
);

create index if not exists venue_opening_hours_lookup_idx
  on public.venue_opening_hours(venue_id, weekday, valid_from, valid_until);

create table if not exists public.venue_opening_exceptions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  date date not null,
  opens_at time,
  closes_at time,
  kitchen_opens_at time,
  kitchen_closes_at time,
  is_closed boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, date)
);

create index if not exists organizers_name_lookup_idx on public.organizers(lower(name));
create index if not exists artists_name_lookup_idx on public.artists(lower(name));
create index if not exists venues_name_city_lookup_idx on public.venues(lower(name), lower(city));
create index if not exists communities_name_lookup_idx on public.communities(lower(name));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'organizers', 'organizer_members', 'artists', 'venues',
    'user_preferences', 'organizer_private_details', 'communities', 'community_members',
    'genres', 'artist_genres', 'artist_members', 'artist_professional_details',
    'venue_features', 'venue_opening_hours', 'venue_opening_exceptions'
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
