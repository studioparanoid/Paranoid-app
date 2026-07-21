"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/public";

export function usePendingBookingRequestCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        if (active) setCount(0);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("account_type,entity_id,account_status").eq("id", user.id).maybeSingle();
      let total = 0;

      if (profile?.account_type === "artist" && profile.account_status === "approved" && profile.entity_id) {
        const { count: artistCount } = await supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("artist_id", profile.entity_id).eq("status", "pending");
        total += artistCount || 0;
      }

      const { data: memberships } = await supabase.from("organizer_members").select("organizer_id").eq("user_id", user.id).eq("status", "active");
      const organizerIds = (memberships || []).map((membership) => membership.organizer_id);
      if (organizerIds.length > 0) {
        const { count: organizerCount } = await supabase.from("booking_requests").select("id", { count: "exact", head: true }).in("organizer_id", organizerIds).eq("status", "pending");
        total += organizerCount || 0;
      }

      if (active) setCount(total);
    }

    void load();
    return () => { active = false; };
  }, [user]);

  return count;
}
