import { supabase } from "@/lib/supabase/public";

export type AppEvent = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue: string;
  organizer: string;
  date: string;
  time: string;
  category: string;
  price: string;
  description: string;
  image: string | null;
  featured: boolean;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  category: string;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  status: string | null;
  start_at: string | null;
};

function mapEvent(row: EventRow): AppEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    venue: row.venue_name || "Espaço por definir",
    organizer: row.organizer_name || "Organizador por definir",
    date: row.display_date || "Data por definir",
    time: row.display_time || "Hora por definir",
    category: row.category,
    price: row.price || "Preço por definir",
    description: row.description || "",
    image: row.image_url,
    featured: Boolean(row.featured),
  };
}

export async function getEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .eq("status", "published")
    .order("start_at", { ascending: true });

  if (error) {
    return [];
  }

  return ((data || []) as EventRow[]).map(mapEvent);
}

export async function getFeaturedEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .eq("status", "published")
    .eq("featured", true)
    .order("start_at", { ascending: true });

  if (error) {
    return [];
  }

  return ((data || []) as EventRow[]).map(mapEvent);
}

export async function getEventBySlug(slug: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEvent(data as EventRow);
}