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

type NetworkTab = "artist" | "venue" | "organizer";

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string[] | null;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  pack: string | null;
  verified: boolean | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AdminNetworkClient() {
  const [activeTab, setActiveTab] = useState<NetworkTab>("artist");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingNetwork, setLoadingNetwork] = useState(true);

  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);

  const [artistName, setArtistName] = useState("");
  const [artistCity, setArtistCity] = useState("Pombal");
  const [artistGenres, setArtistGenres] = useState("");
  const [artistDescription, setArtistDescription] = useState("");
  const [artistInstagram, setArtistInstagram] = useState("");
  const [artistBandcamp, setArtistBandcamp] = useState("");

  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("Pombal");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueDescription, setVenueDescription] = useState("");
  const [venueInstagram, setVenueInstagram] = useState("");

  const [organizerName, setOrganizerName] = useState("");
  const [organizerCity, setOrganizerCity] = useState("Pombal");
  const [organizerDescription, setOrganizerDescription] = useState("");
  const [organizerPack, setOrganizerPack] = useState("");
  const [organizerInstagram, setOrganizerInstagram] = useState("");
  const [organizerVerified, setOrganizerVerified] = useState(false);

  async function loadNetwork() {
    setLoadingNetwork(true);

    const [artistsResult, venuesResult, organizersResult] = await Promise.all([
      supabase
        .from("artists")
        .select("id,slug,name,city,genres")
        .order("name", { ascending: true }),
      supabase
        .from("venues")
        .select("id,slug,name,city,address")
        .order("name", { ascending: true }),
      supabase
        .from("organizers")
        .select("id,slug,name,city,pack,verified")
        .order("name", { ascending: true }),
    ]);

    if (!artistsResult.error) {
      setArtists((artistsResult.data || []) as ArtistRow[]);
    }

    if (!venuesResult.error) {
      setVenues((venuesResult.data || []) as VenueRow[]);
    }

    if (!organizersResult.error) {
      setOrganizers((organizersResult.data || []) as OrganizerRow[]);
    }

    setLoadingNetwork(false);
  }

  useEffect(() => {
    loadNetwork();
  }, []);

  async function createArtist() {
    setMessage("");

    if (!artistName) {
      setMessage("Mete o nome do artista.");
      return;
    }

    setSaving(true);

    const genres = artistGenres
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);

    const { error } = await supabase.from("artists").insert({
      slug: slugify(artistName),
      name: artistName,
      city: artistCity,
      genres,
      description: artistDescription || null,
      instagram: artistInstagram || null,
      bandcamp: artistBandcamp || null,
    });

    setSaving(false);

    if (error) {
      setMessage("Erro ao criar artista. Pode já existir slug igual.");
      return;
    }

    setArtistName("");
    setArtistGenres("");
    setArtistDescription("");
    setArtistInstagram("");
    setArtistBandcamp("");
    setMessage("Artista criado.");
    await loadNetwork();
  }

  async function createVenue() {
    setMessage("");

    if (!venueName) {
      setMessage("Mete o nome do espaço.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("venues").insert({
      slug: slugify(venueName),
      name: venueName,
      city: venueCity,
      address: venueAddress || null,
      description: venueDescription || null,
      instagram: venueInstagram || null,
    });

    setSaving(false);

    if (error) {
      setMessage("Erro ao criar espaço. Pode já existir slug igual.");
      return;
    }

    setVenueName("");
    setVenueAddress("");
    setVenueDescription("");
    setVenueInstagram("");
    setMessage("Espaço criado.");
    await loadNetwork();
  }

  async function createOrganizer() {
    setMessage("");

    if (!organizerName) {
      setMessage("Mete o nome do organizador.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("organizers").insert({
      slug: slugify(organizerName),
      name: organizerName,
      city: organizerCity,
      description: organizerDescription || null,
      pack: organizerPack || null,
      verified: organizerVerified,
      instagram: organizerInstagram || null,
    });

    setSaving(false);

    if (error) {
      setMessage("Erro ao criar organizador. Pode já existir slug igual.");
      return;
    }

    setOrganizerName("");
    setOrganizerDescription("");
    setOrganizerPack("");
    setOrganizerInstagram("");
    setOrganizerVerified(false);
    setMessage("Organizador criado.");
    await loadNetwork();
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="grid grid-cols-3 gap-2 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("artist");
            setMessage("");
          }}
          className={`rounded-2xl px-3 py-3 text-xs font-black uppercase ${
            activeTab === "artist"
              ? "bg-[#f2f1ec] text-black"
              : "text-zinc-500"
          }`}
        >
          Artista
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("venue");
            setMessage("");
          }}
          className={`rounded-2xl px-3 py-3 text-xs font-black uppercase ${
            activeTab === "venue"
              ? "bg-[#f2f1ec] text-black"
              : "text-zinc-500"
          }`}
        >
          Espaço
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("organizer");
            setMessage("");
          }}
          className={`rounded-2xl px-3 py-3 text-xs font-black uppercase ${
            activeTab === "organizer"
              ? "bg-[#f2f1ec] text-black"
              : "text-zinc-500"
          }`}
        >
          Org.
        </button>
      </div>

      {activeTab === "artist" && (
        <>
          <section className="space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Novo artista
            </p>

            <input
              value={artistName}
              onChange={(event) => setArtistName(event.target.value)}
              placeholder="Nome do artista"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <select
              value={artistCity}
              onChange={(event) => setArtistCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>

            <input
              value={artistGenres}
              onChange={(event) => setArtistGenres(event.target.value)}
              placeholder="Géneros separados por vírgula. Ex: Doom, Sludge"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <textarea
              rows={5}
              value={artistDescription}
              onChange={(event) => setArtistDescription(event.target.value)}
              placeholder="Descrição"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <input
              value={artistInstagram}
              onChange={(event) => setArtistInstagram(event.target.value)}
              placeholder="Instagram URL"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <input
              value={artistBandcamp}
              onChange={(event) => setArtistBandcamp(event.target.value)}
              placeholder="Bandcamp URL"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <button
              type="button"
              onClick={createArtist}
              disabled={saving}
              className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {saving ? "A criar..." : "Criar artista"}
            </button>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Artistas existentes</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Perfis já dentro da rede.
                </p>
              </div>

              <span className="text-sm font-black text-red-700">
                {artists.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loadingNetwork && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-zinc-400">A carregar artistas...</p>
                </div>
              )}

              {!loadingNetwork &&
                artists.map((artist) => (
                  <article
                    key={artist.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <h3 className="text-xl font-black">{artist.name}</h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {artist.city || "Cidade por definir"}
                    </p>

                    {artist.genres && artist.genres.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {artist.genres.slice(0, 4).map((genre) => (
                          <span
                            key={genre}
                            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-400"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/admin/rede/artistas/${artist.id}`}
                        className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-center text-sm font-black text-black"
                      >
                        Editar
                      </Link>

                      <Link
                        href={`/artistas/${artist.slug}`}
                        className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
                      >
                        Ver perfil
                      </Link>
                    </div>
                  </article>
                ))}

              {!loadingNetwork && artists.length === 0 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-zinc-400">Ainda não há artistas.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "venue" && (
        <>
          <section className="space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Novo espaço
            </p>

            <input
              value={venueName}
              onChange={(event) => setVenueName(event.target.value)}
              placeholder="Nome do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <select
              value={venueCity}
              onChange={(event) => setVenueCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>

            <input
              value={venueAddress}
              onChange={(event) => setVenueAddress(event.target.value)}
              placeholder="Morada"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <textarea
              rows={5}
              value={venueDescription}
              onChange={(event) => setVenueDescription(event.target.value)}
              placeholder="Descrição"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <input
              value={venueInstagram}
              onChange={(event) => setVenueInstagram(event.target.value)}
              placeholder="Instagram URL"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <button
              type="button"
              onClick={createVenue}
              disabled={saving}
              className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {saving ? "A criar..." : "Criar espaço"}
            </button>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Espaços existentes</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Salas, caves, auditórios e pontos ativos.
                </p>
              </div>

              <span className="text-sm font-black text-red-700">
                {venues.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loadingNetwork && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-zinc-400">A carregar espaços...</p>
                </div>
              )}

              {!loadingNetwork &&
                venues.map((venue) => (
                  <article
                    key={venue.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <h3 className="text-xl font-black">{venue.name}</h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {venue.address || "Morada por definir"}, {venue.city}
                    </p>

                    <Link
                      href={`/espacos/${venue.slug}`}
                      className="mt-4 block rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
                    >
                      Ver perfil
                    </Link>
                  </article>
                ))}

              {!loadingNetwork && venues.length === 0 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-zinc-400">Ainda não há espaços.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "organizer" && (
        <>
          <section className="space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Novo organizador
            </p>

            <input
              value={organizerName}
              onChange={(event) => setOrganizerName(event.target.value)}
              placeholder="Nome do organizador"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <select
              value={organizerCity}
              onChange={(event) => setOrganizerCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>

            <textarea
              rows={5}
              value={organizerDescription}
              onChange={(event) => setOrganizerDescription(event.target.value)}
              placeholder="Descrição"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <input
              value={organizerPack}
              onChange={(event) => setOrganizerPack(event.target.value)}
              placeholder="Pack. Ex: Paranoid Crew"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <input
              value={organizerInstagram}
              onChange={(event) => setOrganizerInstagram(event.target.value)}
              placeholder="Instagram URL"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
              <input
                type="checkbox"
                checked={organizerVerified}
                onChange={(event) => setOrganizerVerified(event.target.checked)}
              />

              <span className="text-sm font-bold text-zinc-300">
                Organizador verificado
              </span>
            </label>

            <button
              type="button"
              onClick={createOrganizer}
              disabled={saving}
              className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {saving ? "A criar..." : "Criar organizador"}
            </button>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  Organizadores existentes
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Promotores, coletivos e entidades.
                </p>
              </div>

              <span className="text-sm font-black text-red-700">
                {organizers.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loadingNetwork && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-zinc-400">A carregar organizadores...</p>
                </div>
              )}

              {!loadingNetwork &&
                organizers.map((organizer) => (
                  <article
                    key={organizer.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black">
                          {organizer.name}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {organizer.city || "Cidade por definir"}
                        </p>

                        {organizer.pack && (
                          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-600">
                            {organizer.pack}
                          </p>
                        )}
                      </div>

                      {organizer.verified && (
                        <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                          Verificado
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/organizadores/${organizer.slug}`}
                      className="mt-4 block rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
                    >
                      Ver perfil
                    </Link>
                  </article>
                ))}

              {!loadingNetwork && organizers.length === 0 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-zinc-400">
                    Ainda não há organizadores.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {message && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}