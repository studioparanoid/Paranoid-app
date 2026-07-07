"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type ClaimType = "artist" | "organizer" | "venue";
type ClaimStatus = "pending" | "approved" | "rejected";

type ProfileClaimRow = {
  id: string;
  user_id: string;
  account_type: ClaimType;
  display_name: string | null;
  entity_name: string;
  city: string | null;
  instagram_url: string | null;
  status: ClaimStatus;
  entity_id: string | null;
  entity_slug: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

function normalizeExternalUrl(value: string | null | undefined) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function typeLabel(type: ClaimType) {
  if (type === "artist") {
    return "Artista";
  }

  if (type === "organizer") {
    return "Organizador";
  }

  return "Espaço";
}

function statusLabel(status: ClaimStatus) {
  if (status === "approved") {
    return "Aprovado";
  }

  if (status === "rejected") {
    return "Rejeitado";
  }

  return "Pendente";
}

function statusClasses(status: ClaimStatus) {
  if (status === "approved") {
    return "border-green-900 bg-green-950/30 text-green-400";
  }

  if (status === "rejected") {
    return "border-red-900 bg-red-950/30 text-red-400";
  }

  return "border-yellow-900 bg-yellow-950/30 text-yellow-500";
}

function formatDate(value: string | null | undefined) {
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

function publicPathForClaim(claim: ProfileClaimRow) {
  if (!claim.entity_slug) {
    return null;
  }

  if (claim.account_type === "artist") {
    return `/artistas/${claim.entity_slug}`;
  }

  if (claim.account_type === "organizer") {
    return `/organizadores/${claim.entity_slug}`;
  }

  return `/espacos/${claim.entity_slug}`;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-zinc-500">{text}</p>
    </div>
  );
}

export function AdminProfileApprovalsClient() {
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState("");

  const [claims, setClaims] = useState<ProfileClaimRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const pendingClaims = useMemo(() => {
    return claims.filter((claim) => claim.status === "pending");
  }, [claims]);

  const visibleClaims = useMemo(() => {
    if (filter === "pending") {
      return pendingClaims;
    }

    return claims;
  }, [claims, filter, pendingClaims]);

  async function loadClaims() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profile_claims")
      .select(
        "id,user_id,account_type,display_name,entity_name,city,instagram_url,status,entity_id,entity_slug,review_note,reviewed_by,reviewed_at,created_at,updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setClaims([]);
      setLoading(false);
      return;
    }

    setClaims((data || []) as ProfileClaimRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadClaims();
  }, []);

  async function approveClaim(claim: ProfileClaimRow) {
    setMessage("");
    setActionId(claim.id);

    const { error } = await supabase.rpc("admin_approve_profile_claim", {
      p_claim_id: claim.id,
    });

    if (error) {
      setMessage(`Erro ao aprovar: ${error.message}`);
      setActionId("");
      return;
    }

    setMessage(`${typeLabel(claim.account_type)} aprovado.`);
    await loadClaims();
    setActionId("");
  }

  async function rejectClaim(claim: ProfileClaimRow) {
    setMessage("");

    const note = prompt("Motivo da rejeição? Podes deixar vazio.") || null;

    if (!confirm("Rejeitar este pedido?")) {
      return;
    }

    setActionId(claim.id);

    const { error } = await supabase.rpc("admin_reject_profile_claim", {
      p_claim_id: claim.id,
      p_review_note: note,
    });

    if (error) {
      setMessage(`Erro ao rejeitar: ${error.message}`);
      setActionId("");
      return;
    }

    setMessage("Pedido rejeitado.");
    await loadClaims();
    setActionId("");
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar pedidos...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[320px_1fr] lg:items-start">
      <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
        <p className="text-xs uppercase tracking-[0.3em] text-red-700">
          Aprovações
        </p>

        <h2 className="mt-3 text-4xl font-black leading-none">
          Rede cultural.
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-3xl font-black">{pendingClaims.length}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Pendentes
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-3xl font-black">{claims.length}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Total
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`rounded-full px-5 py-4 text-sm font-black ${
              filter === "pending"
                ? "bg-[#f2f1ec] text-black"
                : "border border-zinc-800 text-zinc-400"
            }`}
          >
            Ver pendentes
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-5 py-4 text-sm font-black ${
              filter === "all"
                ? "bg-[#f2f1ec] text-black"
                : "border border-zinc-800 text-zinc-400"
            }`}
          >
            Ver todos
          </button>

          <button
            type="button"
            onClick={loadClaims}
            className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
          >
            Atualizar
          </button>

          <Link
            href="/admin/rede"
            className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
          >
            Ver rede
          </Link>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
            {message}
          </p>
        )}
      </aside>

      <section className="space-y-4">
        {visibleClaims.length === 0 && (
          <EmptyCard text="Não há pedidos para mostrar." />
        )}

        {visibleClaims.map((claim) => {
          const publicPath = publicPathForClaim(claim);

          return (
            <article
              key={claim.id}
              className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase text-zinc-300">
                      {typeLabel(claim.account_type)}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                        claim.status
                      )}`}
                    >
                      {statusLabel(claim.status)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-4xl font-black leading-none lg:text-5xl">
                    {claim.entity_name}
                  </h3>

                  <div className="mt-4 space-y-1 text-sm text-zinc-500">
                    <p>Nome público: {claim.display_name || "Sem nome"}</p>
                    <p>Cidade: {claim.city || "Sem cidade"}</p>
                    <p>Criado: {formatDate(claim.created_at)}</p>

                    {claim.instagram_url && (
                      <p>
                        Instagram:{" "}
                        <a
                          href={normalizeExternalUrl(claim.instagram_url) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-300 underline"
                        >
                          {claim.instagram_url}
                        </a>
                      </p>
                    )}

                    {claim.entity_slug && <p>Slug criado: {claim.entity_slug}</p>}

                    {claim.review_note && <p>Nota: {claim.review_note}</p>}
                  </div>
                </div>

                <div className="grid gap-2 lg:min-w-56">
                  {claim.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => approveClaim(claim)}
                        disabled={actionId === claim.id}
                        className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
                      >
                        {actionId === claim.id ? "A aprovar..." : "Aprovar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => rejectClaim(claim)}
                        disabled={actionId === claim.id}
                        className="rounded-full border border-red-900 px-5 py-4 text-sm font-bold text-red-400 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </>
                  )}

                  {claim.status === "approved" && publicPath && (
                    <Link
                      href={publicPath}
                      className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                    >
                      Ver perfil público
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}