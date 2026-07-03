"use client";

import { useEffect, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/events";

export function SavedEventsClient() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const savedEvents = JSON.parse(localStorage.getItem("savedEvents") || "[]");
    setSavedIds(savedEvents);
  }, []);

  const savedEvents = events.filter((event) => savedIds.includes(event.id));

  if (savedEvents.length === 0) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-lg font-bold text-[#f2f1ec]">
          Ainda não guardaste nada.
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          Vai à agenda, escolhe o que não queres perder e carrega em Guardar.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {savedEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}