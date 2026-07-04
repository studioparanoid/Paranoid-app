import { supabase } from "@/lib/supabase/public";

export type EventSubmission = {
  id: string;
  title: string;
  city: string;
  venue: string | null;
  organizer: string | null;
  category: string;
submitted_by: string | null;
organizer_id: string | null;
  event_date: string | null;
  event_time: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

export async function getEventSubmissions(): Promise<EventSubmission[]> {
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar submissões:", error);
    return [];
  }

  return data || [];
}