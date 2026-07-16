import { NextResponse } from "next/server";
import { buildHubResponse, classifyHubQuery, type HubEventRecord } from "@/lib/hub/router";
import { createClient } from "@/lib/supabase/server";
import { tryStructuredHubResponse } from "@/lib/hub/structured-router";

type HubPayload = { query?: unknown };

const intentsWithoutEvents = new Set(["tickets", "shop", "map", "dining"]);

export async function POST(request: Request) {
  let payload: HubPayload;
  try {
    payload = await request.json() as HubPayload;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  if (!query || query.length > 240) {
    return NextResponse.json({ error: "Escreve um pedido entre 1 e 240 caracteres." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const intent = classifyHubQuery(query);
  const structuredResponse = await tryStructuredHubResponse(query);
  if (structuredResponse) return NextResponse.json(structuredResponse);
  let profileCity: string | null = null;

  if (intent === "nearby" && user) {
    const { data: profile } = await supabase.from("profiles").select("city").eq("id", user.id).maybeSingle();
    profileCity = typeof profile?.city === "string" ? profile.city : null;
  }

  let events: HubEventRecord[] = [];
  if (!intentsWithoutEvents.has(intent)) {
    const { data, error } = await supabase
      .from("events")
      .select("id,slug,title,city,municipality,venue_name,display_date,display_time,start_at,start_date,category,price,ticket_price,description,image_url,featured")
      .eq("status", "published")
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) return NextResponse.json({ error: "Não foi possível consultar a Agenda agora." }, { status: 503 });
    events = (data || []) as HubEventRecord[];
  }

  // A future AI tool-calling layer can replace this interpreter while preserving this response contract.
  return NextResponse.json(buildHubResponse(query, events, { authenticated: Boolean(user), profileCity }));
}
