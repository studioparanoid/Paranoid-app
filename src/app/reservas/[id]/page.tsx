"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, LoadingButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/shop";
import { normalizeDecimalValue } from "@/lib/inputFormatting";
import {
  acceptBookingRequest,
  getBookingRequest,
  listBookingRequestMessages,
  respondToBookingRequest,
  sendBookingRequestMessage,
  type BookingRequest,
  type BookingRequestMessage,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { supabase } from "@/lib/supabase/public";

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
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function ReservaDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : String(params?.id || "")), [params]);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [artistName, setArtistName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [isArtistViewer, setIsArtistViewer] = useState(false);
  const [isOrganizerViewer, setIsOrganizerViewer] = useState(false);
  const [messages, setMessages] = useState<BookingRequestMessage[]>([]);

  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterDate, setCounterDate] = useState("");
  const [counterVenue, setCounterVenue] = useState("");
  const [counterFee, setCounterFee] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [loadedRequest, loadedMessages] = await Promise.all([getBookingRequest(id), listBookingRequestMessages(id)]);
    setRequest(loadedRequest);
    setMessages(loadedMessages);

    if (loadedRequest) {
      const [{ data: artist }, { data: organizer }, { data: profile }, { data: membership }] = await Promise.all([
        supabase.from("artists").select("name").eq("id", loadedRequest.artist_id).maybeSingle(),
        supabase.from("organizers").select("name").eq("id", loadedRequest.organizer_id).maybeSingle(),
        supabase.from("profiles").select("account_type,entity_id,account_status").eq("id", user.id).maybeSingle(),
        supabase.from("organizer_members").select("role,can_manage_events").eq("organizer_id", loadedRequest.organizer_id).eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);
      setArtistName(artist?.name || "Artista");
      setOrganizerName(organizer?.name || "Organizador");
      setIsArtistViewer(profile?.account_type === "artist" && profile.account_status === "approved" && profile.entity_id === loadedRequest.artist_id);
      setIsOrganizerViewer(Boolean(membership && (["owner", "admin"].includes(membership.role) || membership.can_manage_events)));
      setCounterDate(loadedRequest.proposed_date || "");
      setCounterVenue(loadedRequest.proposed_venue_name || "");
      setCounterFee(loadedRequest.proposed_fee_cents != null ? (loadedRequest.proposed_fee_cents / 100).toFixed(2).replace(".", ",") : "");
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!id || !messageBody.trim() || sending) return;
    setSending(true);
    try {
      const created = await sendBookingRequestMessage(id, messageBody);
      setMessages((current) => [...current, created]);
      setMessageBody("");
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar a mensagem.", tone: "error" });
    } finally {
      setSending(false);
    }
  }

  async function handleAccept() {
    if (!id) return;
    setActing(true);
    try {
      const result = await acceptBookingRequest(id);
      setRequest(result.bookingRequest);
      setConfirmAccept(false);
      toast({ message: "Pedido aceite. O evento entrou em revisão.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível aceitar o pedido.", tone: "error" });
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    if (!id || acting) return;
    setActing(true);
    try {
      const updated = await respondToBookingRequest(id, { status: "declined" });
      setRequest(updated);
      toast({ message: "Pedido recusado.", tone: "neutral" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível recusar o pedido.", tone: "error" });
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!id || acting) return;
    setActing(true);
    try {
      const updated = await respondToBookingRequest(id, { status: "cancelled" });
      setRequest(updated);
      toast({ message: "Pedido cancelado.", tone: "neutral" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível cancelar o pedido.", tone: "error" });
    } finally {
      setActing(false);
    }
  }

  async function submitCounter(event: FormEvent) {
    event.preventDefault();
    if (!id || acting) return;
    setActing(true);
    try {
      const feeValue = normalizeDecimalValue(counterFee);
      const updated = await respondToBookingRequest(id, {
        status: "countered",
        proposedDate: counterDate || null,
        proposedVenueName: counterVenue || null,
        proposedFeeCents: feeValue != null ? Math.round(feeValue * 100) : null,
      });
      setRequest(updated);
      setCounterOpen(false);
      toast({ message: "Contraproposta enviada.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível enviar a contraproposta.", tone: "error" });
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-2xl"><LoadingSkeleton rows={5} /></section>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-2xl">
          <EmptyState title="Não encontramos este pedido." description="Pode ter sido removido ou não teres acesso a ele." actionLabel="Ver os meus pedidos" actionHref="/reservas" />
        </section>
      </main>
    );
  }

  const canRespond = isArtistViewer || isOrganizerViewer;
  const isOpen = request.status === "pending" || request.status === "countered";

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Pedido de reserva</p>
          <Button variant="ghost" size="sm" onClick={() => void load()}>Atualizar</Button>
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-black">{artistName} · {organizerName}</h1>
            <StatusBadge label={statusLabels[request.status]} tone={statusTones[request.status]} />
          </div>
          <dl className="mt-4 grid gap-2 text-sm text-foreground-muted sm:grid-cols-2">
            <div><dt className="font-bold text-foreground">Data proposta</dt><dd>{formatDate(request.proposed_date)}</dd></div>
            <div><dt className="font-bold text-foreground">Local</dt><dd>{request.proposed_venue_name || "Por definir"}</dd></div>
            <div><dt className="font-bold text-foreground">Cachê</dt><dd>{request.proposed_fee_cents != null ? formatMoney(request.proposed_fee_cents) : "Por combinar"}</dd></div>
          </dl>
          {request.note && <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground-secondary">{request.note}</p>}

          {canRespond && isOpen && (
            <div className="mt-5 flex flex-wrap gap-2">
              {isArtistViewer && <Button onClick={() => setConfirmAccept(true)} disabled={acting}>Aceitar</Button>}
              {isArtistViewer && <Button variant="danger" onClick={() => void handleDecline()} disabled={acting}>Recusar</Button>}
              <Button variant="secondary" onClick={() => setCounterOpen((open) => !open)} disabled={acting}>Contrapropor</Button>
              {isOrganizerViewer && <Button variant="ghost" onClick={() => void handleCancel()} disabled={acting}>Cancelar pedido</Button>}
            </div>
          )}

          {request.status === "accepted" && request.event_submission_id && (
            <p className="mt-5 text-sm text-foreground-muted">Aceite — o evento está em revisão na submissão associada.</p>
          )}
        </Card>

        {counterOpen && (
          <Card className="mt-4 p-5">
            <h2 className="text-lg font-black">Nova proposta</h2>
            <form onSubmit={submitCounter} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-foreground-muted">Data</span>
                <Input type="date" value={counterDate} onChange={(event) => setCounterDate(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-foreground-muted">Local</span>
                <Input value={counterVenue} onChange={(event) => setCounterVenue(event.target.value)} maxLength={160} />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-foreground-muted">Cachê</span>
                <CurrencyInput value={counterFee} onChange={setCounterFee} className="focus-ring w-full rounded-md border border-input-border bg-input px-3.5 py-2.5 text-sm text-foreground" />
              </label>
              <LoadingButton type="submit" loading={acting} loadingText="A enviar...">Enviar contraproposta</LoadingButton>
            </form>
          </Card>
        )}

        <Card className="mt-4 p-5">
          <h2 className="mb-4 text-lg font-black">Conversa</h2>
          <div className="space-y-3">
            {messages.length === 0 && <p className="text-sm text-foreground-muted">Ainda não há mensagens.</p>}
            {messages.map((message) => (
              <div key={message.id} className={`max-w-[85%] rounded-lg border border-border px-3.5 py-2.5 text-sm ${message.sender_id === userId ? "ml-auto bg-surface" : "bg-card"}`}>
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className="mt-1 text-[11px] text-foreground-muted">{formatMessageTime(message.created_at)}</p>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="mt-4 flex gap-2">
            <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={2} maxLength={2000} placeholder="Escreve uma mensagem..." className="flex-1" />
            <LoadingButton type="submit" loading={sending} loadingText="..." disabled={!messageBody.trim()}>Enviar</LoadingButton>
          </form>
        </Card>
      </section>

      <ConfirmDialog
        open={confirmAccept}
        onClose={() => setConfirmAccept(false)}
        onConfirm={() => void handleAccept()}
        title="Aceitar este pedido?"
        description="Cria automaticamente um rascunho de evento para revisão — não fica publicado de imediato."
        confirmLabel="Aceitar"
        loading={acting}
      />
    </main>
  );
}
