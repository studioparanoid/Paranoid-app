import { supabase } from "@/lib/supabase/public";

export type Artist = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string[] | null;
  description: string | null;
  instagram: string | null;
  bandcamp: string | null;
};

export async function getArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar artistas:", error);
    return [];
  }

  return data || [];
}

export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao carregar artista:", error);
    return null;
  }

  return data;
}