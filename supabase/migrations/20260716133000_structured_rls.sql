-- Authorization helpers and RLS for every table introduced by the structured model.

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

create or replace function public.organizer_has_permission(
  requested_organizer_id uuid,
  requested_permission text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1
    from public.organizer_members member
    where member.organizer_id = requested_organizer_id
      and member.user_id = auth.uid()
      and member.status = 'active'
      and (
        member.role in ('owner', 'admin')
        or requested_permission is null
        or case requested_permission
          when 'profile' then member.can_manage_profile
          when 'events' then member.can_manage_events
          when 'program' then member.can_manage_program
          when 'tickets' then member.can_manage_tickets
          when 'store' then member.can_manage_store
          when 'live_status' then member.can_manage_live_status
          when 'team' then member.can_manage_team
          else false
        end
      )
  );
$$;

create or replace function public.can_manage_event(requested_event_id uuid, requested_permission text default 'events')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1
    from public.events event
    where event.id = requested_event_id
      and event.organizer_id is not null
      and public.organizer_has_permission(event.organizer_id, requested_permission)
  );
$$;

create or replace function public.can_manage_artist(requested_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and account_type = 'artist' and entity_id = requested_artist_id
      and account_status = 'approved'
  );
$$;

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
  );
$$;

create or replace function public.can_manage_community(requested_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1 from public.community_members
    where community_id = requested_community_id and user_id = auth.uid()
      and status = 'active' and role in ('owner', 'admin', 'moderator')
  );
$$;

