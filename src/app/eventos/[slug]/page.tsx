"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { StructuredEventSections } from "@/components/events/StructuredEventSections";
import { Card } from "@/components/ui/Card";
import { LinkButton, buttonClassName } from "@/components/ui/Button";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  city: string | null;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  start_at: string | null;
  start_date: string | null;
  end_date: string | null;
  is_multi_day: boolean | null;
  category: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  ticket_mode: string | null;
  ticket_url: string | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  ticket_button_label: string | null;
  instagram_url: string | null;
  organizer_id: string | null;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
};

type EventArtistRow = {
  artist_id: string | null;
};

type SavedEventRow = {
  event_id: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeExternalUrl(value: string | null | undefined) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Data por definir";
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "Data por definir";
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function ticketLabel(event: EventRow) {
  if (event.ticket_button_label) {
    return event.ticket_button_label;
  }

  if (event.ticket_mode === "internal") {
    return "Reservar bilhete";
  }

  if (event.ticket_mode === "external") {
    return "Comprar bilhete";
  }

  return null;
}

function ticketBadge(event: EventRow) {
  if (event.ticket_mode === "internal") {
    return "Bilheteira Paranoid";
  }

  if (event.ticket_mode === "external") {
    return "Bilheteira externa";
  }

  return null;
}

function eventDateValue(event: EventRow) {
  return event.start_at || event.start_date || event.display_date || "";
}

function NotFoundCard() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <Card className="p-6 lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-accent">
            Evento
          </p>

          <h1 className="mt-4 text-4xl font-black leading-none lg:text-6xl">
            Isto não existe.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-foreground-muted">
            O evento pode ter sido removido, arquivado ou ainda não estar
            publicado.
          </p>

          <LinkButton href="/agenda" className="mt-8">Voltar à agenda</LinkButton>
        </Card>
      </section>
    </main>
  );
}

