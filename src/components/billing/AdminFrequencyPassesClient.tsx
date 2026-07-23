"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type OrganizerVisibilityPass } from "@/lib/billing/frequency";

type AdminFrequencyPass = OrganizerVisibilityPass & {
  eligibleEventsCount: number;
  publishedDuringPeriodCount: number;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminFrequencyPassesClient() {
  const [passes, setPasses] = useState<AdminFrequencyPass[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadPasses() {
    setLoading(true);
    setMessage("");
    const token = await getToken();

    if (!token) {
      setMessage("Tens de iniciar sessão como admin.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/billing/frequency/passes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Não consegui carregar Frequency.");
      setLoading(false);
      return;
    }

    setPasses(payload.passes || []);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPasses();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function updatePass(
    passId: string,
    action: "cancel" | "expire" | "set_end",
    endsAt?: string
  ) {
    const token = await getToken();
    const response = await fetch("/api/billing/frequency/passes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ passId, action, endsAt }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Não consegui atualizar Frequency.");
      return;
    }

    await loadPasses();
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">Frequency</h2>
        <button
          type="button"
          onClick={loadPasses}
          className="rounded-full border border-border px-4 py-2 text-sm font-black text-foreground-secondary"
        >
          Atualizar
        </button>
      </div>

      {message && (
        <p className="rounded-2xl border border-danger bg-danger/40 p-4 font-bold text-danger">
          {message}
        </p>
      )}

      {loading && <p className="text-foreground-muted">A carregar passes...</p>}

      {!loading && passes.length === 0 && (
        <p className="rounded-[1.5rem] border border-border bg-background p-5 text-foreground-muted">
          Ainda não há passes Frequency.
        </p>
      )}

      {passes.map((pass) => (
        <article
          key={pass.id}
          className="rounded-[1.5rem] border border-border bg-background p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">
                {pass.status}
              </p>
              <h3 className="mt-2 break-all text-xl font-black">
                {pass.organizerId}
              </h3>
              <p className="mt-1 break-all text-sm text-foreground-muted">
                Pagamento: {pass.paymentId || "manual/sem pagamento"}
              </p>
            </div>
            <p className="rounded-full bg-[#f5f5f2] px-3 py-1 text-sm font-black text-black">
              49 €
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-black p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-foreground-muted">
                Início
              </p>
              <p className="mt-2 font-black">{formatDate(pass.startsAt)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-black p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-foreground-muted">
                Fim
              </p>
              <p className="mt-2 font-black">{formatDate(pass.endsAt)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-black p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-foreground-muted">
                Elegíveis
              </p>
              <p className="mt-2 font-black">{pass.eligibleEventsCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-black p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-foreground-muted">
                No período
              </p>
              <p className="mt-2 font-black">{pass.publishedDuringPeriodCount}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                updatePass(pass.id, "set_end", (() => {
                  const currentEnd = pass.endsAt ? new Date(pass.endsAt) : null;
                  const base =
                    currentEnd && currentEnd.getTime() > Date.now()
                      ? currentEnd
                      : new Date();

                  return new Date(base.getTime() + 30 * 86400000).toISOString();
                })())
              }
              className="rounded-full border border-green-900 px-4 py-3 text-sm font-black text-green-300"
            >
              Renovar 30 dias
            </button>
            <button
              type="button"
              onClick={() => updatePass(pass.id, "expire")}
              className="rounded-full border border-border-strong px-4 py-3 text-sm font-black text-foreground-secondary"
            >
              Expirar
            </button>
            <button
              type="button"
              onClick={() => updatePass(pass.id, "cancel")}
              className="rounded-full border border-border-strong px-4 py-3 text-sm font-black text-foreground-secondary"
            >
              Cancelar
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
