import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_id: string | null;
  venue_name: string | null;
  organizer_id: string | null;
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

type VenueRow = {
  id: string;
  slug: string;
  name: string;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
};

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
};

type EventArtistRelationRow = {
  artists: ArtistRow | ArtistRow[] | null;
};

async function getEvent(slug: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_id,venue_name,organizer_id,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EventRow;
}

async function getVenue(event: EventRow) {
  if (event.venue_id) {
    const { data, error } = await supabase
      .from("venues")
      .select("id,slug,name")
      .eq("id", event.venue_id)
      .maybeSingle();

    if (!error && data) {
      return data as VenueRow;
    }
  }

  if (event.venue_name) {
    const { data, error } = await supabase
      .from("venues")
      .select("id,slug,name")
      .eq("name", event.venue_name)
      .maybeSingle();

    if (!error && data) {
      return data as VenueRow;
    }
  }

  return null;
}

async function getOrganizer(event: EventRow) {
  if (event.organizer_id) {
    const { data, error } = await supabase
      .from("organizers")
      .select("id,slug,name")
      .eq("id", event.organizer_id)
      .maybeSingle();

    if (!error && data) {
      return data as OrganizerRow;
    }
  }

  if (event.organizer_name) {
    const { data, error } = await supabase
      .from("organizers")
      .select("id,slug,name")
      .eq("name", event.organizer_name)
      .maybeSingle();

    if (!error && data) {
      return data as OrganizerRow;
    }
  }

  return null;
}

function getArtistRowsFromRelationRows(rows: EventArtistRelationRow[]) {
  const artists: ArtistRow[] = [];

  for (const row of rows) {
    if (!row.artists) {
      continue;
    }

    if (Array.isArray(row.artists)) {
      for (const artist of row.artists) {
        artists.push(artist);
      }

      continue;
    }

    artists.push(row.artists);
  }

  return artists;
}

async function getEventArtists(eventId: string) {
  const { data, error } = await supabase
    .from("event_artists")
    .select(
      `
      artists (
        id,
        slug,
        name
      )
    `
    )
    .eq("event_id", eventId);

  if (error || !data) {
    return [];
  }

  const relationRows = (data || []) as unknown as EventArtistRelationRow[];

  return getArtistRowsFromRelationRows(relationRows);
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  const [venue, organizer, artists] = await Promise.all([
    getVenue(event),
    getOrganizer(event),
    getEventArtists(event.id),
  ]);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/agenda" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar à agenda
        </Link>

        {event.image_url && (
          <div
            className="mb-6 h-80 rounded-[2rem] bg-cover bg-center"
            style={{
              backgroundImage: `url(${event.image_url})`,
            }}
          />
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              {event.category || "Evento"}
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight">
              {event.title}
            </h1>
          </div>

          {event.featured && (
            <span className="mt-1 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
              Destaque
            </span>
          )}
        </div>

        <div className="mt-8 space-y-4 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Data
            </p>

            <p className="mt-2 text-lg font-black text-[#f2f1ec]">
              {event.display_date || "Data por definir"}
              {event.display_time ? ` · ${event.display_time}` : ""}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Cidade
            </p>

            <p className="mt-2 text-lg font-black text-[#f2f1ec]">
              {event.city || "Cidade por definir"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Espaço
            </p>

            <p className="mt-2 text-lg font-black text-[#f2f1ec]">
              {venue ? (
                <Link
                  href={`/espacos/${venue.slug}`}
                  className="underline decoration-zinc-700 underline-offset-4"
                >
                  {venue.name}
                </Link>
              ) : (
                event.venue_name || "Espaço por definir"
              )}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Organizador
            </p>

            <p className="mt-2 text-lg font-black text-[#f2f1ec]">
              {organizer ? (
                <Link
                  href={`/organizadores/${organizer.slug}`}
                  className="underline decoration-zinc-700 underline-offset-4"
                >
                  {organizer.name}
                </Link>
              ) : (
                event.organizer_name || "Organizador por definir"
              )}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Preço
            </p>

            <p className="mt-2 text-lg font-black text-[#f2f1ec]">
              {event.price || "Preço por definir"}
            </p>
          </div>
        </div>

        {artists.length > 0 && (
          <section className="mt-8 rounded-[2rem] border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Artistas
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artistas/${artist.slug}`}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300"
                >
                  {artist.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {event.description && (
          <section className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Descrição
            </p>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
              {event.description}
            </p>
          </section>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link
            href="/agenda"
            className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Agenda
          </Link>

          <Link
            href="/submeter"
            className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Submeter evento
          </Link>
        </div>
      </section>
    </main>
  );
}