"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { LoadingButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type TargetType = "artist" | "venue" | "organizer";

type FollowButtonProps = {
  targetId?: string | null;
  targetType: TargetType;
};

const followLabels: Record<TargetType, string> = {
  artist: "Seguir artista",
  venue: "Seguir espaço",
  organizer: "Seguir organizador",
};

const followingLabels: Record<TargetType, string> = {
  artist: "Artista seguido",
  venue: "Espaço seguido",
  organizer: "Organizador seguido",
};

export function FollowButton({ targetId, targetType }: FollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    async function checkFollow() {
      setMessage("");

      if (!targetId) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();

      if (error) {
        setMessage("Não consegui verificar este follow.");
        setLoading(false);
        return;
      }

      setFollowing(Boolean(data));
      setLoading(false);
    }

    checkFollow();
  }, [targetId, targetType]);

  async function toggleFollow() {
    if (loading || !targetId) {
      return;
    }

    setLoading(true);
    setMessage("");
    const wasFollowing = following;
    setFollowing(!wasFollowing);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFollowing(wasFollowing);
      window.location.href = "/login";
      return;
    }

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("user_id", user.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      if (error) {
        setFollowing(wasFollowing);
        setMessage("Não consegui remover.");
        toast({ message: "Não foi possível deixar de seguir.", tone: "error" });
        setLoading(false);
        return;
      }

      setFollowing(false);
      toast({ message: "Deixaste de seguir.", tone: "success" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("follows").upsert(
      {
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      },
      {
        onConflict: "user_id,target_type,target_id",
        ignoreDuplicates: true,
      }
    );

    if (error) {
      setFollowing(wasFollowing);
      setMessage("Não consegui seguir.");
      toast({ message: "Não foi possível seguir.", tone: "error" });
      setLoading(false);
      return;
    }

    setFollowing(true);
    toast({ message: "Agora estás a seguir.", tone: "success" });
    setLoading(false);
  }

  if (!targetId) {
    return null;
  }

  return (
    <div>
      <LoadingButton
        onClick={toggleFollow}
        disabled={loading}
        loading={loading}
        loadingText="A atualizar..."
        variant={following ? "danger" : "primary"}
      >
        {following
            ? followingLabels[targetType]
            : followLabels[targetType]}
      </LoadingButton>

      {message && (
        <p className="mt-2 text-xs font-bold text-red-500">{message}</p>
      )}
    </div>
  );
}
