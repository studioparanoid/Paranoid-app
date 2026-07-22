"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { AlbumStackedPreview } from "@/components/albums/AlbumStackedPreview";
import { EntityProfileHeader } from "@/components/EntityProfileHeader";
import { EventCard } from "@/components/EventCard";
import { LinkButton } from "@/components/ui/Button";
import { listCoverPhotosForAlbums, listPublicAlbumsForEntity, type PhotoAlbum } from "@/lib/albums";
import { findShopLinkForUserIds } from "@/lib/shop";
import { supabase } from "@/lib/supabase/public";

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
  image_url: string | null;
  organizer_type: string | null;
  organizer_type_other: string | null;
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
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Organizador</p>
          <h1 className="mt-3 text-2xl font-black leading-tight">Não encontramos este organizador.</h1>
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
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted">Este organizador ainda não tem eventos publicados na agenda.</p>
    </section>
  );
}

export default function OrganizerPage() {
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

  const [organizer, setOrganizer] = useState<OrganizerRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState("");
  const [hasFrequency, setHasFrequency] = useState(false);
  const [canPublishAlbums, setCanPublishAlbums] = useState(false);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string[]>>({});
  const [shopLink, setShopLink] = useState<{ name: string; slug: string } | null>(null);
  const [canContactOrganizer, setCanContactOrganizer] = useState(false);

  async function loadOrganizer() {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: organizerData, error: organizerError } = await supabase
      .from("organizers")
      .select("id,slug,name,city,description,pack,verified,image_url,organizer_type,organizer_type_other")
      .eq("slug", slug)
      .maybeSingle();

    if (organizerError) {
      setMessage(organizerError.message);
      setOrganizer(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedOrganizer = (organizerData || null) as OrganizerRow | null;
    setOrganizer(loadedOrganizer);
    setHasFrequency(false);

    if (!loadedOrganizer) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedAlbums = await listPublicAlbumsForEntity("organizer", loadedOrganizer.id);
    setAlbums(loadedAlbums);
    setAlbumCovers(await listCoverPhotosForAlbums(loadedAlbums.map((album) => album.id)));

    const { data: orgMembers } = await supabase.from("organizer_members").select("user_id").eq("organizer_id", loadedOrganizer.id).eq("status", "active");
    setShopLink(await findShopLinkForUserIds((orgMembers || []).map((member) => member.user_id)));

    const frequencyResponse = await fetch(
      `/api/billing/frequency/status?organizerId=${loadedOrganizer.id}`
    ).catch(() => null);

    if (frequencyResponse?.ok) {
      const frequencyPayload = await frequencyResponse.json().catch(() => null);
      setHasFrequency(Boolean(frequencyPayload?.active));
    }

    const baseSelect =
      "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,image_url,featured,ticket_mode,ticket_price";

    const [{ data: eventsById }, { data: eventsByName }] = await Promise.all([
      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("organizer_id", loadedOrganizer.id)
        .order("start_at", { ascending: true, nullsFirst: false }),

      supabase
        .from("events")
        .select(baseSelect)
        .eq("status", "published")
        .eq("organizer_name", loadedOrganizer.name)
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
        .eq("target_type", "organizer")
        .eq("target_id", loadedOrganizer.id)
        .maybeSingle();

      const loadedFollow = (followData || null) as FollowRow | null;

      setIsFollowing(Boolean(loadedFollow));
      setFollowId(loadedFollow?.id || "");

      const { data: membership } = await supabase
        .from("organizer_members")
        .select("role,can_manage_events")
        .eq("organizer_id", loadedOrganizer.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      setCanPublishAlbums(Boolean(membership && (["owner", "admin"].includes(membership.role) || membership.can_manage_events)));

      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("account_type,entity_id,account_status")
        .eq("id", user.id)
        .maybeSingle();

      setCanContactOrganizer(viewerProfile?.account_type === "artist" && viewerProfile.account_status === "approved" && Boolean(viewerProfile.entity_id));
    } else {
      setIsFollowing(false);
      setFollowId("");
      setCanPublishAlbums(false);
      setCanContactOrganizer(false);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOrganizer(); }, 0);
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
      setMessage("Tens de iniciar sessão para seguir organizadores.");
      return;
    }

    if (!organizer) {
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
        target_type: "organizer",
        target_id: organizer.id,
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
            <p className="text-foreground-muted">A carregar organizador...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!organizer) {
    return <NotFoundCard />;
  }

  const featuredEvents = events.filter((event) => event.featured);
  const organizerType = organizer.organizer_type === "Outro" ? organizer.organizer_type_other : organizer.organizer_type;
  const tags = [organizer.pack, organizerType, hasFrequency ? "Frequency" : null].filter((value): value is string => Boolean(value));
  const links = [
    ...(shopLink ? [{ label: "Loja", href: `/loja?vendedor=${encodeURIComponent(shopLink.name)}` }] : []),
    ...(canContactOrganizer ? [{ label: "Entra em contacto", href: `/reservas/nova?organizerId=${organizer.id}` }] : []),
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <EntityProfileHeader
          kindLabel="Organizador"
          name={organizer.name}
          imageUrl={organizer.image_url}
          city={organizer.city}
          tags={tags}
          verified={Boolean(organizer.verified)}
          bio={organizer.description}
          stats={[{ value: events.length, label: "Eventos" }, { value: featuredEvents.length, label: "Destaques" }]}
          isFollowing={isFollowing}
          followLoading={actionLoading}
          onToggleFollow={() => void toggleFollow()}
          links={links}
          message={message}
        />

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-black">Próximas datas</h2>
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

        {(albums.length > 0 || canPublishAlbums) && (
          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black">Álbuns</h2>
              {canPublishAlbums && <LinkButton href={`/albuns/novo?type=organizer&entityId=${organizer.id}`} variant="secondary" size="sm">Publicar fotos</LinkButton>}
            </div>
            {albums.length > 0 && (
              <CardGrid>
                {albums.map((album) => (
                  <AlbumStackedPreview key={album.id} photos={albumCovers[album.id] || []} title={album.title} href={`/albuns/${album.id}`} visibility={album.visibility} />
                ))}
              </CardGrid>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
