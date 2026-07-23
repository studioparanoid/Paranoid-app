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
import { AdminListSkeleton } from "@/components/LoadingSkeleton";
import { Button, LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

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
  const [busyAction, setBusyAction] = useState("");
  const { toast } = useToast();

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
    const timer = window.setTimeout(() => { void loadOrders(); }, 0);
    return () => window.clearTimeout(timer);
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
        vat: acc.vat + order.vatTotalCents,
        payout: acc.payout + order.partnerPayoutTotalCents,
        margin: acc.margin + order.paranoidMarginTotalCents,
      }),
      { commission: 0, vat: 0, payout: 0, margin: 0 }
    );
  }, [orders]);

  async function updateStatus(
    orderId: string,
    status: string,
    fiscalDocumentStatus?: string
  ) {
    const actionKey = `${orderId}-${status}-${fiscalDocumentStatus || ""}`;
    if (busyAction) return;
    setBusyAction(actionKey);
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão.");
      setBusyAction("");
      toast({ message: "Tens de iniciar sessão.", tone: "error" });
      return;
    }

    const response = await fetch(`/api/shop/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status, fiscalDocumentStatus }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.error || "Não consegui atualizar a encomenda.");
      setBusyAction("");
      toast({ message: "Não foi possível atualizar a encomenda.", tone: "error" });
      return;
    }

    await loadOrders();
    setBusyAction("");
    toast({ message: "Encomenda atualizada.", tone: "success" });
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
              aria-pressed={filter === value}
              className={`pressable focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                filter === value
                  ? "bg-[#f5f5f2] text-black"
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

        {loading && <AdminListSkeleton />}

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
                <p className="mt-1 text-xs font-bold text-zinc-600">
                  IVA estimado {formatMoney(order.vatTotalCents)} · margem{" "}
                  {formatMoney(order.paranoidMarginTotalCents)}
                </p>
              </div>
              <p className="rounded-full bg-[#f5f5f2] px-3 py-1 text-sm font-black text-black">
                {order.paymentStatus}
              </p>
            </div>

            <div className="mt-5 space-y-2 text-sm text-zinc-400">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-2xl bg-black/40 p-3">
                  <p className="font-bold text-zinc-200">
                    {item.quantity}x {item.productName}
                  </p>
                  <p>
                    preço final {formatMoney(item.finalPriceCents)} · IVA{" "}
                    {formatMoney(item.vatCents)} · produção{" "}
                    {formatMoney(item.productionCostCents * item.quantity)}
                  </p>
                  <p>
                    parceiro {formatMoney(item.partnerPayoutAmountCents)} ·
                    margem {formatMoney(item.paranoidMarginCents)}
                  </p>
                </div>
              ))}
            </div>

            {order.payouts.length > 0 && (
              <div className="mt-5 space-y-2 rounded-2xl border border-zinc-900 bg-black/40 p-4 text-sm">
                <p className="font-black text-zinc-200">Payouts</p>
                {order.payouts.map((payout) => (
                  <div key={payout.id} className="text-zinc-400">
                    <p>
                      {payout.sellerName || "Parceiro"} ·{" "}
                      {formatMoney(payout.amountCents)} · documento{" "}
                      {payout.fiscalDocumentStatus} · {payout.status}
                    </p>
                    {payout.blockedReason && (
                      <p className="mt-1 text-red-300">
                        {payout.blockedReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              <LoadingButton
                onClick={() => updateStatus(order.id, "paid")}
                loading={busyAction === `${order.id}-paid-`}
                loadingText="A confirmar..."
                disabled={Boolean(busyAction)}
                variant="secondary"
                size="sm"
                className="border-green-900 text-green-300"
              >
                Marcar pago
              </LoadingButton>
              <LoadingButton
                onClick={() => updateStatus(order.id, "awaiting_shipment")}
                loading={busyAction === `${order.id}-awaiting_shipment-`}
                loadingText="A atualizar..."
                disabled={Boolean(busyAction)}
                variant="secondary"
                size="sm"
              >
                A preparar
              </LoadingButton>
              <LoadingButton
                onClick={() => updateStatus(order.id, "completed")}
                loading={busyAction === `${order.id}-completed-`}
                loadingText="A concluir..."
                disabled={Boolean(busyAction)}
                variant="secondary"
                size="sm"
              >
                Concluir
              </LoadingButton>
              <LoadingButton
                onClick={() => updateStatus(order.id, "payout_paid")}
                loading={busyAction === `${order.id}-payout_paid-`}
                loadingText="A atualizar..."
                variant="secondary"
                size="sm"
                disabled={
                  Boolean(busyAction) ||
                  order.payouts.length === 0 ||
                  order.payouts.some(
                    (payout) => payout.fiscalDocumentStatus !== "approved"
                  )
                }
                className="disabled:text-zinc-700"
              >
                Payout pago
              </LoadingButton>
            </div>

            {order.payouts.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {["requested", "received", "approved", "rejected"].map(
                  (status) => (
                    <Button
                      key={status}
                      onClick={() =>
                        updateStatus(order.id, "payout_fiscal_document", status)
                      }
                      disabled={Boolean(busyAction)}
                      variant="secondary"
                      size="sm"
                    >
                      Doc. {status}
                    </Button>
                  )
                )}
                <LoadingButton
                  onClick={() => updateStatus(order.id, "approve_seller_payment")}
                  loading={busyAction === `${order.id}-approve_seller_payment-`}
                  loadingText="A validar..."
                  disabled={Boolean(busyAction)}
                  variant="secondary"
                  size="sm"
                  className="border-green-900 text-green-300 sm:col-span-4"
                >
                  Validar fiscal + contrato do parceiro
                </LoadingButton>
              </div>
            )}
          </article>
        ))}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
          <h2 className="text-2xl font-black">Totais</h2>
          <div className="mt-5 space-y-3 text-sm">
            <p className="flex justify-between text-zinc-400">
              <span>IVA estimado</span>
              <span>{formatMoney(totals.vat)}</span>
            </p>
            <p className="flex justify-between text-zinc-400">
              <span>Taxa/margem bruta Paranoid</span>
              <span>{formatMoney(totals.commission)}</span>
            </p>
            <p className="flex justify-between text-zinc-400">
              <span>Payout parceiros</span>
              <span>{formatMoney(totals.payout)}</span>
            </p>
            <p className="flex justify-between text-zinc-400">
              <span>Margem estimada</span>
              <span>{formatMoney(totals.margin)}</span>
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
