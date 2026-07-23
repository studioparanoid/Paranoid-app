"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { AdminListSkeleton, LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { LinkButton } from "@/components/ui/Button";
import { listBookingRequestsForArtist, type BookingRequest } from "@/lib/bookingRequests";
import { supabase } from "@/lib/supabase/public";

type ArtistRow = { id: string; slug: string; name: string; verified: boolean | null };
type EventRow = { id: string; slug: string; title: string; display_date: string | null; display_time: string | null; start_at: string | null; city: string | null; venue_name: string | null };

function formatDate(value: string | null) {
  if (!value) return "Data por definir";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date);
}

export function ArtistDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [artist, setArtist] = useState<ArtistRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  const pendingRequests = useMemo(() => bookingRequests.filter((request) => request.status === "pending"), [bookingRequests]);

  async function loadArtistData(artistId: string, userId: string) {
    setDataLoading(true);
    setMessage("");

    const [eventLinksResponse, requests, followerResponse, sellerResponse] = await Promise.all([
      supabase.from("event_artists").select("event_id").eq("artist_id", artistId),
      listBookingRequestsForArtist(artistId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("target_type", "artist").eq("target_id", artistId),
      supabase.from("shop_sellers").select("id").eq("user_id", userId).maybeSingle(),
    ]);

    const eventIds = (eventLinksResponse.data || []).map((row) => row.event_id).filter(Boolean) as string[];
    if (eventIds.length > 0) {
      const eventsResponse = await supabase
        .from("events")
        .select("id,slug,title,display_date,display_time,start_at,city,venue_name")
        .in("id", eventIds)
        .eq("status", "published")
        .order("start_at", { ascending: true, nullsFirst: false })
        .limit(10);
      if (eventsResponse.error) setMessage(eventsResponse.error.message);
      setEvents((eventsResponse.data || []) as EventRow[]);
    } else {
      setEvents([]);
    }

    setBookingRequests(requests);
    setFollowerCount(followerResponse.count || 0);

    if (sellerResponse.data?.id) {
      const productsResponse = await supabase.from("shop_products").select("id", { count: "exact", head: true }).eq("seller_id", sellerResponse.data.id).eq("status", "active");
      setProductCount(productsResponse.count || 0);
    } else {
      setProductCount(0);
    }

    setDataLoading(false);
  }

  async function loadAccount() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("account_type,account_status,entity_id,entity_slug").eq("id", user.id).maybeSingle();
    if (profile?.account_type !== "artist" || profile.account_status !== "approved" || !profile.entity_id) {
      setLoading(false);
      return;
    }

    const { data: artistRow } = await supabase.from("artists").select("id,slug,name,verified").eq("id", profile.entity_id).maybeSingle();
    if (!artistRow) { setLoading(false); return; }

    setArtist(artistRow as ArtistRow);
    setLoading(false);
    await loadArtistData(artistRow.id, user.id);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAccount(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (!email) return <EmptyState title="Tens de iniciar sessão." description="A área do artista está ligada à tua conta." actionLabel="Entrar" actionHref="/login" />;
  if (!artist) return <EmptyState title="Esta conta ainda não tem um perfil de artista aprovado." description="Junta-te à rede para teres acesso a esta área." actionLabel="Reivindicar perfil" actionHref="/reivindicar" />;

  return <div>
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.3em] text-danger">Artista</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">{artist.name}</h1><div className="mt-2"><StatusBadge label={artist.verified ? "Perfil verificado" : "Perfil ativo"} tone="success" /></div></div>
      <div className="flex gap-2">
        <LinkButton href="/perfil" variant="secondary">Editar perfil</LinkButton>
        <LinkButton href={`/artistas/${artist.slug}`}>Ver perfil público</LinkButton>
      </div>
    </header>

    <nav aria-label="Área do artista" className="my-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <a href="#eventos" className="pressable focus-ring rounded border border-border px-4 py-3 text-center text-sm font-bold hover:bg-surface-hover">Eventos</a>
      <Link href="/reservas" className="pressable focus-ring rounded border border-border px-4 py-3 text-center text-sm font-bold hover:bg-surface-hover">Reservas</Link>
      <Link href="/artista/loja" className="pressable focus-ring rounded border border-border px-4 py-3 text-center text-sm font-bold hover:bg-surface-hover">Loja</Link>
      <Link href={`/artistas/${artist.slug}`} className="pressable focus-ring rounded border border-border px-4 py-3 text-center text-sm font-bold hover:bg-surface-hover">Perfil</Link>
    </nav>

    {message && <p className="mb-6 border-l-2 border-danger pl-4 text-sm text-danger">{message}</p>}
    {dataLoading ? <AdminListSkeleton /> : <div className="content-transition">
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-surface sm:grid-cols-4">
        <Metric value={events.length} label="Próximos eventos" />
        <Metric value={pendingRequests.length} label="Pedidos pendentes" />
        <Metric value={followerCount} label="Seguidores" />
        <Metric value={productCount} label="Produtos na loja" />
      </section>

      <section id="eventos" className="mt-9 scroll-mt-24"><SectionHeader title="Próximos eventos" meta={`${events.length} publicados`} />
        {events.length === 0 ? <EmptyState title="Ainda não tens eventos publicados." description="Os eventos onde participares como artista aparecem aqui." /> : <div className="divide-y divide-border border-y border-border">{events.map((event) => <Link key={event.id} href={`/eventos/${event.slug}`} className="interactive flex items-center gap-4 py-4 hover:bg-surface-hover"><div className="w-14 shrink-0 text-center"><p className="text-xs font-black uppercase text-danger">{formatDate(event.start_at || event.display_date)}</p><p className="text-xs text-foreground-muted">{event.display_time || ""}</p></div><div className="min-w-0 flex-1"><h3 className="truncate font-black">{event.title}</h3><p className="truncate text-xs text-foreground-muted">{[event.venue_name, event.city].filter(Boolean).join(" · ")}</p></div></Link>)}</div>}
      </section>

      <section className="mt-9"><SectionHeader title="Loja" />
        {productCount === 0 ? (
          <div className="border-y border-border py-8 text-center">
            <p className="text-sm font-bold text-foreground-secondary">És artista e tens merch? Ou pintor e tens arte para vender?</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">Cria a tua loja e vende diretamente a quem te segue.</p>
            <LinkButton href="/artista/loja" className="mt-5">Começar a vender</LinkButton>
          </div>
        ) : (
          <div className="flex items-center justify-between border-y border-border py-5"><p className="text-sm text-foreground-muted">{productCount} {productCount === 1 ? "produto ativo" : "produtos ativos"}</p><LinkButton href="/artista/loja" variant="secondary">Gerir loja</LinkButton></div>
        )}
      </section>

      {pendingRequests.length > 0 && <section className="mt-9"><SectionHeader title="Pedidos de reserva pendentes" /><div className="divide-y divide-border border-y border-border">{pendingRequests.slice(0, 5).map((request) => <Link key={request.id} href={`/reservas/${request.id}`} className="flex items-center gap-4 py-4"><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{request.proposed_venue_name || "Proposta de reserva"}</h3><p className="text-xs text-foreground-muted">{formatDate(request.proposed_date)}</p></div><StatusBadge label="Pendente" tone="warning" /></Link>)}</div></section>}
    </div>}
  </div>;
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="bg-background p-4"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-foreground-muted">{label}</p></div>;
}
