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

type EntityRow = {
  id: string;
  slug: string;
  name: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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

async function findOrCreateArtist(claim: ProfileClaimRow) {
  const name = claim.entity_name.trim();
  const slug = slugify(name);

  const { data: existing, error: existingError } = await supabase
    .from("artists")
    .select("id,slug,name")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as EntityRow;
  }

  const { data, error } = await supabase
    .from("artists")
    .insert({
      slug,
      name,
      city: claim.city || null,
      genres: null,
      description: null,
      instagram: normalizeExternalUrl(claim.instagram_url),
      bandcamp: null,
    })
    .select("id,slug,name")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EntityRow;
}

async function findOrCreateOrganizer(claim: ProfileClaimRow) {
  const name = claim.entity_name.trim();
  const slug = slugify(name);

  const { data: existing, error: existingError } = await supabase
    .from("organizers")
    .select("id,slug,name")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as EntityRow;
  }

  const { data, error } = await supabase
    .from("organizers")
    .insert({
      slug,
      name,
      city: claim.city || null,
      description: null,
      pack: null,
      verified: false,
    })
    .select("id,slug,name")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EntityRow;
}

async function findOrCreateVenue(claim: ProfileClaimRow) {
  const name = claim.entity_name.trim();
  const slug = slugify(name);

  const { data: existing, error: existingError } = await supabase
    .from("venues")
    .select("id,slug,name")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as EntityRow;
  }

  const { data, error } = await supabase
    .from("venues")
    .insert({
      slug,
      name,
      city: claim.city || null,
      address: null,
      description: null,
      instagram: normalizeExternalUrl(claim.instagram_url),
    })
    .select("id,slug,name")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EntityRow;
}

async function linkOrganizerMember({
  organizerId,
  userId,
}: {
  organizerId: string;
  userId: string;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("organizer_members")
    .select("organizer_id,user_id")
    .eq("organizer_id", organizerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.from("organizer_members").insert({
    organizer_id: organizerId,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Tens de entrar como admin.");
      }

      let entity: EntityRow;

      if (claim.account_type === "artist") {
        entity = await findOrCreateArtist(claim);
      } else if (claim.account_type === "organizer") {
        entity = await findOrCreateOrganizer(claim);

        await linkOrganizerMember({
          organizerId: entity.id,
          userId: claim.user_id,
        });
      } else {
        entity = await findOrCreateVenue(claim);
      }

      const { error: claimError } = await supabase
        .from("profile_claims")
        .update({
          status: "approved",
          entity_id: entity.id,
          entity_slug: entity.slug,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          review_note: null,
        })
        .eq("id", claim.id);

      if (claimError) {
        throw new Error(claimError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          account_status: "approved",
          entity_id: entity.id,
          entity_slug: entity.slug,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", claim.user_id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setMessage(`${typeLabel(claim.account_type)} aprovado.`);
      await loadClaims();
    } catch (error) {
      setMessage(
        `Erro: ${error instanceof Error ? error.message : "erro desconhecido"}`
      );
    }

    setActionId("");
  }

  async function rejectClaim(claim: ProfileClaimRow) {
    setMessage("");

    const note = prompt("Motivo da rejeição? Podes deixar vazio.") || null;

    if (!confirm("Rejeitar este pedido?")) {
      return;
    }

    setActionId(claim.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Tens de entrar como admin.");
      }

      const { error: claimError } = await supabase
        .from("profile_claims")
        .update({
          status: "rejected",
          review_note: note,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (claimError) {
        throw new Error(claimError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          account_status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", claim.user_id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setMessage("Pedido rejeitado.");
      await loadClaims();
    } catch (error) {
      setMessage(
        `Erro: ${error instanceof Error ? error.message : "erro desconhecido"}`
      );
    }

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

        {visibleClaims.map((claim) => (
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

                {claim.status === "approved" &&
                  claim.account_type === "artist" &&
                  claim.entity_slug && (
                    <Link
                      href={`/artistas/${claim.entity_slug}`}
                      className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                    >
                      Ver artista
                    </Link>
                  )}

                {claim.status === "approved" &&
                  claim.account_type === "organizer" &&
                  claim.entity_slug && (
                    <Link
                      href={`/organizadores/${claim.entity_slug}`}
                      className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                    >
                      Ver organizador
                    </Link>
                  )}

                {claim.status === "approved" &&
                  claim.account_type === "venue" &&
                  claim.entity_slug && (
                    <Link
                      href={`/espacos/${claim.entity_slug}`}
                      className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                    >
                      Ver espaço
                    </Link>
                  )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}