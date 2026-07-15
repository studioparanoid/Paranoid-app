alter table public.profiles
  add column if not exists avatar_url text;

alter table public.artists
  add column if not exists image_url text,
  add column if not exists artist_category text,
  add column if not exists artist_category_other text,
  add column if not exists music_genres text[] not null default '{}';

alter table public.organizers
  add column if not exists image_url text,
  add column if not exists organizer_type text,
  add column if not exists organizer_type_other text;

alter table public.venues
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public profile images are readable" on storage.objects;
create policy "Public profile images are readable" on storage.objects
for select using (bucket_id = 'profile-images');

drop policy if exists "Users upload own profile images" on storage.objects;
create policy "Users upload own profile images" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own profile images" on storage.objects;
create policy "Users update own profile images" on storage.objects
for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own profile images" on storage.objects;
create policy "Users delete own profile images" on storage.objects
for delete to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.update_my_extended_profile(
  p_avatar_url text,
  p_city text,
  p_description text,
  p_organizer_type text,
  p_organizer_type_other text,
  p_artist_category text,
  p_artist_category_other text,
  p_music_genres text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  if char_length(coalesce(p_description, '')) > 800 then raise exception 'A descrição excede 800 caracteres.'; end if;
  if coalesce(array_length(p_music_genres, 1), 0) > 6 then raise exception 'Escolhe no máximo 6 géneros.'; end if;

  select * into current_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Perfil não encontrado.'; end if;

  update public.profiles set avatar_url = nullif(trim(p_avatar_url), ''), city = nullif(trim(p_city), '') where id = auth.uid();

  if current_profile.account_type = 'artist' and current_profile.entity_id is not null then
    update public.artists set
      city = nullif(trim(p_city), ''), image_url = nullif(trim(p_avatar_url), ''),
      description = nullif(trim(p_description), ''), artist_category = nullif(trim(p_artist_category), ''),
      artist_category_other = case when p_artist_category = 'Outro' then nullif(trim(p_artist_category_other), '') else null end,
      music_genres = case when p_artist_category = 'Música' then coalesce(p_music_genres, '{}') else '{}' end
    where id = current_profile.entity_id;
  elsif current_profile.account_type = 'organizer' and current_profile.entity_id is not null then
    update public.organizers set
      city = nullif(trim(p_city), ''), image_url = nullif(trim(p_avatar_url), ''), description = nullif(trim(p_description), ''),
      organizer_type = nullif(trim(p_organizer_type), ''),
      organizer_type_other = case when p_organizer_type = 'Outro' then nullif(trim(p_organizer_type_other), '') else null end
    where id = current_profile.entity_id;
  elsif current_profile.account_type = 'venue' and current_profile.entity_id is not null then
    update public.venues set city = nullif(trim(p_city), ''), image_url = nullif(trim(p_avatar_url), ''), description = nullif(trim(p_description), '')
    where id = current_profile.entity_id;
  end if;
end;
$$;

revoke all on function public.update_my_extended_profile(text,text,text,text,text,text,text,text[]) from public;
grant execute on function public.update_my_extended_profile(text,text,text,text,text,text,text,text[]) to authenticated;

create or replace function public.sync_extended_profile_from_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  signup_genres text[];
begin
  select raw_user_meta_data into metadata from auth.users where id = new.id;
  select coalesce(array_agg(value), '{}') into signup_genres
  from jsonb_array_elements_text(coalesce(metadata -> 'music_genres', '[]'::jsonb)) as value;

  if new.entity_id is not null and new.account_type = 'artist' then
    update public.artists set
      description = nullif(trim(metadata ->> 'description'), ''),
      artist_category = nullif(trim(metadata ->> 'artist_category'), ''),
      artist_category_other = nullif(trim(metadata ->> 'artist_category_other'), ''),
      music_genres = signup_genres
    where id = new.entity_id;
  elsif new.entity_id is not null and new.account_type = 'organizer' then
    update public.organizers set
      description = nullif(trim(metadata ->> 'description'), ''),
      organizer_type = nullif(trim(metadata ->> 'organizer_type'), ''),
      organizer_type_other = nullif(trim(metadata ->> 'organizer_type_other'), '')
    where id = new.entity_id;
  elsif new.entity_id is not null and new.account_type = 'venue' then
    update public.venues set description = nullif(trim(metadata ->> 'description'), '') where id = new.entity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_extended_profile_signup on public.profiles;
create trigger sync_extended_profile_signup
after insert or update of entity_id on public.profiles
for each row execute function public.sync_extended_profile_from_signup();
