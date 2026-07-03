import { supabase } from "@/lib/supabase/public";

export type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  instagram: string | null;
};

export async function getVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("city", { ascending: true });

  if (error) {
    console.error("Erro ao carregar espaços:", error);
    return [];
  }

  return data || [];
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao carregar espaço:", error);
    return null;
  }

  return data;
}