"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";

type LocationSource = "manual" | "geocoded" | "venue" | null;

type SubmissionLocationFields = {
  address?: string | null;
  postal_code?: string | null;
  municipality?: string | null;
  district?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location_source?: LocationSource;
};

type AdminSubmissionActionsProps = {
  submission: EventSubmission & SubmissionLocationFields;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  municipality: string | null;
  address: string | null;
  postal_code: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: LocationSource;
};

type VenueLocation = {
  id: string;
  address: string | null;
  postal_code: string | null;
  municipality: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: LocationSource;
};

type LocationPayload = {
  address: string | null;
  postal_code: string | null;
  municipality: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: LocationSource;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
};

type ArtistRow = {
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

function buildDisplayDate(startDate: string, endDate: string, isMultiDay: boolean) {
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

function getStartAt(startDate: string, displayTime: string | null) {
  if (!startDate) {
    return new Date().toISOString();
  }

  const cleanTime = displayTime || "00:00";
  const timeWithSeconds =
    cleanTime.split(":").length === 2 ? `${cleanTime}:00` : cleanTime;

  return `${startDate}T${timeWithSeconds}+00:00`;
}

function getEndAt(startDate: string, endDate: string, isMultiDay: boolean) {
  if (!startDate) {
    return new Date().toISOString();
  }

  const finalEndDate = isMultiDay && endDate ? endDate : startDate;

  return `${finalEndDate}T23:59:00+00:00`;
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

function normalizeNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function getSubmissionLocation(
  submission: EventSubmission & SubmissionLocationFields
): LocationPayload {
  const latitude = normalizeNumber(submission.latitude);
  const longitude = normalizeNumber(submission.longitude);

  return {
    address: submission.address?.trim() || null,
    postal_code: submission.postal_code?.trim() || null,
    municipality: submission.municipality?.trim() || null,
    district: submission.district?.trim() || null,
    latitude,
    longitude,
    location_source:
      latitude !== null && longitude !== null
        ? submission.location_source || "geocoded"
        : null,
  };
}

function hasLocationDetails(location: LocationPayload) {
  return Boolean(
    location.address ||
      location.postal_code ||
      location.municipality ||
      location.district ||
      (location.latitude !== null && location.longitude !== null)
  );
}

function mergeEventLocation(
  submissionLocation: LocationPayload,
  venueLocation: VenueLocation | null
): LocationPayload {
  const latitude =
    submissionLocation.latitude !== null
      ? submissionLocation.latitude
      : venueLocation?.latitude ?? null;

  const longitude =
    submissionLocation.longitude !== null
      ? submissionLocation.longitude
      : venueLocation?.longitude ?? null;

  const fromSubmission =
    submissionLocation.latitude !== null && submissionLocation.longitude !== null;

  const fromVenue = !fromSubmission && latitude !== null && longitude !== null;

  return {
    address: submissionLocation.address || venueLocation?.address || null,
    postal_code:
      submissionLocation.postal_code || venueLocation?.postal_code || null,
    municipality:
      submissionLocation.municipality || venueLocation?.municipality || null,
    district: submissionLocation.district || venueLocation?.district || null,
    latitude,
    longitude,
    location_source: fromSubmission
      ? submissionLocation.location_source || "geocoded"
      : fromVenue
        ? "venue"
        : null,
  };
}

async function createUniqueEventSlug(title: string) {
  const baseSlug = slugify(title) || crypto.randomUUID();
  let candidate = baseSlug;
  let count = 1;

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }

    count += 1;
    candidate = `${baseSlug}-${count}`;
  }
}

async function findOrCreateVenue(
  name: string,
  city: string,
  municipality: string | null,
  location: LocationPayload
): Promise<VenueLocation | null> {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

  const { data: existingVenue, error: existingError } = await supabase
    .from("venues")
    .select(
      "id,slug,name,city,municipality,address,postal_code,district,latitude,longitude,location_source"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingVenue) {
    const venue = existingVenue as VenueRow;

    if (hasLocationDetails(location)) {
      const updatePayload = {
        city,
        municipality: location.municipality || municipality || venue.municipality,
        address: location.address || venue.address,
        postal_code: location.postal_code || venue.postal_code,
        district: location.district || venue.district,
        latitude:
          location.latitude !== null ? location.latitude : venue.latitude,
        longitude:
          location.longitude !== null ? location.longitude : venue.longitude,
        location_source:
          location.latitude !== null && location.longitude !== null
            ? location.location_source || "geocoded"
            : venue.location_source,
      };

      const { error: updateError } = await supabase
        .from("venues")
        .update(updatePayload)
        .eq("id", venue.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return {
        id: venue.id,
        address: updatePayload.address,
        postal_code: updatePayload.postal_code,
        municipality: updatePayload.municipality,
        district: updatePayload.district,
        latitude: updatePayload.latitude,
        longitude: updatePayload.longitude,
        location_source: updatePayload.location_source,
      };
    }

    return {
      id: venue.id,
      address: venue.address,
      postal_code: venue.postal_code,
      municipality: venue.municipality,
      district: venue.district,
      latitude: venue.latitude,
      longitude: venue.longitude,
      location_source: venue.location_source,
    };
  }

  const { data: createdVenue, error: createError } = await supabase
    .from("venues")
    .insert({
      slug,
      name: cleanName,
      city,
      municipality: location.municipality || municipality,
      address: location.address,
      postal_code: location.postal_code,
      district: location.district,
      latitude: location.latitude,
      longitude: location.longitude,
      location_source: location.location_source,
      description: null,
      instagram: null,
    })
    .select(
      "id,slug,name,city,municipality,address,postal_code,district,latitude,longitude,location_source"
    )
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  const venue = createdVenue as VenueRow;

  return {
    id: venue.id,
    address: venue.address,
    postal_code: venue.postal_code,
    municipality: venue.municipality,
    district: venue.district,
    latitude: venue.latitude,
    longitude: venue.longitude,
    location_source: venue.location_source,
  };
}

async function findOrCreateOrganizer(name: string, city: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

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
      name: cleanName,
      city,
      description: null,
      pack: null,
      verified: false,
    })
    .select("id,slug,name")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return (createdOrganizer as OrganizerRow).id;
}

