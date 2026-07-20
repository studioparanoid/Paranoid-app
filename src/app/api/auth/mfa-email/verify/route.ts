import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailMfaMaxAttempts, hashEmailMfaCode, parseEmailMfaPurpose } from "@/lib/auth/emailMfa";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const purpose = parseEmailMfaPurpose(body.purpose);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!purpose || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Código inválido." }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const admin = getRequiredSupabaseAdminClient();

  const { data: pending } = await admin
    .from("mfa_email_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", user.id)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return NextResponse.json({ error: "Pede um código novo." }, { status: 400 });

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await admin.from("mfa_email_codes").delete().eq("id", pending.id);
    return NextResponse.json({ error: "O código expirou. Pede um novo." }, { status: 400 });
  }

  if (pending.attempts >= emailMfaMaxAttempts) {
    await admin.from("mfa_email_codes").delete().eq("id", pending.id);
    return NextResponse.json({ error: "Demasiadas tentativas. Pede um novo código." }, { status: 429 });
  }

  if (pending.code_hash !== hashEmailMfaCode(code)) {
    await admin.from("mfa_email_codes").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);
    return NextResponse.json({ error: "Código incorreto." }, { status: 400 });
  }

  await admin.from("mfa_email_codes").delete().eq("id", pending.id);

  if (purpose === "enroll") {
    const { error: updateError } = await admin.from("profiles").update({ email_mfa_enabled: true }).eq("id", user.id);
    if (updateError) return NextResponse.json({ error: "Não foi possível ativar a verificação por email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
