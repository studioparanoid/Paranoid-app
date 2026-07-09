"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_COMMISSION_RATE,
  formatMoney,
  getOrderStatusLabel,
  normalizeOrderId,
  type ShopOrder,
} from "@/lib/shop";
import { supabase } from "@/lib/supabase/public";

const filters = [
  ["all", "Todas"],
  ["pending_payment", "Pendente"],
  ["paid", "Paga"],
  ["awaiting_shipment", "A preparar"],
  ["shipped", "Enviada"],
  ["completed", "Concluída"],
  ["cancelled", "Cancelada"],
];

export function AdminShopClient() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [filter, setFilter] = useState("all");
  const [commission, setCommission] = useState(
    String(Math.round(DEFAULT_COMMISSION_RATE * 100))
  );
  const [shipping, setShipping] = useState("3.99");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão para ver encomendas.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/shop/orders?scope=admin", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error || "Sem acesso à loja admin.");
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders(payload.orders || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }

    return orders.filter((order) => order.orderStatus === filter);
  }, [filter, orders]);

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => ({
        commission: acc.commission + order.commissionTotalCents,
        payout:
          acc.payout +
          order.items.reduce(
            (total, item) => total + item.payoutAmountCents,
            0
          ),
      }),
      { commission: 0, payout: 0 }
    );
  }, [orders]);

  async function updateStatus(orderId: string, status: string) {
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão.");
      return;
    }

    const response = await fetch(`/api/shop/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setMessage("Não consegui atualizar a encomenda.");
      return;
    }

    await loadOrders();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                filter === value
                  ? "bg-[#f2f1ec] text-black"
                  : "border border-zinc-800 text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {message && (
          <p className="rounded-2xl border border-red-900 bg-red-950/40 p-4 font-bold text-red-100">
            {message}
          </p>
        )}

        {loading && <p className="text-zinc-500">A carregar encomendas...</p>}

        {!loading && filteredOrders.length === 0 && (
          <p className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5 text-zinc-500">
            Ainda não há encomendas neste estado.
          </p>
        )}

        {filteredOrders.map((order) => (
          <article
            key={order.id}
            className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
                  #{normalizeOrderId(order.id)}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {order.buyerName}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {getOrderStatusLabel(order.orderStatus)} ·{" "}
                  {formatMoney(order.totalCents)}
                </p>
              </div>
              <p className="rounded-full bg-[#f2f1ec] px-3 py-1 text-sm font-black text-black">
                {order.paymentStatus}
              </p>
            </div>

            <div className="mt-5 space-y-2 text-sm text-zinc-400">
              {order.items.map((item) => (
                <p key={item.id}>
                  {item.quantity}x {item.productName} · payout{" "}
                  {formatMoney(item.payoutAmountCents)}
                </p>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => updateStatus(order.id, "paid")}
                className="rounded-full border border-green-900 px-4 py-3 text-sm font-black text-green-300"
              >
                Marcar pago
              </button>
              <button
                type="button"
                onClick={() => updateStatus(order.id, "awaiting_shipment")}
                className="rounded-full border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-300"
              >
                A preparar
              </button>
              <button
                type="button"
                onClick={() => updateStatus(order.id, "completed")}
                className="rounded-full border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-300"
              >
                Concluir
              </button>
              <button
                type="button"
                onClick={() => updateStatus(order.id, "payout_paid")}
                className="rounded-full border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-300"
              >
                Payout pago
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Totais</h2>
          <div className="mt-5 space-y-3 text-sm">
            <p className="flex justify-between text-zinc-400">
              <span>Taxa Paranoid</span>
              <span>{formatMoney(totals.commission)}</span>
            </p>
            <p className="flex justify-between text-zinc-400">
              <span>Payout artistas</span>
              <span>{formatMoney(totals.payout)}</span>
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Configuração</h2>
          <label className="mt-5 block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Taxa de serviço %
            </span>
            <input
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
            />
          </label>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Envio base
            </span>
            <input
              value={shipping}
              onChange={(event) => setShipping(event.target.value)}
              inputMode="decimal"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
            />
          </label>
        </section>
      </aside>
    </div>
  );
}
