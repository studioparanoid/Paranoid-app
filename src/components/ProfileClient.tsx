"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type AccountType = "community" | "artist" | "organizer" | "venue";
type AccountStatus = "approved" | "pending" | "rejected";

type ProfileRow = {
  id: string;
  email?: string | null;
  role?: string | null;

  display_name?: string | null;
  account_type?: AccountType | string | null;
  account_status?: AccountStatus | string | null;

  artist_name?: string | null;
  organizer_name?: string | null;
  venue_name?: string | null;

  city?: string | null;
  instagram_url?: string | null;

  entity_id?: string | null;
  entity_slug?: string | null;

  preferred_cities?: string[] | null;
  preferred_categories?: string[] | null;

  approved_at?: string | null;
  created_at?: string | null;
};

type ProfileClaimRow = {
  id: string;
  user_id: string;
  account_type: "artist" | "organizer" | "venue";
  display_name: string | null;
  entity_name: string;
  city: string | null;
  instagram_url: string | null;
  status: "pending" | "approved" | "rejected";
  entity_id: string | null;
  entity_slug: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  city: string | null;
  created_at: string;
};

type TicketRow = {
  id: string;
  event_id: string;
  quantity: number;
  status: string;
  check_in_code: string;
  created_at: string;
};

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

const categories = [
  "Concertos",
  "Festivais",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
  "Teatro",
  "Outros",
];

function accountTypeLabel(type: string | null | undefined) {
  if (type === "artist") {
    return "Artista";
  }

  if (type === "organizer") {
    return "Organizador";
  }

  if (type === "venue") {
    return "Espaço";
  }

  return "Comunidade";
}

function accountTypeDescription(type: string | null | undefined) {
  if (type === "artist") {
    return "Perfil artístico ligado à rede cultural Paranoid.";
  }

  if (type === "organizer") {
    return "Perfil de organizador, promotor, coletivo ou associação.";
  }

  if (type === "venue") {
    return "Perfil de espaço cultural, sala, bar, galeria ou auditório.";
  }

  return "Perfil de comunidade para guardar eventos, seguir a rede e reservar bilhetes.";
}

function statusLabel(status: string | null | undefined) {
  if (status === "pending") {
    return "Pendente";
  }

  if (status === "rejected") {
    return "Rejeitado";
  }

  return "Aprovado";
}

function statusClasses(status: string | null | undefined) {
  if (status === "pending") {
    return "border-yellow-900 bg-yellow-950/30 text-yellow-500";
  }

  if (status === "rejected") {
    return "border-red-900 bg-red-950/30 text-red-400";
  }

  return "border-green-900 bg-green-950/30 text-green-400";
}

function claimTypePath(type: string | null | undefined, slug: string | null) {
  if (!slug) {
    return null;
  }

  if (type === "artist") {
    return `/artistas/${slug}`;
  }

  if (type === "organizer") {
    return `/organizadores/${slug}`;
  }

  if (type === "venue") {
    return `/espacos/${slug}`;
  }

  return null;
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
  }).format(date);
}

function normalizeExternalUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function toggleArrayValue(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-black p-5">
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}

