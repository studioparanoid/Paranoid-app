-- Booking requests become bidirectional: an artist can now also initiate a
-- request to an organizer (previously only the organizer could). Additive —
-- the existing organizer-initiated path keeps working unchanged.

alter table public.booking_requests
  add column if not exists contact_phone text;

drop policy if exists "Organizer members create booking requests" on public.booking_requests;
drop policy if exists "Parties create booking requests" on public.booking_requests;
create policy "Parties create booking requests" on public.booking_requests
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    public.organizer_has_permission(organizer_id, 'events')
    or public.can_manage_artist(artist_id)
  )
);
