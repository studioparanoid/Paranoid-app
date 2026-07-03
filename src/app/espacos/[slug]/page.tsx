import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/events";
import { venues } from "@/data/venues";

export function generateStaticParams() {
  return venues.map((venue) => ({
    slug: venue.slug,
  }));
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const venue = venues.find((venue) => venue.slug === slug);

  if (!venue) {
    notFound();
  }

  const venueEvents = events.filter((event) => event.venueSlug === venue.slug);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <div className="mb-6 h-64 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-red-950" />

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Espaço
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          {venue.name}
        </h1>

        <p className="mt-3 text-zinc-400">
          {venue.address}, {venue.city}
        </p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-300">
          {venue.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {venue.categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-400"
            >
              {category}
            </span>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button className="rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">
            Seguir espaço
          </button>

          <a
            href={venue.instagram}
            target="_blank"
            className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
          >
            Instagram
          </a>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Próximos eventos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            O que está marcado neste espaço.
          </p>

          <div className="mt-4 space-y-4">
            {venueEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {venueEvents.length === 0 && (
            <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-400">
                Ainda não há eventos marcados aqui.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}