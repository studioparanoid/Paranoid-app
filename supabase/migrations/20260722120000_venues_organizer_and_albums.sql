-- Part A: venues belong to organizers (additive — old single-profile-claim
-- ownership keeps working, this only adds an organizer-owned path on top).

alter table public.venues
  add column if not exists organizer_id uuid references public.organizers(id) on delete set null;

create index if not exists venues_organizer_id_idx on public.venues (organizer_id);

create or replace function public.can_manage_venue(requested_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and account_type = 'venue' and entity_id = requested_venue_id
      and account_status = 'approved'
  ) or exists (
    select 1 from public.venues v
    where v.id = requested_venue_id and v.organizer_id is not null
      and public.organizer_has_permission(v.organizer_id, 'events')
  );
$$;

revoke all on function public.can_manage_venue(uuid) from public;
grant execute on function public.can_manage_venue(uuid) to authenticated;

drop policy if exists "Organizer members insert venues" on public.venues;
create policy "Organizer members insert venues" on public.venues
for insert to authenticated
with check (organizer_id is not null and public.organizer_has_permission(organizer_id, 'events'));

drop policy if exists "Venue managers update venues" on public.venues;
create policy "Venue managers update venues" on public.venues
for update to authenticated using (public.can_manage_venue(id)) with check (public.can_manage_venue(id));

-- Deliberately NOT calling `alter table venues enable row level security` here —
-- this migration only adds INSERT/UPDATE policies. Confirm in the Supabase dashboard
-- whether `venues` already has RLS enabled with a public SELECT policy before relying
-- on this; blindly enabling RLS without a known-good SELECT policy would break the
-- public venue pages.

-- Part B: photo albums.

create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text check (entity_type in ('artist', 'organizer', 'venue')),
  entity_id uuid,
  title text not null,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  join_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.album_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table public.album_members (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (album_id, user_id)
);

create table public.album_photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.album_photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists album_photos_album_id_idx on public.album_photos (album_id);
create index if not exists album_members_album_id_idx on public.album_members (album_id);
create index if not exists album_members_user_id_idx on public.album_members (user_id);
create index if not exists album_photo_comments_photo_id_idx on public.album_photo_comments (photo_id);
create index if not exists photo_albums_owner_idx on public.photo_albums (owner_user_id);

create or replace function public.can_access_album(requested_album_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1 from public.photo_albums where id = requested_album_id and owner_user_id = auth.uid()
  ) or exists (
    select 1 from public.album_members where album_id = requested_album_id and user_id = auth.uid()
  );
$$;

revoke all on function public.can_access_album(uuid) from public;
grant execute on function public.can_access_album(uuid) to authenticated;

alter table public.photo_albums enable row level security;
alter table public.album_photos enable row level security;
alter table public.album_members enable row level security;
alter table public.album_photo_comments enable row level security;

create policy "Public albums are readable, members read own" on public.photo_albums
for select using (visibility = 'public' or public.can_access_album(id));

create policy "Owners insert albums" on public.photo_albums
for insert to authenticated with check (owner_user_id = auth.uid());

create policy "Owners update own albums" on public.photo_albums
for update to authenticated using (owner_user_id = auth.uid() or public.is_app_admin())
with check (owner_user_id = auth.uid() or public.is_app_admin());

create policy "Owners delete own albums" on public.photo_albums
for delete to authenticated using (owner_user_id = auth.uid() or public.is_app_admin());

create policy "Photos visible with album access" on public.album_photos
for select using (exists (
  select 1 from public.photo_albums a where a.id = album_id and (a.visibility = 'public' or public.can_access_album(a.id))
));

create policy "Album members add photos" on public.album_photos
for insert to authenticated with check (uploaded_by = auth.uid() and public.can_access_album(album_id));

create policy "Uploader or owner deletes photo" on public.album_photos
for delete to authenticated using (
  uploaded_by = auth.uid() or public.is_app_admin()
  or exists (select 1 from public.photo_albums a where a.id = album_id and a.owner_user_id = auth.uid())
);

-- No INSERT policy for album_members: membership is only ever written by the
-- server-side join route (service role, bypasses RLS) — intentional, so the
-- join_code can never be brute-forced/guessed through client-side RLS.
create policy "Members and owner read membership" on public.album_members
for select to authenticated using (user_id = auth.uid() or exists (
  select 1 from public.photo_albums a where a.id = album_id and a.owner_user_id = auth.uid()
) or public.is_app_admin());

create policy "Owner removes members" on public.album_members
for delete to authenticated using (exists (
  select 1 from public.photo_albums a where a.id = album_id and a.owner_user_id = auth.uid()
) or public.is_app_admin());

create policy "Comments visible with album access" on public.album_photo_comments
for select using (exists (
  select 1 from public.album_photos p join public.photo_albums a on a.id = p.album_id
  where p.id = photo_id and (a.visibility = 'public' or public.can_access_album(a.id))
));

create policy "Album members comment" on public.album_photo_comments
for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.album_photos p where p.id = photo_id and public.can_access_album(p.album_id))
);

create policy "Author or owner deletes comment" on public.album_photo_comments
for delete to authenticated using (
  user_id = auth.uid() or public.is_app_admin()
  or exists (select 1 from public.album_photos p join public.photo_albums a on a.id = p.album_id where p.id = photo_id and a.owner_user_id = auth.uid())
);

-- Part C: storage bucket for album photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album-photos', 'album-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public album photos are readable" on storage.objects;
create policy "Public album photos are readable" on storage.objects
for select using (bucket_id = 'album-photos');

drop policy if exists "Album members upload photos" on storage.objects;
create policy "Album members upload photos" on storage.objects
for insert to authenticated
with check (bucket_id = 'album-photos' and public.can_access_album(((storage.foldername(name))[1])::uuid));

drop policy if exists "Album members delete own photo objects" on storage.objects;
create policy "Album members delete own photo objects" on storage.objects
for delete to authenticated
using (bucket_id = 'album-photos' and public.can_access_album(((storage.foldername(name))[1])::uuid));
