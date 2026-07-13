import { NextResponse } from "next/server";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = getRequiredSupabaseAdminClient();
    const { data, error } = await supabase
      .from("organizer_visibility_passes")
      .select("organizer_id")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString());

    if (error) {
      throw error;
    }

    return NextResponse.json({
      organizerIds: (data || []).map((row) => row.organizer_id).filter(Boolean),
    });
  } catch {
    return NextResponse.json({ organizerIds: [] });
  }
}
