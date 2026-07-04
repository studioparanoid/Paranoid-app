"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import {
  getMyOrganizerMemberships,
  type OrganizerMembership,
} from "@/lib/organizer-members";

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

export function SubmitEventClient() {
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [city, setCity] = useState("Pombal");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [organizerMemberships, setOrganizerMemberships] = useState<
    OrganizerMembership[]
  >([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(
    null
  );
  const [organizerLocked, setOrganizerLocked] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    async function loadOrganizerMemberships() {
      const memberships = await getMyOrganizerMemberships();

      setOrganizerMemberships(memberships);

      const firstMembership = memberships[0];

      if (firstMembership?.organizers) {
        setSelectedOrganizerId(firstMembership.organizer_id);
        setOrganizer(firstMembership.organizers.name);
        setOrganizerLocked(true);
      }
    }

    loadOrganizerMemberships();
  }, []);

  function handleOrganizerMembershipChange(organizerId: string) {
    const membership = organizerMemberships.find(
      (item) => item.organizer_id === organizerId
    );

    if (!membership?.organizers) {
      setSelectedOrganizerId(null);
      setOrganizer("");
      setOrganizerLocked(false);
      return;
    }

    setSelectedOrganizerId(membership.organizer_id);
    setOrganizer(membership.organizers.name);
    setOrganizerLocked(true);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitMessage("A imagem não pode ter mais de 5MB.");
      return;
    }

    setImageFile(file);
    setImageName(file.name);
    setImagePreview(URL.createObjectURL(file));
    setSubmitMessage("");
  }

  async function uploadEventImage() {
    if (!imageFile) {
      return null;
    }

    const fileExtension = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `submissions/${fileName}`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(filePath, imageFile);

    if (error) {
      throw new Error("Erro ao carregar imagem.");
    }

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function formatPrice() {
    const cleanPrice = price.trim();

    if (!cleanPrice) {
      return;
    }

    if (
      cleanPrice.toLowerCase() === "gratis" ||
      cleanPrice.toLowerCase() === "grátis" ||
      cleanPrice === "0"
    ) {
      setPrice("Entrada livre");
      return;
    }

    if (!cleanPrice.includes("€") && /^\d+([,.]\d{1,2})?$/.test(cleanPrice)) {
      setPrice(`${cleanPrice.replace(".", ",")}€`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitMessage("");

    if (!title || !organizer || !category || !city || !venue || !eventDate) {
      setSubmitMessage(
        "Preenche pelo menos nome, organizador, local, cidade e data."
      );
      return;
    }

    setSubmitting(true);

    try {
      const uploadedImageUrl = await uploadEventImage();

      const { error } = await supabase.from("event_submissions").insert({
        title,
        city,
        venue,
        organizer,
        organizer_id: selectedOrganizerId,
        artists_text: artistsText || null,
        category,
        event_date: eventDate || null,
        event_time: eventTime || null,
        price,
        description,
        image_url: uploadedImageUrl,
        status: "pending",
      });

      if (error) {
        setSubmitMessage("Erro ao submeter evento.");
        setSubmitting(false);
        return;
      }

      const activeMembership = organizerMemberships.find(
        (item) => item.organizer_id === selectedOrganizerId
      );

      setTitle("");
      setVenue("");
      setArtistsText("");
      setCategory("Concertos");
      setCity("Pombal");
      setEventDate("");
      setEventTime("");
      setPrice("");
      setDescription("");
      setImagePreview(null);
      setImageName("");
      setImageFile(null);

      if (activeMembership?.organizers) {
        setOrganizer(activeMembership.organizers.name);
        setOrganizerLocked(true);
      } else {
        setOrganizer("");
        setOrganizerLocked(false);
      }

      setSubmitMessage("Evento submetido. Vai para aprovação Paranoid.");
    } catch {
      setSubmitMessage("Erro ao carregar imagem ou submeter evento.");
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Cartaz
        </p>

        <label className="block cursor-pointer">
          <div
            className={`flex h-64 items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-zinc-700 bg-black bg-cover bg-center ${
              imagePreview ? "" : "bg-gradient-to-br from-zinc-900 to-red-950"
            }`}
            style={
              imagePreview
                ? { backgroundImage: `url(${imagePreview})` }
                : undefined
            }
          >
            {!imagePreview && (
              <div className="px-6 text-center">
                <p className="text-2xl font-black">Adicionar imagem</p>
                <p className="mt-2 text-sm text-zinc-500">
                  PNG, JPG ou WEBP até 5MB.
                </p>
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>

        {imageName && <p className="mt-3 text-sm text-zinc-500">{imageName}</p>}
      </section>

      <section className="space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Nome do evento
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Noise Night Pombal"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        {organizerMemberships.length > 1 && (
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Conta do organizador
            </label>

            <select
              value={selectedOrganizerId || ""}
              onChange={(event) =>
                handleOrganizerMembershipChange(event.target.value)
              }
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {organizerMemberships.map((membership) => (
                <option
                  key={membership.organizer_id}
                  value={membership.organizer_id}
                >
                  {membership.organizers?.name || "Organizador sem nome"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Organizador
          </label>

          <input
            value={organizer}
            onChange={(event) => setOrganizer(event.target.value)}
            readOnly={organizerLocked}
            placeholder="Nome do organizador"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />

          {organizerLocked && (
            <p className="mt-2 text-xs font-bold text-red-500">
              Este evento vai entrar como submissão do teu organizador.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Artistas / bandas / DJs
          </label>

          <input
            value={artistsText}
            onChange={(event) => setArtistsText(event.target.value)}
            placeholder="Ex: Dead Static, Cave Ritual, DJ Ruína"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />

          <p className="mt-2 text-xs text-zinc-600">
            Separa vários nomes por vírgula.
          </p>
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
            Espaço / local
          </label>

          <input
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
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Hora
            </label>

            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Preço
          </label>

          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={formatPrice}
            placeholder="Ex: 5€, 10€ ou Entrada livre"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Descrição
          </label>

          <textarea
            rows={7}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Texto curto, direto, com vibe."
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
          Preview
        </p>

        <div className="rounded-3xl border border-zinc-800 bg-black p-4">
          <div
            className={`mb-4 h-44 rounded-2xl bg-cover bg-center ${
              imagePreview ? "" : "bg-gradient-to-br from-zinc-800 to-red-950"
            }`}
            style={
              imagePreview
                ? { backgroundImage: `url(${imagePreview})` }
                : undefined
            }
          />

          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
            {category}
          </p>

          <h3 className="text-2xl font-black">{title || "Nome do evento"}</h3>

          {artistsText && (
            <p className="mt-2 text-sm font-bold text-zinc-300">
              {artistsText}
            </p>
          )}

          <p className="mt-2 text-sm text-zinc-400">
            {eventDate || "Data"} · {eventTime || "Hora"}
          </p>

          <p className="text-sm text-zinc-500">
            {venue || "Espaço"}, {city}
          </p>

          <p className="mt-3 text-sm font-bold text-zinc-300">
            {price || "Preço por definir"}
          </p>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
      >
        {submitting ? "A submeter..." : "Submeter evento"}
      </button>

      {submitMessage && (
        <p className="text-center text-sm font-bold text-zinc-400">
          {submitMessage}
        </p>
      )}
    </form>
  );
}