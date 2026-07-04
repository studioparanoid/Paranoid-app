import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string[] | null;
  description: string | null;
  instagram: string | null;
  bandcamp: string | null;
};

type EventArtistRow = {
  event_id: string;
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

async function getArtist(slug: string) {
  const { data, error } = await supabase
    .from("artists")
    .select("id,slug,name,city,genres,description,instagram,bandcamp")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ArtistRow;
}

async function getArtistEvents(artistId: string) {
  const { data: relationData, error: relationError } = await supabase
    .from("event_artists")
    .select("event_id")
    .eq("artist_id", artistId);

  if (relationError || !relationData) {
    return [];
  }

  const eventIds = ((relationData || []) as EventArtistRow[])
    .map((row) => row.event_id)
    .filter(Boolean);

  if (eventIds.length === 0) {
    return [];
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .in("id", eventIds)
    .eq("status", "published")
    .order("start_at", { ascending: true });

  if (eventsError || !eventsData) {
    return [];
  }

  return (eventsData || []) as EventRow[];
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const artist = await getArtist(slug);

  if (!artist) {
    notFound();
  }

  const events = await getArtistEvents(artist.id);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link
          href="/descobrir"
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar ao descobrir
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Artista
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          {artist.name}
        </h1>

        <div className="mt-5 space-y-2 text-base text-zinc-400">
          {artist.city && <p>{artist.city}</p>}

          {artist.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {artist.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-bold text-zinc-400"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {artist.description && (
          <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm leading-relaxed text-zinc-400">
              {artist.description}
            </p>
          </div>
        )}

        {(artist.instagram || artist.bandcamp) && (
          <div className="mt-5 flex gap-2">
            {artist.instagram && (
              <a
                href={artist.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
              >
                Instagram
              </a>
            )}

            {artist.bandcamp && (
              <a
                href={artist.bandcamp}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
              >
                Bandcamp
              </a>
            )}
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Agenda
              </p>

              <h2 className="mt-2 text-3xl font-black">Eventos</h2>
            </div>

            <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
              {events.length}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {events.length === 0 && (
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-500">
                  Ainda não há eventos publicados para este artista.
                </p>
              </div>
            )}

            {events.map((event) => (
              <Link
                key={event.id}
                href={`/eventos/${event.slug}`}
                className="block rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
              >
                {event.image_url && (
                  <div
                    className="mb-4 h-56 rounded-[1.5rem] bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${event.image_url})`,
                    }}
                  />
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                      {event.category || "Evento"}
                    </p>

                    <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
                      {event.title}
                    </h3>
                  </div>

                  {event.featured && (
                    <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
                      Destaque
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-sm text-zinc-400">
                  <p>
                    <span className="font-bold text-zinc-300">Data:</span>{" "}
                    {event.display_date || "Data por definir"}{" "}
                    {event.display_time ? `· ${event.display_time}` : ""}
                  </p>

                  <p>
                    <span className="font-bold text-zinc-300">Cidade:</span>{" "}
                    {event.city || "Cidade por definir"}
                  </p>

                  <p>
                    <span className="font-bold text-zinc-300">Espaço:</span>{" "}
                    {event.venue_name || "Espaço por definir"}
                  </p>

                  <p>
                    <span className="font-bold text-zinc-300">
                      Organizador:
                    </span>{" "}
                    {event.organizer_name || "Organizador por definir"}
                  </p>

                  {event.price && (
                    <p>
                      <span className="font-bold text-zinc-300">Preço:</span>{" "}
                      {event.price}
                    </p>
                  )}
                </div>

                {event.description && (
                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
                    {event.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}