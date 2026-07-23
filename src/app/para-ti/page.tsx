"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DiscoveryStandalonePage } from "@/components/discovery/DiscoveryStandalonePage";
import { supabase } from "@/lib/supabase/public";

type ProfileRow = { preferred_cities: string[] | null; preferred_categories: string[] | null };
type FollowRow = { target_type: "artist" | "organizer" | "venue"; target_id: string };
type EventArtistRow = { event_id: string; artist_id: string };
type EventRow = {
  id: string; slug: string; title: string; city: string | null; venue_id: string | null; venue_name: string | null;
  organizer_id: string | null; display_date: string | null; display_time: string | null; start_at: string | null;
  start_date: string | null; category: string | null; price: string | null; image_url: string | null; featured: boolean | null;
};
type ScoredEvent = EventRow & { score: number; reasons: string[]; followed: boolean; nearby: boolean };
type FeedTab = "recommended" | "followed" | "nearby";
const feedTabs: Array<{ value: FeedTab; label: string }> = [
  { value: "recommended", label: "Recomendados" },
  { value: "followed", label: "Seguidos" },
  { value: "nearby", label: "Perto de ti" },
];

function dateValue(event: EventRow) { return event.start_at || event.start_date || event.display_date || ""; }
function dateTime(event: EventRow) { const value = dateValue(event); if (!value) return Number.MAX_SAFE_INTEGER; const date = new Date(value.includes("T") ? value : `${value}T00:00:00`); return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime(); }
function dateLabel(event: EventRow) { if (event.display_date) return event.display_date; const value = dateValue(event); if (!value) return "Data por definir"; const date = new Date(value.includes("T") ? value : `${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date); }

export default function ForYouPage() {
  if (process.env.NEXT_PUBLIC_DISCOVERY_FEED_ENABLED === "true") return <DiscoveryStandalonePage />;
  return <LegacyForYouPage />;
}

function LegacyForYouPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [eventArtists, setEventArtists] = useState<EventArtistRow[]>([]);
  const [tab, setTab] = useState<FeedTab>("recommended");

  async function loadFeed() {
    setLoading(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || "");
    let nextProfile: ProfileRow | null = null;
    let nextFollows: FollowRow[] = [];
    if (user) {
      const [profileResponse, followsResponse] = await Promise.all([
        supabase.from("profiles").select("preferred_cities,preferred_categories").eq("id", user.id).maybeSingle(),
        supabase.from("follows").select("target_type,target_id").eq("user_id", user.id),
      ]);
      nextProfile = profileResponse.data as ProfileRow | null;
      nextFollows = (followsResponse.data || []) as FollowRow[];
    }
    const eventsResponse = await supabase.from("events").select("id,slug,title,city,venue_id,venue_name,organizer_id,display_date,display_time,start_at,start_date,category,price,image_url,featured").eq("status", "published").order("start_at", { ascending: true, nullsFirst: false }).limit(80);
    if (eventsResponse.error) setMessage("Não foi possível preparar o feed.");
    const artistIds = nextFollows.filter((follow) => follow.target_type === "artist").map((follow) => follow.target_id);
    let nextEventArtists: EventArtistRow[] = [];
    if (artistIds.length > 0) {
      const response = await supabase.from("event_artists").select("event_id,artist_id").in("artist_id", artistIds);
      nextEventArtists = (response.data || []) as EventArtistRow[];
    }
    setProfile(nextProfile); setFollows(nextFollows); setEvents((eventsResponse.data || []) as EventRow[]); setEventArtists(nextEventArtists); setLoading(false);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadFeed(); }, 0); return () => window.clearTimeout(timer); }, []);

  const preferredCities = useMemo(() => profile?.preferred_cities || [], [profile]);
  const preferredCategories = useMemo(() => profile?.preferred_categories || [], [profile]);
  const scored = useMemo<ScoredEvent[]>(() => {
    const organizerIds = new Set(follows.filter((follow) => follow.target_type === "organizer").map((follow) => follow.target_id));
    const venueIds = new Set(follows.filter((follow) => follow.target_type === "venue").map((follow) => follow.target_id));
    const artistEventIds = new Set(eventArtists.map((row) => row.event_id));
    return events.map((event) => {
      const reasons: string[] = []; let score = event.featured ? 15 : 0;
      const followed = Boolean((event.organizer_id && organizerIds.has(event.organizer_id)) || (event.venue_id && venueIds.has(event.venue_id)) || artistEventIds.has(event.id));
      const nearby = Boolean(event.city && preferredCities.includes(event.city));
      if (followed) { score += 100; reasons.push("Seguido"); }
      if (nearby) { score += 45; reasons.push(event.city || "Perto de ti"); }
      if (event.category && preferredCategories.includes(event.category)) { score += 35; reasons.push(event.category); }
      if (event.featured) reasons.push("Destaque");
      return { ...event, score, reasons: Array.from(new Set(reasons)), followed, nearby };
    }).sort((first, second) => second.score - first.score || dateTime(first) - dateTime(second));
  }, [events, follows, eventArtists, preferredCities, preferredCategories]);

  const visible = useMemo(() => tab === "followed" ? scored.filter((event) => event.followed) : tab === "nearby" ? scored.filter((event) => event.nearby) : scored.slice(0, 20), [scored, tab]);
  const hasSignals = follows.length > 0 || preferredCities.length > 0 || preferredCategories.length > 0;

  return <main className="min-h-screen bg-[#070707] px-4 py-6 pb-28 text-[#f5f5f2] sm:px-6 lg:px-10 lg:py-10"><section className="mx-auto max-w-7xl">
    <PageHeader eyebrow="Para ti" title="O teu feed" description={!userId ? "Eventos relevantes agora. Inicia sessão para personalizar." : undefined} />
    <SegmentedControl value={tab} options={feedTabs} onChange={setTab} label="Tipo de recomendações" className="mt-5 sm:max-w-md" />

    {!userId && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4"><p className="text-sm text-foreground-muted">Entra para usar os perfis e locais que segues.</p><Link href="/login" className="rounded-full border border-border-strong px-4 py-2 text-xs font-black">Iniciar sessão</Link></div>}
    {userId && !hasSignals && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4"><p className="text-sm text-foreground-muted">Segue artistas, espaços e organizadores para melhorares este feed.</p><Link href="/descobrir" className="rounded-full border border-border-strong px-4 py-2 text-xs font-black">Descobrir</Link></div>}
    {message && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-danger pl-4" role="alert"><p className="text-sm text-danger">{message}</p><Button variant="secondary" size="sm" onClick={() => void loadFeed()}>Tentar novamente</Button></div>}

    <section key={tab} className="content-transition mt-6">{loading ? <EventCardSkeleton rows={8} /> : visible.length === 0 ? <EmptyState title={tab === "followed" ? "Ainda não há eventos dos perfis que segues." : tab === "nearby" ? "Ainda não há eventos nas tuas localizações preferidas." : "Ainda não há recomendações."} description="Podes ajustar os teus interesses no perfil." actionLabel="Abrir perfil" actionHref="/perfil" /> : <CardGrid>{visible.map((event) => <EventCard key={event.id} event={{ id: event.id, slug: event.slug, title: event.title, date: dateLabel(event), time: event.display_time, venue: event.venue_name, city: event.city, price: event.price, category: event.category, image: event.image_url, featured: event.featured, reason: event.reasons[0] || null }} />)}</CardGrid>}</section>
  </section></main>;
}
