"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { LoadingButton } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { normalizeDecimalValue } from "@/lib/inputFormatting";
import { createBookingRequest } from "@/lib/bookingRequests";
import { supabase } from "@/lib/supabase/public";

type Artist = { id: string; name: string; city: string | null };
type Organizer = { id: string; name: string };

export default function NovaReservaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    const artistId = new URLSearchParams(window.location.search).get("artistId") || "";

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !artistId) {
      setLoading(false);
      return;
    }

    const [{ data: artistData }, { data: memberships }] = await Promise.all([
      supabase.from("artists").select("id,name,city").eq("id", artistId).maybeSingle(),
      supabase.from("organizer_members").select("organizer_id,role,can_manage_events").eq("user_id", user.id).eq("status", "active"),
    ]);

    const eligibleOrganizerIds = (memberships || [])
      .filter((membership) => ["owner", "admin"].includes(membership.role) || membership.can_manage_events)
      .map((membership) => membership.organizer_id);

    if (artistData && eligibleOrganizerIds.length > 0) {
      const { data: organizerRows } = await supabase.from("organizers").select("id,name").in("id", eligibleOrganizerIds).order("name");
      setArtist(artistData);
      setOrganizers(organizerRows || []);
      setOrganizerId(organizerRows?.[0]?.id || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!artist || !organizerId || submitting) return;
    setSubmitting(true);
    try {
      const feeValue = normalizeDecimalValue(fee);
      const created = await createBookingRequest({
        organizerId,
        artistId: artist.id,
        proposedDate: proposedDate || null,
        proposedVenueName: venueName || null,
        proposedFeeCents: feeValue != null ? Math.round(feeValue * 100) : null,
        note: note || null,
      });
      toast({ message: "Pedido enviado.", tone: "success" });
      router.push(`/reservas/${created.id}`);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar o pedido.", tone: "error" });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg"><LoadingSkeleton rows={4} /></section>
      </main>
    );
  }

  if (!artist || organizers.length === 0) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg">
          <EmptyState title="Não é possível criar este pedido." description="Confirma que o artista existe e que a tua conta gere um organizador com permissão para eventos." actionLabel="Voltar ao perfil" actionHref="/perfil" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-lg">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Pedir reserva</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{artist.name}</h1>
          {artist.city && <p className="mt-1 text-sm text-foreground-muted">{artist.city}</p>}
        </header>

        <form onSubmit={submit} className="space-y-5">
          {organizers.length > 1 && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-muted">Organizador</span>
              <select value={organizerId} onChange={(event) => setOrganizerId(event.target.value)} className="focus-ring w-full rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground">
                {organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name}</option>)}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Data proposta</span>
            <Input type="date" value={proposedDate} onChange={(event) => setProposedDate(event.target.value)} min={new Date().toISOString().slice(0, 10)} />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Local</span>
            <Input value={venueName} onChange={(event) => setVenueName(event.target.value)} placeholder="Nome do espaço" maxLength={160} />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Cachê (opcional)</span>
            <CurrencyInput value={fee} onChange={setFee} placeholder="0,00" className="focus-ring w-full rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Mensagem</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={2000} placeholder="Conta ao artista o que tens em mente." />
          </label>

          <LoadingButton type="submit" loading={submitting} loadingText="A enviar..." className="w-full">Enviar pedido</LoadingButton>
        </form>
      </section>
    </main>
  );
}
