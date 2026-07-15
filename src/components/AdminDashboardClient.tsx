"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminEventActions } from "@/components/AdminEventActions";
import { AdminSubmissionActions } from "@/components/AdminSubmissionActions";
import { AppIcon } from "@/components/AppIcon";
import { AdminListSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { EventSubmission } from "@/lib/submissions";
import { supabase } from "@/lib/supabase/public";

type AdminEvent = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  venue_name: string | null;
  display_date: string | null;
  display_time: string | null;
  image_url: string | null;
  featured: boolean | null;
  status: string | null;
  created_at: string | null;
};

type ProfileClaim = {
  id: string;
  account_type: "artist" | "organizer" | "venue";
  entity_name: string;
  status: string;
  created_at: string;
};

type Tab = "submissions" | "events";

function relativeDate(value: string | null | undefined) {
  if (!value) return "Sem data";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Sem data";
  const seconds = Math.round((time - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function rowKey(kind: Tab, id: string) {
  return `${kind}:${id}`;
}

export function AdminDashboardClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [claims, setClaims] = useState<ProfileClaim[]>([]);
  const [tab, setTab] = useState<Tab>("submissions");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");
    const [submissionResponse, eventResponse, claimResponse] = await Promise.all([
      supabase.from("event_submissions").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
      supabase.from("events").select("id,slug,title,city,venue_name,display_date,display_time,image_url,featured,status,created_at").in("status", ["published", "archived"]).order("created_at", { ascending: false }).limit(50),
      supabase.from("profile_claims").select("id,account_type,entity_name,status,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    ]);
    const error = submissionResponse.error || eventResponse.error || claimResponse.error;
    if (error) setMessage("Não foi possível carregar toda a informação administrativa.");
    setSubmissions((submissionResponse.data ?? []) as EventSubmission[]);
    setEvents((eventResponse.data ?? []) as AdminEvent[]);
    setClaims((claimResponse.data ?? []) as ProfileClaim[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setTab(params.get("tab") === "events" ? "events" : "submissions");
      setSearch(params.get("q") ?? "");
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateListState(nextTab: Tab, nextSearch: string) {
    setTab(nextTab);
    setSearch(nextSearch);
    setSelected(new Set());
    const params = new URLSearchParams(window.location.search);
    params.set("tab", nextTab);
    if (nextSearch) params.set("q", nextSearch);
    else params.delete("q");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}#admin-lists`);
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-PT");
  const visibleSubmissions = useMemo(() => submissions.filter((item) => !normalizedSearch || `${item.title} ${item.organizer} ${item.city}`.toLocaleLowerCase("pt-PT").includes(normalizedSearch)), [normalizedSearch, submissions]);
  const visibleEvents = useMemo(() => events.filter((item) => !normalizedSearch || `${item.title} ${item.city ?? ""} ${item.venue_name ?? ""}`.toLocaleLowerCase("pt-PT").includes(normalizedSearch)), [events, normalizedSearch]);
  const visibleKeys = (tab === "submissions" ? visibleSubmissions : visibleEvents).map((item) => rowKey(tab, item.id));
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selected.has(key));

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleKeys.forEach((key) => next.delete(key));
      else visibleKeys.forEach((key) => next.add(key));
      return next;
    });
  }

  async function runBulkAction() {
    if (selected.size === 0 || acting) return;
    setActing(true);
    const ids = [...selected].map((key) => key.split(":")[1]);
    const response = await fetch("/api/admin/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: tab, ids }),
    });
    const result = await response.json() as { updatedIds?: string[]; error?: string };
    setActing(false);
    setConfirmBulk(false);
    if (!response.ok || result.error) {
      toast({ message: "Não foi possível concluir a ação em massa.", tone: "error" });
      return;
    }
    const updatedIds = result.updatedIds ?? [];
    if (tab === "submissions") setSubmissions((current) => current.filter((item) => !updatedIds.includes(item.id)));
    else setEvents((current) => current.map((item) => updatedIds.includes(item.id) ? { ...item, status: "archived" } : item));
    setSelected(new Set());
    toast({ message: tab === "submissions" ? `${updatedIds.length} submissões rejeitadas.` : `${updatedIds.length} eventos arquivados.`, tone: "success" });
  }

  if (loading) return <section className="mt-8 shadow-panel rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"><AdminListSkeleton /></section>;

  const approvalRows = [
    { label: "Eventos pendentes", count: submissions.length, href: "/admin?tab=submissions#admin-lists" },
    { label: "Artistas pendentes", count: claims.filter((item) => item.account_type === "artist").length, href: "/admin/perfis?type=artist" },
    { label: "Organizadores pendentes", count: claims.filter((item) => item.account_type === "organizer").length, href: "/admin/perfis?type=organizer" },
    { label: "Espaços pendentes", count: claims.filter((item) => item.account_type === "venue").length, href: "/admin/perfis?type=venue" },
  ];
  const activity = [
    ...submissions.map((item) => ({ id: `s-${item.id}`, label: "Evento submetido", entity: item.title, date: item.created_at, href: `/admin/submissoes/${item.id}` })),
    ...events.map((item) => ({ id: `e-${item.id}`, label: item.status === "archived" ? "Evento arquivado" : "Evento publicado", entity: item.title, date: item.created_at, href: `/admin/eventos/${item.id}` })),
    ...claims.map((item) => ({ id: `p-${item.id}`, label: "Perfil submetido", entity: item.entity_name, date: item.created_at, href: "/admin/perfis" })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 8);

  return <div className="mt-8">
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="order-2 shadow-panel rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:order-1 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Atividade recente</p>
        {activity.length === 0 ? <p className="mt-5 text-sm text-[var(--foreground-muted)]">Ainda não existe atividade recente.</p> : <ul className="mt-4 divide-y divide-[var(--border)]">{activity.map((item) => <li key={item.id}><Link href={item.href} className="interactive focus-ring flex min-h-14 items-center gap-3 rounded py-2 hover:bg-[var(--surface-hover)]"><AppIcon name="events" className="h-4 w-4 shrink-0 text-red-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.label}</span><span className="block truncate text-xs text-[var(--foreground-muted)]">{item.entity}</span></span><time className="shrink-0 text-xs text-[var(--foreground-muted)]">{relativeDate(item.date)}</time></Link></li>)}</ul>}
      </article>
      <article className="order-1 shadow-panel rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:order-2 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Aprovações pendentes</p>
        <ul className="mt-4 divide-y divide-[var(--border)]">{approvalRows.map((item) => <li key={item.label}><Link href={item.href} className="interactive focus-ring flex min-h-14 items-center gap-3 rounded py-2 hover:bg-[var(--surface-hover)]"><span className="min-w-0 flex-1 text-sm font-bold">{item.label}</span><strong className="text-xl">{item.count}</strong><AppIcon name="chevron" className="h-4 w-4 text-[var(--foreground-muted)]" /></Link></li>)}</ul>
        <Link href="/admin/perfis" className="focus-ring mt-5 inline-flex min-h-11 items-center rounded text-sm font-black text-red-500 hover:text-red-400">Ver aprovações</Link>
      </article>
    </section>

    {message && <p className="mt-5 text-sm font-bold text-red-400" role="alert">{message}</p>}

    <section id="admin-lists" className="mt-10 scroll-mt-24" aria-labelledby="admin-list-title">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Conteúdo</p><h2 id="admin-list-title" className="mt-2 text-3xl font-black">Eventos e submissões</h2></div>
        <label className="w-full sm:max-w-xs"><span className="sr-only">Pesquisar na lista</span><input value={search} onChange={(event) => updateListState(tab, event.target.value)} placeholder="Pesquisar" className="h-11 w-full rounded border px-4 text-sm outline-none" /></label>
      </div>
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Tipo de conteúdo">
        <Button role="tab" aria-selected={tab === "submissions"} variant={tab === "submissions" ? "primary" : "secondary"} onClick={() => updateListState("submissions", search)}>Submissões</Button>
        <Button role="tab" aria-selected={tab === "events"} variant={tab === "events" ? "primary" : "secondary"} onClick={() => updateListState("events", search)}>Eventos</Button>
      </div>

      <div className="mt-5 flex min-h-12 flex-wrap items-center gap-3 border-y border-[var(--border)] py-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Selecionar todos os itens visíveis" className="h-5 w-5 accent-red-600" />Selecionar todos</label>
        {selected.size > 0 && <><span className="text-sm font-black">{selected.size} selecionados</span><Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar seleção</Button><Button size="sm" variant="danger" onClick={() => setConfirmBulk(true)}>{tab === "submissions" ? "Rejeitar" : "Arquivar"}</Button></>}
      </div>

      <div className="mt-4 grid gap-3">
        {tab === "submissions" ? visibleSubmissions.map((item) => {
          const key = rowKey("submissions", item.id); const active = selected.has(key);
          return <article key={item.id} role="link" tabIndex={0} aria-label={`Abrir submissão ${item.title}`} onClick={() => router.push(`/admin/submissoes/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/admin/submissoes/${item.id}`); if (event.key === " " && event.target === event.currentTarget) { event.preventDefault(); toggle(key); } }} className={`interactive-card cursor-pointer rounded-lg border bg-[var(--surface)] p-4 ${active ? "border-red-600 ring-1 ring-red-600" : "border-[var(--border)]"}`}>
            <div className="grid gap-4 md:grid-cols-[auto_1fr_250px] md:items-start">
              <label className="flex min-h-11 items-center" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={active} onChange={() => toggle(key)} aria-label={`Selecionar submissão ${item.title}`} className="h-5 w-5 accent-red-600" /></label>
              <div className="min-w-0"><h3 className="text-lg font-black">{item.title}</h3><p className="mt-1 text-sm text-[var(--foreground-muted)]">{item.organizer} · {item.city}</p><p className="mt-1 text-xs text-[var(--foreground-muted)]">{item.category} · {item.event_date || "Sem data"} · Pendente</p></div>
              <div onClick={(event) => event.stopPropagation()}><AdminSubmissionActions submission={item} /></div>
            </div>
          </article>;
        }) : visibleEvents.map((item) => {
          const key = rowKey("events", item.id); const active = selected.has(key);
          return <article key={item.id} role="link" tabIndex={0} aria-label={`Abrir evento ${item.title}`} onClick={() => router.push(`/admin/eventos/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/admin/eventos/${item.id}`); if (event.key === " " && event.target === event.currentTarget) { event.preventDefault(); toggle(key); } }} className={`interactive-card cursor-pointer rounded-lg border bg-[var(--surface)] p-4 ${active ? "border-red-600 ring-1 ring-red-600" : "border-[var(--border)]"}`}>
            <div className="grid gap-4 md:grid-cols-[auto_72px_1fr_250px] md:items-center">
              <label className="flex min-h-11 items-center" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={active} onChange={() => toggle(key)} aria-label={`Selecionar evento ${item.title}`} className="h-5 w-5 accent-red-600" /></label>
              <div className="h-16 rounded bg-[var(--surface-secondary)] bg-cover bg-center" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined} />
              <div className="min-w-0"><h3 className="text-lg font-black">{item.title}</h3><p className="mt-1 text-sm text-[var(--foreground-muted)]">{item.venue_name || "Sem espaço"} · {item.city || "Sem cidade"}</p><p className="mt-1 text-xs font-bold uppercase text-[var(--foreground-muted)]">{item.display_date || "Sem data"} · {item.status === "archived" ? "Arquivado" : "Publicado"}</p></div>
              <div onClick={(event) => event.stopPropagation()}><AdminEventActions event={item} mode={item.status === "archived" ? "archived" : "published"} /></div>
            </div>
          </article>;
        })}
        {((tab === "submissions" && visibleSubmissions.length === 0) || (tab === "events" && visibleEvents.length === 0)) && <p className="rounded-lg border border-[var(--border)] p-6 text-sm text-[var(--foreground-muted)]">Não existem resultados nesta lista.</p>}
      </div>
    </section>

    {selected.size > 0 && <div className="shadow-floating fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex min-h-14 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden"><strong className="min-w-0 flex-1 text-sm">{selected.size} selecionados</strong><Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button><Button size="sm" variant="danger" onClick={() => setConfirmBulk(true)}>{tab === "submissions" ? "Rejeitar" : "Arquivar"}</Button></div>}
    <ConfirmDialog open={confirmBulk} onClose={() => !acting && setConfirmBulk(false)} onConfirm={() => void runBulkAction()} title={tab === "submissions" ? `Rejeitar ${selected.size} submissões?` : `Arquivar ${selected.size} eventos?`} description={tab === "submissions" ? "As submissões selecionadas ficam marcadas como rejeitadas." : "Os eventos selecionados deixam de aparecer nas listas públicas."} confirmLabel={tab === "submissions" ? "Rejeitar submissões" : "Arquivar eventos"} loading={acting} danger />
  </div>;
}
