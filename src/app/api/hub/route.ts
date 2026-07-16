import { NextResponse } from "next/server";
import { buildHubResponse, classifyHubQuery, type HubEventRecord } from "@/lib/hub/router";
import { createClient } from "@/lib/supabase/server";
import { tryStructuredHubResponse } from "@/lib/hub/structured-router";
import type { HubConversationContext } from "@/lib/hub/types";

type HubPayload = { query?: unknown; context?: unknown };

const intentsWithoutEvents = new Set(["tickets", "shop", "map", "dining"]);

function cleanContext(value: unknown): HubConversationContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const text = (key: string, limit = 120) => typeof input[key] === "string" ? String(input[key]).trim().slice(0, limit) : undefined;
  const list = (key: string) => Array.isArray(input[key]) ? input[key].filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 40)).slice(0, 10) : undefined;
  const rawBudget = typeof input.budgetMax === "number" ? input.budgetMax : undefined;
  return { eventId: text("eventId", 36), eventSlug: text("eventSlug", 160), eventTitle: text("eventTitle", 160), city: text("city", 100), avoidTerms: list("avoidTerms"), preferredGenres: list("preferredGenres"), budgetMax: rawBudget != null && Number.isFinite(rawBudget) && rawBudget >= 0 && rawBudget <= 10000 ? rawBudget : undefined };
}

export async function POST(request: Request) {
  let payload: HubPayload;
  try {
    payload = await request.json() as HubPayload;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  const conversationContext = cleanContext(payload.context);
  if (!query || query.length > 240) {
    return NextResponse.json({ error: "Escreve um pedido entre 1 e 240 caracteres." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const intent = classifyHubQuery(query);
  const structuredResponse = await tryStructuredHubResponse(query, conversationContext);
  if (structuredResponse) return NextResponse.json({ ...structuredResponse, context: structuredResponse.context || conversationContext });
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
  const response = buildHubResponse(query, events, { authenticated: Boolean(user), profileCity, conversation: conversationContext });
  return NextResponse.json({ ...response, context: response.context || conversationContext });
}
