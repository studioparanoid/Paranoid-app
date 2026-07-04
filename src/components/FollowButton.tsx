"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
        setMessage("Não consegui remover.");
        setLoading(false);
        return;
      }

      setFollowing(false);
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
      setMessage("Não consegui seguir.");
      setLoading(false);
      return;
    }

    setFollowing(true);
    setLoading(false);
  }

  if (!targetId) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleFollow}
        disabled={loading}
        className={`rounded-full px-5 py-3 text-sm font-black disabled:opacity-50 ${
          following
            ? "border border-red-900 bg-red-950 text-red-300"
            : "bg-[#f2f1ec] text-black"
        }`}
      >
        {loading
          ? "A verificar..."
          : following
            ? followingLabels[targetType]
            : followLabels[targetType]}
      </button>

      {message && (
        <p className="mt-2 text-xs font-bold text-red-500">{message}</p>
      )}
    </div>
  );
}