export default function EventPage() {
  const params = useParams();

  const slug = useMemo(() => {
    const rawSlug = params?.slug;

    if (Array.isArray(rawSlug)) {
      return rawSlug[0] || "";
    }

    return String(rawSlug || "");
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [event, setEvent] = useState<EventRow | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerRow | null>(null);
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  async function loadEvent() {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .select(
        "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,description,image_url,featured,ticket_mode,ticket_url,ticket_price,ticket_capacity,ticket_button_label,instagram_url,organizer_id"
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setEvent(null);
      setLoading(false);
      return;
    }

    const loadedEvent = (data || null) as EventRow | null;
    setEvent(loadedEvent);

    if (!loadedEvent) {
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id || "");

    if (user) {
      const { data: savedData } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("event_id", loadedEvent.id)
        .maybeSingle();

      const loadedSaved = (savedData || null) as SavedEventRow | null;
      setIsSaved(Boolean(loadedSaved));
    } else {
      setIsSaved(false);
    }

    if (loadedEvent.organizer_id) {
      const { data: organizerData } = await supabase
        .from("organizers")
        .select("id,slug,name,city")
        .eq("id", loadedEvent.organizer_id)
        .maybeSingle();

      setOrganizer((organizerData || null) as OrganizerRow | null);
    } else if (loadedEvent.organizer_name) {
      const { data: organizerData } = await supabase
        .from("organizers")
        .select("id,slug,name,city")
        .eq("slug", slugify(loadedEvent.organizer_name))
        .maybeSingle();

      setOrganizer((organizerData || null) as OrganizerRow | null);
    } else {
      setOrganizer(null);
    }

    if (loadedEvent.venue_name) {
      const { data: venueData } = await supabase
        .from("venues")
        .select("id,slug,name,city")
        .eq("slug", slugify(loadedEvent.venue_name))
        .maybeSingle();

      setVenue((venueData || null) as VenueRow | null);
    } else {
      setVenue(null);
    }

    const { data: eventArtistsData } = await supabase
      .from("event_artists")
      .select("artist_id")
      .eq("event_id", loadedEvent.id);

    const artistIds = ((eventArtistsData || []) as EventArtistRow[])
      .map((row) => row.artist_id)
      .filter(Boolean) as string[];

    if (artistIds.length > 0) {
      const { data: artistData } = await supabase
        .from("artists")
        .select("id,slug,name")
        .in("id", artistIds)
        .order("name", { ascending: true });

      setArtists((artistData || []) as ArtistRow[]);
    } else {
      setArtists([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEvent(); }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  async function toggleSavedEvent() {
    setMessage("");

    if (!event) {
      return;
    }

    if (!userId) {
      setMessage("Tens de iniciar sessão para guardar eventos.");
      return;
    }

    setActionLoading(true);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", event.id);

      if (error) {
        setMessage(error.message);
        setActionLoading(false);
        return;
      }

      setIsSaved(false);
      setActionLoading(false);
      return;
    }

    const { error } = await supabase.from("saved_events").insert({
      user_id: userId,
      event_id: event.id,
    });

    if (error) {
      setMessage(error.message);
      setActionLoading(false);
      return;
    }

    setIsSaved(true);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="skeleton-shimmer aspect-[4/5] lg:aspect-[16/7]" />
            <div className="space-y-3 p-6">
              <div className="skeleton-shimmer h-4 w-24 rounded" />
              <div className="skeleton-shimmer h-9 w-3/4 rounded" />
              <div className="skeleton-shimmer h-4 w-1/2 rounded" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!event) {
    return <NotFoundCard />;
  }

  const dateValue = eventDateValue(event);
  const externalTicketUrl = normalizeExternalUrl(event.ticket_url);
  const instagramUrl = normalizeExternalUrl(event.instagram_url);
  const ticketButtonText = ticketLabel(event);
  const ticketBadgeText = ticketBadge(event);

  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link href="/agenda" className="pressable focus-ring mb-6 inline-block rounded text-sm text-foreground-muted hover:text-foreground">
          ← Voltar à agenda
        </Link>

        {message && (
          <Card className="mb-6 border-danger/40 p-5">
            <p className="text-sm font-bold text-danger">{message}</p>
          </Card>
        )}

        <section className="grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-surface-secondary lg:min-h-[580px] lg:aspect-auto">
            {event.image_url ? (
              <Image
                src={event.image_url}
                alt={event.title}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 58vw"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="event-card-fallback absolute inset-0" aria-hidden="true" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55" aria-hidden="true" />
            <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap gap-2 p-4 sm:p-6">
                {event.featured && (
                  <span className="rounded border border-danger/60 bg-danger/90 px-3 py-1.5 text-xs font-black uppercase text-danger">
                    Destaque
                  </span>
                )}

                <span className="rounded border border-border-strong bg-black/75 px-3 py-1.5 text-xs font-black uppercase text-foreground">
                  {event.category || "Evento"}
                </span>

                {ticketBadgeText && (
                  <span className="rounded border border-border-strong bg-black/75 px-3 py-1.5 text-xs font-black uppercase text-foreground">
                    {ticketBadgeText}
                  </span>
                )}

                {isSaved && (
                  <span className="rounded border border-danger/60 bg-danger/90 px-3 py-1.5 text-xs font-black uppercase text-danger">
                    Guardado
                  </span>
                )}
            </div>
          </div>

          <div className="flex flex-col justify-end p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">
              {event.display_date || formatDate(dateValue)}
            </p>
            <h1 className="mt-4 break-words text-4xl font-black leading-[0.96] sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
            <p className="mt-6 text-base font-bold text-foreground-secondary">
              {[event.display_time, event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              {event.price || event.ticket_price || "Preço por definir"}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <section className="space-y-6">
            <Card className="p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">
                Informação
              </p>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Data
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.display_date || formatDate(dateValue)}
                  </p>

                  {event.is_multi_day && event.end_date && (
                    <p className="mt-1 text-sm text-foreground-muted">
                      até {formatShortDate(event.end_date)}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Hora
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.display_time || "Hora por definir"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Cidade
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.city || "Sem cidade"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Preço
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.price || event.ticket_price || "Preço por definir"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">
                Rede
              </p>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Espaço
                  </p>

                  {venue ? (
                    <Link
                      href={`/espacos/${venue.slug}`}
                      className="focus-ring mt-2 inline-block rounded text-2xl font-black underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
                    >
                      {venue.name}
                    </Link>
                  ) : (
                    <p className="mt-2 text-2xl font-black">
                      {event.venue_name || "Sem espaço"}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Organizador
                  </p>

                  {organizer ? (
                    <Link
                      href={`/organizadores/${organizer.slug}`}
                      className="focus-ring mt-2 inline-block rounded text-2xl font-black underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
                    >
                      {organizer.name}
                    </Link>
                  ) : (
                    <p className="mt-2 text-2xl font-black">
                      {event.organizer_name || "Sem organizador"}
                    </p>
                  )}
                </div>
              </div>

              {artists.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-xs font-black uppercase tracking-wide text-foreground-muted">
                    Artistas
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {artists.map((artist) => (
                      <Link
                        key={artist.id}
                        href={`/artistas/${artist.slug}`}
                        className="pressable focus-ring rounded-full border border-border-strong px-4 py-2 text-sm font-bold text-foreground-secondary hover:text-foreground"
                      >
                        {artist.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {event.description ? <Card className="p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">
                Descrição
              </p>

              <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-foreground-secondary lg:text-lg">
                {event.description}
              </p>
            </Card> : null}

            <StructuredEventSections eventId={event.id} />
          </section>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <Card className="p-5 lg:p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">
                Ação
              </p>

              <h2 className="mt-3 text-2xl font-black leading-none">
                Entra no ruído
              </h2>

              <div className="mt-6 grid gap-3">
                {event.ticket_mode === "internal" && (
                  <LinkButton href={`/bilhetes/${event.slug}`} size="lg">
                    {ticketButtonText || "Reservar bilhete"}
                  </LinkButton>
                )}

                {event.ticket_mode === "external" && externalTicketUrl && (
                  <a
                    href={externalTicketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClassName({ size: "lg" })}
                  >
                    {ticketButtonText || "Comprar bilhete"}
                  </a>
                )}

                <button
                  type="button"
                  onClick={toggleSavedEvent}
                  disabled={actionLoading}
                  aria-pressed={isSaved}
                  className={`pressable focus-ring rounded-full px-5 py-4 text-center text-sm font-black disabled:opacity-50 ${
                    isSaved
                      ? "border border-warning/40 text-warning"
                      : "border border-border-strong text-foreground-secondary hover:text-foreground"
                  }`}
                >
                  {actionLoading
                    ? "A guardar..."
                    : isSaved
                      ? "Guardado"
                      : "Guardar evento"}
                </button>

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClassName({ variant: "ghost" })}
                  >
                    Ver Instagram
                  </a>
                )}

                <LinkButton href="/guardados" variant="ghost">Ver guardados</LinkButton>
              </div>

              {event.ticket_mode === "none" && (
                <p className="mt-5 rounded-md border border-border bg-background-subtle p-4 text-sm text-foreground-muted">
                  Este evento ainda não tem bilheteira associada.
                </p>
              )}
            </Card>

          </aside>
        </section>
      </section>
    </main>
  );
}
