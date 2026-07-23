"use client";

import { useEffect, useMemo, useState } from "react";
import { type BillingPayment } from "@/lib/billing/types";
import { formatMoney } from "@/lib/shop";
import { supabase } from "@/lib/supabase/public";

const statusFilters = ["all", "pending", "paid", "failed", "cancelled"];

type AdminBillingPaymentsClientProps = {
  relatedType?: string;
  productCodes?: string[];
  title?: string;
};

export function AdminBillingPaymentsClient({
  relatedType,
  productCodes,
  title = "Pagamentos",
}: AdminBillingPaymentsClientProps) {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadPayments() {
    setLoading(true);
    setMessage("");
    const token = await getToken();

    if (!token) {
      setMessage("Tens de iniciar sessão como admin.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/billing/payments?status=${filter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error || "Não consegui carregar pagamentos.");
      setLoading(false);
      return;
    }

    setPayments(payload.payments || []);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPayments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [filter]);

  const visiblePayments = useMemo(() => {
    if (!relatedType) {
      return productCodes?.length
        ? payments.filter((payment) =>
            payment.productCode ? productCodes.includes(payment.productCode) : false
          )
        : payments;
    }

    return payments.filter((payment) => {
      const matchesType = payment.relatedType === relatedType;
      const matchesProduct =
        !productCodes?.length ||
        (payment.productCode ? productCodes.includes(payment.productCode) : false);

      return matchesType && matchesProduct;
    });
  }, [payments, productCodes, relatedType]);

  async function updatePayment(paymentId: string, action: "confirm" | "cancel" | "failed") {
    const token = await getToken();
    const endpoint =
      action === "confirm" ? "/api/billing/mock/confirm" : "/api/billing/mock/cancel";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        paymentId,
        status: action === "failed" ? "failed" : "cancelled",
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Não consegui atualizar pagamento.");
      return;
    }

    await loadPayments();
    setMessage("Pagamento atualizado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">{title}</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
              filter === status
                ? "bg-[#f5f5f2] text-black"
                : "border border-border text-foreground-muted"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {message && (
        <p className="rounded-2xl border border-danger bg-danger/40 p-4 font-bold text-danger">
          {message}
        </p>
      )}

      {loading && <p className="text-foreground-muted">A carregar pagamentos...</p>}

      {!loading && visiblePayments.length === 0 && (
        <p className="rounded-[1.5rem] border border-border bg-background p-5 text-foreground-muted">
          Ainda não há pagamentos para este filtro.
        </p>
      )}

      {visiblePayments.map((payment) => (
        <article
          key={payment.id}
          className="rounded-[1.5rem] border border-border bg-background p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">
                {payment.relatedType || "serviço"}
              </p>
              <h3 className="mt-2 text-2xl font-black">
                {payment.productCode || "Pagamento"}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {payment.provider} · {payment.status} ·{" "}
                {payment.relatedId || "sem relação"}
              </p>
            </div>
            <p className="rounded-full bg-[#f5f5f2] px-3 py-1 text-sm font-black text-black">
              {formatMoney(payment.totalCents)}
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => updatePayment(payment.id, "confirm")}
              disabled={payment.status === "paid"}
              className="rounded-full border border-green-900 px-4 py-3 text-sm font-black text-green-300 disabled:text-foreground-muted"
            >
              Marcar pago
            </button>
            <button
              type="button"
              onClick={() => updatePayment(payment.id, "failed")}
              className="rounded-full border border-border-strong px-4 py-3 text-sm font-black text-foreground-secondary"
            >
              Falhado
            </button>
            <button
              type="button"
              onClick={() => updatePayment(payment.id, "cancel")}
              className="rounded-full border border-border-strong px-4 py-3 text-sm font-black text-foreground-secondary"
            >
              Cancelar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
