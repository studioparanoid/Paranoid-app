"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type TicketReservationClientProps = {
  event: {
    id: string;
    slug: string;
    title: string;
    ticket_price: string | null;
    ticket_capacity: number | null;
  };
};

type ReservationRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  user_email: string | null;
  quantity: number;
  status: string;
  check_in_code: string;
  created_at: string;
};

type AvailabilityRow = {
  ticket_capacity: number | null;
  reserved_quantity: number;
  available_quantity: number | null;
};

export function TicketReservationClient({
  event,
}: TicketReservationClientProps) {
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [reservedTotal, setReservedTotal] = useState(0);
  const [availableTickets, setAvailableTickets] = useState<number | null>(
    event.ticket_capacity
  );
  const [myReservations, setMyReservations] = useState<ReservationRow[]>([]);

  const capacity = event.ticket_capacity || null;

  const hasActiveReservation = useMemo(() => {
    return myReservations.some(
      (reservation) => reservation.status === "reserved"
    );
  }, [myReservations]);

  async function loadReservationData() {
    setLoading(true);
    setMessage("");

    const { data: availabilityData, error: availabilityError } =
      await supabase.rpc("get_event_ticket_availability", {
        p_event_id: event.id,
      });

    if (availabilityError) {
      setMessage(availabilityError.message);
    } else {
      const rows = (availabilityData || []) as AvailabilityRow[];
      const availability = rows[0] || null;

      setReservedTotal(availability?.reserved_quantity || 0);
      setAvailableTickets(
        typeof availability?.available_quantity === "number"
          ? availability.available_quantity
          : null
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setMyReservations([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: myRows, error: myRowsError } = await supabase
      .from("ticket_reservations")
      .select(
        "id,event_id,user_id,user_email,quantity,status,check_in_code,created_at"
      )
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (myRowsError) {
      setMessage(myRowsError.message);
      setMyReservations([]);
      setLoading(false);
      return;
    }

    setMyReservations((myRows || []) as ReservationRow[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReservationData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [event.id]);

  async function createReservation() {
    setMessage("");

    if (!userId) {
      setMessage("Tens de entrar na conta para reservar.");
      return;
    }

    if (quantity < 1 || quantity > 10) {
      setMessage("Escolhe entre 1 e 10 bilhetes.");
      return;
    }

    if (availableTickets !== null && quantity > availableTickets) {
      setMessage("Não há lugares suficientes disponíveis.");
      return;
    }

    setReserving(true);

    const { error } = await supabase.rpc("create_ticket_reservation", {
      p_event_id: event.id,
      p_quantity: quantity,
    });

    setReserving(false);

    if (error) {
      setMessage(error.message);
      await loadReservationData();
      return;
    }

    await loadReservationData();
  }

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
      setMessage(`Erro ao cancelar: ${error.message}`);
      return;
    }

    await loadReservationData();
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-border bg-surface p-5">
        <p className="text-foreground-muted">A carregar bilheteira...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-[2rem] border border-yellow-900 bg-yellow-950/20 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
          Conta necessária
        </p>

        <h2 className="mt-3 text-3xl font-black leading-none">
          Entra para reservar.
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
          A reserva fica ligada à tua conta e gera um código de entrada.
        </p>

        <Link
          href="/login"
          className="mt-5 block rounded-full bg-[#f5f5f2] px-5 py-4 text-center text-sm font-black text-black"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-border bg-surface p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-danger">
          Disponibilidade
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] border border-border bg-background p-4">
            <p className="text-3xl font-black">
              {availableTickets === null ? "∞" : availableTickets}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
              Disponíveis
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-background p-4">
            <p className="text-3xl font-black">{reservedTotal}</p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground-muted">
              Reservados
            </p>
          </div>
        </div>

        {capacity && (
          <p className="mt-4 text-sm text-foreground-muted">
            Lotação total: {capacity}
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-danger bg-danger/20 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-danger">
          Reservar
        </p>

        <h2 className="mt-3 text-3xl font-black leading-none">
          {event.ticket_price || "Preço por definir"}
        </h2>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Quantidade
          </label>

          <input
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(inputEvent) =>
              setQuantity(Number(inputEvent.target.value))
            }
            disabled={hasActiveReservation}
            className="w-full rounded-2xl border border-border bg-input px-4 py-3 text-foreground outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
        </div>

        {hasActiveReservation ? (
          <p className="mt-4 rounded-2xl border border-border bg-input px-4 py-3 text-sm font-bold text-foreground-muted">
            Já tens uma reserva ativa para este evento.
          </p>
        ) : (
          <button
            type="button"
            onClick={createReservation}
            disabled={
              reserving ||
              (availableTickets !== null && availableTickets <= 0)
            }
            className="mt-5 w-full rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {reserving ? "A reservar..." : "Reservar lugar"}
          </button>
        )}

        {message && (
          <p className="mt-4 text-center text-sm font-bold text-foreground-muted">
            {message}
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-border bg-background p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-danger">
          As tuas reservas
        </p>

        <div className="mt-5 space-y-3">
          {myReservations.length === 0 && (
            <p className="text-sm text-foreground-muted">
              Ainda não tens reservas para este evento.
            </p>
          )}

          {myReservations.map((reservation) => (
            <article
              key={reservation.id}
              className="rounded-[1.5rem] border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-foreground">
                    {reservation.quantity} bilhete
                    {reservation.quantity === 1 ? "" : "s"}
                  </p>

                  <p className="mt-1 text-xs uppercase tracking-wide text-foreground-muted">
                    Estado: {reservation.status}
                  </p>
                </div>

                <span className="rounded-full border border-danger bg-danger px-3 py-1 text-xs font-black uppercase text-danger">
                  {reservation.check_in_code}
                </span>
              </div>

              {reservation.status === "reserved" && (
                <button
                  type="button"
                  onClick={() => cancelReservation(reservation.id)}
                  className="mt-4 w-full rounded-full border border-border-strong px-4 py-3 text-sm font-bold text-foreground-secondary"
                >
                  Cancelar reserva
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
