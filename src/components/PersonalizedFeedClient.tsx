"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { supabase } from "@/lib/supabase/public";
import { type AppEvent } from "@/lib/events";

type PersonalizedFeedClientProps = {
  events: AppEvent[];
};

type FollowRow = {
  target_type: "artist" | "venue" | "organizer";
  target_id: string;
};

type FollowEntity = {
  id: string;
  slug: string;
  name: string;
};

export function PersonalizedFeedClient({
  events,
}: PersonalizedFeedClientProps) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [followedArtists, setFollowedArtists] = useState<FollowEntity[]>([]);
  const [followedVenues, setFollowedVenues] = useState<FollowEntity[]>([]);
  const [followedOrganizers, setFollowedOrganizers] = useState<FollowEntity[]>(
    []
  );

  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);

  useEffect(() => {
    setPreferredCities(
      JSON.parse(localStorage.getItem("preferredCities") || "[]")
    );

    setPreferredCategories(
      JSON.parse(localStorage.getItem("preferredCategories") || "[]")
    );

    async function loadPersonalData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      setLoggedIn(true);

      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("target_type,target_id")
        .eq("user_id", user.id);

      if (followsError) {
        console.error(followsError);
        setLoading(false);
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
          .select("id,slug,name")
          .in("id", artistIds);

        setFollowedArtists((data || []) as FollowEntity[]);
      }

      if (venueIds.length > 0) {
        const { data } = await supabase
          .from("venues")
          .select("id,slug,name")
          .in("id", venueIds);

        setFollowedVenues((data || []) as FollowEntity[]);
      }

      if (organizerIds.length > 0) {
        const { data } = await supabase
          .from("organizers")
          .select("id,slug,name")
          .in("id", organizerIds);

        setFollowedOrganizers((data || []) as FollowEntity[]);
      }

      setLoading(false);
    }

    loadPersonalData();
  }, []);

  const feed = useMemo(() => {
    const artistSlugs = followedArtists.map((artist) => artist.slug);
    const venueSlugs = followedVenues.map((venue) => venue.slug);
    const organizerSlugs = followedOrganizers.map(
      (organizer) => organizer.slug
    );

    const artistNames = followedArtists.map((artist) => artist.name);
    const venueNames = followedVenues.map((venue) => venue.name);
    const organizerNames = followedOrganizers.map(
      (organizer) => organizer.name
    );

    const scoredEvents = events.map((event) => {
      let score = 0;
      const reasons: string[] = [];

      const hasFollowedArtist = event.artists.some(
        (artist) =>
          artistSlugs.includes(artist.slug) || artistNames.includes(artist.name)
      );

      if (hasFollowedArtist) {
        score += 50;
        reasons.push("artista seguido");
      }

      if (
        venueSlugs.includes(event.venueSlug || "") ||
        venueNames.includes(event.venue)
      ) {
        score += 40;
        reasons.push("espaço seguido");
      }

      if (
        organizerSlugs.includes(event.organizerSlug || "") ||
        organizerNames.includes(event.organizer)
      ) {
        score += 40;
        reasons.push("organizador seguido");
      }

      if (preferredCities.includes(event.city)) {
        score += 15;
        reasons.push("cidade preferida");
      }

      if (preferredCategories.includes(event.category)) {
        score += 15;
        reasons.push("categoria preferida");
      }

      if (event.featured) {
        score += 10;
        reasons.push("escolha Paranoid");
      }

      return {
        event,
        score,
        reasons,
      };
    });

    return scoredEvents
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [
    events,
    followedArtists,
    followedVenues,
    followedOrganizers,
    preferredCities,
    preferredCategories,
  ]);

  const fallbackEvents = events.slice(0, 6);

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-400">A montar o teu feed...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
          Sinal
        </p>

        <h2 className="text-2xl font-black">
          {feed.length > 0
            ? `${feed.length} evento${feed.length !== 1 ? "s" : ""} com ligação a ti`
            : "Ainda estás a ensinar a Paranoid."}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {feed.length > 0
            ? "Este feed usa artistas, espaços e organizadores que segues, mais cidades e categorias preferidas."
            : "Segue artistas, espaços e organizadores para este feed ficar mais certeiro."}
        </p>

        {!loggedIn && (
          <Link
            href="/login"
            className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Entrar para melhorar o feed
          </Link>
        )}

        <Link
          href="/descobrir"
          className="mt-3 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
        >
          Descobrir quem seguir
        </Link>
      </section>

      {feed.length > 0 && (
        <section>
          <h2 className="text-2xl font-black">Escolhidos para ti</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Ordenado por ligação à tua rede.
          </p>

          <div className="mt-4 space-y-4">
            {feed.map((item) => (
              <div key={item.event.id}>
                <div className="mb-2 flex flex-wrap gap-2">
                  {item.reasons.slice(0, 3).map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-400"
                    >
                      {reason}
                    </span>
                  ))}
                </div>

                <EventCard event={item.event} />
              </div>
            ))}
          </div>
        </section>
      )}

      {feed.length === 0 && (
        <section>
          <h2 className="text-2xl font-black">Começa por aqui</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Enquanto não há sinal suficiente, mostramos eventos ativos.
          </p>

          <div className="mt-4 space-y-4">
            {fallbackEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}