import Link from "next/link";

type EventCardProps = {
  event: {
    slug: string;
    title: string;
    city: string;
    venue: string;
    date: string;
    time: string;
    category: string;
    price: string;
  };
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/eventos/${event.slug}`}>
      <article className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-red-900">
        <div className="mb-4 h-44 rounded-2xl bg-gradient-to-br from-zinc-800 to-red-950" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
              {event.category}
            </p>

            <h2 className="text-2xl font-black">{event.title}</h2>

            <p className="mt-2 text-sm text-zinc-400">
              {event.date} · {event.time}
            </p>

            <p className="text-sm text-zinc-500">
              {event.venue}, {event.city}
            </p>
          </div>

          <span className="rounded-full bg-[#f2f1ec] px-3 py-1 text-xs font-bold text-black">
            {event.price}
          </span>
        </div>
      </article>
    </Link>
  );
}