export function ProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [claims, setClaims] = useState<ProfileClaimRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);

  const latestClaim = useMemo(() => {
    return claims[0] || null;
  }, [claims]);

  const accountType = profile?.account_type || "community";
  const accountStatus = profile?.account_status || "approved";

  const publicPath = claimTypePath(accountType, profile?.entity_slug || null);

  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === "pending"
  );

  const approvedSubmissions = submissions.filter(
    (submission) => submission.status === "approved"
  );

  const activeTickets = tickets.filter((ticket) => ticket.status === "reserved");

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId("");
      setEmail("");
      setProfile(null);
      setClaims([]);
      setSubmissions([]);
      setTickets([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadedProfile = (profileData || null) as ProfileRow | null;

    setProfile(loadedProfile);
    setDisplayName(loadedProfile?.display_name || "");
    setCity(loadedProfile?.city || "");
    setInstagramUrl(loadedProfile?.instagram_url || "");
    setPreferredCities(loadedProfile?.preferred_cities || []);
    setPreferredCategories(loadedProfile?.preferred_categories || []);

    const { data: claimData } = await supabase
      .from("profile_claims")
      .select(
        "id,user_id,account_type,display_name,entity_name,city,instagram_url,status,entity_id,entity_slug,review_note,reviewed_at,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setClaims((claimData || []) as ProfileClaimRow[]);

    const { data: submissionData } = await supabase
      .from("event_submissions")
      .select("id,title,status,event_date,city,created_at")
      .eq("submitted_by", user.email || "")
      .order("created_at", { ascending: false })
      .limit(6);

    setSubmissions((submissionData || []) as SubmissionRow[]);

    const { data: ticketData } = await supabase
      .from("ticket_reservations")
      .select("id,event_id,quantity,status,check_in_code,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6);

    setTickets((ticketData || []) as TicketRow[]);

    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile() {
    setMessage("");

    if (!userId) {
      setMessage("Tens de entrar para guardar o perfil.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        city: city.trim() || null,
        instagram_url: normalizeExternalUrl(instagramUrl),
        preferred_cities: preferredCities,
        preferred_categories: preferredCategories,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setMessage(`Erro ao guardar: ${error.message}`);
      return;
    }

    setMessage("Perfil atualizado.");
    await loadProfile();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-md px-5 py-8 text-[#f2f1ec] lg:max-w-7xl lg:px-10 lg:py-12">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-zinc-500">A carregar perfil...</p>
        </div>
      </section>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-5xl">
          <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-red-700">
              Perfil
            </p>

            <h1 className="mt-4 text-5xl font-black leading-none lg:text-7xl">
              Entra na tua conta.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-zinc-400">
              Guarda eventos, reserva bilhetes, acompanha submissões e gere a
              tua presença na rede Paranoid.
            </p>

            <div className="mt-8 grid gap-3 lg:grid-cols-2">
              <Link
                href="/login"
                className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
              >
                Entrar
              </Link>

              <Link
                href="/registar"
                className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Perfil
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              {displayName || email}
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-zinc-600">
              Conta
            </p>

            <p className="mt-2 break-words text-lg font-black">{email}</p>

            <button
              type="button"
              onClick={signOut}
              className="mt-5 rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
            >
              Sair
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-28">
            <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Tipo de conta
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none">
                {accountTypeLabel(accountType)}
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                {accountTypeDescription(accountType)}
              </p>

              <div
                className={`mt-5 inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase ${statusClasses(
                  accountStatus
                )}`}
              >
                {statusLabel(accountStatus)}
              </div>

              {accountStatus === "pending" && (
                <p className="mt-4 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm leading-relaxed text-yellow-500">
                  O teu perfil está pendente. A Paranoid tem de aprovar antes de
                  apareceres como artista, organizador ou espaço na rede.
                </p>
              )}

              {accountStatus === "rejected" && (
                <p className="mt-4 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm leading-relaxed text-red-300">
                  O teu pedido foi rejeitado.
                  {latestClaim?.review_note
                    ? ` Motivo: ${latestClaim.review_note}`
                    : " Podes falar com a Paranoid para corrigir dados."}
                </p>
              )}

              {accountStatus === "approved" && publicPath && (
                <Link
                  href={publicPath}
                  className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                >
                  Ver perfil público
                </Link>
              )}

              {accountStatus === "approved" && accountType === "organizer" && (
                <Link
                  href="/organizador"
                  className="mt-3 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                >
                  Painel organizador
                </Link>
              )}
            </section>

            <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Atalhos
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/submeter"
                  className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                >
                  Submeter evento
                </Link>

                <Link
                  href="/guardados"
                  className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                >
                  Eventos guardados
                </Link>

                <Link
                  href="/bilhetes"
                  className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
                >
                  Os meus bilhetes
                </Link>

                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-300"
                  >
                    Painel admin
                  </Link>
                )}
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Dados
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                Perfil base.
              </h2>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Nome público
                  </label>

                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Nome público"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Cidade
                  </label>

                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Cidade"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Instagram
                  </label>

                  <input
                    value={instagramUrl}
                    onChange={(event) => setInstagramUrl(event.target.value)}
                    placeholder="instagram.com/..."
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="mt-8 w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
              >
                {saving ? "A guardar..." : "Guardar perfil"}
              </button>

              {message && (
                <p className="mt-5 text-center text-sm font-bold text-zinc-400">
                  {message}
                </p>
              )}
            </section>

            <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Preferências
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                O que queres ver.
              </h2>

              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-zinc-300">Cidades</p>

                <div className="flex flex-wrap gap-2">
                  {cities.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setPreferredCities((current) =>
                          toggleArrayValue(current, item)
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-bold ${
                        preferredCities.includes(item)
                          ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                          : "border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-zinc-300">
                  Categorias
                </p>

                <div className="flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setPreferredCategories((current) =>
                          toggleArrayValue(current, item)
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-bold ${
                        preferredCategories.includes(item)
                          ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                          : "border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Submissões
                </p>

                <p className="mt-4 text-5xl font-black">
                  {submissions.length}
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  {pendingSubmissions.length} pendente
                  {pendingSubmissions.length === 1 ? "" : "s"} ·{" "}
                  {approvedSubmissions.length} aprovada
                  {approvedSubmissions.length === 1 ? "" : "s"}
                </p>
              </article>

              <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Bilhetes
                </p>

                <p className="mt-4 text-5xl font-black">
                  {activeTickets.length}
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Reservas ativas na tua carteira.
                </p>
              </article>

              <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Estado
                </p>

                <p className="mt-4 text-5xl font-black">
                  {statusLabel(accountStatus)}
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  {accountTypeLabel(accountType)}
                </p>
              </article>
            </section>

            <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Últimas submissões
                  </p>

                  <h2 className="mt-3 text-4xl font-black leading-none">
                    O que enviaste.
                  </h2>
                </div>

                <Link
                  href="/submeter"
                  className="hidden rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300 lg:inline-block"
                >
                  Submeter
                </Link>
              </div>

              <div className="mt-6 grid gap-3">
                {submissions.length === 0 && (
                  <EmptyCard text="Ainda não submeteste eventos com esta conta." />
                )}

                {submissions.map((submission) => (
                  <article
                    key={submission.id}
                    className="rounded-[1.5rem] border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black">
                          {submission.title}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {formatDate(submission.event_date)} ·{" "}
                          {submission.city || "Sem cidade"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                          submission.status
                        )}`}
                      >
                        {statusLabel(submission.status)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {claims.length > 0 && (
              <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Pedidos de perfil
                </p>

                <h2 className="mt-3 text-4xl font-black leading-none">
                  Aprovação.
                </h2>

                <div className="mt-6 grid gap-3">
                  {claims.map((claim) => (
                    <article
                      key={claim.id}
                      className="rounded-[1.5rem] border border-zinc-800 bg-black p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black">
                            {claim.entity_name}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-500">
                            {accountTypeLabel(claim.account_type)} ·{" "}
                            {formatDate(claim.created_at)}
                          </p>

                          {claim.review_note && (
                            <p className="mt-2 text-sm text-red-300">
                              {claim.review_note}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                            claim.status
                          )}`}
                        >
                          {statusLabel(claim.status)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}