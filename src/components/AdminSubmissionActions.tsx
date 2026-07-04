"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";

type AdminSubmissionActionsProps = {
  submission: EventSubmission;
  onDone?: () => void;
};

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
};

type CreatedEventRow = {
  id: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getStartAt(startDate: string | null, eventTime: string | null) {
  if (!startDate) {
    return new Date().toISOString();
  }

  const cleanTime = eventTime || "00:00";

  const timeWithSeconds =
    cleanTime.split(":").length === 2 ? `${cleanTime}:00` : cleanTime;

  return `${startDate}T${timeWithSeconds}+00:00`;
}

function getEndAt(startDate: string | null, endDate: string | null) {
  if (!startDate) {
    return new Date().toISOString();
  }

  const finalEndDate = endDate || startDate;

  return `${finalEndDate}T23:59:00+00:00`;
}

function formatDateForDisplay(value: string) {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function buildDisplayDate(
  startDate: string | null,
  endDate: string | null,
  isMultiDay: boolean | null
) {
  if (!startDate) {
    return "Data por definir";
  }

  if (isMultiDay && endDate && endDate !== startDate) {
    return `${formatDateForDisplay(startDate)} — ${formatDateForDisplay(
      endDate
    )}`;
  }

  return formatDateForDisplay(startDate);
}

function getArtistNames(artistsText: string | null) {
  if (!artistsText) {
    return [];
  }

  const names = artistsText
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

export function AdminSubmissionActions({
  submission,
  onDone,
}: AdminSubmissionActionsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function findOrCreateVenue() {
    const venueName = submission.venue?.trim();

    if (!venueName) {
      return null;
    }

    const slug = slugify(venueName);

    const { data: existingVenue, error: existingError } = await supabase
      .from("venues")
      .select("id,slug,name")
      .eq("slug", slug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingVenue) {
      return (existingVenue as VenueRow).id;
    }

    const { data: createdVenue, error: createError } = await supabase
      .from("venues")
      .insert({
        slug,
        name: venueName,
        city: submission.city || "Cidade por definir",
        address: null,
        description: null,
        instagram: null,
      })
      .select("id,slug,name")
      .single();

    if (createError) {
      const { data: fallbackVenue, error: fallbackError } = await supabase
        .from("venues")
        .select("id,slug,name")
        .eq("slug", slug)
        .maybeSingle();

      if (fallbackError || !fallbackVenue) {
        throw new Error(createError.message);
      }

      return (fallbackVenue as VenueRow).id;
    }

    return (createdVenue as VenueRow).id;
  }

  async function findOrCreateOrganizer() {
    if (submission.organizer_id) {
      return submission.organizer_id;
    }

    const organizerName = submission.organizer?.trim();

    if (!organizerName) {
      return null;
    }

    const slug = slugify(organizerName);

    const { data: existingOrganizer, error: existingError } = await supabase
      .from("organizers")
      .select("id,slug,name")
      .eq("slug", slug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingOrganizer) {
      return (existingOrganizer as OrganizerRow).id;
    }

    const { data: createdOrganizer, error: createError } = await supabase
      .from("organizers")
      .insert({
        slug,
        name: organizerName,
        city: submission.city || "Cidade por definir",
        description: null,
        pack: null,
        verified: false,
        instagram: null,
      })
      .select("id,slug,name")
      .single();

    if (createError) {
      const { data: fallbackOrganizer, error: fallbackError } = await supabase
        .from("organizers")
        .select("id,slug,name")
        .eq("slug", slug)
        .maybeSingle();

      if (fallbackError || !fallbackOrganizer) {
        throw new Error(createError.message);
      }

      return (fallbackOrganizer as OrganizerRow).id;
    }

    return (createdOrganizer as OrganizerRow).id;
  }

  async function findOrCreateArtist(name: string) {
    const slug = slugify(name);

    const { data: existingArtist, error: existingError } = await supabase
      .from("artists")
      .select("id,slug,name")
      .eq("slug", slug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingArtist) {
      return (existingArtist as ArtistRow).id;
    }

    const { data: createdArtist, error: createError } = await supabase
      .from("artists")
      .insert({
        slug,
        name,
        city: submission.city || null,
        genres: null,
        description: null,
        instagram: null,
        bandcamp: null,
      })
      .select("id,slug,name")
      .single();

    if (createError) {
      const { data: fallbackArtist, error: fallbackError } = await supabase
        .from("artists")
        .select("id,slug,name")
        .eq("slug", slug)
        .maybeSingle();

      if (fallbackError || !fallbackArtist) {
        throw new Error(createError.message);
      }

      return (fallbackArtist as ArtistRow).id;
    }

    return (createdArtist as ArtistRow).id;
  }

  async function attachArtistsToEvent(eventId: string) {
    const artistNames = getArtistNames(submission.artists_text);

    if (artistNames.length === 0) {
      return;
    }

    const artistIds: string[] = [];

    for (const artistName of artistNames) {
      const artistId = await findOrCreateArtist(artistName);
      artistIds.push(artistId);
    }

    const rows = artistIds.map((artistId) => ({
      event_id: eventId,
      artist_id: artistId,
    }));

    const { error } = await supabase.from("event_artists").insert(rows);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function getUniqueEventSlug(baseSlug: string) {
    const cleanBaseSlug = baseSlug || `evento-${crypto.randomUUID().slice(0, 6)}`;

    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", cleanBaseSlug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return cleanBaseSlug;
    }

    return `${cleanBaseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  async function approveSubmission() {
    setLoading(true);
    setMessage("");

    const startDate = submission.event_date;
    const finalEndDate =
      submission.is_multi_day && submission.end_date
        ? submission.end_date
        : submission.event_date;

    const startAt = getStartAt(startDate, submission.event_time);
    const endAt = getEndAt(startDate, finalEndDate);
    const displayDate = buildDisplayDate(
      startDate,
      finalEndDate,
      submission.is_multi_day
    );

    let slug = "";

    try {
      slug = await getUniqueEventSlug(slugify(submission.title));
    } catch (error) {
      setMessage(
        `Erro ao gerar slug: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setLoading(false);
      return;
    }

    let venueId: string | null = null;
    let organizerId: string | null = null;

    try {
      venueId = await findOrCreateVenue();
    } catch (error) {
      setMessage(
        `Erro ao criar/associar espaço: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setLoading(false);
      return;
    }

    try {
      organizerId = await findOrCreateOrganizer();
    } catch (error) {
      setMessage(
        `Erro ao criar/associar organizador: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setLoading(false);
      return;
    }

    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert({
        slug,
        title: submission.title,
        city: submission.city,
        venue_id: venueId,
        venue_name: submission.venue || "Espaço por definir",
        organizer_id: organizerId,
        organizer_name: submission.organizer || "Organizador por definir",
        start_at: startAt,
        end_at: endAt,
        start_date: startDate,
        end_date: finalEndDate,
        is_multi_day: Boolean(submission.is_multi_day),
        display_date: displayDate,
        display_time: submission.event_time || "Hora por definir",
        category: submission.category,
        price: submission.price || "Preço por definir",
        description: submission.description || "",
        image_url: submission.image_url || null,
        featured: false,
        status: "published",
      })
      .select("id")
      .single();

    if (eventError || !createdEvent) {
      setMessage(
        `Erro ao publicar evento: ${
          eventError?.message || "sem detalhe do Supabase"
        }`
      );
      setLoading(false);
      return;
    }

    const event = createdEvent as CreatedEventRow;

    try {
      await attachArtistsToEvent(event.id);
    } catch (error) {
      setMessage(
        `Evento criado, mas erro nos artistas: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setLoading(false);
      return;
    }

    const { error: submissionError } = await supabase
      .from("event_submissions")
      .update({
        status: "approved",
      })
      .eq("id", submission.id);

    if (submissionError) {
      setMessage(
        `Evento publicado, mas erro ao aprovar submissão: ${submissionError.message}`
      );
      setLoading(false);
      return;
    }

    setMessage("Evento aprovado com organizador, espaço e artistas associados.");
    setLoading(false);

    if (onDone) {
      onDone();
    }

    router.refresh();
  }

  async function rejectSubmission() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("event_submissions")
      .update({
        status: "rejected",
      })
      .eq("id", submission.id);

    setLoading(false);

    if (error) {
      setMessage(`Erro ao rejeitar submissão: ${error.message}`);
      return;
    }

    setMessage("Submissão rejeitada.");

    if (onDone) {
      onDone();
    }

    router.refresh();
  }

  return (
    <div>
      {submission.artists_text && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
            Artistas
          </p>

          <p className="text-sm font-bold text-zinc-300">
            {submission.artists_text}
          </p>
        </div>
      )}

      {submission.is_multi_day && (
        <div className="mt-4 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-yellow-600">
            Festival / vários dias
          </p>

          <p className="text-sm font-bold text-yellow-400">
            {buildDisplayDate(
              submission.event_date,
              submission.end_date,
              submission.is_multi_day
            )}
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/admin/submissoes/${submission.id}`}
          className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
        >
          Editar
        </Link>

        <button
          type="button"
          onClick={approveSubmission}
          disabled={loading}
          className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
        >
          {loading ? "A tratar..." : "Aprovar"}
        </button>

        <button
          type="button"
          onClick={rejectSubmission}
          disabled={loading}
          className="flex-1 rounded-full border border-red-900 px-4 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
        >
          Rejeitar
        </button>
      </div>

      {message && (
        <p className="mt-3 text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}