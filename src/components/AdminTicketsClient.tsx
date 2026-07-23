"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type ReservationStatus = "reserved" | "cancelled" | "checked_in";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  display_time: string | null;
  image_url: string | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  status: string | null;
};

type ReservationRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  user_email: string | null;
  quantity: number;
  status: ReservationStatus;
  check_in_code: string;
  created_at: string;
  updated_at: string | null;
};

type ReservationWithEvent = ReservationRow & {
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

function statusLabel(status: ReservationStatus) {
  if (status === "reserved") {
    return "Reservado";
  }

  if (status === "checked_in") {
    return "Entrada feita";
  }

  return "Cancelado";
}

function statusClasses(status: ReservationStatus) {
  if (status === "reserved") {
    return "border-yellow-900 bg-yellow-950/30 text-yellow-500";
  }

  if (status === "checked_in") {
    return "border-green-900 bg-green-950/30 text-green-500";
  }

  return "border-border bg-background text-foreground-muted";
}

function escapeCsv(value: string | number | null | undefined) {
  const cleanValue = String(value ?? "");
  return `"${cleanValue.replace(/"/g, '""')}"`;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-border bg-background p-6">
      <p className="text-foreground-muted">{text}</p>
    </div>
  );
}

export function AdminTicketsClient() {
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reservations, setReservations] = useState<ReservationWithEvent[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "reserved" | "checked_in" | "cancelled"
  >("all");
  const [eventFilter, setEventFilter] = useState("all");

  const filteredReservations = useMemo(() => {
    const cleanSearch = normalize(search);

    return reservations.filter((reservation) => {
      const event = reservation.event;

      const matchesSearch =
        !cleanSearch ||
        normalize(
          [
            reservation.check_in_code,
            reservation.user_email,
            reservation.status,
            event?.title,
            event?.city,
            event?.venue_name,
            event?.organizer_name,
            event?.display_date,
          ].join(" ")
        ).includes(cleanSearch);

      const matchesStatus =
        statusFilter === "all" || reservation.status === statusFilter;

      const matchesEvent =
        eventFilter === "all" || reservation.event_id === eventFilter;

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [reservations, search, statusFilter, eventFilter]);

  const reservedReservations = reservations.filter(
    (reservation) => reservation.status === "reserved"
  );

  const checkedInReservations = reservations.filter(
    (reservation) => reservation.status === "checked_in"
  );

  const totalReservedTickets = reservedReservations.reduce(
    (sum, reservation) => sum + Number(reservation.quantity || 0),
    0
  );

  const totalCheckedInTickets = checkedInReservations.reduce(
    (sum, reservation) => sum + Number(reservation.quantity || 0),
    0
  );

  const totalCapacity = events.reduce(
    (sum, event) => sum + Number(event.ticket_capacity || 0),
    0
  );

  async function loadData() {
    setLoadingData(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEmail("");
      setEvents([]);
      setReservations([]);
      setLoading(false);
      setLoadingData(false);
      return;
    }

    setEmail(user.email || "");

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(
        "id,slug,title,city,venue_name,organizer_name,display_date,display_time,image_url,ticket_price,ticket_capacity,status"
      )
      .eq("ticket_mode", "internal")
      .order("start_at", { ascending: true });

    if (eventsError) {
      setMessage(eventsError.message);
      setEvents([]);
      setReservations([]);
      setLoading(false);
      setLoadingData(false);
      return;
    }

    const loadedEvents = (eventsData || []) as EventRow[];
    const eventIds = loadedEvents.map((event) => event.id);

    setEvents(loadedEvents);

    if (eventIds.length === 0) {
      setReservations([]);
      setLoading(false);
      setLoadingData(false);
      return;
    }

    const { data: reservationsData, error: reservationsError } = await supabase
      .from("ticket_reservations")
      .select(
        "id,event_id,user_id,user_email,quantity,status,check_in_code,created_at,updated_at"
      )
      .in("event_id", eventIds)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      setMessage(reservationsError.message);
      setReservations([]);
      setLoading(false);
      setLoadingData(false);
      return;
    }

    const loadedReservations = ((reservationsData || []) as ReservationRow[]).map(
      (reservation) => ({
        ...reservation,
        event:
          loadedEvents.find((event) => event.id === reservation.event_id) ||
          null,
      })
    );

    setReservations(loadedReservations);
    setLoading(false);
    setLoadingData(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function updateReservationStatus({
    reservationId,
    nextStatus,
  }: {
    reservationId: string;
    nextStatus: ReservationStatus;
  }) {
    setMessage("");

    const confirmText =
      nextStatus === "checked_in"
        ? "Marcar entrada/check-in?"
        : nextStatus === "cancelled"
          ? "Cancelar esta reserva?"
          : "Reabrir esta reserva?";

    if (!confirm(confirmText)) {
      return;
    }

    const { error } = await supabase
      .from("ticket_reservations")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (error) {
      setMessage(`Erro ao atualizar reserva: ${error.message}`);
      return;
    }

    await loadData();
  }

  function exportCsv() {
    const rows = filteredReservations.map((reservation) => {
      const event = reservation.event;

      return [
        reservation.check_in_code,
        reservation.status,
        reservation.quantity,
        reservation.user_email,
        event?.title,
        event?.display_date,
        event?.display_time,
        event?.venue_name,
        event?.city,
        event?.organizer_name,
        event?.ticket_price,
        formatDateTime(reservation.created_at),
        formatDateTime(reservation.updated_at),
      ];
    });

    const header = [
      "codigo",
      "estado",
      "quantidade",
      "email",
      "evento",
      "data",
      "hora",
      "espaco",
      "cidade",
      "organizador",
      "preco",
      "criado",
      "atualizado",
    ];

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(";"))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `paranoid-bilheteira-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-border bg-background p-6">
        <p className="text-foreground-muted">A carregar bilheteira admin...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-border bg-background p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-danger">
          Sem sessão
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
          Tens de entrar.
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-foreground-muted">
          A bilheteira admin só aparece para contas com permissões.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-[#f5f5f2] px-6 py-4 text-sm font-black text-black"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-border bg-background p-5 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            Conta admin
          </p>

          <h2 className="mt-3 break-words text-2xl font-black leading-tight">
            {email}
          </h2>

          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-foreground-muted">
            Bilheteira geral
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-border bg-surface p-4">
              <p className="text-3xl font-black">{events.length}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
                Eventos
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-surface p-4">
              <p className="text-3xl font-black">{reservations.length}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
                Reservas
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-surface p-4">
              <p className="text-3xl font-black">{totalReservedTickets}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
                Lug. ativos
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-surface p-4">
              <p className="text-3xl font-black">{totalCheckedInTickets}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
                Entradas
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-danger bg-danger/20 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-danger">
              Lotação registada
            </p>

            <p className="mt-3 text-3xl font-black">
              {totalCapacity > 0 ? totalCapacity : "∞"}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
              Capacidade somada
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={loadingData}
              className="rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {loadingData ? "A atualizar..." : "Atualizar"}
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="rounded-full border border-border-strong px-5 py-4 text-sm font-bold text-foreground-secondary"
            >
              Exportar CSV
            </button>

            <Link
              href="/organizador/bilhetes/scan"
              className="rounded-full border border-danger px-5 py-4 text-center text-sm font-bold text-danger"
            >
              Abrir scanner
            </Link>

            <Link
              href="/admin"
              className="rounded-full border border-border px-5 py-4 text-center text-sm font-bold text-foreground-muted"
            >
              Painel admin
            </Link>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-danger bg-danger/20 p-4 text-xs leading-relaxed text-danger">
              {message}
            </p>
          )}
        </aside>

        <section className="space-y-8">
          <section className="rounded-[2.5rem] border border-border bg-background p-5 lg:p-8">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-3">
                <p className="text-xs uppercase tracking-[0.3em] text-danger">
                  Filtros
                </p>

                <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                  Procurar reserva.
                </h2>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                  Pesquisa
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Código, email, evento, cidade..."
                  className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground-secondary">
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
                  className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-foreground outline-none focus:border-[var(--accent)]"
                >
                  <option value="all">Todos</option>
                  <option value="reserved">Reservados</option>
                  <option value="checked_in">Entrada feita</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                  Evento
                </label>

                <select
                  value={eventFilter}
                  onChange={(event) => setEventFilter(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-foreground outline-none focus:border-[var(--accent)]"
                >
                  <option value="all">Todos</option>

                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-danger">
                  Eventos
                </p>

                <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                  Bilheteiras internas
                </h2>
              </div>

              <span className="rounded-full border border-border px-3 py-1 text-sm font-black text-foreground-muted">
                {events.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {events.length === 0 && (
                <EmptyCard text="Ainda não há eventos com bilheteira Paranoid." />
              )}

              {events.map((event) => {
                const eventReservations = reservations.filter(
                  (reservation) => reservation.event_id === event.id
                );

                const eventReservedTickets = eventReservations
                  .filter((reservation) => reservation.status === "reserved")
                  .reduce(
                    (sum, reservation) =>
                      sum + Number(reservation.quantity || 0),
                    0
                  );

                const eventCheckedInTickets = eventReservations
                  .filter((reservation) => reservation.status === "checked_in")
                  .reduce(
                    (sum, reservation) =>
                      sum + Number(reservation.quantity || 0),
                    0
                  );

                const available =
                  event.ticket_capacity === null || event.ticket_capacity === undefined
                    ? null
                    : Math.max(event.ticket_capacity - eventReservedTickets, 0);

                return (
                  <article
                    key={event.id}
                    className="rounded-[2rem] border border-border bg-background p-5"
                  >
                    {event.image_url && (
                      <Link
                        href={`/eventos/${event.slug}`}
                        className="mb-4 block h-44 rounded-[1.5rem] bg-cover bg-center"
                        style={{ backgroundImage: `url(${event.image_url})` }}
                      />
                    )}

                    <p className="text-xs font-bold uppercase tracking-wide text-danger">
                      {event.status || "Evento"}
                    </p>

                    <h3 className="mt-2 text-2xl font-black leading-tight">
                      {event.title}
                    </h3>

                    <div className="mt-4 space-y-1 text-sm text-foreground-muted">
                      <p>{event.display_date || "Data por definir"}</p>
                      <p>
                        {[event.venue_name, event.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p>{event.organizer_name || "Organizador por definir"}</p>
                      <p>{event.ticket_price || "Preço por definir"}</p>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-border bg-surface p-3">
                        <p className="text-xl font-black">
                          {available === null ? "∞" : available}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
                          Disp.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-surface p-3">
                        <p className="text-xl font-black">
                          {eventReservedTickets}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
                          Reserv.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-surface p-3">
                        <p className="text-xl font-black">
                          {eventCheckedInTickets}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
                          Check
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2">
                      <Link
                        href={`/eventos/${event.slug}`}
                        className="rounded-full bg-[#f5f5f2] px-4 py-3 text-center text-sm font-black text-black"
                      >
                        Ver evento
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setEventFilter(event.id);
                          setStatusFilter("all");
                        }}
                        className="rounded-full border border-border-strong px-4 py-3 text-sm font-bold text-foreground-secondary"
                      >
                        Ver reservas
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-danger">
                  Reservas
                </p>

                <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                  Lista geral
                </h2>
              </div>

              <span className="rounded-full border border-border px-3 py-1 text-sm font-black text-foreground-muted">
                {filteredReservations.length}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredReservations.length === 0 && (
                <EmptyCard text="Não encontrei reservas com estes filtros." />
              )}

              {filteredReservations.map((reservation) => (
                <article
                  key={reservation.id}
                  className="rounded-[2rem] border border-border bg-background p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-danger">
                        {reservation.event?.title || "Evento"}
                      </p>

                      <h3 className="mt-2 text-3xl font-black leading-none">
                        {reservation.check_in_code}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                        reservation.status
                      )}`}
                    >
                      {statusLabel(reservation.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-border bg-surface p-4 text-sm text-foreground-muted">
                    <p>
                      <span className="font-bold text-foreground-secondary">Email:</span>{" "}
                      {reservation.user_email || "Sem email"}
                    </p>

                    <p>
                      <span className="font-bold text-foreground-secondary">
                        Quantidade:
                      </span>{" "}
                      {reservation.quantity}
                    </p>

                    <p>
                      <span className="font-bold text-foreground-secondary">Criado:</span>{" "}
                      {formatDateTime(reservation.created_at)}
                    </p>

                    <p>
                      <span className="font-bold text-foreground-secondary">Evento:</span>{" "}
                      {reservation.event?.display_date || "Data por definir"} ·{" "}
                      {[reservation.event?.venue_name, reservation.event?.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    <p>
                      <span className="font-bold text-foreground-secondary">
                        Organizador:
                      </span>{" "}
                      {reservation.event?.organizer_name ||
                        "Organizador por definir"}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {reservation.status === "reserved" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            updateReservationStatus({
                              reservationId: reservation.id,
                              nextStatus: "checked_in",
                            })
                          }
                          className="rounded-full bg-[#f5f5f2] px-4 py-3 text-sm font-black text-black"
                        >
                          Marcar entrada
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateReservationStatus({
                              reservationId: reservation.id,
                              nextStatus: "cancelled",
                            })
                          }
                          className="rounded-full border border-danger px-4 py-3 text-sm font-bold text-danger"
                        >
                          Cancelar reserva
                        </button>
                      </>
                    )}

                    {reservation.status !== "reserved" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateReservationStatus({
                            reservationId: reservation.id,
                            nextStatus: "reserved",
                          })
                        }
                        className="rounded-full border border-border-strong px-4 py-3 text-sm font-bold text-foreground-secondary"
                      >
                        Reabrir reserva
                      </button>
                    )}

                    {reservation.event && (
                      <Link
                        href={`/eventos/${reservation.event.slug}`}
                        className="rounded-full border border-border px-4 py-3 text-center text-sm font-bold text-foreground-muted"
                      >
                        Ver evento
                      </Link>
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
