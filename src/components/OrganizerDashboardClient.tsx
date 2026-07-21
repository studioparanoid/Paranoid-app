"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { AdminListSkeleton, LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { LinkButton } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/public";

type OrganizerRow = { id: string; slug: string; name: string; verified: boolean | null };
type EventRow = { id: string; slug: string; title: string; display_date: string | null; display_time: string | null; start_at: string | null; city: string | null; venue_name: string | null; featured: boolean | null; status: string | null };
type SubmissionRow = { id: string; title: string; event_date: string | null; city: string | null; status: string };
type FrequencySummary = { active: boolean; credits: number };

function formatDate(value: string | null) {
  if (!value) return "Data por definir";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date);
}

export function OrganizerDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [frequency, setFrequency] = useState<FrequencySummary>({ active: false, credits: 0 });

  const selectedOrganizer = useMemo(() => organizers.find((item) => item.id === selectedId) || null, [organizers, selectedId]);
  const publishedEvents = useMemo(() => events.filter((event) => event.status === "published"), [events]);
  const pendingSubmissions = useMemo(() => submissions.filter((submission) => submission.status === "pending"), [submissions]);
  const featuredCount = useMemo(() => publishedEvents.filter((event) => event.featured).length, [publishedEvents]);

  async function loadOrganizerData(organizerId: string) {
    if (!organizerId) return;
    setDataLoading(true);
    setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    const [eventsResponse, submissionsResponse, frequencyResponse] = await Promise.all([
      supabase.from("events").select("id,slug,title,display_date,display_time,start_at,city,venue_name,featured,status").eq("organizer_id", organizerId).in("status", ["published", "archived"]).order("start_at", { ascending: true, nullsFirst: false }).limit(30),
      supabase.from("event_submissions").select("id,title,event_date,city,status").eq("organizer_id", organizerId).order("created_at", { ascending: false }).limit(20),
      session?.access_token ? fetch(`/api/billing/frequency/me?organizerId=${encodeURIComponent(organizerId)}`, { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null) : null,
    ]);
    if (eventsResponse.error || submissionsResponse.error) setMessage(eventsResponse.error?.message || submissionsResponse.error?.message || "Não foi possível carregar os dados.");
    setEvents((eventsResponse.data || []) as EventRow[]);
    setSubmissions((submissionsResponse.data || []) as SubmissionRow[]);
    if (frequencyResponse?.ok) {
      const payload = await frequencyResponse.json().catch(() => ({}));
      setFrequency({ active: payload.pass?.status === "active" && (!payload.pass?.endsAt || new Date(payload.pass.endsAt).getTime() > Date.now()), credits: (payload.creditPacks || []).reduce((sum: number, pack: { remaining_credits?: number }) => sum + Number(pack.remaining_credits || 0), 0) });
    } else setFrequency({ active: false, credits: 0 });
    setDataLoading(false);
  }

  async function loadAccount() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setEmail(user.email || "");
    const memberships = await supabase.from("organizer_members").select("organizer_id").eq("user_id", user.id);
    const ids = (memberships.data || []).map((item) => item.organizer_id).filter(Boolean);
    if (memberships.error || ids.length === 0) { setMessage(memberships.error?.message || ""); setLoading(false); return; }
    const organizerResponse = await supabase.from("organizers").select("id,slug,name,verified").in("id", ids).order("name");
    const nextOrganizers = (organizerResponse.data || []) as OrganizerRow[];
    const firstId = nextOrganizers[0]?.id || "";
    setOrganizers(nextOrganizers);
    setSelectedId(firstId);
    setLoading(false);
    await loadOrganizerData(firstId);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAccount(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (!email) return <EmptyState title="Tens de iniciar sessão." description="A área do organizador está ligada à tua conta." actionLabel="Entrar" actionHref="/login" />;
  if (organizers.length === 0) return <EmptyState title="Esta conta ainda não tem organizador." description="A associação ao organizador precisa de estar aprovada." actionLabel="Voltar ao perfil" actionHref="/perfil" />;

  return <div>
    <header className="flex flex-col gap-5 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">Organizador</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">{selectedOrganizer?.name}</h1><div className="mt-2"><StatusBadge label={selectedOrganizer?.verified ? "Perfil verificado" : "Perfil ativo"} tone="success" /></div></div>
      <LinkButton href="/submeter">Criar evento</LinkButton>
    </header>

    {organizers.length > 1 && <label className="mt-5 block max-w-sm"><span className="mb-2 block text-xs font-bold text-zinc-600">Organizador</span><select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); void loadOrganizerData(event.target.value); }} className="w-full rounded border border-zinc-800 bg-black px-4 py-3">{organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name}</option>)}</select></label>}

    <nav aria-label="Área do organizador" className="my-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <a href="#eventos" className="pressable focus-ring rounded border border-zinc-800 px-4 py-3 text-center text-sm font-bold hover:bg-zinc-950">Eventos</a>
      <Link href="/reservas" className="pressable focus-ring rounded border border-zinc-800 px-4 py-3 text-center text-sm font-bold hover:bg-zinc-950">Reservas</Link>
      <Link href="/organizador/destaques" className="pressable focus-ring rounded border border-zinc-800 px-4 py-3 text-center text-sm font-bold hover:bg-zinc-950">Destaques</Link>
      <Link href="/organizador/loja" className="pressable focus-ring rounded border border-zinc-800 px-4 py-3 text-center text-sm font-bold hover:bg-zinc-950">Loja</Link>
      {selectedOrganizer && <Link href={`/organizadores/${selectedOrganizer.slug}`} className="pressable focus-ring rounded border border-zinc-800 px-4 py-3 text-center text-sm font-bold hover:bg-zinc-950">Perfil</Link>}
    </nav>

    {message && <p className="mb-6 border-l-2 border-red-800 pl-4 text-sm text-red-300">{message}</p>}
    {dataLoading ? <AdminListSkeleton /> : <div className="content-transition">
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded border border-zinc-900 bg-zinc-900 sm:grid-cols-5">
        <Metric value={publishedEvents.length} label="Publicados" />
        <Metric value={pendingSubmissions.length} label="Pendentes" />
        <Metric value={featuredCount} label="Destaques" />
        <Metric value={frequency.credits} label="Créditos" />
        <Metric value={frequency.active ? "Ativo" : "Inativo"} label="Frequency" />
      </section>

      <section id="eventos" className="mt-9 scroll-mt-24"><SectionHeader title="Próximos eventos" meta={`${publishedEvents.length} publicados`} />
        {publishedEvents.length === 0 ? <EmptyState title="Ainda não tens eventos publicados." actionLabel="Criar evento" actionHref="/submeter" /> : <div className="divide-y divide-zinc-900 border-y border-zinc-900">{publishedEvents.slice(0, 8).map((event) => <article key={event.id} className="interactive flex items-center gap-4 py-4 hover:bg-zinc-950/60"><div className="w-14 shrink-0 text-center"><p className="text-xs font-black uppercase text-red-500">{formatDate(event.start_at || event.display_date)}</p><p className="text-xs text-zinc-600">{event.display_time || ""}</p></div><div className="min-w-0 flex-1"><h3 className="truncate font-black">{event.title}</h3><p className="truncate text-xs text-zinc-600">{[event.venue_name, event.city].filter(Boolean).join(" · ")}</p></div>{event.featured && <StatusBadge label="Destaque" tone="danger" />}<Link href={`/organizador/eventos/${event.id}`} className="pressable focus-ring rounded-full border border-zinc-700 px-4 py-2 text-xs font-bold">Gerir</Link></article>)}</div>}
      </section>

      {pendingSubmissions.length > 0 && <section className="mt-9"><SectionHeader title="Submissões pendentes" /><div className="divide-y divide-zinc-900 border-y border-zinc-900">{pendingSubmissions.slice(0, 5).map((submission) => <Link key={submission.id} href={`/organizador/submissoes/${submission.id}`} className="flex items-center gap-4 py-4"><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{submission.title}</h3><p className="text-xs text-zinc-600">{formatDate(submission.event_date)} · {submission.city || "Sem cidade"}</p></div><StatusBadge label="Pendente" tone="warning" /></Link>)}</div></section>}
    </div>}
  </div>;
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="bg-[#0b0b0b] p-4"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-zinc-600">{label}</p></div>;
}
