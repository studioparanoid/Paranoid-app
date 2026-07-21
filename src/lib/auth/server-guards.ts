import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function requireAuthenticated(nextPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const safeNext = safeInternalPath(nextPath);

  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext)}`);

  return { supabase, user };
}

export async function requireAdmin(nextPath = "/admin") {
  const access = await requireAuthenticated(nextPath);
  const { data: admin } = await access.supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (!admin) redirect("/perfil");
  return access;
}

export async function requireOrganizerMember(organizerId: string, nextPath = "/organizador") {
  const access = await requireAuthenticated(nextPath);
  const { data: membership } = await access.supabase
    .from("organizer_members")
    .select("id, role")
    .eq("organizer_id", organizerId)
    .eq("user_id", access.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) redirect("/organizador");
  return { ...access, membership };
}
