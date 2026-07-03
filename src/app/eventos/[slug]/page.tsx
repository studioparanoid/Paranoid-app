import Link from "next/link";
import { notFound } from "next/navigation";
import { events } from "@/data/events";

export function generateStaticParams() {
  return events.map((event) => ({
    slug: event.slug,
  }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = events.find((event) => event.slug === slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f2f1ec]">
      <section className="px-5 py-8">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <div className="mb-6 h-72 rounded-3xl bg-gradient-to-br from-zinc-800 to-red-950" />

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          {event.category}
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          {event.title}
        </h1>

        <div className="mt-5 space-y-1 text-zinc-400">
          <Link
  href={`/espacos/${event.venueSlug}`}
  className="inline-block text-zinc-300 underline decoration-zinc-700 underline-offset-4"
>
  {event.venue}, {event.city}
</Link>
          <p>
            {event.venue}, {event.city}
          </p>
          <p>{event.price}</p>
        </div>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-300">
          {event.description}
        </p>

        <div className="mt-8 flex gap-3">
          <button className="rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">
            Guardar
          </button>

          <button className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300">
            Partilhar
          </button>
        </div>
      </section>
    </main>
  );
}