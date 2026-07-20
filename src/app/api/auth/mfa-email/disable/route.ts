import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const admin = getRequiredSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ email_mfa_enabled: false }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível desativar a verificação por email." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
