import { supabase } from "@/lib/supabase/public";

export type BookingRequestStatus = "pending" | "countered" | "accepted" | "declined" | "cancelled";

export type BookingRequest = {
  id: string;
  organizer_id: string;
  artist_id: string;
  created_by: string;
  status: BookingRequestStatus;
  proposed_date: string | null;
  proposed_venue_name: string | null;
  proposed_fee_cents: number | null;
  currency: string;
  note: string | null;
  event_submission_id: string | null;
  contact_phone: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingRequestMessage = {
  id: string;
  booking_request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const bookingRequestColumns =
  "id,organizer_id,artist_id,created_by,status,proposed_date,proposed_venue_name,proposed_fee_cents,currency,note,event_submission_id,contact_phone,responded_at,responded_by,created_at,updated_at";

export async function createBookingRequest(input: {
  organizerId: string;
  artistId: string;
  proposedDate?: string | null;
  proposedVenueName?: string | null;
  proposedFeeCents?: number | null;
  currency?: string;
  note?: string | null;
  contactPhone?: string | null;
}): Promise<BookingRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      organizer_id: input.organizerId,
      artist_id: input.artistId,
      created_by: user.id,
      proposed_date: input.proposedDate || null,
      proposed_venue_name: input.proposedVenueName?.trim() || null,
      proposed_fee_cents: input.proposedFeeCents ?? null,
      currency: input.currency || "EUR",
      note: input.note?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
    })
    .select(bookingRequestColumns)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listOrganizerBusyDates(organizerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("events")
    .select("start_at,start_date,display_date")
    .eq("organizer_id", organizerId)
    .eq("status", "published");

  if (error) {
    console.error("Erro ao carregar datas ocupadas:", error);
    return [];
  }
  return extractIsoDates(data || []);
}

export async function listArtistBusyDates(artistId: string): Promise<string[]> {
  const { data: links, error: linksError } = await supabase.from("event_artists").select("event_id").eq("artist_id", artistId);
  if (linksError) {
    console.error("Erro ao carregar datas ocupadas:", linksError);
    return [];
  }
  const eventIds = (links || []).map((link) => link.event_id).filter(Boolean) as string[];
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("events")
    .select("start_at,start_date,display_date")
    .in("id", eventIds)
    .eq("status", "published");

  if (error) {
    console.error("Erro ao carregar datas ocupadas:", error);
    return [];
  }
  return extractIsoDates(data || []);
}

function extractIsoDates(rows: Array<{ start_at?: string | null; start_date?: string | null; display_date?: string | null }>) {
  const dates = new Set<string>();
  for (const row of rows) {
    const value = row.start_at || row.start_date;
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) dates.add(parsed.toISOString().slice(0, 10));
    }
  }
  return Array.from(dates);
}

export async function listBookingRequestsForArtist(artistId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(bookingRequestColumns)
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pedidos de reserva:", error);
    return [];
  }
  return data || [];
}

export async function listBookingRequestsForOrganizer(organizerId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(bookingRequestColumns)
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pedidos de reserva:", error);
    return [];
  }
  return data || [];
}

export async function getBookingRequest(id: string): Promise<BookingRequest | null> {
  const { data, error } = await supabase
    .from("booking_requests")
    .select(bookingRequestColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar pedido de reserva:", error);
    return null;
  }
  return data;
}

export async function respondToBookingRequest(id: string, input: {
  status: "countered" | "declined" | "cancelled";
  proposedDate?: string | null;
  proposedVenueName?: string | null;
  proposedFeeCents?: number | null;
  note?: string | null;
}): Promise<BookingRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const patch: Record<string, unknown> = {
    status: input.status,
    responded_at: new Date().toISOString(),
    responded_by: user.id,
  };
  if (input.proposedDate !== undefined) patch.proposed_date = input.proposedDate;
  if (input.proposedVenueName !== undefined) patch.proposed_venue_name = input.proposedVenueName?.trim() || null;
  if (input.proposedFeeCents !== undefined) patch.proposed_fee_cents = input.proposedFeeCents;
  if (input.note !== undefined) patch.note = input.note?.trim() || null;

  const { data, error } = await supabase
    .from("booking_requests")
    .update(patch)
    .eq("id", id)
    .select(bookingRequestColumns)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function acceptBookingRequest(id: string): Promise<{ bookingRequest: BookingRequest; submissionId: string }> {
  const response = await fetch(`/api/booking-requests/${id}/accept`, { method: "POST" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível aceitar o pedido.");
  return payload;
}

export async function sendBookingRequestMessage(bookingRequestId: string, body: string): Promise<BookingRequestMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Escreve uma mensagem.");

  const { data, error } = await supabase
    .from("booking_request_messages")
    .insert({ booking_request_id: bookingRequestId, sender_id: user.id, body: trimmed.slice(0, 2000) })
    .select("id,booking_request_id,sender_id,body,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listBookingRequestMessages(bookingRequestId: string): Promise<BookingRequestMessage[]> {
  const { data, error } = await supabase
    .from("booking_request_messages")
    .select("id,booking_request_id,sender_id,body,created_at")
    .eq("booking_request_id", bookingRequestId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error);
    return [];
  }
  return data || [];
}
