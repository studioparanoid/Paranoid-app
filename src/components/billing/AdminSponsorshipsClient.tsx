"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type SponsorshipCampaign = {
  id: string;
  product_code: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  sponsored_post_limit: number | null;
  sponsored_posts_used: number | null;
  founding_partner_number: number | null;
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

export function AdminSponsorshipsClient() {
  const [campaigns, setCampaigns] = useState<SponsorshipCampaign[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCampaigns() {
    setLoading(true);
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tens de iniciar sessão como admin.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/billing/sponsorships", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Não consegui carregar parceiros.");
      setLoading(false);
      return;
    }

    setCampaigns(payload.campaigns || []);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadCampaigns();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">Campanhas</h2>
        <button
          type="button"
          onClick={loadCampaigns}
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

      {loading && <p className="text-foreground-muted">A carregar parceiros...</p>}

      {!loading && campaigns.length === 0 && (
        <p className="rounded-[1.5rem] border border-border bg-background p-5 text-foreground-muted">
          Ainda não há campanhas.
        </p>
      )}

      {campaigns.map((campaign) => (
        <article
          key={campaign.id}
          className="rounded-[1.5rem] border border-border bg-background p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-danger">
                {campaign.status}
              </p>
              <h3 className="mt-2 text-2xl font-black">
                {campaign.product_code}
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {formatDate(campaign.starts_at)} até {formatDate(campaign.ends_at)}
              </p>
            </div>
            {campaign.founding_partner_number && (
              <p className="rounded-full bg-[#f5f5f2] px-3 py-1 text-sm font-black text-black">
                Fundador #{campaign.founding_partner_number}
              </p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
