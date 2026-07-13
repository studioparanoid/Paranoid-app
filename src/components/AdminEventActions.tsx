"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { Button, LinkButton, LoadingButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type AdminEventActionsProps = {
  event?: {
    id: string;
    slug: string;
    featured?: boolean | null;
    status?: string | null;
  };
  eventId?: string;
  slug?: string;
  featured?: boolean;
  mode?: "published" | "archived";
};

export function AdminEventActions({
  event,
  eventId,
  slug,
  featured,
  mode,
}: AdminEventActionsProps) {
  const resolvedEventId = event?.id || eventId || "";
  const resolvedSlug = event?.slug || slug || "";
  const resolvedFeatured =
    typeof featured === "boolean" ? featured : Boolean(event?.featured);
  const resolvedMode =
    mode || (event?.status === "archived" ? "archived" : "published");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { toast } = useToast();

  async function updateEventStatus(nextStatus: "published" | "archived") {
    setMessage("");

    if (!resolvedEventId) {
      setMessage("Evento inválido.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .update({
        status: nextStatus,
      })
      .eq("id", resolvedEventId)
      .select("id,status")
      .single();

    setLoading(false);

    if (error) {
      setMessage(`Erro: ${error.message}`);
      toast({ message: "Não foi possível atualizar o evento.", tone: "error" });
      return;
    }

    if (data?.status !== nextStatus) {
      setMessage("A operação não confirmou o novo estado.");
      toast({ message: "O novo estado não foi confirmado.", tone: "error" });
      return;
    }

    setConfirmArchive(false);
    toast({ message: nextStatus === "archived" ? "Evento arquivado." : "Evento republicado.", tone: "success" });
    window.setTimeout(() => window.location.reload(), 240);
  }

  async function toggleFeatured() {
    setMessage("");

    if (!resolvedEventId) {
      setMessage("Evento inválido.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("events")
      .update({
        featured: !resolvedFeatured,
      })
      .eq("id", resolvedEventId);

    setLoading(false);

    if (error) {
      setMessage(`Erro: ${error.message}`);
      toast({ message: "Não foi possível atualizar o destaque.", tone: "error" });
      return;
    }

    toast({ message: resolvedFeatured ? "Destaque removido." : "Evento destacado.", tone: "success" });
    window.setTimeout(() => window.location.reload(), 240);
  }

  if (!resolvedEventId) {
    return (
      <div className="rounded-2xl border border-red-950 bg-red-950/20 p-4 text-sm font-bold text-red-300">
        Evento inválido.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <LinkButton href={`/admin/eventos/${resolvedSlug || resolvedEventId}`} variant="secondary">
          Editar
        </LinkButton>

        {resolvedMode === "published" && resolvedSlug && (
          <LinkButton href={`/eventos/${resolvedSlug}`} variant="secondary">
            Ver público
          </LinkButton>
        )}

        {resolvedMode === "published" && (
          <>
            <LoadingButton
              onClick={toggleFeatured}
              disabled={loading}
              loading={loading}
              loadingText="A atualizar..."
              variant="danger"
            >
              {resolvedFeatured ? "Remover destaque" : "Destacar"}
            </LoadingButton>

            <Button
              onClick={() => setConfirmArchive(true)}
              disabled={loading}
              variant="secondary"
            >
              Arquivar / despublicar
            </Button>
          </>
        )}

        {resolvedMode === "archived" && (
          <LoadingButton
            onClick={() => updateEventStatus("published")}
            disabled={loading}
            loading={loading}
            loadingText="A republicar..."
          >
            Republicar
          </LoadingButton>
        )}
      </div>

      {message && (
        <p className="text-center text-xs font-bold text-zinc-500" role="alert">
          {message}
        </p>
      )}
      <ConfirmDialog open={confirmArchive} onClose={() => !loading && setConfirmArchive(false)} onConfirm={() => void updateEventStatus("archived")} title="Arquivar este evento?" description="O evento deixa de aparecer publicamente até ser republicado." confirmLabel="Arquivar" loading={loading} danger />
    </div>
  );
}
