import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function authorize(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }) };

  const { data: bookingRequest, error } = await supabase
    .from("booking_requests")
    .select("id,organizer_id,artist_id,created_by,status,proposed_date,proposed_venue_name,proposed_fee_cents,currency,note")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !bookingRequest) return { error: NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type,entity_id,account_status")
    .eq("id", user.id)
    .maybeSingle();
  const isArtistOwner = profile?.account_type === "artist" && profile.account_status === "approved" && profile.entity_id === bookingRequest.artist_id;
  if (!isArtistOwner) return { error: NextResponse.json({ error: "Só o artista pode aceitar este pedido." }, { status: 403 }) };

  if (bookingRequest.status !== "pending" && bookingRequest.status !== "countered") {
    return { error: NextResponse.json({ error: "Este pedido já não está disponível para aceitar." }, { status: 409 }) };
  }

  return { user, bookingRequest };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id);
  if ("error" in access) return access.error;
  const { user, bookingRequest } = access;

  const admin = getRequiredSupabaseAdminClient();

  const { data: artist } = await admin.from("artists").select("name,city").eq("id", bookingRequest.artist_id).maybeSingle();
  if (!artist) return NextResponse.json({ error: "Artista não encontrado." }, { status: 404 });

  const { data: submission, error: submissionError } = await admin
    .from("event_submissions")
    .insert({
      title: `${artist.name}${bookingRequest.proposed_venue_name ? ` em ${bookingRequest.proposed_venue_name}` : ""}`,
      city: artist.city,
      venue: bookingRequest.proposed_venue_name || "",
      organizer_id: bookingRequest.organizer_id,
      artists_text: artist.name,
      event_date: bookingRequest.proposed_date,
      price: bookingRequest.proposed_fee_cents != null ? (bookingRequest.proposed_fee_cents / 100).toFixed(2) : null,
      description: bookingRequest.note,
      submitted_by: bookingRequest.created_by,
      status: "pending",
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Não foi possível criar o rascunho do evento." }, { status: 500 });
  }

  const { data: updated, error: updateError } = await admin
    .from("booking_requests")
    .update({ status: "accepted", event_submission_id: submission.id, responded_at: new Date().toISOString(), responded_by: user.id })
    .eq("id", id)
    .select("id,organizer_id,artist_id,created_by,status,proposed_date,proposed_venue_name,proposed_fee_cents,currency,note,event_submission_id,responded_at,responded_by,created_at,updated_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "O rascunho foi criado mas o pedido não foi atualizado. Contacta o suporte." }, { status: 500 });
  }

  return NextResponse.json({ bookingRequest: updated, submissionId: submission.id });
}