async function findOrCreateArtist(name: string, city: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

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
      name: cleanName,
      city,
      genres: null,
      description: null,
      instagram: null,
      bandcamp: null,
    })
    .select("id,slug,name")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return (createdArtist as ArtistRow).id;
}

async function attachArtistsToEvent({
  eventId,
  artistsText,
  city,
}: {
  eventId: string;
  artistsText: string | null;
  city: string;
}) {
  const artistNames = getArtistNames(artistsText);

  if (artistNames.length === 0) {
    return;
  }

  const artistIds: string[] = [];

  for (const artistName of artistNames) {
    const artistId = await findOrCreateArtist(artistName, city);

    if (artistId) {
      artistIds.push(artistId);
    }
  }

  if (artistIds.length === 0) {
    return;
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

export function AdminSubmissionActions({
  submission,
}: AdminSubmissionActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function rejectSubmission() {
    setMessage("");

    if (!confirm("Rejeitar esta submissão?")) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("event_submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id);

    setLoading(false);

    if (error) {
      setMessage(`Erro ao rejeitar: ${error.message}`);
      return;
    }

    window.location.reload();
  }

  async function approveSubmission() {
    setMessage("");

    if (!submission.event_date) {
      setMessage("A submissão não tem data.");
      return;
    }

    if (!confirm("Aprovar e publicar este evento?")) {
      return;
    }

    setLoading(true);

    try {
      const eventSlug = await createUniqueEventSlug(submission.title);
      const submissionLocation = getSubmissionLocation(submission);

      const venueLocation = await findOrCreateVenue(
        submission.venue,
        submission.city,
        submission.municipality || null,
        submissionLocation
      );

      const eventLocation = mergeEventLocation(
        submissionLocation,
        venueLocation
      );

      const organizerId =
        submission.organizer_id ||
        (await findOrCreateOrganizer(submission.organizer, submission.city));

      const isMultiDay = Boolean(submission.is_multi_day);
      const finalEndDate = isMultiDay
        ? submission.end_date || submission.event_date
        : submission.event_date;

      const displayDate = buildDisplayDate(
        submission.event_date,
        finalEndDate,
        isMultiDay
      );

      const startAt = getStartAt(submission.event_date, submission.event_time);
      const endAt = getEndAt(submission.event_date, finalEndDate, isMultiDay);

      const ticketMode = submission.ticket_mode || "none";

      const { data: createdEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          slug: eventSlug,
          title: submission.title,
          city: submission.city,
          municipality: eventLocation.municipality || submission.municipality,
          district: eventLocation.district,
          address: eventLocation.address,
          postal_code: eventLocation.postal_code,
          latitude: eventLocation.latitude,
          longitude: eventLocation.longitude,
          location_source: eventLocation.location_source,

          venue_id: venueLocation?.id || null,
          venue_name: submission.venue,
          organizer_id: organizerId,
          organizer_name: submission.organizer,
          start_at: startAt,
          end_at: endAt,
          start_date: submission.event_date,
          end_date: finalEndDate,
          is_multi_day: isMultiDay,
          display_date: displayDate,
          display_time: submission.event_time || "Hora por definir",
          category: submission.category,
          price: submission.price || "Preço por definir",
          description: submission.description || "",
          image_url: submission.image_url,

          ticket_mode: ticketMode,
          ticket_url: ticketMode === "external" ? submission.ticket_url : null,
          ticket_price:
            ticketMode !== "none" ? submission.ticket_price : null,
          ticket_capacity:
            ticketMode === "internal" ? submission.ticket_capacity : null,
          ticket_button_label:
            ticketMode !== "none" ? submission.ticket_button_label : null,
          instagram_url: submission.instagram_url,

          featured: false,
          status: "published",
        })
        .select("id,slug")
        .single();

      if (eventError) {
        throw new Error(eventError.message);
      }

      await attachArtistsToEvent({
        eventId: createdEvent.id,
        artistsText: submission.artists_text,
        city: submission.city,
      });

      const { error: submissionError } = await supabase
        .from("event_submissions")
        .update({ status: "approved" })
        .eq("id", submission.id);

      if (submissionError) {
        throw new Error(submissionError.message);
      }

      setLoading(false);
      window.location.reload();
    } catch (error) {
      setLoading(false);
      setMessage(
        `Erro ao aprovar: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={approveSubmission}
          disabled={loading || submission.status !== "pending"}
          className="rounded-full bg-[#f2f1ec] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
        >
          {loading ? "..." : "Aprovar"}
        </button>

        <button
          type="button"
          onClick={rejectSubmission}
          disabled={loading || submission.status !== "pending"}
          className="rounded-full border border-red-900 px-4 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
        >
          Rejeitar
        </button>
      </div>

      {submission.ticket_mode && submission.ticket_mode !== "none" && (
        <p className="rounded-2xl border border-red-950 bg-red-950/20 px-4 py-3 text-center text-xs font-bold text-red-300">
          Bilheteira:{" "}
          {submission.ticket_mode === "internal" ? "Paranoid" : "externa"}
        </p>
      )}

      {submission.municipality && (
        <p className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-center text-xs font-bold text-zinc-400">
          Concelho: {submission.municipality}
        </p>
      )}

      {submission.address && (
        <p className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-center text-xs font-bold text-zinc-400">
          Morada: {submission.address}
        </p>
      )}

      {submission.latitude && submission.longitude && (
        <p className="rounded-2xl border border-green-900 bg-green-950/20 px-4 py-3 text-center text-xs font-bold text-green-400">
          Localização automática pronta
        </p>
      )}

      {message && (
        <p className="text-center text-xs font-bold text-zinc-500">
          {message}
        </p>
      )}
    </div>
  );
}