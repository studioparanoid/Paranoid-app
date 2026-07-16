import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Entity = { id: string; name: string; slug: string; city?: string | null; status?: string | null };
type ReviewItem = { id: string; entity_type: string; field_name: string | null; legacy_value: string | null; reason: string; created_at: string };

function normalizedName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT").replace(/[^a-z0-9]+/g, " ").trim();
}

function duplicateGroups(rows: Entity[]) {
  const groups = new Map<string, Entity[]>();
  rows.forEach((row) => {
    const key = normalizedName(row.name);
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return Array.from(groups.values()).filter((group) => group.length > 1);
}

function EntityList({ title, rows, kind }: { title: string; rows: Entity[]; kind: "artistas" | "espacos" | "organizadores" }) {
  if (!rows.length) return null;
  return <section className="border-t border-[var(--border)] pt-5">
    <div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-black">{title}</h2><span className="text-xs text-[var(--foreground-muted)]">{rows.length}</span></div>
    <ul className="mt-3 divide-y divide-[var(--border)]">{rows.map((row) => <li key={row.id} className="flex items-center justify-between gap-4 py-3"><div><strong>{row.name}</strong><p className="text-xs text-[var(--foreground-muted)]">{[row.city, row.slug].filter(Boolean).join(" · ")}</p></div><Link className="text-xs font-black text-red-700 hover:text-red-600" href={`/admin/rede/${kind}/${row.id}`}>Rever</Link></li>)}</ul>
  </section>;
}

export default async function DataQualityPage() {
  const supabase = await createClient();
  const [artistsResult, venuesResult, organizersResult, reviewsResult] = await Promise.all([
    supabase.from("artists").select("id,name,slug,city,status").order("name").limit(500),
    supabase.from("venues").select("id,name,slug,city,status").order("name").limit(500),
    supabase.from("organizers").select("id,name,slug,city,status").order("name").limit(500),
    supabase.from("data_migration_review_items").select("id,entity_type,field_name,legacy_value,reason,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(100),
  ]);
  const unavailable = artistsResult.error || venuesResult.error || organizersResult.error || reviewsResult.error;
  const artists = (artistsResult.data || []) as Entity[];
  const venues = (venuesResult.data || []) as Entity[];
  const organizers = (organizersResult.data || []) as Entity[];
  const provisionalArtists = artists.filter((row) => row.status === "provisional");
  const provisionalVenues = venues.filter((row) => row.status === "provisional");
  const provisionalOrganizers = organizers.filter((row) => row.status === "provisional");
  const duplicateCandidates = [
    ...duplicateGroups(artists).map((rows) => ({ kind: "Artistas", rows })),
    ...duplicateGroups(venues).map((rows) => ({ kind: "Espaços", rows })),
    ...duplicateGroups(organizers).map((rows) => ({ kind: "Organizadores", rows })),
  ];
  const reviews = (reviewsResult.data || []) as ReviewItem[];

  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-[var(--border)] pb-6"><p className="text-xs font-black uppercase text-red-700">Administração</p><h1 className="mt-2 text-3xl font-black">Qualidade de dados</h1><p className="mt-2 max-w-3xl text-sm text-[var(--foreground-muted)]">Revisão humana para entidades provisórias, valores antigos ambíguos e possíveis duplicados.</p></header>
      {unavailable ? <section className="mt-8 border-l-2 border-amber-600 pl-4"><h2 className="font-black">Estrutura ainda não aplicada</h2><p className="mt-1 text-sm text-[var(--foreground-muted)]">Aplica primeiro as migrations estruturais. Nenhum dado atual foi alterado por esta página.</p></section> : <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="space-y-8">
          <EntityList title="Artistas provisórios" rows={provisionalArtists} kind="artistas" />
          <EntityList title="Espaços provisórios" rows={provisionalVenues} kind="espacos" />
          <EntityList title="Organizadores provisórios" rows={provisionalOrganizers} kind="organizadores" />
          {!provisionalArtists.length && !provisionalVenues.length && !provisionalOrganizers.length && <p className="text-sm text-[var(--foreground-muted)]">Não existem entidades provisórias.</p>}
        </div>
        <div className="space-y-8">
          <section className="border-t border-[var(--border)] pt-5"><div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-black">Revisão da migração</h2><span className="text-xs text-[var(--foreground-muted)]">{reviews.length}</span></div>{reviews.length ? <ul className="mt-3 divide-y divide-[var(--border)]">{reviews.map((item) => <li key={item.id} className="py-3"><strong className="text-sm">{item.reason}</strong><p className="mt-1 text-xs text-[var(--foreground-muted)]">{[item.entity_type, item.field_name, item.legacy_value].filter(Boolean).join(" · ")}</p></li>)}</ul> : <p className="mt-3 text-sm text-[var(--foreground-muted)]">Sem casos ambíguos pendentes.</p>}</section>
          <section className="border-t border-[var(--border)] pt-5"><div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-black">Possíveis duplicados</h2><span className="text-xs text-[var(--foreground-muted)]">{duplicateCandidates.length}</span></div>{duplicateCandidates.length ? <ul className="mt-3 divide-y divide-[var(--border)]">{duplicateCandidates.map((group) => <li key={`${group.kind}-${group.rows[0].id}`} className="py-3"><strong className="text-sm">{group.kind}: {group.rows[0].name}</strong><p className="mt-1 text-xs text-[var(--foreground-muted)]">{group.rows.map((row) => [row.city, row.slug].filter(Boolean).join(" / ")).join(" · ")}</p></li>)}</ul> : <p className="mt-3 text-sm text-[var(--foreground-muted)]">Sem nomes duplicados nos primeiros 500 registos de cada tipo.</p>}</section>
        </div>
      </div>}
    </div>
  </main>;
}
