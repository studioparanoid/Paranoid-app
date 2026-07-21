"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BusyDaysCalendar } from "@/components/BusyDaysCalendar";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { LoadingButton } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { normalizeDecimalValue } from "@/lib/inputFormatting";
import { createBookingRequest, listArtistBusyDates, listOrganizerBusyDates } from "@/lib/bookingRequests";
import { supabase } from "@/lib/supabase/public";

type Entity = { id: string; name: string; city: string | null };
type Mode = "artist" | "organizer";

export default function NovaReservaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [mode, setMode] = useState<Mode | null>(null);
  const [counterpart, setCounterpart] = useState<Entity | null>(null);
  const [selfArtist, setSelfArtist] = useState<Entity | null>(null);
  const [organizers, setOrganizers] = useState<Entity[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [busyDates, setBusyDates] = useState<string[]>([]);

  const [proposedDate, setProposedDate] = useState<string | null>(null);
  const [venueName, setVenueName] = useState("");
  const [fee, setFee] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const artistIdParam = params.get("artistId");
    const organizerIdParam = params.get("organizerId");

    const { data: { user } } = await supabase.auth.getUser();
    setAuthenticated(Boolean(user));
    if (!user) {
      setLoading(false);
      return;
    }

    if (artistIdParam) {
      const [{ data: artistData }, { data: memberships }] = await Promise.all([
        supabase.from("artists").select("id,name,city").eq("id", artistIdParam).maybeSingle(),
        supabase.from("organizer_members").select("organizer_id,role,can_manage_events").eq("user_id", user.id).eq("status", "active"),
      ]);
      const eligibleOrganizerIds = (memberships || [])
        .filter((membership) => ["owner", "admin"].includes(membership.role) || membership.can_manage_events)
        .map((membership) => membership.organizer_id);

      if (artistData && eligibleOrganizerIds.length > 0) {
        const { data: organizerRows } = await supabase.from("organizers").select("id,name,city").in("id", eligibleOrganizerIds).order("name");
        setMode("artist");
        setCounterpart(artistData);
        setOrganizers(organizerRows || []);
        setOrganizerId(organizerRows?.[0]?.id || "");
        setBusyDates(await listArtistBusyDates(artistData.id));
      }
    } else if (organizerIdParam) {
      const [{ data: organizerData }, { data: profile }] = await Promise.all([
        supabase.from("organizers").select("id,name,city").eq("id", organizerIdParam).maybeSingle(),
        supabase.from("profiles").select("account_type,entity_id,account_status").eq("id", user.id).maybeSingle(),
      ]);
      const eligible = profile?.account_type === "artist" && profile.account_status === "approved" && Boolean(profile.entity_id);

      if (organizerData && eligible) {
        const { data: artistData } = await supabase.from("artists").select("id,name,city").eq("id", profile!.entity_id as string).maybeSingle();
        if (artistData) {
          setMode("organizer");
          setCounterpart(organizerData);
          setSelfArtist(artistData);
          setBusyDates(await listOrganizerBusyDates(organizerData.id));
        }
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode || !counterpart || submitting) return;
    if (mode === "artist" && !organizerId) return;
    if (mode === "organizer" && !selfArtist) return;
    setSubmitting(true);
    try {
      const feeValue = normalizeDecimalValue(fee);
      const created = await createBookingRequest({
        organizerId: mode === "artist" ? organizerId : counterpart.id,
        artistId: mode === "artist" ? counterpart.id : selfArtist!.id,
        proposedDate: proposedDate || null,
        proposedVenueName: venueName || null,
        proposedFeeCents: feeValue != null ? Math.round(feeValue * 100) : null,
        note: note || null,
        contactPhone: phone || null,
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

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg">
          <EmptyState title="Tens de iniciar sessão." description="Precisas de uma conta para entrar em contacto." actionLabel="Entrar" actionHref="/login" />
        </section>
      </main>
    );
  }

  if (!mode || !counterpart) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg">
          <EmptyState title="Não é possível criar este pedido." description="Esta funcionalidade é para artistas e organizadores com perfil aprovado." actionLabel="Voltar ao perfil" actionHref="/perfil" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-lg">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Entra em contacto</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{counterpart.name}</h1>
          {counterpart.city && <p className="mt-1 text-sm text-foreground-muted">{counterpart.city}</p>}
        </header>

        <form onSubmit={submit} className="space-y-5">
          {mode === "organizer" && selfArtist && (
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <span className="block text-xs font-bold text-foreground-muted">A tocar</span>
              <span className="text-sm font-black">{selfArtist.name}</span>
            </div>
          )}

          {mode === "artist" && organizers.length > 1 && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-foreground-muted">Organizador</span>
              <select value={organizerId} onChange={(event) => setOrganizerId(event.target.value)} className="focus-ring w-full rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground">
                {organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name}</option>)}
              </select>
            </label>
          )}

          <div>
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Escolhe um dia</span>
            <BusyDaysCalendar busyDates={busyDates} selectedDate={proposedDate} onSelectDate={setProposedDate} />
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Local (opcional)</span>
            <Input value={venueName} onChange={(event) => setVenueName(event.target.value)} placeholder="Nome do espaço" maxLength={160} />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Telefone</span>
            <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9XX XXX XXX" maxLength={30} />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Cachê (opcional)</span>
            <CurrencyInput value={fee} onChange={setFee} placeholder="0,00" className="focus-ring w-full rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Descrição</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={2000} placeholder={mode === "organizer" ? "Conta um pouco o que tocas ou fazes." : "Conta ao artista o que tens em mente."} />
          </label>

          <LoadingButton type="submit" loading={submitting} loadingText="A enviar..." className="w-full">Enviar pedido</LoadingButton>
        </form>
      </section>
    </main>
  );
}
