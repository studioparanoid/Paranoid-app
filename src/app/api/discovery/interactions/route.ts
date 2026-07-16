import { NextResponse } from "next/server";
import { isDiscoveryFeedEnabled } from "@/lib/discovery/flag";
import { createClient } from "@/lib/supabase/server";

const itemTypes = new Set(["event", "venue", "promotion", "product", "community"]);
const actions = new Set(["open", "dismiss"]);

export async function POST(request: Request) {
  if (!isDiscoveryFeedEnabled()) return NextResponse.json({ error: "Discovery Feed desativado." }, { status: 404 });
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const itemType = typeof payload.itemType === "string" && itemTypes.has(payload.itemType) ? payload.itemType : "";
  const itemId = typeof payload.itemId === "string" ? payload.itemId.trim().slice(0, 160) : "";
  const action = typeof payload.action === "string" && actions.has(payload.action) ? payload.action : "";
  const intent = typeof payload.intent === "string" ? payload.intent.trim().slice(0, 40) : null;
  if (!itemType || !itemId || !action) return NextResponse.json({ error: "Interação inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 204 });
  const { error } = await supabase.from("discovery_interactions").insert({ user_id: user.id, item_type: itemType, item_id: itemId, action, intent });
  if (error) {
    if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code || "")) return new NextResponse(null, { status: 204 });
    return NextResponse.json({ error: "Não foi possível guardar a interação." }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
