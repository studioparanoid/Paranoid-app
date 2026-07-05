import Link from "next/link";
import { notFound } from "next/navigation";
import { EventPublicActions } from "@/components/EventPublicActions";
import { supabase } from "@/lib/supabase/public";

type TicketMode = "none" | "external" | "internal";

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

  ticket_mode: TicketMode | null;
  ticket_url: string | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  ticket_button_label: string | null;
  instagram_url: string | null;

  featured: boolean | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
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
      "id,slug,title,city,venue_id,venue_name,organizer_id,organizer_name,display_date,display_time,category,price,description,image_url,ticket_mode,ticket_url,ticket_price,ticket_capacity,ticket_button_label,instagram_url,featured,status,start_at,end_at"
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

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-700">
        {label}
      </p>

      <div className="mt-2 text-lg font-black text-[#f2f1ec]">{children}</div>
    </div>
  );
}

function TicketBox({ event }: { event: EventRow }) {
  const ticketMode = event.ticket_mode || "none";

  if (ticketMode === "none" && !event.instagram_url) {
    return null;
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-red-950 bg-red-950/20 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-red-500">
        Bilheteira
      </p>

      {ticketMode === "internal" && (
        <div className="mt-4">
          <h2 className="text-3xl font-black leading-none">
            Bilheteira Paranoid.
          </h2>

          <div className="mt-4 space-y-1 text-sm text-zinc-400">
            <p>
              <span className="font-bold text-zinc-300">Preço:</span>{" "}
              {event.ticket_price || event.price || "Preço por definir"}
            </p>

            {event.ticket_capacity && (
              <p>
                <span className="font-bold text-zinc-300">Lotação:</span>{" "}
                {event.ticket_capacity}
              </p>
            )}

            <p className="text-red-300">
              Compra online ainda em preparação.
            </p>
          </div>

          <Link
            href={`/bilhetes/${event.slug}`}
            className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            {event.ticket_button_label || "Comprar na Paranoid"}
          </Link>
        </div>
      )}

      {ticketMode === "external" && event.ticket_url && (
        <div className="mt-4">
          <h2 className="text-3xl font-black leading-none">
            Bilhetes externos.
          </h2>

          <a
            href={event.ticket_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            {event.ticket_button_label || "Bilhetes / inscrição"}
          </a>
        </div>
      )}

      {event.instagram_url && (
        <a
          href={event.instagram_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-300"
        >
          Instagram / mais info
        </a>
      )}
    </section>
  );
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
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link href="/agenda" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar à agenda
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            {event.image_url ? (
              <div
                className="h-80 rounded-[2rem] bg-cover bg-center lg:h-[720px] lg:rounded-[3rem]"
                style={{
                  backgroundImage: `url(${event.image_url})`,
                }}
              />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-[2rem] border border-zinc-800 bg-zinc-950 lg:h-[720px] lg:rounded-[3rem]">
                <div className="px-8 text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-red-700">
                    Paranoid
                  </p>

                  <p className="mt-4 text-4xl font-black leading-none text-zinc-700 lg:text-7xl">
                    Poster por chegar.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-28">
            <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
                    {event.category || "Evento"}
                  </p>

                  <h1 className="text-5xl font-black leading-none tracking-tight lg:text-7xl">
                    {event.title}
                  </h1>
                </div>

                {event.featured && (
                  <span className="mt-1 shrink-0 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
                    Destaque
                  </span>
                )}
              </div>

              <div className="mt-8 grid gap-5">
                <InfoBlock label="Data">
                  <>
                    {event.display_date || "Data por definir"}
                    {event.display_time ? ` · ${event.display_time}` : ""}
                  </>
                </InfoBlock>

                <InfoBlock label="Cidade">
                  {event.city || "Cidade por definir"}
                </InfoBlock>

                <InfoBlock label="Espaço">
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
                </InfoBlock>

                <InfoBlock label="Organizador">
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
                </InfoBlock>

                <InfoBlock label="Preço">
                  {event.price || "Preço por definir"}
                </InfoBlock>
              </div>
            </div>

            {artists.length > 0 && (
              <section className="mt-6 rounded-[2rem] border border-zinc-800 bg-black p-5">
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

            <TicketBox event={event} />

            <EventPublicActions
              eventId={event.id}
              title={event.title}
              slug={event.slug}
              description={event.description}
              startAt={event.start_at}
              endAt={event.end_at || event.start_at}
              city={event.city}
              venueName={event.venue_name}
            />
          </div>
        </section>

        {event.description && (
          <section className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:mt-12 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.35fr_1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Descrição
                </p>

                <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                  O que vai acontecer.
                </h2>
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-400 lg:text-base">
                {event.description}
              </p>
            </div>
          </section>
        )}

        <section className="mt-8 grid grid-cols-2 gap-3 lg:mt-12 lg:max-w-xl">
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
        </section>
      </section>
    </main>
  );
}