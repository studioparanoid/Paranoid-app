"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/public";

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AdminNetworkClient() {
  const [activeTab, setActiveTab] = useState<"artist" | "venue" | "organizer">(
    "artist"
  );

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
      console.error(error);
      setMessage("Erro ao criar artista. Pode já existir slug igual.");
      return;
    }

    setArtistName("");
    setArtistGenres("");
    setArtistDescription("");
    setArtistInstagram("");
    setArtistBandcamp("");
    setMessage("Artista criado.");
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
      console.error(error);
      setMessage("Erro ao criar espaço. Pode já existir slug igual.");
      return;
    }

    setVenueName("");
    setVenueAddress("");
    setVenueDescription("");
    setVenueInstagram("");
    setMessage("Espaço criado.");
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
      console.error(error);
      setMessage("Erro ao criar organizador. Pode já existir slug igual.");
      return;
    }

    setOrganizerName("");
    setOrganizerDescription("");
    setOrganizerPack("");
    setOrganizerInstagram("");
    setOrganizerVerified(false);
    setMessage("Organizador criado.");
  }

  return (
    <div className="mt-8 space-y-6">
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
      )}

      {activeTab === "venue" && (
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
      )}

      {activeTab === "organizer" && (
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
      )}

      {message && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}