revoke all on function public.is_app_admin() from public;
revoke all on function public.organizer_has_permission(uuid, text) from public;
revoke all on function public.can_manage_event(uuid, text) from public;
revoke all on function public.can_manage_artist(uuid) from public;
revoke all on function public.can_manage_venue(uuid) from public;
revoke all on function public.can_manage_community(uuid) from public;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.organizer_has_permission(uuid, text) to authenticated;
grant execute on function public.can_manage_event(uuid, text) to authenticated;
grant execute on function public.can_manage_artist(uuid) to authenticated;
grant execute on function public.can_manage_venue(uuid) to authenticated;
grant execute on function public.can_manage_community(uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_preferences', 'organizer_private_details', 'communities', 'community_members',
    'genres', 'artist_genres', 'artist_members', 'artist_professional_details',
    'venue_features', 'venue_opening_hours', 'venue_opening_exceptions',
    'event_types', 'event_categories', 'event_category_links', 'event_days', 'event_zones',
    'event_program_items', 'program_item_artists', 'ticket_channels', 'ticket_products',
    'event_vendors', 'menu_categories', 'menu_items', 'allergens', 'menu_item_allergens',
    'promotions', 'promotion_items', 'event_services', 'event_transport_routes',
    'event_transport_departures', 'live_status_updates', 'event_templates',
    'data_migration_review_items'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end
$$;

create policy "Users manage own preferences" on public.user_preferences
for all to authenticated using (user_id = auth.uid() or public.is_app_admin())
with check (user_id = auth.uid() or public.is_app_admin());

create policy "Organizer managers read private details" on public.organizer_private_details
for select to authenticated using (public.organizer_has_permission(organizer_id, 'profile'));
create policy "Organizer owners manage private details" on public.organizer_private_details
for all to authenticated using (public.organizer_has_permission(organizer_id, 'team'))
with check (public.organizer_has_permission(organizer_id, 'team'));

create policy "Public communities are readable" on public.communities
for select using (visibility = 'public' and status = 'active');
create policy "Community managers manage communities" on public.communities
for all to authenticated using (public.can_manage_community(id))
with check (public.can_manage_community(id));
create policy "Community members read team" on public.community_members
for select to authenticated using (user_id = auth.uid() or public.can_manage_community(community_id));
create policy "Community managers manage team" on public.community_members
for all to authenticated using (public.can_manage_community(community_id))
with check (public.can_manage_community(community_id));

create policy "Active genres are public" on public.genres
for select using (active);
create policy "Admins manage genres" on public.genres
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "Artist genres are public" on public.artist_genres for select using (true);
create policy "Artists manage own genres" on public.artist_genres
for all to authenticated using (public.can_manage_artist(artist_id))
with check (public.can_manage_artist(artist_id));
create policy "Active artist members are public" on public.artist_members for select using (active);
create policy "Artists manage own members" on public.artist_members
for all to authenticated using (public.can_manage_artist(artist_id))
with check (public.can_manage_artist(artist_id));
create policy "Artists manage professional details" on public.artist_professional_details
for all to authenticated using (public.can_manage_artist(artist_id))
with check (public.can_manage_artist(artist_id));

create policy "Venue features are public" on public.venue_features for select using (true);
create policy "Venues manage features" on public.venue_features
for all to authenticated using (public.can_manage_venue(venue_id))
with check (public.can_manage_venue(venue_id));
create policy "Venue hours are public" on public.venue_opening_hours for select using (true);
create policy "Venues manage hours" on public.venue_opening_hours
for all to authenticated using (public.can_manage_venue(venue_id))
with check (public.can_manage_venue(venue_id));
create policy "Venue exceptions are public" on public.venue_opening_exceptions for select using (true);
create policy "Venues manage exceptions" on public.venue_opening_exceptions
for all to authenticated using (public.can_manage_venue(venue_id))
with check (public.can_manage_venue(venue_id));

create policy "Active event types are public" on public.event_types for select using (active);
create policy "Admins manage event types" on public.event_types
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "Active event categories are public" on public.event_categories for select using (active);
create policy "Admins manage event categories" on public.event_categories
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "Published event categories are public" on public.event_category_links
for select using (exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage categories" on public.event_category_links
for all to authenticated using (public.can_manage_event(event_id, 'events'))
with check (public.can_manage_event(event_id, 'events'));

create policy "Published event days are public" on public.event_days
for select using (exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage days" on public.event_days
for all to authenticated using (public.can_manage_event(event_id, 'program'))
with check (public.can_manage_event(event_id, 'program'));

create policy "Published event zones are public" on public.event_zones
for select using (exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage zones" on public.event_zones
for all to authenticated using (public.can_manage_event(event_id, 'program'))
with check (public.can_manage_event(event_id, 'program'));

create policy "Published program is public" on public.event_program_items
for select using (status <> 'draft' and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage program" on public.event_program_items
for all to authenticated using (public.can_manage_event(event_id, 'program'))
with check (public.can_manage_event(event_id, 'program'));

create policy "Published program artists are public" on public.program_item_artists
for select using (exists (
  select 1 from public.event_program_items item
  join public.events event on event.id = item.event_id
  where item.id = program_item_id and item.status <> 'draft'
    and event.publication_status = 'published' and event.visibility = 'public'
));
create policy "Event managers manage program artists" on public.program_item_artists
for all to authenticated using (exists (
  select 1 from public.event_program_items where id = program_item_id
    and public.can_manage_event(event_id, 'program')
)) with check (exists (
  select 1 from public.event_program_items where id = program_item_id
    and public.can_manage_event(event_id, 'program')
));

create policy "Active ticket channels are public" on public.ticket_channels
for select using (active and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Ticket managers manage channels" on public.ticket_channels
for all to authenticated using (public.can_manage_event(event_id, 'tickets'))
with check (public.can_manage_event(event_id, 'tickets'));
create policy "Active ticket products are public" on public.ticket_products
for select using (active and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Ticket managers manage products" on public.ticket_products
for all to authenticated using (public.can_manage_event(event_id, 'tickets'))
with check (public.can_manage_event(event_id, 'tickets'));

create policy "Published vendors are public" on public.event_vendors
for select using (status = 'active' and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage vendors" on public.event_vendors
for all to authenticated using (public.can_manage_event(event_id, 'events'))
with check (public.can_manage_event(event_id, 'events'));

create policy "Published menu categories are public" on public.menu_categories
for select using (active and exists (
  select 1 from public.event_vendors vendor join public.events event on event.id = vendor.event_id
  where vendor.id = vendor_id and vendor.status = 'active'
    and event.publication_status = 'published' and event.visibility = 'public'
));
create policy "Event managers manage menu categories" on public.menu_categories
for all to authenticated using (exists (
  select 1 from public.event_vendors where id = vendor_id and public.can_manage_event(event_id, 'events')
)) with check (exists (
  select 1 from public.event_vendors where id = vendor_id and public.can_manage_event(event_id, 'events')
));

create policy "Published menu items are public" on public.menu_items
for select using (exists (
  select 1 from public.event_vendors vendor join public.events event on event.id = vendor.event_id
  where vendor.id = vendor_id and vendor.status = 'active'
    and event.publication_status = 'published' and event.visibility = 'public'
));
create policy "Event managers manage menu items" on public.menu_items
for all to authenticated using (exists (
  select 1 from public.event_vendors where id = vendor_id and public.can_manage_event(event_id, 'events')
)) with check (exists (
  select 1 from public.event_vendors where id = vendor_id and public.can_manage_event(event_id, 'events')
));

create policy "Active allergens are public" on public.allergens for select using (active);
create policy "Admins manage allergens" on public.allergens
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "Menu allergens are public" on public.menu_item_allergens for select using (true);
create policy "Event managers manage menu allergens" on public.menu_item_allergens
for all to authenticated using (exists (
  select 1 from public.menu_items item join public.event_vendors vendor on vendor.id = item.vendor_id
  where item.id = menu_item_id and public.can_manage_event(vendor.event_id, 'events')
)) with check (exists (
  select 1 from public.menu_items item join public.event_vendors vendor on vendor.id = item.vendor_id
  where item.id = menu_item_id and public.can_manage_event(vendor.event_id, 'events')
));

create policy "Active promotions are public" on public.promotions
for select using (active and starts_at <= now() and ends_at > now() and (
  event_id is null or exists (
    select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
  )
));
create policy "Promotion owners manage promotions" on public.promotions
for all to authenticated using (
  public.is_app_admin()
  or (event_id is not null and public.can_manage_event(event_id, 'events'))
  or (organizer_id is not null and public.organizer_has_permission(organizer_id, 'events'))
  or (venue_id is not null and public.can_manage_venue(venue_id))
  or (vendor_id is not null and exists (
    select 1 from public.event_vendors where id = vendor_id and public.can_manage_event(event_id, 'events')
  ))
) with check (
  public.is_app_admin()
  or (event_id is not null and public.can_manage_event(event_id, 'events'))
  or (organizer_id is not null and public.organizer_has_permission(organizer_id, 'events'))
  or (venue_id is not null and public.can_manage_venue(venue_id))
  or (vendor_id is not null and exists (
    select 1 from public.event_vendors where id = vendor_id and public.can_manage_event(event_id, 'events')
  ))
);
create policy "Active promotion items are public" on public.promotion_items
for select using (exists (
  select 1 from public.promotions where id = promotion_id and active and starts_at <= now() and ends_at > now()
));
create policy "Promotion owners manage items" on public.promotion_items
for all to authenticated using (exists (
  select 1 from public.promotions where id = promotion_id and (
    public.is_app_admin()
    or (event_id is not null and public.can_manage_event(event_id, 'events'))
    or (organizer_id is not null and public.organizer_has_permission(organizer_id, 'events'))
  )
)) with check (exists (
  select 1 from public.promotions where id = promotion_id and (
    public.is_app_admin()
    or (event_id is not null and public.can_manage_event(event_id, 'events'))
    or (organizer_id is not null and public.organizer_has_permission(organizer_id, 'events'))
  )
));

create policy "Published services are public" on public.event_services
for select using (status = 'active' and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage services" on public.event_services
for all to authenticated using (public.can_manage_event(event_id, 'events'))
with check (public.can_manage_event(event_id, 'events'));

create policy "Published transport routes are public" on public.event_transport_routes
for select using (active and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Event managers manage transport routes" on public.event_transport_routes
for all to authenticated using (public.can_manage_event(event_id, 'events'))
with check (public.can_manage_event(event_id, 'events'));
create policy "Published departures are public" on public.event_transport_departures
for select using (exists (
  select 1 from public.event_transport_routes route join public.events event on event.id = route.event_id
  where route.id = route_id and route.active and event.publication_status = 'published' and event.visibility = 'public'
));
create policy "Event managers manage departures" on public.event_transport_departures
for all to authenticated using (exists (
  select 1 from public.event_transport_routes where id = route_id and public.can_manage_event(event_id, 'events')
)) with check (exists (
  select 1 from public.event_transport_routes where id = route_id and public.can_manage_event(event_id, 'events')
));

create policy "Current live updates are public" on public.live_status_updates
for select using (starts_at <= now() and expires_at > now() and exists (
  select 1 from public.events where id = event_id and publication_status = 'published' and visibility = 'public'
));
create policy "Live operators manage updates" on public.live_status_updates
for all to authenticated using (public.can_manage_event(event_id, 'live_status'))
with check (public.can_manage_event(event_id, 'live_status'));

create policy "Organizer members manage templates" on public.event_templates
for all to authenticated using (public.organizer_has_permission(organizer_id, 'events'))
with check (public.organizer_has_permission(organizer_id, 'events'));

create policy "Admins manage migration review" on public.data_migration_review_items
for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
