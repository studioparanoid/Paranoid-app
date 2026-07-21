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

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string | string[] | null;
  description: string | null;
  instagram: string | null;
  bandcamp: string | null;
  image_url: string | null;
  artist_category: string | null;
  artist_category_other: string | null;
  music_genres: string[] | null;
  verified: boolean | null;
};

type EventArtistRow = {
  event_id: string | null;
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

function formatGenres(value: string | string[] | null) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function eventDateValue(event: EventRow) {
  return event.start_at || event.start_date || event.display_date || "";
}

function sortEvents(events: EventRow[]) {
  return [...events].sort((first, second) => {
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
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Artista</p>
          <h1 className="mt-3 text-2xl font-black leading-tight">Não encontramos este artista.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-foreground-muted">
            Pode ter sido removido, ainda não estar aprovado, ou ainda não estar ligado a eventos.
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
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted">Este artista ainda não tem eventos publicados na agenda.</p>
    </section>
  );
}

export default function ArtistPage() {
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

  const [artist, setArtist] = useState<ArtistRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState("");
  const [canRequestBooking, setCanRequestBooking] = useState(false);
  const [canPublishAlbums, setCanPublishAlbums] = useState(false);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [albumCovers, setAlbumCovers] = useState<Record<string, string[]>>({});
  const [shopLink, setShopLink] = useState<{ name: string; slug: string } | null>(null);

  async function loadArtist() {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: artistData, error: artistError } = await supabase
      .from("artists")
      .select("id,slug,name,city,genres,description,instagram,bandcamp,image_url,artist_category,artist_category_other,music_genres,verified")
      .eq("slug", slug)
      .maybeSingle();

    if (artistError) {
      setMessage(artistError.message);
      setArtist(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedArtist = (artistData || null) as ArtistRow | null;
    setArtist(loadedArtist);

    if (!loadedArtist) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedAlbums = await listPublicAlbumsForEntity("artist", loadedArtist.id);
    setAlbums(loadedAlbums);
    setAlbumCovers(await listCoverPhotosForAlbums(loadedAlbums.map((album) => album.id)));

    const { data: artistProfiles } = await supabase.from("profiles").select("id").eq("account_type", "artist").eq("account_status", "approved").eq("entity_id", loadedArtist.id);
    setShopLink(await findShopLinkForUserIds((artistProfiles || []).map((profile) => profile.id)));

    const { data: eventArtistData } = await supabase
      .from("event_artists")
      .select("event_id")
      .eq("artist_id", loadedArtist.id);

    const eventIds = ((eventArtistData || []) as EventArtistRow[])
      .map((row) => row.event_id)
      .filter(Boolean) as string[];

    if (eventIds.length > 0) {
      const { data: eventData } = await supabase
        .from("events")
        .select(
          "id,slug,title,status,city,venue_name,organizer_name,display_date,display_time,start_at,start_date,end_date,is_multi_day,category,price,image_url,featured,ticket_mode,ticket_price"
        )
        .eq("status", "published")
        .in("id", eventIds)
        .order("start_at", { ascending: true, nullsFirst: false });

      setEvents(sortEvents((eventData || []) as EventRow[]));
    } else {
      setEvents([]);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_type", "artist")
        .eq("target_id", loadedArtist.id)
        .maybeSingle();

      const loadedFollow = (followData || null) as FollowRow | null;

      setIsFollowing(Boolean(loadedFollow));
      setFollowId(loadedFollow?.id || "");

      const { data: memberships } = await supabase
        .from("organizer_members")
        .select("role,status,can_manage_events")
        .eq("user_id", user.id)
        .eq("status", "active");

      setCanRequestBooking((memberships || []).some((membership) => ["owner", "admin"].includes(membership.role) || membership.can_manage_events));

      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("account_type,entity_id,account_status")
        .eq("id", user.id)
        .maybeSingle();

      setCanPublishAlbums(viewerProfile?.account_type === "artist" && viewerProfile.account_status === "approved" && viewerProfile.entity_id === loadedArtist.id);
    } else {
      setIsFollowing(false);
      setFollowId("");
      setCanRequestBooking(false);
      setCanPublishAlbums(false);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadArtist(); }, 0);
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
      setMessage("Tens de iniciar sessão para seguir artistas.");
      return;
    }

    if (!artist) {
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
        target_type: "artist",
        target_id: artist.id,
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
            <p className="text-foreground-muted">A carregar artista...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!artist) {
    return <NotFoundCard />;
  }

  const genres = artist.music_genres?.length ? artist.music_genres : formatGenres(artist.genres);
  const artistCategory = artist.artist_category === "Outro" ? artist.artist_category_other : artist.artist_category;
  const featuredEvents = events.filter((event) => event.featured);
  const instagramUrl = normalizeExternalUrl(artist.instagram);
  const bandcampUrl = normalizeExternalUrl(artist.bandcamp);

  const tags = [artistCategory, ...genres.slice(0, 3)].filter((value): value is string => Boolean(value));
  const links = [
    ...(instagramUrl ? [{ label: "Instagram", href: instagramUrl, external: true }] : []),
    ...(bandcampUrl ? [{ label: "Bandcamp", href: bandcampUrl, external: true }] : []),
    ...(!artist.verified ? [{ label: "Reivindicar perfil", href: `/reivindicar?type=artist&entityName=${encodeURIComponent(artist.name)}&city=${encodeURIComponent(artist.city || "")}` }] : []),
    ...(shopLink ? [{ label: "Loja", href: `/loja?vendedor=${encodeURIComponent(shopLink.name)}` }] : []),
    ...(canRequestBooking ? [{ label: "Entra em contacto", href: `/reservas/nova?artistId=${artist.id}` }] : []),
    { label: "Submeter evento", href: "/submeter" },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <EntityProfileHeader
          kindLabel="Artista"
          name={artist.name}
          imageUrl={artist.image_url}
          city={artist.city}
          tags={tags}
          bio={artist.description}
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
              {canPublishAlbums && <LinkButton href={`/albuns/novo?type=artist&entityId=${artist.id}`} variant="secondary" size="sm">Publicar fotos</LinkButton>}
            </div>
            {albums.length > 0 && (
              <CardGrid>
                {albums.map((album) => (
                  <AlbumStackedPreview key={album.id} photos={albumCovers[album.id] || []} title={album.title} href={`/albuns/${album.id}`} />
                ))}
              </CardGrid>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
