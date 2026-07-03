import Link from "next/link";
import { notFound } from "next/navigation";
import { SaveEventButton } from "@/components/SaveEventButton";
import { getEventBySlug } from "@/lib/events";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f2f1ec]">
      <section className="mx-auto max-w-md px-5 py-8">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <div
          className={`mb-6 h-72 rounded-3xl bg-cover bg-center ${
            event.image ? "" : "bg-gradient-to-br from-zinc-800 to-red-950"
          }`}
          style={event.image ? { backgroundImage: `url(${event.image})` } : {}}
        />

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          {event.category}
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          {event.title}
        </h1>

        <div className="mt-5 space-y-2 text-zinc-400">
          <p>
            {event.date} · {event.time}
          </p>

          {event.venueSlug ? (
            <Link
              href={`/espacos/${event.venueSlug}`}
              className="inline-block text-zinc-300 underline decoration-zinc-700 underline-offset-4"
            >
              {event.venue}, {event.city}
            </Link>
          ) : (
            <p>
              {event.venue}, {event.city}
            </p>
          )}

          <p>{event.price}</p>
        </div>

        {event.artists.length > 0 && (
          <section className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
              Artistas
            </p>

            <div className="flex flex-wrap gap-2">
              {event.artists.map((artist) => (
                <Link
                  key={artist.slug}
                  href={`/artistas/${artist.slug}`}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300"
                >
                  {artist.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {event.organizerSlug && (
          <section className="mt-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
              Organizador
            </p>

            <Link
              href={`/organizadores/${event.organizerSlug}`}
              className="inline-block text-zinc-300 underline decoration-zinc-700 underline-offset-4"
            >
              {event.organizer}
            </Link>
          </section>
        )}

        <p className="mt-8 text-lg leading-relaxed text-zinc-300">
          {event.description}
        </p>

        <div className="mt-8 flex gap-3">
          <SaveEventButton eventId={event.id} />

          <button className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300">
            Partilhar
          </button>
        </div>
      </section>
    </main>
  );
}