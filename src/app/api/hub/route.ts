import { NextResponse } from "next/server";
import { buildHubResponse, classifyHubQuery, type HubEventRecord } from "@/lib/hub/router";
import { getHubPersonalityResponse } from "@/lib/hub/hub-personality.js";
import { HubTimeoutError, withHubTimeout } from "@/lib/hub/timeout";
import { createClient } from "@/lib/supabase/server";
import { tryStructuredHubResponse } from "@/lib/hub/structured-router";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { getUserTickets } from "@/lib/data/hub-tools";
import { formatMoney, getActiveShopProducts } from "@/lib/shop";
import type { HubConversationContext, HubResponse } from "@/lib/hub/types";

type HubPayload = { query?: unknown; context?: unknown };

const intentsWithoutEvents = new Set(["tickets", "shop", "map", "profile", "dining"]);
const hubTimeoutMs = 8_000;

const lisbonDateTimeFormatter = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" });

function ticketMeta(row: Record<string, unknown>) {
  const event = row.events as { starts_at?: string; start_at?: string; venue_name?: string } | null;
  const when = event?.starts_at || event?.start_at;
  const date = when ? new Date(when) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? lisbonDateTimeFormatter.format(date) : null;
  return [dateLabel, event?.venue_name].filter(Boolean).join(" · ") || null;
}

async function buildTicketsResponse(authenticated: boolean, conversationContext: HubConversationContext): Promise<HubResponse> {
  if (!authenticated) {
    return {
      intent: "tickets",
      title: "Entra para veres os teus bilhetes",
      description: "A carteira é privada e precisa de uma sessão autenticada.",
      results: [],
      actions: [{ label: "Iniciar sessão", href: "/login?next=%2Fbilhetes", primary: true }],
      context: conversationContext,
    };
  }
  const { data: tickets } = await getUserTickets();
  if (!tickets.length) {
    return {
      intent: "tickets",
      title: "Ainda não tens bilhetes",
      description: "Quando comprares bilhetes para um evento, aparecem aqui.",
      results: [],
      actions: [{ label: "Ver Agenda", href: "/agenda", primary: true }],
      context: conversationContext,
    };
  }
  const details = tickets.slice(0, 6).map((row) => {
    const event = row.events as { title?: string } | null;
    return { id: String(row.id), title: event?.title || "Evento", meta: ticketMeta(row), href: "/bilhetes" };
  });
  return {
    intent: "tickets",
    title: "Os teus bilhetes estão na carteira",
    description: `Tens ${tickets.length} ${tickets.length === 1 ? "bilhete ativo" : "bilhetes ativos"}.`,
    results: [],
    details,
    actions: [{ label: "Abrir Bilhetes", href: "/bilhetes", primary: true }],
    context: conversationContext,
  };
}

async function buildShopResponse(conversationContext: HubConversationContext): Promise<HubResponse> {
  const products = await getActiveShopProducts();
  if (!products.length) {
    return {
      intent: "shop",
      title: "A loja está a preparar-se",
      description: "Ainda não há produtos publicados.",
      results: [],
      actions: [{ label: "Abrir Loja", href: "/loja", primary: true }],
      context: conversationContext,
    };
  }
  const details = products.slice(0, 6).map((product) => ({
    id: product.id,
    title: product.name,
    meta: `${formatMoney(product.finalPriceCents)} · ${product.sellerName}`,
    href: `/loja/${product.slug}`,
  }));
  return {
    intent: "shop",
    title: "Vamos à loja.",
    description: "Merch, edições e produtos independentes.",
    results: [],
    details,
    actions: [{ label: "Abrir Loja", href: "/loja", primary: true }],
    context: conversationContext,
  };
}

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
  if (intent === "tickets") return buildTicketsResponse(Boolean(user), conversationContext);
  if (intent === "shop") return buildShopResponse(conversationContext);
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
  if (isRateLimited(`hub:${getClientIp(request)}`, 40, 60_000)) {
    return NextResponse.json({ error: "Demasiados pedidos. Tenta novamente daqui a pouco." }, { status: 429 });
  }

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
