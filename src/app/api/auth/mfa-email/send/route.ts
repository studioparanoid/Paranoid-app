import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  buildEmailMfaMessage,
  emailMfaCodeTtlMs,
  emailMfaResendCooldownMs,
  generateEmailMfaCode,
  hashEmailMfaCode,
  parseEmailMfaPurpose,
} from "@/lib/auth/emailMfa";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isRateLimited(`mfa-send:${getClientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiados pedidos. Tenta novamente daqui a pouco." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const purpose = parseEmailMfaPurpose(body.purpose);
  if (!purpose) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const admin = getRequiredSupabaseAdminClient();

  const { data: recent } = await admin
    .from("mfa_email_codes")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < emailMfaResendCooldownMs) {
    return NextResponse.json({ error: "Aguarda um pouco antes de pedir outro código." }, { status: 429 });
  }

  const code = generateEmailMfaCode();
  const expiresAt = new Date(Date.now() + emailMfaCodeTtlMs).toISOString();

  const { error: insertError } = await admin.from("mfa_email_codes").insert({
    user_id: user.id,
    purpose,
    code_hash: hashEmailMfaCode(code),
    expires_at: expiresAt,
  });

  if (insertError) return NextResponse.json({ error: "Não foi possível preparar o código." }, { status: 500 });

  try {
    const message = buildEmailMfaMessage(code);
    await sendTransactionalEmail({ to: user.email, ...message });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar o email. Tenta novamente." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email: user.email });
}
