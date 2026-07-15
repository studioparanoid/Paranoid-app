import { NextResponse } from "next/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type BulkPayload = {
  kind?: "submissions" | "events";
  ids?: string[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const { data: admin } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: "Sem permissão para concluir esta ação." }, { status: 403 });
  }

  let payload: BulkPayload;
  try {
    payload = await request.json() as BulkPayload;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const ids = [...new Set(payload.ids ?? [])].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50);
  if (!payload.kind || ids.length === 0) {
    return NextResponse.json({ error: "Não existem itens válidos." }, { status: 400 });
  }

  const adminClient = getRequiredSupabaseAdminClient();
  const result = payload.kind === "submissions"
    ? await adminClient.from("event_submissions").update({ status: "rejected" }).in("id", ids).eq("status", "pending").select("id")
    : await adminClient.from("events").update({ status: "archived" }).in("id", ids).eq("status", "published").select("id");

  if (result.error) return NextResponse.json({ error: "Não foi possível concluir a ação." }, { status: 500 });
  return NextResponse.json({ updatedIds: (result.data ?? []).map((item) => item.id) });
}
