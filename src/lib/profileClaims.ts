import { supabase } from "@/lib/supabase/public";

export type ProfileClaimAccountType = "artist" | "organizer" | "venue";

export async function createProfileClaim(input: {
  accountType: ProfileClaimAccountType;
  displayName: string;
  entityName: string;
  city?: string | null;
  instagramUrl?: string | null;
}): Promise<{ id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Autenticação necessária.");

  const { data, error } = await supabase
    .from("profile_claims")
    .insert({
      user_id: user.id,
      account_type: input.accountType,
      display_name: input.displayName.trim(),
      entity_name: input.entityName.trim(),
      city: input.city?.trim() || null,
      instagram_url: input.instagramUrl?.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
