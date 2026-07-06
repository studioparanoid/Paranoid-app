"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type ReservationRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  user_email: string | null;
  quantity: number;
  status: "reserved" | "cancelled" | "checked_in";
  check_in_code: string;
  created_at: string;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  display_date: string | null;
  display_time: string | null;
  image_url: string | null;
  ticket_price: string | null;
  status: string | null;
};

type TicketWithEvent = ReservationRow & {
  event: EventRow | null;
};

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: ReservationRow["status"]) {
  if (status === "reserved") {
    return "Reservado";
  }

  if (status === "checked_in") {
    return "Entrada feita";
  }

  return "Cancelado";
}

function statusClasses(status: ReservationRow["status"]) {
  if (status === "reserved") {
    return "border-yellow-900 bg-yellow-950/30 text-yellow-500";
  }

  if (status === "checked_in") {
    return "border-green-900 bg-green-950/30 text-green-500";
  }

  return "border-zinc-800 bg-zinc-950 text-zinc-500";
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-zinc-500">{text}</p>
    </div>
  );
}

export function UserTicketsClient() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "reserved" | "checked_in" | "cancelled"
  >("all");

  const filteredTickets = useMemo(() => {
    const cleanSearch = normalize(search);

    return tickets.filter((ticket) => {
      const event = ticket.event;

      const matchesSearch =
        !cleanSearch ||
        normalize(
          [
            ticket.check_in_code,
            ticket.status,
            event?.title,
            event?.city,
            event?.venue_name,
            event?.display_date,
          ].join(" ")
        ).includes(cleanSearch);

      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const activeTickets = tickets.filter((ticket) => ticket.status === "reserved");
  const checkedInTickets = tickets.filter(
    (ticket) => ticket.status === "checked_in"
  );
  const cancelledTickets = tickets.filter(
    (ticket) => ticket.status === "cancelled"
  );

  const activeQuantity = activeTickets.reduce(
    (sum, ticket) => sum + Number(ticket.quantity || 0),
    0
  );

  async function loadTickets() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEmail("");
      setTickets([]);
      setLoading(false);
      return;
    }

    setEmail(user.email || "");

    const { data: reservationData, error: reservationError } = await supabase
      .from("ticket_reservations")
      .select(
        "id,event_id,user_id,user_email,quantity,status,check_in_code,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (reservationError) {
      setMessage(reservationError.message);
      setTickets([]);
      setLoading(false);
      return;
    }

    const reservations = (reservationData || []) as ReservationRow[];
    const eventIds = Array.from(
      new Set(reservations.map((reservation) => reservation.event_id))
    );

    if (eventIds.length === 0) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(
        "id,slug,title,city,venue_name,display_date,display_time,image_url,ticket_price,status"
      )
      .in("id", eventIds);

    if (eventsError) {
      setMessage(eventsError.message);
      setTickets([]);
      setLoading(false);
      return;
    }

    const events = (eventsData || []) as EventRow[];

    const ticketsWithEvents = reservations.map((reservation) => ({
      ...reservation,
      event: events.find((event) => event.id === reservation.event_id) || null,
    }));

    setTickets(ticketsWithEvents);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function cancelReservation(reservationId: string) {
    setMessage("");

    if (!confirm("Cancelar esta reserva?")) {
      return;
    }

    const { error } = await supabase
      .from("ticket_reservations")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (error) {
      setMessage(`Erro ao cancelar reserva: ${error.message}`);
      return;
    }

    await loadTickets();
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar bilhetes...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-red-700">
          Sem sessão
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
          Entra para ver os teus bilhetes.
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-zinc-400 lg:text-base">
          As reservas ficam ligadas à tua conta.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Conta
          </p>

          <h2 className="mt-3 break-words text-2xl font-black leading-tight">
            {email}
          </h2>

          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-zinc-600">
            Bilhetes Paranoid
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{activeTickets.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Ativos
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{activeQuantity}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Lug.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{checkedInTickets.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Check
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{cancelledTickets.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Canc.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={loadTickets}
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
            >
              Atualizar
            </button>

            <Link
              href="/agenda"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Explorar agenda
            </Link>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-red-950 bg-red-950/20 p-4 text-xs leading-relaxed text-red-300">
              {message}
            </p>
          )}
        </aside>

        <section className="space-y-8">
          <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Filtros
                </p>

                <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                  Encontrar bilhete.
                </h2>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Pesquisa
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Código, evento, cidade..."
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Estado
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | "all"
                        | "reserved"
                        | "checked_in"
                        | "cancelled"
                    )
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                >
                  <option value="all">Todos</option>
                  <option value="reserved">Reservados</option>
                  <option value="checked_in">Entrada feita</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Lista
                </p>

                <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                  Os teus bilhetes
                </h2>
              </div>

              <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                {filteredTickets.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredTickets.length === 0 && (
                <EmptyCard text="Não encontrei bilhetes com estes filtros." />
              )}

              {filteredTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
                >
                  {ticket.event?.image_url && (
                    <Link
                      href={`/eventos/${ticket.event.slug}`}
                      className="mb-4 block h-52 rounded-[1.5rem] bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${ticket.event.image_url})`,
                      }}
                    />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                        {ticket.event?.title || "Evento"}
                      </p>

                      <h3 className="mt-2 text-4xl font-black leading-none">
                        {ticket.check_in_code}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                        ticket.status
                      )}`}
                    >
                      {statusLabel(ticket.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                    <p>
                      <span className="font-bold text-zinc-300">Quantidade:</span>{" "}
                      {ticket.quantity}
                    </p>

                    <p>
                      <span className="font-bold text-zinc-300">Data:</span>{" "}
                      {ticket.event?.display_date || "Data por definir"}
                      {ticket.event?.display_time
                        ? ` · ${ticket.event.display_time}`
                        : ""}
                    </p>

                    <p>
                      <span className="font-bold text-zinc-300">Local:</span>{" "}
                      {[ticket.event?.venue_name, ticket.event?.city]
                        .filter(Boolean)
                        .join(" · ") || "Local por definir"}
                    </p>

                    <p>
                      <span className="font-bold text-zinc-300">Preço:</span>{" "}
                      {ticket.event?.ticket_price || "Preço por definir"}
                    </p>

                    <p>
                      <span className="font-bold text-zinc-300">Criado:</span>{" "}
                      {formatDateTime(ticket.created_at)}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {ticket.event && (
                      <Link
                        href={`/eventos/${ticket.event.slug}`}
                        className="rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
                      >
                        Ver evento
                      </Link>
                    )}

                    {ticket.status === "reserved" && (
                      <button
                        type="button"
                        onClick={() => cancelReservation(ticket.id)}
                        className="rounded-full border border-red-900 px-4 py-3 text-sm font-bold text-red-400"
                      >
                        Cancelar reserva
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}