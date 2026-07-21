import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action === "accept" || body.action === "decline" ? body.action : null;
  if (!action) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const admin = getRequiredSupabaseAdminClient();
  const { data: membership, error } = await admin
    .from("organizer_members")
    .select("id,user_id,status")
    .eq("id", id)
    .maybeSingle();

  if (error || !membership) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  if (membership.user_id !== user.id) return NextResponse.json({ error: "Este convite não é para esta conta." }, { status: 403 });
  if (membership.status !== "invited") return NextResponse.json({ error: "Este convite já foi respondido." }, { status: 409 });

  const patch = action === "accept"
    ? { status: "active", accepted_at: new Date().toISOString() }
    : { status: "removed" };

  const { error: updateError } = await admin.from("organizer_members").update(patch).eq("id", id);
  if (updateError) return NextResponse.json({ error: "Não foi possível responder ao convite." }, { status: 500 });

  return NextResponse.json({ ok: true, status: patch.status });
}
