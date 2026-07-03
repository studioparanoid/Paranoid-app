"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
];

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  city: string | null;
  role: string | null;
};

export function ProfileClient() {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const [accountLoading, setAccountLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountCity, setAccountCity] = useState("");
  const [role, setRole] = useState("public_user");
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    setSelectedCities(
      JSON.parse(localStorage.getItem("preferredCities") || "[]")
    );

    setSelectedCategories(
      JSON.parse(localStorage.getItem("preferredCategories") || "[]")
    );

    setSavedCount(JSON.parse(localStorage.getItem("savedEvents") || "[]").length);

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAccountLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        setAccountLoading(false);
        return;
      }

      const profile = data as ProfileRow;

      setDisplayName(profile.display_name || "");
      setAccountCity(profile.city || "");
      setRole(profile.role || "public_user");
      setAccountLoading(false);
    }

    loadAccount();
  }, []);

  function toggleCity(city: string) {
    const next = selectedCities.includes(city)
      ? selectedCities.filter((item) => item !== city)
      : [...selectedCities, city];

    setSelectedCities(next);
    localStorage.setItem("preferredCities", JSON.stringify(next));
  }

  function toggleCategory(category: string) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];

    setSelectedCategories(next);
    localStorage.setItem("preferredCategories", JSON.stringify(next));
  }

  async function saveProfile() {
    setProfileMessage("");

    if (!userId) {
      setProfileMessage("Tens de iniciar sessão para guardar perfil.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        city: accountCity || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error(error);
      setProfileMessage("Erro ao guardar perfil.");
      return;
    }

    setProfileMessage("Perfil atualizado.");
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
          Conta
        </p>

        {accountLoading && (
          <p className="text-sm text-zinc-500">A verificar sessão...</p>
        )}

        {!accountLoading && !userId && (
          <>
            <h2 className="text-2xl font-black">Visitante Paranoid</h2>

            <p className="mt-2 text-sm text-zinc-500">
              Podes usar a app sem conta. Mais tarde, a conta serve para guardar
              eventos, seguir artistas, seguir espaços e receber alertas.
            </p>

            <Link
              href="/login"
              className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Entrar
            </Link>
          </>
        )}

        {!accountLoading && userId && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {displayName || "Perfil sem nome"}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">{userEmail}</p>
              </div>

              <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                {role}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Nome público
                </label>

                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ex: Damien"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Cidade base
                </label>

                <select
                  value={accountCity}
                  onChange={(event) => setAccountCity(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                >
                  <option value="">Cidade por definir</option>
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={saveProfile}
                className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
              >
                Guardar perfil
              </button>

              {profileMessage && (
                <p className="text-center text-sm font-bold text-zinc-400">
                  {profileMessage}
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{savedCount}</p>
            <p className="text-[10px] uppercase text-zinc-600">Guardados</p>
          </div>

          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{selectedCities.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Cidades</p>
          </div>

          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{selectedCategories.length}</p>
            <p className="text-[10px] uppercase text-zinc-600">Categorias</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black">Cidades</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Escolhe onde queres apanhar movimento.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {cities.map((city) => {
            const active = selectedCities.includes(city);

            return (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  active
                    ? "border-red-800 bg-red-950 text-[#f2f1ec]"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black">Categorias</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Diz à Paranoid que tipo de ruído te interessa.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategories.includes(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  active
                    ? "border-red-800 bg-red-950 text-[#f2f1ec]"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Próximo passo
        </p>

        <h2 className="text-2xl font-black">Contas por tipo</h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          A seguir ligamos perfis de organizador, artista e espaço a contas
          reais, para cada entidade poder gerir a sua presença.
        </p>
      </section>
    </div>
  );
}