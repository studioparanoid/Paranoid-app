"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/public";

type AdminCreateBillingPaymentFormProps = {
  productCode: string;
  relatedType: "event" | "organizer" | "sponsorship";
  idLabel: string;
  allowEmptyRelatedId?: boolean;
};

export function AdminCreateBillingPaymentForm({
  productCode,
  relatedType,
  idLabel,
  allowEmptyRelatedId = false,
}: AdminCreateBillingPaymentFormProps) {
  const [relatedId, setRelatedId] = useState("");
  const [message, setMessage] = useState("");

  async function createPayment() {
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão como admin.");
      return;
    }

    const response = await fetch("/api/billing/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        productCode,
        relatedType,
        relatedId: relatedId.trim() || null,
        provider: "mock",
      }),
    });
    const payload = await response.json();

    setMessage(
      response.ok
        ? `Pagamento criado: ${payload.payment?.id || "pending"}`
        : payload.error || "Não consegui criar pagamento."
    );
  }

  return (
    <div className="mb-5 rounded-[1.5rem] border border-border bg-background p-5">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-danger">
        Criar mock
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={relatedId}
          onChange={(event) => setRelatedId(event.target.value)}
          placeholder={idLabel}
          className="rounded-2xl border border-border bg-black px-4 py-3 font-bold outline-none"
        />
        <button
          type="button"
          onClick={createPayment}
          disabled={!allowEmptyRelatedId && !relatedId.trim()}
          className="rounded-full bg-[#f5f5f2] px-5 py-3 font-black text-black disabled:bg-surface-hover disabled:text-foreground-muted"
        >
          Criar pagamento
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-bold text-foreground-muted">{message}</p>}
    </div>
  );
}
