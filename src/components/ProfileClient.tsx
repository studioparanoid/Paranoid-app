"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

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

type ProfileRow = {
  id: string;
  role: string | null;
  preferred_cities: string[] | null;
  preferred_categories: string[] | null;
};

type OrganizerMemberRow = {
  organizer_id: string;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
};

type SavedEventRow = {
  event_id: string;
};

type FollowRow = {
  id: string;
  target_type: string;
  target_id: string;
};

function toggleValue(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-black transition ${
        active
          ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
          : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

export function ProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);

  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);

  const [savedCount, setSavedCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);

  const isLoggedIn = Boolean(userId);

  const profileStrength = useMemo(() => {
    let score = 0;

    if (preferredCities.length > 0) {
      score += 35;
    }

    if (preferredCategories.length > 0) {
      score += 35;
    }

    if (savedCount > 0) {
      score += 15;
    }

    if (followsCount > 0) {
      score += 15;
    }

    return Math.min(score, 100);
  }, [preferredCities.length, preferredCategories.length, savedCount, followsCount]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setEmail("");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,role,preferred_cities,preferred_categories")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        const profile = profileData as ProfileRow;

        setRole(profile.role);
        setPreferredCities(profile.preferred_cities || []);
        setPreferredCategories(profile.preferred_categories || []);
      }

      const { data: savedRows } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id);

      setSavedCount(((savedRows || []) as SavedEventRow[]).length);

      const { data: followRows } = await supabase
        .from("follows")
        .select("id,target_type,target_id")
        .eq("user_id", user.id);

      setFollowsCount(((followRows || []) as FollowRow[]).length);

      const { data: membershipRows } = await supabase
        .from("organizer_members")
        .select("organizer_id")
        .eq("user_id", user.id);

      const organizerIds = ((membershipRows || []) as OrganizerMemberRow[])
        .map((row) => row.organizer_id)
        .filter(Boolean);

      if (organizerIds.length > 0) {
        const { data: organizerRows } = await supabase
          .from("organizers")
          .select("id,slug,name")
          .in("id", organizerIds)
          .order("name", { ascending: true });

        setOrganizers((organizerRows || []) as OrganizerRow[]);
      } else {
        setOrganizers([]);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function savePreferences() {
    setMessage("");

    if (!userId) {
      setMessage("Tens de iniciar sessão para guardar preferências.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      preferred_cities: preferredCities,
      preferred_categories: preferredCategories,
    });

    setSaving(false);

    if (error) {
      setMessage(`Erro ao guardar perfil: ${error.message}`);
      return;
    }

    setMessage("Preferências guardadas.");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar perfil...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mt-8 lg:mt-12">
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Conta
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
              Entra para guardar a tua cena.
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-zinc-400 lg:text-base">
              Sem conta consegues explorar. Com conta consegues sincronizar
              guardados, preferências e acompanhar submissões.
            </p>

            <div className="mt-7 grid gap-3">
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
          </aside>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Guardados
              </p>

              <h3 className="mt-3 text-3xl font-black">Não percas eventos.</h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                Guarda eventos para ver depois e sincroniza entre dispositivos.
              </p>
            </div>

            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Para ti
              </p>

              <h3 className="mt-3 text-3xl font-black">Feed mais certeiro.</h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                Define cidades e categorias para receber eventos mais próximos
                do teu gosto.
              </p>
            </div>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Conta
          </p>

          <h2 className="mt-3 break-words text-2xl font-black leading-tight">
            {email}
          </h2>

          <p className="mt-2 text-sm font-bold uppercase tracking-wide text-zinc-600">
            {role ? `Role: ${role}` : "Utilizador"}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{savedCount}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Guard.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{followsCount}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Seg.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Perfil
            </p>

            <p className="mt-3 text-3xl font-black">{profileStrength}%</p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-[#f2f1ec]"
                style={{ width: `${profileStrength}%` }}
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-zinc-600">
              Quanto mais completo, melhor fica o “Para ti”.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href="/guardados"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Ver guardados
            </Link>

            <Link
              href="/para-ti"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Abrir Para ti
            </Link>

            {role === "admin" && (
              <Link
                href="/admin"
                className="rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-400"
              >
                Painel Admin
              </Link>
            )}

            {organizers.length > 0 && (
              <Link
                href="/organizador"
                className="rounded-full border border-red-900 px-5 py-4 text-center text-sm font-bold text-red-400"
              >
                Painel Organizador
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
            >
              Sair
            </button>
          </div>
        </aside>

        <section className="space-y-6">
          <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Preferências
                </p>

                <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
                  O que queres ver?
                </h2>

                <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                  Escolhe cidades e categorias. Isto alimenta a página “Para ti”
                  e ajuda a limpar ruído.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-sm font-black text-zinc-300">
                    Cidades
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {cities.map((city) => (
                      <PillButton
                        key={city}
                        active={preferredCities.includes(city)}
                        onClick={() =>
                          setPreferredCities((current) =>
                            toggleValue(current, city)
                          )
                        }
                      >
                        {city}
                      </PillButton>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-black text-zinc-300">
                    Categorias
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <PillButton
                        key={category}
                        active={preferredCategories.includes(category)}
                        onClick={() =>
                          setPreferredCategories((current) =>
                            toggleValue(current, category)
                          )
                        }
                      >
                        {category}
                      </PillButton>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={saving}
                  className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
                >
                  {saving ? "A guardar..." : "Guardar preferências"}
                </button>

                {message && (
                  <p className="text-center text-sm font-bold text-zinc-400">
                    {message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Link
              href="/agenda"
              className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Agenda
              </p>

              <h3 className="mt-3 text-3xl font-black leading-none">
                Explorar tudo
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                Vai direto à lista completa de eventos.
              </p>
            </Link>

            <Link
              href="/descobrir"
              className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Rede
              </p>

              <h3 className="mt-3 text-3xl font-black leading-none">
                Descobrir
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                Artistas, espaços e organizadores.
              </p>
            </Link>

            <Link
              href="/submeter"
              className="rounded-[2rem] border border-red-950 bg-red-950/20 p-5 transition hover:border-red-800"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-red-500">
                Submissão
              </p>

              <h3 className="mt-3 text-3xl font-black leading-none">
                Meter evento
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                Envia uma nova cena para revisão.
              </p>
            </Link>
          </section>

          {organizers.length > 0 && (
            <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Organizador
              </p>

              <h2 className="mt-3 text-4xl font-black leading-none">
                Contas ligadas.
              </h2>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {organizers.map((organizer) => (
                  <Link
                    key={organizer.id}
                    href={`/organizadores/${organizer.slug}`}
                    className="rounded-[2rem] border border-zinc-800 bg-black p-5 transition hover:border-red-950"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                      Organizador
                    </p>

                    <h3 className="mt-3 text-2xl font-black">
                      {organizer.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}