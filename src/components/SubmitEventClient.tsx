"use client";

import { type ChangeEvent, useState } from "react";

const categories = [
  "Concertos",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
  "Teatro",
  "Outros",
];

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

function formatPriceValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase();

  if (
    normalized.includes("entrada livre") ||
    normalized.includes("grátis") ||
    normalized.includes("gratis") ||
    normalized === "free"
  ) {
    return "Entrada livre";
  }

  if (trimmed.includes("€")) {
    return trimmed;
  }

  const looksLikeNumber = /^[0-9]+([,.][0-9]{1,2})?$/.test(trimmed);

  if (looksLikeNumber) {
    return `${trimmed.replace(".", ",")}€`;
  }

  return trimmed;
}

export function SubmitEventClient() {
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [category, setCategory] = useState("Concertos");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [price, setPrice] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");

  const previewTitle = title || "Nome do evento";
  const previewVenue = venue || "Espaço por definir";
  const previewPrice = formatPriceValue(price) || "Preço por definir";
  const previewDate = date || "Data";
  const previewTime = time || "Hora";

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const objectUrl = URL.createObjectURL(file);

    setImagePreview((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return objectUrl;
    });

    setImageName(file.name);
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          01 · Dados principais
        </p>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Noise Night"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cartaz / foto do evento
            </label>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-zinc-700 bg-black px-4 py-5 text-center transition hover:border-red-900">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <span className="text-sm font-bold text-zinc-300">
                {imageName || "Carregar imagem"}
              </span>

              <span className="mt-1 block text-xs text-zinc-600">
                PNG, JPG ou WebP. Depois ligamos isto ao Supabase Storage.
              </span>
            </label>

            {imagePreview && (
              <div
                className="mt-4 h-48 rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${imagePreview})` }}
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Organizador
            </label>
            <input
              type="text"
              value={organizer}
              onChange={(event) => setOrganizer(event.target.value)}
              placeholder="Ex: Paranoid Crew"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Categoria
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          02 · Onde e quando
        </p>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade
            </label>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Local / espaço
            </label>
            <input
              type="text"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Ex: Armazém"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Preço
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              onBlur={() => setPrice(formatPriceValue(price))}
              placeholder="Ex: 5, 10, 7,50 ou Entrada livre"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
            <p className="mt-2 text-xs text-zinc-600">
              Escreve só o número. A Paranoid mete o € por ti.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          03 · Descrição
        </p>

        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Texto do evento
        </label>

        <textarea
          rows={6}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explica o evento sem parecer comunicado da câmara."
          className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
        />
      </section>

      <section className="rounded-[2rem] border border-red-950 bg-black p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Preview
        </p>

        <article className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
          <div
            className={`mb-4 h-44 rounded-2xl bg-cover bg-center ${
              imagePreview ? "" : "bg-gradient-to-br from-zinc-800 to-red-950"
            }`}
            style={
              imagePreview ? { backgroundImage: `url(${imagePreview})` } : {}
            }
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                {category}
              </p>

              <h2 className="text-2xl font-black">{previewTitle}</h2>

              <p className="mt-2 text-sm text-zinc-400">
                {previewDate} · {previewTime}
              </p>

              <p className="text-sm text-zinc-500">
                {previewVenue}, {city}
              </p>

              {organizer && (
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-600">
                  {organizer}
                </p>
              )}
            </div>

            <span className="rounded-full bg-[#f2f1ec] px-3 py-1 text-xs font-bold text-black">
              {previewPrice}
            </span>
          </div>
        </article>

        <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/40 p-4">
          <p className="text-sm font-bold text-yellow-400">Estado: Pendente</p>
          <p className="mt-1 text-xs text-zinc-500">
            Depois do Supabase, isto entra no admin para aprovação.
          </p>
        </div>
      </section>

      <button
        type="button"
        className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
      >
        Submeter para aprovação
      </button>
    </div>
  );
}