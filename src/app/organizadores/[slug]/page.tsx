import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
  instagram: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
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

async function getOrganizer(slug: string) {
  const { data, error } = await supabase
    .from("organizers")
    .select("id,slug,name,city,description,pack,verified,instagram")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as OrganizerRow;
}

async function getOrganizerEvents(organizer: OrganizerRow) {
  const { data: eventsById, error: eventsByIdError } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,organizer_id,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .eq("organizer_id", organizer.id)
    .eq("status", "published")
    .order("start_at", { ascending: true });

  if (eventsByIdError) {
    return [];
  }

  const events = ((eventsById || []) as EventRow[]).filter(
    (event) => event.status === "published"
  );

  if (events.length > 0) {
    return events;
  }

  const { data: eventsByName, error: eventsByNameError } = await supabase
    .from("events")
    .select(
      "id,slug,title,city,venue_name,organizer_id,organizer_name,display_date,display_time,category,price,description,image_url,featured,status,start_at"
    )
    .eq("organizer_name", organizer.name)
    .eq("status", "published")
    .order("start_at", { ascending: true });

  if (eventsByNameError) {
    return [];
  }

  return ((eventsByName || []) as EventRow[]).filter(
    (event) => event.status === "published"
  );
}

export default async function OrganizerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const organizer = await getOrganizer(slug);

  if (!organizer) {
    notFound();
  }

  const events = await getOrganizerEvents(organizer);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link
          href="/descobrir"
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar ao descobrir
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Organizador
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight">
              {organizer.name}
            </h1>
          </div>

          {organizer.verified && (
            <span className="mt-1 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
              Verificado
            </span>
          )}
        </div>

        <div className="mt-5 space-y-2 text-base text-zinc-400">
          {organizer.city && <p>{organizer.city}</p>}

          {organizer.pack && (
            <p className="text-sm font-bold uppercase tracking-wide text-zinc-600">
              {organizer.pack}
            </p>
          )}
        </div>

        {organizer.description && (
          <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm leading-relaxed text-zinc-400">
              {organizer.description}
            </p>
          </div>
        )}

        {organizer.instagram && (
          <div className="mt-5">
            <a
              href={organizer.instagram}
              target="_blank"
              rel="noreferrer"
              className="block rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
            >
              Instagram
            </a>
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
                  Ainda não há eventos publicados deste organizador.
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