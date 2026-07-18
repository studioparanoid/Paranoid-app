import { NextResponse } from "next/server";
import { buildHubResponse, classifyHubQuery, type HubEventRecord } from "@/lib/hub/router";
import { getHubPersonalityResponse } from "@/lib/hub/hub-personality.js";
import { HubTimeoutError, withHubTimeout } from "@/lib/hub/timeout";
import { createClient } from "@/lib/supabase/server";
import { tryStructuredHubResponse } from "@/lib/hub/structured-router";
import type { HubConversationContext } from "@/lib/hub/types";

type HubPayload = { query?: unknown; context?: unknown };

const intentsWithoutEvents = new Set(["tickets", "shop", "map", "profile", "dining"]);
const hubTimeoutMs = 8_000;

function cleanContext(value: unknown): HubConversationContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const text = (key: string, limit = 120) => typeof input[key] === "string" ? String(input[key]).trim().slice(0, limit) : undefined;
  const list = (key: string) => Array.isArray(input[key]) ? input[key].filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 40)).slice(0, 10) : undefined;
  const rawBudget = typeof input.budgetMax === "number" ? input.budgetMax : undefined;
  const pendingQuestion = input.pendingQuestion === "city" || input.pendingQuestion === "nightStyle" ? input.pendingQuestion : input.pendingQuestion === null ? null : undefined;
  const pendingIntent = input.pendingIntent === "agenda" || input.pendingIntent === "nearby" || input.pendingIntent === "dining" ? input.pendingIntent : input.pendingIntent === null ? null : undefined;
  return { eventId: text("eventId", 36), eventSlug: text("eventSlug", 160), eventTitle: text("eventTitle", 160), city: text("city", 100), nightStyle: text("nightStyle", 80), pendingQuestion, pendingIntent, avoidTerms: list("avoidTerms"), preferredGenres: list("preferredGenres"), budgetMax: rawBudget != null && Number.isFinite(rawBudget) && rawBudget >= 0 && rawBudget <= 10000 ? rawBudget : undefined };
}

async function resolveHubRequest(query: string, conversationContext: HubConversationContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const intent = classifyHubQuery(query);
  const structuredResponse = await tryStructuredHubResponse(query, conversationContext);
  if (structuredResponse) return { ...structuredResponse, context: structuredResponse.context || conversationContext };
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
    if (error) throw new Error(error.message);
    events = (data || []) as HubEventRecord[];
  }

  // A future AI tool-calling layer can replace this interpreter while preserving this response contract.
  const response = buildHubResponse(query, events, { authenticated: Boolean(user), profileCity, conversation: conversationContext });
  return { ...response, context: response.context || conversationContext };
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

  const localResponse = getHubPersonalityResponse(query, conversationContext);
  if (localResponse) {
    return NextResponse.json({ ...localResponse, context: localResponse.context || conversationContext });
  }

  try {
    return NextResponse.json(await withHubTimeout(resolveHubRequest(query, conversationContext), hubTimeoutMs));
  } catch (error) {
    console.error("[hub] Falha ao processar pedido", error);
    if (error instanceof HubTimeoutError) {
      return NextResponse.json({ error: "Demorei demasiado a obter a informação. Tenta novamente." }, { status: 504 });
    }
    return NextResponse.json({ error: "O Hub falhou a responder. Tenta novamente." }, { status: 500 });
  }
}
