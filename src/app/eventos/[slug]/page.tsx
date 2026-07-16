"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { StructuredEventSections } from "@/components/events/StructuredEventSections";

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
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-red-700">
            Evento
          </p>

          <h1 className="mt-4 text-5xl font-black leading-none lg:text-7xl">
            Isto não existe.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-zinc-400">
            O evento pode ter sido removido, arquivado ou ainda não estar
            publicado.
          </p>

          <Link
            href="/agenda"
            className="mt-8 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
          >
            Voltar à agenda
          </Link>
        </div>
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
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">A carregar evento...</p>
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
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link href="/agenda" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar à agenda
        </Link>

        {message && (
          <div className="mb-6 rounded-[2rem] border border-red-900 bg-red-950/20 p-5">
            <p className="text-sm font-bold text-red-300">{message}</p>
          </div>
        )}

        <section className="grid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 lg:min-h-[580px] lg:aspect-auto">
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
                  <span className="rounded border border-red-500/60 bg-red-950/90 px-3 py-1.5 text-xs font-black uppercase text-red-100">
                    Destaque
                  </span>
                )}

                <span className="rounded border border-zinc-600 bg-black/75 px-3 py-1.5 text-xs font-black uppercase text-zinc-200">
                  {event.category || "Evento"}
                </span>

                {ticketBadgeText && (
                  <span className="rounded border border-zinc-600 bg-black/75 px-3 py-1.5 text-xs font-black uppercase text-zinc-200">
                    {ticketBadgeText}
                  </span>
                )}

                {isSaved && (
                  <span className="rounded border border-red-500/60 bg-red-950/90 px-3 py-1.5 text-xs font-black uppercase text-red-100">
                    Guardado
                  </span>
                )}
            </div>
          </div>

          <div className="flex flex-col justify-end p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
              {event.display_date || formatDate(dateValue)}
            </p>
            <h1 className="mt-4 break-words text-4xl font-black leading-[0.96] sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
            <p className="mt-6 text-base font-bold text-zinc-400">
              {[event.display_time, event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              {event.price || event.ticket_price || "Preço por definir"}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <section className="space-y-6">
            <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Informação
              </p>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Data
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.display_date || formatDate(dateValue)}
                  </p>

                  {event.is_multi_day && event.end_date && (
                    <p className="mt-1 text-sm text-zinc-500">
                      até {formatShortDate(event.end_date)}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Hora
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.display_time || "Hora por definir"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Cidade
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.city || "Sem cidade"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Preço
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {event.price || event.ticket_price || "Preço por definir"}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Rede
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Espaço
                  </p>

                  {venue ? (
                    <Link
                      href={`/espacos/${venue.slug}`}
                      className="mt-2 inline-block text-3xl font-black underline decoration-zinc-700 underline-offset-4"
                    >
                      {venue.name}
                    </Link>
                  ) : (
                    <p className="mt-2 text-3xl font-black">
                      {event.venue_name || "Sem espaço"}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Organizador
                  </p>

                  {organizer ? (
                    <Link
                      href={`/organizadores/${organizer.slug}`}
                      className="mt-2 inline-block text-3xl font-black underline decoration-zinc-700 underline-offset-4"
                    >
                      {organizer.name}
                    </Link>
                  ) : (
                    <p className="mt-2 text-3xl font-black">
                      {event.organizer_name || "Sem organizador"}
                    </p>
                  )}
                </div>
              </div>

              {artists.length > 0 && (
                <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Artistas
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
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
                </div>
              )}
            </article>

            {event.description ? <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Descrição
              </p>

              <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-zinc-300 lg:text-lg">
                {event.description}
              </p>
            </article> : null}

            <StructuredEventSections eventId={event.id} />
          </section>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Ação
              </p>

              <h2 className="mt-3 text-2xl font-black leading-none">
                Entra no ruído
              </h2>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={toggleSavedEvent}
                  disabled={actionLoading}
                  className={`rounded-full px-5 py-4 text-center text-sm font-black disabled:opacity-50 ${
                    isSaved
                      ? "border border-yellow-900 text-yellow-500"
                      : "border border-zinc-700 text-zinc-300"
                  }`}
                >
                  {actionLoading
                    ? "A guardar..."
                    : isSaved
                      ? "Guardado"
                      : "Guardar evento"}
                </button>

                {event.ticket_mode === "internal" && (
                  <Link
                    href={`/bilhetes/${event.slug}`}
                    className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                  >
                    {ticketButtonText || "Reservar bilhete"}
                  </Link>
                )}

                {event.ticket_mode === "external" && externalTicketUrl && (
                  <a
                    href={externalTicketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                  >
                    {ticketButtonText || "Comprar bilhete"}
                  </a>
                )}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                  >
                    Ver Instagram
                  </a>
                )}

                <Link
                  href="/guardados"
                  className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                >
                  Ver guardados
                </Link>

                <Link
                  href="/agenda"
                  className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
                >
                  Mais eventos
                </Link>
              </div>

              {event.ticket_mode === "none" && (
                <p className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  Este evento ainda não tem bilheteira associada.
                </p>
              )}
            </section>

          </aside>
        </section>
      </section>
    </main>
  );
}
