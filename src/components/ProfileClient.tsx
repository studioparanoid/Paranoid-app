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

type FollowRow = {
  target_type: "artist" | "venue" | "organizer";
  target_id: string;
};

type FollowedArtist = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

type FollowedVenue = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

type FollowedOrganizer = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  verified: boolean | null;
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

  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  const [followedVenues, setFollowedVenues] = useState<FollowedVenue[]>([]);
  const [followedOrganizers, setFollowedOrganizers] = useState<
    FollowedOrganizer[]
  >([]);

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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(profileError);
        setAccountLoading(false);
        return;
      }

      const profile = profileData as ProfileRow;

      setDisplayName(profile.display_name || "");
      setAccountCity(profile.city || "");
      setRole(profile.role || "public_user");

      const { data: savedData } = await supabase
        .from("saved_events")
        .select("id")
        .eq("user_id", user.id);

      if (savedData) {
        setSavedCount(savedData.length);
      }

      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("target_type,target_id")
        .eq("user_id", user.id);

      if (followsError) {
        console.error(followsError);
        setAccountLoading(false);
        return;
      }

      const follows = (followsData || []) as FollowRow[];

      const artistIds = follows
        .filter((follow) => follow.target_type === "artist")
        .map((follow) => follow.target_id);

      const venueIds = follows
        .filter((follow) => follow.target_type === "venue")
        .map((follow) => follow.target_id);

      const organizerIds = follows
        .filter((follow) => follow.target_type === "organizer")
        .map((follow) => follow.target_id);

      if (artistIds.length > 0) {
        const { data } = await supabase
          .from("artists")
          .select("id,slug,name,city")
          .in("id", artistIds);

        setFollowedArtists((data || []) as FollowedArtist[]);
      }

      if (venueIds.length > 0) {
        const { data } = await supabase
          .from("venues")
          .select("id,slug,name,city")
          .in("id", venueIds);

        setFollowedVenues((data || []) as FollowedVenue[]);
      }

      if (organizerIds.length > 0) {
        const { data } = await supabase
          .from("organizers")
          .select("id,slug,name,city,verified")
          .in("id", organizerIds);

        setFollowedOrganizers((data || []) as FollowedOrganizer[]);
      }

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

  const totalFollows =
    followedArtists.length + followedVenues.length + followedOrganizers.length;

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
              Podes usar a app sem conta. A conta serve para guardar eventos,
              seguir artistas, seguir espaços e receber alertas.
            </p>

            <Link
              href="/login"
              className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Entrar
            </Link>

            <Link
              href="/registar"
              className="mt-3 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Criar conta
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

        <div className="mt-5 grid grid-cols-4 gap-3">
          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{savedCount}</p>
            <p className="text-[10px] uppercase text-zinc-600">Guardados</p>
          </div>

          <div className="rounded-2xl bg-black p-3 text-center">
            <p className="text-2xl font-black">{totalFollows}</p>
            <p className="text-[10px] uppercase text-zinc-600">Segues</p>
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

      {!accountLoading && userId && (
        <section>
          <h2 className="text-2xl font-black">A tua rede</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Artistas, espaços e organizadores que estás a seguir.
          </p>

          <div className="mt-4 space-y-4">
            {followedArtists.length > 0 && (
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
                  Artistas
                </p>

                <div className="space-y-3">
                  {followedArtists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/artistas/${artist.slug}`}
                      className="block rounded-2xl border border-zinc-800 bg-black p-4"
                    >
                      <h3 className="font-black">{artist.name}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {artist.city || "Cidade por definir"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {followedVenues.length > 0 && (
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
                  Espaços
                </p>

                <div className="space-y-3">
                  {followedVenues.map((venue) => (
                    <Link
                      key={venue.id}
                      href={`/espacos/${venue.slug}`}
                      className="block rounded-2xl border border-zinc-800 bg-black p-4"
                    >
                      <h3 className="font-black">{venue.name}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {venue.city || "Cidade por definir"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {followedOrganizers.length > 0 && (
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
                <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
                  Organizadores
                </p>

                <div className="space-y-3">
                  {followedOrganizers.map((organizer) => (
                    <Link
                      key={organizer.id}
                      href={`/organizadores/${organizer.slug}`}
                      className="block rounded-2xl border border-zinc-800 bg-black p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black">{organizer.name}</h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            {organizer.city || "Cidade por definir"}
                          </p>
                        </div>

                        {organizer.verified && (
                          <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                            Verificado
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {totalFollows === 0 && (
              <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">
                  Ainda não segues artistas, espaços ou organizadores.
                </p>

                <Link
                  href="/agenda"
                  className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                >
                  Explorar agenda
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

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
    </div>
  );
}