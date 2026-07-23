import Image from "next/image";
import Link from "next/link";
import { SaveEventButton } from "@/components/SaveEventButton";
import { StatusBadge } from "@/components/StatusBadge";

export type CompactEvent = {
  id: string;
  slug: string;
  title: string;
  date: string;
  time?: string | null;
  venue?: string | null;
  city?: string | null;
  price?: string | null;
  category?: string | null;
  image?: string | null;
  featured?: boolean | null;
  reason?: string | null;
};

export function EventCardCompact({ event, showSave = true }: { event: CompactEvent; showSave?: boolean }) {
  return <article className="group card-hover grid grid-cols-[88px_1fr] gap-4 border-b border-border py-4 focus-within:bg-background sm:grid-cols-[112px_1fr_auto] sm:items-center">
    <Link href={`/eventos/${event.slug}`} aria-label={event.title} className="focus-ring relative h-24 overflow-hidden rounded bg-background sm:h-20">
      {event.image ? <Image src={event.image} alt="" fill sizes="(min-width: 640px) 112px, 88px" unoptimized className="interactive object-cover group-hover:scale-[1.02]" /> : <span className="block h-full w-full bg-[radial-gradient(circle_at_top,#3f0d0d,#111)]" />}
    </Link>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-wider text-danger">{event.date}{event.time ? ` · ${event.time}` : ""}</p>{event.featured && <StatusBadge label="Destaque" tone="danger" />}{event.reason && <StatusBadge label={event.reason} />}</div>
      <Link href={`/eventos/${event.slug}`} className="focus-ring rounded"><h3 className="interactive mt-1 line-clamp-2 text-lg font-black leading-tight group-hover:text-white sm:text-xl">{event.title}</h3></Link>
      <p className="mt-1 truncate text-xs text-foreground-muted">{[event.venue, event.city].filter(Boolean).join(" · ") || event.category || "Evento"}</p>
      {event.price && <p className="mt-1 text-xs font-bold text-foreground-muted">{event.price}</p>}
    </div>
    <div className="col-span-2 flex items-center gap-2 pl-[104px] sm:col-span-1 sm:pl-0">{showSave && <SaveEventButton eventId={event.id} compact />}<Link href={`/eventos/${event.slug}`} className="pressable focus-ring rounded-full border border-border-strong px-4 py-2 text-xs font-black hover:border-border-strong">Ver evento</Link></div>
  </article>;
}
