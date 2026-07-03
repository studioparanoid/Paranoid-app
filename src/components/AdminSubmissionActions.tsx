"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";
import Link from "next/link";

type AdminSubmissionActionsProps = {
  submission: EventSubmission;
  onDone?: () => void;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminSubmissionActions({
  submission,
  onDone,
}: AdminSubmissionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState("");

  async function approveSubmission() {
    setLoading("approve");
    setMessage("");

    const baseSlug = slugify(`${submission.title}-${submission.city}`);
    const slug = `${baseSlug}-${submission.id.slice(0, 6)}`;

    const startAt =
      submission.event_date && submission.event_time
        ? new Date(`${submission.event_date}T${submission.event_time}`).toISOString()
        : null;

    const { error: eventError } = await supabase.from("events").insert({
      slug,
      title: submission.title,
      city: submission.city,
      venue_id: null,
	venue_name: submission.venue || "Espaço por definir",
	organizer_name: submission.organizer || "Organizador por definir",
      organizer_id: null,
      start_at: startAt,
      display_date: submission.event_date || "Data por definir",
      display_time: submission.event_time || "Hora por definir",
      category: submission.category,
      price: submission.price || "Preço por definir",
      description: submission.description || "",
      image_url: submission.image_url || null,
      featured: false,
      status: "published",
    });

    if (eventError) {
      console.error(eventError);
      setMessage("Erro ao aprovar. O evento não foi criado.");
      setLoading(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("event_submissions")
      .update({ status: "approved" })
      .eq("id", submission.id);

    if (updateError) {
      console.error(updateError);
      setMessage("Evento criado, mas a submissão não foi marcada como aprovada.");
      setLoading(null);
      router.refresh();
	onDone?.();
      return;
    }

    setMessage("Evento aprovado e publicado.");
    setLoading(null);
    router.refresh();
  }

  async function rejectSubmission() {
    setLoading("reject");
    setMessage("");

    const { error } = await supabase
      .from("event_submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id);

    if (error) {
      console.error(error);
      setMessage("Erro ao rejeitar.");
      setLoading(null);
      return;
    }

    setMessage("Submissão rejeitada.");
    setLoading(null);
    router.refresh();
	onDone?.();
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={approveSubmission}
          disabled={Boolean(loading)}
          className="flex-1 rounded-full bg-[#f2f1ec] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
        >
          {loading === "approve" ? "A aprovar..." : "Aprovar"}
        </button>

        <Link
  href={`/admin/submissoes/${submission.id}`}
  className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
>
  Editar
</Link>

        <button
          type="button"
          onClick={rejectSubmission}
          disabled={Boolean(loading)}
          className="flex-1 rounded-full border border-red-900 px-4 py-3 text-sm font-bold text-red-500 disabled:opacity-50"
        >
          {loading === "reject" ? "A rejeitar..." : "Rejeitar"}
        </button>
      </div>

      {message && <p className="mt-3 text-sm font-bold text-zinc-400">{message}</p>}
    </div>
  );
}