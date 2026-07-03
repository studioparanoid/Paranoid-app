import { supabase } from "@/lib/supabase/public";

export type AppEvent = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue: string;
  venueSlug: string;
  organizer: string;
  organizerSlug: string;
  artists: {
    name: string;
    slug: string;
  }[];
  date: string;
  time: string;
  category: string;
  price: string;
  description: string;
  image: string | null;
  featured: boolean;
};

type SupabaseEventRow = {
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
  venues: {
    slug: string;
    name: string;
    city: string;
  } | null;
  organizers: {
    slug: string;
    name: string;
  } | null;
  event_artists:
    | {
        artists: {
          slug: string;
          name: string;
        } | null;
      }[]
    | null;
};

function mapEvent(event: SupabaseEventRow): AppEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    city: event.city,
    venue: event.venues?.name || event.venue_name || "Espaço por definir",
    venueSlug: event.venues?.slug || "",
    organizer:
  event.organizers?.name || event.organizer_name || "Organizador por definir",
    organizerSlug: event.organizers?.slug || "",
    artists:
      event.event_artists
        ?.map((item) => item.artists)
        .filter((artist): artist is { slug: string; name: string } =>
          Boolean(artist)
        ) || [],
    date: event.display_date || "Data por definir",
    time: event.display_time || "Hora por definir",
    category: event.category,
    price: event.price || "Preço por definir",
    description: event.description || "",
    image: event.image_url,
    featured: Boolean(event.featured),
  };
}

const eventSelect = `
  id,
  slug,
  title,
  city,
venue_name,
organizer_name,
  display_date,
  display_time,
  category,
  price,
  description,
  image_url,
  featured,
  venues (
    slug,
    name,
    city
  ),
  organizers (
    slug,
    name
  ),
  event_artists (
    artists (
      slug,
      name
    )
  )
`;

export async function getEvents(): Promise<AppEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .eq("status", "published")
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar eventos:", error);
    return [];
  }

  return ((data || []) as unknown as SupabaseEventRow[]).map(mapEvent);
}

export async function getEventBySlug(slug: string): Promise<AppEvent | null> {
  const { data, error } = await supabase
    .from("events")
    .select(eventSelect)
    .eq("status", "published")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao carregar evento:", error);
    return null;
  }

  return mapEvent(data as unknown as SupabaseEventRow);
}