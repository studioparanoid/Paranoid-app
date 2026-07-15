import { NextResponse } from "next/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const admin = getRequiredSupabaseAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: "Não foi possível verificar o perfil." }, { status: 500 });
  if (existing) return NextResponse.json({ created: false });

  const metadata = user.user_metadata ?? {};
  const accountType = ["community", "artist", "organizer", "venue"].includes(metadata.account_type)
    ? metadata.account_type
    : "community";
  const { error: insertError } = await admin.from("profiles").upsert({
    id: user.id,
    email: user.email?.trim().toLowerCase() ?? null,
    display_name: typeof metadata.display_name === "string" ? metadata.display_name.trim() : null,
    account_type: accountType,
    account_status: accountType === "community" ? "approved" : "pending",
    role: "public_user",
    artist_name: accountType === "artist" && typeof metadata.artist_name === "string" ? metadata.artist_name.trim() : null,
    organizer_name: accountType === "organizer" && typeof metadata.organizer_name === "string" ? metadata.organizer_name.trim() : null,
    venue_name: accountType === "venue" && typeof metadata.venue_name === "string" ? metadata.venue_name.trim() : null,
    city: typeof metadata.city === "string" ? metadata.city.trim() : null,
    instagram_url: typeof metadata.instagram_url === "string" ? metadata.instagram_url : null,
  }, { onConflict: "id", ignoreDuplicates: true });

  if (insertError) return NextResponse.json({ error: "Não foi possível criar o perfil." }, { status: 500 });
  return NextResponse.json({ created: true });
}
