"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type OrganizerVisibilityPass } from "@/lib/billing/frequency";

type FrequencyEvent = {
  id: string;
  title: string;
  slug: string | null;
  status: string | null;
  start_at: string | null;
  city: string | null;
  venue_name: string | null;
};

type CreditPack = {
  id: string;
  total_credits: number;
  remaining_credits: number;
  expires_at: string | null;
};

type FrequencyOrganizer = {
  id: string;
  slug?: string | null;
  name?: string | null;
  city?: string | null;
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

function daysRemaining(pass: OrganizerVisibilityPass | null) {
  if (!pass?.endsAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((new Date(pass.endsAt).getTime() - Date.now()) / 86400000)
  );
}

export function OrganizerFrequencyClient() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [organizer, setOrganizer] = useState<FrequencyOrganizer | null>(null);
  const [pass, setPass] = useState<OrganizerVisibilityPass | null>(null);
  const [events, setEvents] = useState<FrequencyEvent[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);

  const remaining = useMemo(() => daysRemaining(pass), [pass]);
  const active = Boolean(pass && pass.status === "active" && remaining > 0);
  const remainingCredits = useMemo(() => {
    return creditPacks.reduce(
      (total, pack) => total + Number(pack.remaining_credits || 0),
      0
    );
  }, [creditPacks]);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadFrequency() {
    setLoading(true);
    setMessage("");
    const token = await getToken();

    if (!token) {
      setMessage("Tens de iniciar sessão.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/billing/frequency/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Não consegui carregar a Frequency.");
      setLoading(false);
      return;
    }

    setOrganizer(payload.organizer || null);
    setPass(payload.pass || null);
    setEvents(payload.events || []);
    setCreditPacks(payload.creditPacks || []);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadFrequency();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function createOrganizerPayment(productCode: string) {
    setBusy(true);
    setMessage("");
    const token = await getToken();

    if (!token) {
      setMessage("Tens de iniciar sessão.");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/billing/frequency/me", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organizerId: organizer?.id, productCode }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Não consegui criar pagamento.");
      setBusy(false);
      return;
    }

    setMessage(
      `Pagamento criado em modo mock: ${payload.payment?.id || "pending"}. O admin confirma para ativar.`
    );
    setBusy(false);
    await loadFrequency();
  }

  async function handleUseCredit(eventId: string) {
    setBusy(true);
    setMessage("");
    const token = await getToken();
    const response = await fetch("/api/billing/highlight-credits/use", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organizerId: organizer?.id, eventId }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.used) {
      setMessage(
        payload.error ||
          (payload.reason === "already_featured"
            ? "Este evento já recebeu destaque."
            : "Não há créditos ativos disponíveis.")
      );
      setBusy(false);
      return;
    }

    setMessage("Crédito usado. O evento ficou destacado.");
    setBusy(false);
    await loadFrequency();
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6 text-zinc-500">
        A carregar Frequency...
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <section className="rounded-[2rem] border border-red-950 bg-red-950/20 p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
          Paranoid Frequency
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black leading-none">49 € / 30 dias</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">
              Dá visibilidade reforçada a todos os teus eventos durante 30 dias.
              Publicar continua gratuito.
            </p>
          </div>
          <span className="rounded-full bg-[#f5f5f2] px-4 py-2 text-sm font-black text-black">
            {active ? "Ativo" : pass?.status || "Inativo"}
          </span>
        </div>

        {organizer ? (
          <p className="mt-5 text-sm font-bold text-zinc-400">
            Organizador: {organizer.name || organizer.id}
          </p>
        ) : (
          <p className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
            Esta conta ainda não está ligada a um organizador.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
              Início
            </p>
            <p className="mt-2 font-black">{formatDate(pass?.startsAt || null)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
              Válido até
            </p>
            <p className="mt-2 font-black">{formatDate(pass?.endsAt || null)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-600">
              Dias
            </p>
            <p className="mt-2 font-black">{remaining}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => createOrganizerPayment("organizer_paranoid_frequency")}
          disabled={busy || !organizer}
          className="mt-6 w-full rounded-full bg-[#f5f5f2] px-6 py-4 font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {busy ? "A preparar..." : active ? "Renovar por 30 dias" : "Ativar Frequency"}
        </button>

        <button
          type="button"
          onClick={() => createOrganizerPayment("event_feature_pack_3")}
          disabled={busy || !organizer}
          className="mt-3 w-full rounded-full border border-zinc-700 px-6 py-4 font-black text-zinc-200 disabled:border-zinc-900 disabled:text-zinc-600"
        >
          Comprar pack 3 destaques
        </button>

        {message && (
          <p className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4 text-sm font-bold text-zinc-300">
            {message}
          </p>
        )}
      </section>

      <aside className="rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
          Inclui
        </p>
        <ul className="mt-4 space-y-3 text-sm text-zinc-300">
          <li>Prioridade na Agenda e no Mapa.</li>
          <li>Elegível para homepage.</li>
          <li>Badge “Organizador Frequency”.</li>
          <li>Inclusão editorial quando fizer sentido.</li>
          <li>Estatísticas básicas em preparação.</li>
        </ul>
        <p className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
          Divulgação editorial dos teus eventos durante o período ativo, de
          acordo com o calendário e critérios da Paranoid.
        </p>
      </aside>

      <section className="lg:col-span-2 rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
              Eventos elegíveis
            </p>
            <h2 className="mt-2 text-2xl font-black">{events.length} eventos</h2>
          </div>
            <p className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-black text-zinc-500">
            {remainingCredits} créditos
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {events.length === 0 && (
            <p className="rounded-[1.5rem] border border-zinc-800 bg-black p-5 text-zinc-500">
              Ainda não há eventos publicados elegíveis.
            </p>
          )}
          {events.map((event) => (
            <Link
              key={event.id}
              href={event.slug ? `/eventos/${event.slug}` : "/agenda"}
              className="rounded-[1.5rem] border border-zinc-800 bg-black p-5"
            >
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">
                {formatDate(event.start_at)}
              </p>
              <h3 className="mt-2 text-xl font-black">{event.title}</h3>
              <p className="mt-2 text-sm text-zinc-500">
                {event.venue_name || "Espaço por definir"} ·{" "}
                {event.city || "Cidade por definir"}
              </p>
              <button
                type="button"
                onClick={(clickEvent) => {
                  clickEvent.preventDefault();
                  handleUseCredit(event.id);
                }}
                disabled={busy || remainingCredits <= 0}
                className="mt-4 rounded-full border border-red-900 px-4 py-3 text-sm font-black text-red-200 disabled:border-zinc-900 disabled:text-zinc-700"
              >
                Usar crédito
              </button>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
