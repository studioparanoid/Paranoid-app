"use client";

import { useEffect, useState } from "react";

type SaveEventButtonProps = {
  eventId: string;
};

export function SaveEventButton({ eventId }: SaveEventButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedEvents = JSON.parse(localStorage.getItem("savedEvents") || "[]");
    setSaved(savedEvents.includes(eventId));
  }, [eventId]);

  function toggleSave() {
    const savedEvents = JSON.parse(localStorage.getItem("savedEvents") || "[]");

    if (savedEvents.includes(eventId)) {
      const nextSavedEvents = savedEvents.filter((id: string) => id !== eventId);
      localStorage.setItem("savedEvents", JSON.stringify(nextSavedEvents));
      setSaved(false);
      return;
    }

    const nextSavedEvents = [...savedEvents, eventId];
    localStorage.setItem("savedEvents", JSON.stringify(nextSavedEvents));
    setSaved(true);
  }

  return (
    <button
      type="button"
      onClick={toggleSave}
      className={`rounded-full px-5 py-3 text-sm font-black ${
        saved
          ? "bg-red-950 text-red-300"
          : "bg-[#f2f1ec] text-black"
      }`}
    >
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}