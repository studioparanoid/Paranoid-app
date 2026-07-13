"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { TicketSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketQrCode } from "@/components/TicketQrCode";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/public";

type Reservation = { id: string; event_id: string; quantity: number; status: "reserved" | "cancelled" | "checked_in"; check_in_code: string; created_at: string };
type EventRow = { id: string; slug: string; title: string; city: string | null; venue_name: string | null; display_date: string | null; display_time: string | null; start_at: string | null; image_url: string | null };
type Ticket = Reservation & { event: EventRow | null };
type TicketTab = "upcoming" | "past";
const ticketTabs: Array<{ value: TicketTab; label: string }> = [
  { value: "upcoming", label: "Próximos" },
  { value: "past", label: "Passados" },
];

function isPast(ticket: Ticket) {
  if (ticket.status !== "reserved") return true;
  const value = ticket.event?.start_at;
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function status(ticket: Ticket) {
  if (ticket.status === "checked_in") return { label: "Usado", tone: "success" as const };
  if (ticket.status === "cancelled") return { label: "Cancelado", tone: "danger" as const };
  return { label: "Válido", tone: "warning" as const };
}

export function UserTicketsClient() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<TicketTab>("upcoming");
  const [openTicketId, setOpenTicketId] = useState("");
  const [cancelTicketId, setCancelTicketId] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  async function loadTickets() {
    setLoading(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    setLoggedIn(Boolean(user));
    if (!user) { setTickets([]); setLoading(false); return; }
    const reservationResponse = await supabase.from("ticket_reservations").select("id,event_id,quantity,status,check_in_code,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (reservationResponse.error) { setMessage("Não foi possível carregar os bilhetes."); setLoading(false); return; }
    const reservations = (reservationResponse.data || []) as Reservation[];
    const ids = Array.from(new Set(reservations.map((item) => item.event_id)));
    let events: EventRow[] = [];
    if (ids.length > 0) {
      const eventsResponse = await supabase.from("events").select("id,slug,title,city,venue_name,display_date,display_time,start_at,image_url").in("id", ids);
      events = (eventsResponse.data || []) as EventRow[];
    }
    setTickets(reservations.map((reservation) => ({ ...reservation, event: events.find((event) => event.id === reservation.event_id) || null })));
    setLoading(false);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadTickets(); }, 0); return () => window.clearTimeout(timer); }, []);

  const upcoming = useMemo(() => tickets.filter((ticket) => !isPast(ticket)), [tickets]);
  const past = useMemo(() => tickets.filter(isPast), [tickets]);
  const visible = tab === "upcoming" ? upcoming : past;

  async function cancelTicket(id: string) {
    if (cancelling) return;
    setCancelling(true);
    const { error } = await supabase.from("ticket_reservations").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      setMessage("Não foi possível cancelar a reserva.");
      setCancelling(false);
      toast({ message: "Não foi possível cancelar a reserva.", tone: "error" });
      return;
    }
    setCancelTicketId("");
    setCancelling(false);
    toast({ message: "Reserva cancelada.", tone: "success" });
    await loadTickets();
  }

  if (loading) return <TicketSkeleton />;
  if (!loggedIn) return <EmptyState title="Entra para veres os teus bilhetes." actionLabel="Iniciar sessão" actionHref="/login" />;

  return <div>
    <SegmentedControl value={tab} options={ticketTabs.map((item) => ({ ...item, label: `${item.label} · ${item.value === "upcoming" ? upcoming.length : past.length}` }))} onChange={setTab} label="Estado dos bilhetes" className="max-w-sm" />
    {message && <p className="mt-5 border-l-2 border-red-800 pl-4 text-sm text-red-300">{message}</p>}
    <section key={tab} className="content-transition mt-6">{visible.length === 0 ? <EmptyState title="Ainda não tens bilhetes." actionLabel="Ver Agenda" actionHref="/agenda" /> : <div className="divide-y divide-zinc-900 border-y border-zinc-900">{visible.map((ticket) => {
      const ticketStatus = status(ticket); const open = openTicketId === ticket.id;
      return <article key={ticket.id} className="card-hover py-5"><div className="flex items-start gap-4">{ticket.event?.image_url && <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded"><Image src={ticket.event.image_url} alt="" fill sizes="80px" unoptimized className="object-cover" /></span>}<div className="min-w-0 flex-1"><h2 className="text-lg font-black">{ticket.event?.title || "Evento"}</h2><p className="mt-1 text-sm text-zinc-500">{ticket.event?.display_date || "Data por definir"}{ticket.event?.display_time ? ` · ${ticket.event.display_time}` : ""}</p><p className="mt-1 text-xs text-zinc-600">{[ticket.event?.venue_name, ticket.event?.city].filter(Boolean).join(" · ")}</p><p className="mt-2 text-xs font-bold text-zinc-400">{ticket.quantity} {ticket.quantity === 1 ? "bilhete" : "bilhetes"}</p></div><StatusBadge label={ticketStatus.label} tone={ticketStatus.tone} /></div>
      <Button type="button" onClick={() => setOpenTicketId(open ? "" : ticket.id)} aria-expanded={open} aria-controls={`ticket-${ticket.id}`} className="mt-4">{open ? "Fechar bilhete" : "Ver bilhete"}</Button>
      {open && <div id={`ticket-${ticket.id}`} className="scale-in mt-5 rounded border border-zinc-800 bg-black p-5"><p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">Código de entrada</p>{ticket.status === "reserved" && <div className="mt-4"><TicketQrCode value={ticket.check_in_code} /></div>}<p className="mt-4 text-center font-mono text-lg font-black">{ticket.check_in_code}</p><div className="mt-5 flex flex-wrap justify-center gap-2">{ticket.event && <Link href={`/eventos/${ticket.event.slug}`} className="pressable focus-ring rounded-full border border-zinc-700 px-4 py-2 text-xs font-bold">Ver evento</Link>}{ticket.status === "reserved" && <Button variant="danger" size="sm" onClick={() => setCancelTicketId(ticket.id)}>Cancelar reserva</Button>}</div></div>}
      </article>;
    })}</div>}</section>
    <ConfirmDialog open={Boolean(cancelTicketId)} onClose={() => !cancelling && setCancelTicketId("")} onConfirm={() => void cancelTicket(cancelTicketId)} title="Cancelar esta reserva?" description="O bilhete deixa de ficar disponível para entrada." confirmLabel="Cancelar reserva" loading={cancelling} danger />
  </div>;
}
