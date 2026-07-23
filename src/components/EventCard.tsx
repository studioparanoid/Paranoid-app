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
    <article className="group card-hover relative min-w-0 overflow-hidden rounded-xl border border-border bg-card hover:border-border-strong focus-within:border-accent/60">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-secondary">
        {event.image ? (
          <Image
            src={event.image}
            alt=""
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
            unoptimized
            className="interactive object-cover duration-[var(--motion-slow)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="event-card-fallback absolute inset-0 grid place-items-center px-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground-muted">{event.category || "Evento"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/40" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-[var(--foreground)] px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--background)]">{event.date}</span>
            {event.featured ? <span className="rounded-md border border-[var(--accent)]/50 bg-[var(--accent)] px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wide text-white">Destaque</span> : null}
          </div>
          {action ? <div className="relative z-30">{action}</div> : showSave ? <div className="relative z-30"><SaveEventButton eventId={event.id} compact /></div> : null}
        </div>
        {event.reason ? <span className="absolute bottom-4 left-4 z-20 max-w-[75%] rounded-md bg-black/70 px-3 py-1.5 text-[0.68rem] font-semibold text-white/90">{event.reason}</span> : null}
      </div>

      <div className="relative min-h-40 p-5">
        <Link href={`/eventos/${event.slug}`} className="focus-ring absolute inset-0 z-10 rounded-xl" aria-label={`Abrir ${event.title}`} />
        <h3 className="line-clamp-2 pr-8 text-2xl font-bold leading-[1.05] tracking-tight text-foreground">{event.title}</h3>
        <p className="mt-3 truncate text-sm font-medium text-foreground-muted">{location || event.category || "Local por definir"}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-foreground-muted">
          <span>{event.time || "Hora por definir"}</span>
          {event.price ? <span className="font-semibold text-foreground-secondary">{event.price}</span> : null}
        </div>
        <AppIcon name="chevron" className="absolute bottom-5 right-5 h-4 w-4 translate-x-1 text-foreground-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </article>
  );
}
