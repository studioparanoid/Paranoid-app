"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { EntityProfileHeader } from "@/components/EntityProfileHeader";
import { EventCard } from "@/components/EventCard";
import { supabase } from "@/lib/supabase/public";

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  instagram: string | null;
  image_url: string | null;
};

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
  image_url: string | null;
  featured: boolean | null;
  ticket_mode: string | null;
  ticket_price: string | null;
};

type FollowRow = {
  id: string;
};

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

function eventDateValue(event: EventRow) {
  return event.start_at || event.start_date || event.display_date || "";
}

function mergeEvents(firstList: EventRow[], secondList: EventRow[]) {
  const map = new Map<string, EventRow>();

  firstList.forEach((event) => map.set(event.id, event));
  secondList.forEach((event) => map.set(event.id, event));

  return Array.from(map.values()).sort((first, second) => {
    const firstDate = eventDateValue(first);
    const secondDate = eventDateValue(second);

    if (!firstDate && !secondDate) {
      return 0;
    }

    if (!firstDate) {
      return 1;
    }

    if (!secondDate) {
      return -1;
    }

    return new Date(firstDate).getTime() - new Date(secondDate).getTime();
  });
}

function NotFoundCard() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Espaço</p>
          <h1 className="mt-3 text-2xl font-black leading-tight">Não encontramos este espaço.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-foreground-muted">
            Pode ter sido removido ou ainda não estar aprovado na rede.
          </p>
          <Link href="/descobrir" className="pressable focus-ring mt-6 inline-block rounded-full bg-foreground px-5 py-3 text-sm font-black text-background">
            Voltar à rede
          </Link>
        </div>
      </section>
    </main>
  );
}

function EmptyEvents() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 text-center lg:p-10">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground-muted">Sem eventos</p>
      <h2 className="mt-3 text-xl font-black">Ainda não há datas.</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted">Este espaço ainda não tem eventos publicados na agenda.</p>
    </section>
  );
}

export default function VenuePage() {
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

  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState("");

  async function loadVenue() {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: venueData, error: venueError } = await supabase
      .from("venues")
      .select("id,slug,name,city,address,description,instagram,image_url")
      .eq("slug", slug)
      .maybeSingle();

    if (venueError) {
      setMessage(venueError.message);
      setVenue(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedVenue = (venueData || null) as VenueRow | null;
    setVenue(loadedVenue);

    if (!loadedVenue) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const baseSelect =
      "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,image_url,featured,ticket_mode,ticket_price";

    const [{ data: eventsById }, { data: eventsByName }] = await Promise.all([
      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("venue_id", loadedVenue.id)
        .order("start_at", { ascending: true, nullsFirst: false }),

      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("venue_name", loadedVenue.name)
        .order("start_at", { ascending: true, nullsFirst: false }),
    ]);

    setEvents(
      mergeEvents(
        (eventsById || []) as EventRow[],
        (eventsByName || []) as EventRow[]
      )
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_type", "venue")
        .eq("target_id", loadedVenue.id)
        .maybeSingle();

      const loadedFollow = (followData || null) as FollowRow | null;

      setIsFollowing(Boolean(loadedFollow));
      setFollowId(loadedFollow?.id || "");
    } else {
      setIsFollowing(false);
      setFollowId("");
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadVenue(); }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  async function toggleFollow() {
    setMessage("");
    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionLoading(false);
      setMessage("Tens de iniciar sessão para seguir espaços.");
      return;
    }

    if (!venue) {
      setActionLoading(false);
      return;
    }

    if (isFollowing && followId) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", followId);

      if (error) {
        setMessage(error.message);
        setActionLoading(false);
        return;
      }

      setIsFollowing(false);
      setFollowId("");
      setActionLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("follows")
      .insert({
        user_id: user.id,
        target_type: "venue",
        target_id: venue.id,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setActionLoading(false);
      return;
    }

    setIsFollowing(true);
    setFollowId(data.id);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-foreground-muted">A carregar espaço...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!venue) {
    return <NotFoundCard />;
  }

  const featuredEvents = events.filter((event) => event.featured);
  const instagramUrl = normalizeExternalUrl(venue.instagram);
  const tags = venue.city ? [venue.city] : [];
  const links = [
    ...(instagramUrl ? [{ label: "Instagram", href: instagramUrl, external: true }] : []),
    { label: "Reivindicar perfil", href: `/reivindicar?type=venue&entityName=${encodeURIComponent(venue.name)}&city=${encodeURIComponent(venue.city || "")}` },
    { label: "Submeter evento", href: "/submeter" },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <EntityProfileHeader
          kindLabel="Espaço"
          name={venue.name}
          imageUrl={venue.image_url}
          city={venue.address || venue.city}
          tags={tags}
          bio={venue.description}
          stats={[{ value: events.length, label: "Eventos" }, { value: featuredEvents.length, label: "Destaques" }]}
          isFollowing={isFollowing}
          followLoading={actionLoading}
          onToggleFollow={() => void toggleFollow()}
          links={links}
          message={message}
        />

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-black">O que acontece aqui</h2>
          </div>

          {events.length === 0 && <EmptyEvents />}

          {events.length > 0 && (
            <CardGrid>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    slug: event.slug,
                    title: event.title,
                    date: event.display_date || event.start_at || event.start_date || "Data por definir",
                    time: event.display_time,
                    venue: event.venue_name,
                    city: event.city,
                    price: event.price || event.ticket_price,
                    category: event.category,
                    image: event.image_url,
                    featured: Boolean(event.featured),
                  }}
                  showSave
                />
              ))}
            </CardGrid>
          )}
        </section>
      </section>
    </main>
  );
}
