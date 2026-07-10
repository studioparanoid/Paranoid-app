"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/public";

type AdminCreateBillingPaymentFormProps = {
  productCode: string;
  relatedType: "event" | "organizer";
  idLabel: string;
};

export function AdminCreateBillingPaymentForm({
  productCode,
  relatedType,
  idLabel,
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
        relatedId,
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
    <div className="mb-5 rounded-[1.5rem] border border-zinc-900 bg-zinc-950 p-5">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-red-600">
        Criar mock
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={relatedId}
          onChange={(event) => setRelatedId(event.target.value)}
          placeholder={idLabel}
          className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 font-bold outline-none"
        />
        <button
          type="button"
          onClick={createPayment}
          disabled={!relatedId.trim()}
          className="rounded-full bg-[#f2f1ec] px-5 py-3 font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Criar pagamento
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-bold text-zinc-400">{message}</p>}
    </div>
  );
}
