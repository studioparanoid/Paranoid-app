import { supabase } from "@/lib/supabase/public";

export type Organizer = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
  instagram: string | null;
};

export async function getOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar organizadores:", error);
    return [];
  }

  return data || [];
}

export async function getOrganizerBySlug(
  slug: string
): Promise<Organizer | null> {
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao carregar organizador:", error);
    return null;
  }

  return data;
}