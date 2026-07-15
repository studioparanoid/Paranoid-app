import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function requireAal2(nextPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const safeNext = safeInternalPath(nextPath);

  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext)}`);

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel === "aal1" && assurance.nextLevel === "aal2") {
    redirect(`/auth/mfa?next=${encodeURIComponent(safeNext)}`);
  }
  if (assurance?.currentLevel !== "aal2") {
    redirect(`/perfil?onboarding=1&step=security&next=${encodeURIComponent(safeNext)}`);
  }

  return { supabase, user };
}

export async function requireAdmin(nextPath = "/admin") {
  const access = await requireAal2(nextPath);
  const { data: admin } = await access.supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (!admin) redirect("/perfil");
  return access;
}
