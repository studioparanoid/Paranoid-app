import { NextResponse } from "next/server";
import { isDiscoveryApiEnabled } from "@/lib/discovery/flag";
import { buildDiscoveryResponse } from "@/lib/discovery/server";
import type { DiscoveryLocation, DiscoveryRequest } from "@/lib/discovery/types";
import { HubTimeoutError, withHubTimeout } from "@/lib/hub/timeout";
import type { HubConversationContext, HubIntent } from "@/lib/hub/types";

const discoveryTimeoutMs = 8_000;
const hubIntents = new Set<HubIntent>(["agenda", "nearby", "map", "tickets", "shop", "lineup", "dining", "unknown"]);

function cleanContext(value: unknown): HubConversationContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const text = (key: string, limit = 120) => typeof input[key] === "string" ? String(input[key]).trim().slice(0, limit) : undefined;
  const list = (key: string) => Array.isArray(input[key]) ? input[key].filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 40)).filter(Boolean).slice(0, 10) : undefined;
  const budget = typeof input.budgetMax === "number" && Number.isFinite(input.budgetMax) && input.budgetMax >= 0 && input.budgetMax <= 10_000 ? input.budgetMax : undefined;
  const pendingQuestion = input.pendingQuestion === "city" || input.pendingQuestion === "nightStyle" ? input.pendingQuestion : input.pendingQuestion === null ? null : undefined;
  const pendingIntent = input.pendingIntent === "agenda" || input.pendingIntent === "nearby" || input.pendingIntent === "dining" ? input.pendingIntent : input.pendingIntent === null ? null : undefined;
  return { eventId: text("eventId", 36), eventSlug: text("eventSlug", 160), eventTitle: text("eventTitle", 160), city: text("city", 100), nightStyle: text("nightStyle", 80), pendingQuestion, pendingIntent, avoidTerms: list("avoidTerms"), preferredGenres: list("preferredGenres"), budgetMax: budget };
}

function cleanLocation(value: unknown): DiscoveryLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  if (input.source !== "manual" || typeof input.latitude !== "number" || typeof input.longitude !== "number") return undefined;
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude) || Math.abs(input.latitude) > 90 || Math.abs(input.longitude) > 180) return undefined;
  return { latitude: input.latitude, longitude: input.longitude, label: typeof input.label === "string" ? input.label.trim().slice(0, 120) : undefined, source: "manual" };
}

export async function POST(request: Request) {
  if (!isDiscoveryApiEnabled()) return NextResponse.json({ error: "Discovery Feed desativado." }, { status: 404 });
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const query = typeof payload.query === "string" ? payload.query.trim().slice(0, 240) : "";
  const rawIntent = typeof payload.intent === "string" && hubIntents.has(payload.intent as HubIntent) ? payload.intent as HubIntent : undefined;
  const discoveryRequest: DiscoveryRequest = { query, intent: rawIntent, context: cleanContext(payload.context), location: cleanLocation(payload.location) };
  try {
    return NextResponse.json(await withHubTimeout(buildDiscoveryResponse(discoveryRequest), discoveryTimeoutMs));
  } catch (error) {
    console.error("[discovery] Falha ao preparar feed", error);
    if (error instanceof HubTimeoutError) return NextResponse.json({ error: "O feed demorou demasiado a atualizar." }, { status: 504 });
    return NextResponse.json({ error: "Não foi possível atualizar o feed." }, { status: 500 });
  }
}
