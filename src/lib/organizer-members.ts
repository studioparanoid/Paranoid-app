import { supabase } from "@/lib/supabase/public";

export type OrganizerMembership = {
  id: string;
  role: string;
  organizer_id: string;
  organizers: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    pack: string | null;
    verified: boolean | null;
  } | null;
};

export async function getMyOrganizerMemberships(): Promise<OrganizerMembership[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("organizer_members")
    .select(
      `
      id,
      role,
      organizer_id,
      organizers (
        id,
        slug,
        name,
        city,
        pack,
        verified
      )
    `
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao carregar organizadores do user:", error);
    return [];
  }

  return (data || []) as unknown as OrganizerMembership[];
}