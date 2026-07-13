import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon } from "@/components/AppIcon";
import { SaveEventButton } from "@/components/SaveEventButton";

export type EventCardEvent = {
  id: string;
  slug: string;
  title: string;
  date: string;
  time?: string | null;
  venue?: string | null;
  municipality?: string | null;
  city?: string | null;
  price?: string | null;
  category?: string | null;
  image?: string | null;
  featured?: boolean | null;
  reason?: string | null;
};

export function EventCard({ event, showSave = true, action }: { event: EventCardEvent; showSave?: boolean; action?: ReactNode }) {
  const location = [event.venue, event.municipality || event.city].filter(Boolean).join(" · ");

  return (
    <article className="group card-hover relative min-w-0 overflow-hidden rounded-lg border border-zinc-900 bg-[#0d0d0d] hover:border-zinc-700 focus-within:border-red-900">
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        {event.image ? (
          <Image
            src={event.image}
            alt=""
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
            unoptimized
            className="interactive object-cover duration-[var(--motion-slow)] group-hover:scale-[1.02]"
          />
        ) : (
          <div className="event-card-fallback absolute inset-0 grid place-items-center px-6 text-center">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-700">{event.category || "Evento"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-[#f2f1ec] px-2.5 py-1.5 text-[0.65rem] font-black uppercase tracking-wide text-black">{event.date}</span>
            {event.featured ? <span className="rounded border border-red-500/60 bg-red-950/85 px-2.5 py-1.5 text-[0.6rem] font-black uppercase tracking-wide text-red-100">Destaque</span> : null}
          </div>
          {action ? <div className="relative z-30">{action}</div> : showSave ? <div className="relative z-30"><SaveEventButton eventId={event.id} compact /></div> : null}
        </div>
        {event.reason ? <span className="absolute bottom-3 left-3 z-20 max-w-[75%] rounded bg-black/75 px-2.5 py-1.5 text-[0.65rem] font-bold text-zinc-200">{event.reason}</span> : null}
      </div>

      <div className="relative min-h-36 p-4">
        <Link href={`/eventos/${event.slug}`} className="focus-ring absolute inset-0 z-10 rounded-lg" aria-label={`Abrir ${event.title}`} />
        <h3 className="line-clamp-2 pr-8 text-xl font-black leading-[1.08] text-[#f2f1ec]">{event.title}</h3>
        <p className="mt-3 truncate text-xs font-bold text-zinc-500">{location || event.category || "Local por definir"}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-600">
          <span>{event.time || "Hora por definir"}</span>
          {event.price ? <span className="font-black text-zinc-300">{event.price}</span> : null}
        </div>
        <AppIcon name="chevron" className="absolute bottom-4 right-4 h-4 w-4 translate-x-1 text-zinc-700 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </article>
  );
}
