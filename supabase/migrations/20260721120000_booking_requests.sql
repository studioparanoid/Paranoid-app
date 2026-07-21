-- Booking requests: structured negotiation between an organizer and an artist,
-- with an attached message thread. Acceptance bridges into the existing
-- event_submissions moderation pipeline (server route, service role) rather
-- than writing directly to events.

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  proposed_date date,
  proposed_venue_name text,
  proposed_fee_cents integer,
  currency text not null default 'EUR',
  note text,
  event_submission_id uuid references public.event_submissions(id) on delete set null,
  responded_at timestamptz,
  responded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_requests_status_check check (status in ('pending', 'countered', 'accepted', 'declined', 'cancelled')),
  constraint booking_requests_fee_check check (proposed_fee_cents is null or proposed_fee_cents >= 0)
);

create index if not exists booking_requests_organizer_idx on public.booking_requests(organizer_id, created_at desc);
create index if not exists booking_requests_artist_idx on public.booking_requests(artist_id, created_at desc);
create index if not exists booking_requests_status_idx on public.booking_requests(status);

drop trigger if exists booking_requests_set_updated_at on public.booking_requests;
create trigger booking_requests_set_updated_at before update on public.booking_requests
  for each row execute function public.set_updated_at();

create table if not exists public.booking_request_messages (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint booking_request_messages_body_check check (char_length(btrim(body)) > 0)
);

create index if not exists booking_request_messages_thread_idx on public.booking_request_messages(booking_request_id, created_at);

create or replace function public.can_access_booking_request(request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1 from public.booking_requests request
    where request.id = request_id
      and (
        public.can_manage_artist(request.artist_id)
        or public.organizer_has_permission(request.organizer_id, 'events')
      )
  );
$$;

revoke all on function public.can_access_booking_request(uuid) from public;
grant execute on function public.can_access_booking_request(uuid) to authenticated;

alter table public.booking_requests enable row level security;
alter table public.booking_request_messages enable row level security;

create policy "Parties read booking requests" on public.booking_requests
for select to authenticated using (public.can_access_booking_request(id));

create policy "Organizer members create booking requests" on public.booking_requests
for insert to authenticated with check (
  created_by = auth.uid() and public.organizer_has_permission(organizer_id, 'events')
);

create policy "Parties update booking requests" on public.booking_requests
for update to authenticated using (public.can_access_booking_request(id))
with check (public.can_access_booking_request(id));

create policy "Parties read booking request messages" on public.booking_request_messages
for select to authenticated using (public.can_access_booking_request(booking_request_id));

create policy "Parties send booking request messages" on public.booking_request_messages
for insert to authenticated with check (
  sender_id = auth.uid() and public.can_access_booking_request(booking_request_id)
);
