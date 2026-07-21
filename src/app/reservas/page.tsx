"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatMoney } from "@/lib/shop";
import { listBookingRequestsForArtist, listBookingRequestsForOrganizer, type BookingRequest, type BookingRequestStatus } from "@/lib/bookingRequests";
import { supabase } from "@/lib/supabase/public";

type ViewMode = "pedidos" | "agenda";
type Role = "artist" | "organizer";
type NamedRequest = BookingRequest & { counterpartName: string };

const statusLabels: Record<BookingRequestStatus, string> = {
  pending: "Pendente",
  countered: "Contraproposta",
  accepted: "Aceite",
  declined: "Recusado",
  cancelled: "Cancelado",
};

const statusTones: Record<BookingRequestStatus, "neutral" | "success" | "warning" | "danger"> = {
  pending: "warning",
  countered: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "neutral",
};

function formatDate(value: string | null) {
  if (!value) return "Data por definir";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function ReservasPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [requests, setRequests] = useState<NamedRequest[]>([]);
  const [view, setView] = useState<ViewMode>("pedidos");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type,entity_id,account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.account_type === "artist" && profile.account_status === "approved" && profile.entity_id) {
      setRole("artist");
      const rows = await listBookingRequestsForArtist(profile.entity_id);
      const organizerIds = Array.from(new Set(rows.map((row) => row.organizer_id)));
      const { data: organizers } = organizerIds.length
        ? await supabase.from("organizers").select("id,name").in("id", organizerIds)
        : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((organizers || []).map((organizer) => [organizer.id, organizer.name]));
      setRequests(rows.map((row) => ({ ...row, counterpartName: nameById.get(row.organizer_id) || "Organizador" })));
    } else if (profile?.account_type === "organizer" && profile.account_status === "approved") {
      setRole("organizer");
      const { data: memberships } = await supabase
        .from("organizer_members")
        .select("organizer_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const organizerIds = (memberships || []).map((membership) => membership.organizer_id);
      const rows = (await Promise.all(organizerIds.map((id) => listBookingRequestsForOrganizer(id)))).flat();
      const artistIds = Array.from(new Set(rows.map((row) => row.artist_id)));
      const { data: artists } = artistIds.length
        ? await supabase.from("artists").select("id,name").in("id", artistIds)
        : { data: [] as { id: string; name: string }[] };
      const nameById = new Map((artists || []).map((artist) => [artist.id, artist.name]));
      setRequests(rows.map((row) => ({ ...row, counterpartName: nameById.get(row.artist_id) || "Artista" })));
    } else {
      setRole(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-3xl"><LoadingSkeleton rows={4} /></section>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-3xl">
          <EmptyState title="Esta conta não participa em pedidos de reserva." description="Os pedidos de reserva são para contas de artista ou organizador aprovadas." actionLabel="Voltar ao perfil" actionHref="/perfil" />
        </section>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const agendaItems = requests
    .filter((request) => (request.status === "pending" || request.status === "accepted") && request.proposed_date && request.proposed_date >= today)
    .sort((first, second) => (first.proposed_date || "").localeCompare(second.proposed_date || ""));
  const pedidosItems = [...requests].sort((first, second) => second.updated_at.localeCompare(first.updated_at));
  const items = view === "agenda" ? agendaItems : pedidosItems;

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Reservas</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{role === "artist" ? "Pedidos de organizadores" : "Os teus pedidos"}</h1>
        </header>

        <SegmentedControl
          label="Vista"
          value={view}
          onChange={setView}
          options={[{ value: "pedidos", label: "Pedidos" }, { value: "agenda", label: "Agenda" }]}
          className="max-w-xs"
        />

        <div className="mt-6 space-y-3">
          {items.length === 0 && (
            <EmptyState
              title={view === "agenda" ? "Sem datas confirmadas." : "Ainda não há pedidos."}
              description={role === "artist" ? "Quando um organizador te contactar, aparece aqui." : "Pede uma reserva a partir do perfil público de um artista."}
            />
          )}
          {items.map((request) => (
            <Link key={request.id} href={`/reservas/${request.id}`}>
              <Card interactive className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-black">{request.counterpartName}</p>
                  <StatusBadge label={statusLabels[request.status]} tone={statusTones[request.status]} />
                </div>
                <p className="mt-1 text-sm text-foreground-muted">
                  {formatDate(request.proposed_date)}
                  {request.proposed_venue_name ? ` · ${request.proposed_venue_name}` : ""}
                  {request.proposed_fee_cents != null ? ` · ${formatMoney(request.proposed_fee_cents)}` : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
