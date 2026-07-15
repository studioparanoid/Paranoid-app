import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function hasAal2(token: string) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return (JSON.parse(decoded) as { aal?: string }).aal === "aal2";
  } catch {
    return false;
  }
}

export async function getShopApiUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return null;
  }

  const serverClient = getSupabaseAdminClient();
  const { data, error } = await serverClient.auth.getUser(token);

  if (error || !data.user || !hasAal2(token)) {
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
