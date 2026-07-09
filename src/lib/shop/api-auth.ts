import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/public";

export async function getShopApiUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function isShopAdminUser(userId: string) {
  const adminClient = getSupabaseAdminClient();
  const { data } = await adminClient
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

