import { supabase } from "@/lib/supabase/public";

type EntityTable = "artists" | "venues" | "organizers";

export async function findExistingEntity(table: EntityTable, slug: string, name: string, city: string, columns = "id,slug,name") {
  const bySlug = await supabase.from(table).select(columns).eq("slug", slug).maybeSingle();
  if (bySlug.error) throw new Error(bySlug.error.message);
  if (bySlug.data) return bySlug.data as unknown as Record<string, unknown>;

  let query = supabase.from(table).select(columns).ilike("name", name.trim());
  if (city.trim()) query = query.ilike("city", city.trim());
  const byIdentity = await query.limit(2);
  if (byIdentity.error) throw new Error(byIdentity.error.message);
  return byIdentity.data?.length === 1 ? byIdentity.data[0] as unknown as Record<string, unknown> : null;
}
